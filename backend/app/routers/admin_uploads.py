"""图片上传接口（/api/admin/uploads）。

限制：≤5MB；jpg/jpeg/png/webp；落盘 uploads/upload/{uuid}.{ext}。
安全：① 扩展名白名单 → ② **有界分块读取**（超限即时中止，不缓冲超大输入）
→ ③ 非空 → ④ Pillow 真实内容嗅探。四项均在写盘之前完成，失败不落盘。
"""

from __future__ import annotations

import io
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, UploadFile

from app.config import settings
from app.deps import require_role
from app.models.user import User
from app.utils.errors import CODE_PARAM_ERROR, BusinessError
from app.utils.response import ok

router = APIRouter(prefix="/api/admin", tags=["后台·上传"])

# 分块读取的块大小（64KB）：累计超过上限即中止，避免把超大文件完整读入内存
UPLOAD_CHUNK_SIZE: int = 64 * 1024

# 扩展名 → Pillow 识别的标准格式名（用于「内容与扩展名一致」校验）
_EXT_FORMAT_MAP: dict[str, str] = {
    "jpg": "JPEG",
    "jpeg": "JPEG",
    "png": "PNG",
    "webp": "WEBP",
}

# 允许的真实图片格式（Pillow 识别结果）
_ALLOWED_FORMATS: frozenset[str] = frozenset({"JPEG", "PNG", "WEBP"})


def _detect_image_format(content: bytes) -> str | None:
    """用 Pillow 嗅探图片真实格式；无法识别或文件损坏时返回 None。

    先用 ``verify()`` 校验完整性，再二次 ``open()`` 读取 ``format``
    （``verify()`` 会消耗流，必须重新打开才能读取元信息）。任何异常
    （``UnidentifiedImageError``、``OSError``（Truncated File Read）等）
    一律视为非法图片。

    Args:
        content: 上传文件的原始字节。

    Returns:
        标准格式名（``JPEG`` / ``PNG`` / ``WEBP``）或 ``None``。
    """
    try:
        from PIL import Image  # 局部导入，避免未安装时影响应用启动

        with Image.open(io.BytesIO(content)) as image:
            image.verify()
        with Image.open(io.BytesIO(content)) as image:
            fmt = (image.format or "").upper()
        return fmt or None
    except Exception:  # noqa: BLE001 —— 任何解析异常都判为「非图片」
        return None


def _read_image_size(path: Path) -> tuple[int | None, int | None]:
    """用 Pillow 读取图片宽高；未安装或读取失败时返回 (None, None)。"""
    try:
        from PIL import Image  # 局部导入，避免未安装时影响应用启动

        with Image.open(path) as image:
            return int(image.width), int(image.height)
    except Exception:  # noqa: BLE001
        return None, None


@router.post("/uploads", summary="上传图片")
async def upload_image(
    file: UploadFile = File(...),
    _user: User = Depends(require_role("editor")),
) -> dict:
    """保存上传图片并返回 ``{url,width,height}``（url 为相对路径）。

    校验顺序：① 扩展名白名单 → ② 有界分块读取（累计 > 5MB 立即中止）
    → ③ 非空 → ④ 真实内容嗅探（格式 ∈ {JPEG, PNG, WEBP} 且与扩展名一致）。

    边界语义：**恰好等于 5MB 接受**，**严格大于 5MB 拒绝**（见 ``total > limit``）。
    所有校验均在**写盘之前**完成，任一失败都不会在磁盘留下半成品文件；
    统一返回 1001，并附 ``data:{field:"file", detail:...}``。
    """
    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in settings.allowed_image_exts:
        allowed = "/".join(sorted(settings.allowed_image_exts))
        raise BusinessError(
            CODE_PARAM_ERROR,
            f"仅支持 {allowed} 格式的图片",
            {"field": "file", "detail": f"扩展名需为 {allowed}"},
        )

    # 有界分块读取：每块 64KB，累计超过上限立即中止并关闭，绝不整份缓冲
    limit = settings.max_upload_bytes
    chunks: list[bytes] = []
    total = 0
    exceeded = False
    while True:
        chunk = await file.read(UPLOAD_CHUNK_SIZE)
        if not chunk:
            break
        total += len(chunk)
        if total > limit:  # 边界：恰好 = 5MB 接受；> 5MB 拒绝
            exceeded = True
            break
        chunks.append(chunk)
    await file.close()  # 无论成败都关闭底层临时文件；此时尚无任何落盘

    if exceeded:
        raise BusinessError(
            CODE_PARAM_ERROR,
            f"图片不能超过 {settings.MAX_UPLOAD_MB}MB",
            {"field": "file", "detail": f"文件大小超过 {settings.MAX_UPLOAD_MB}MB 限制"},
        )

    content = b"".join(chunks)
    if not content:
        raise BusinessError(
            CODE_PARAM_ERROR,
            "上传文件为空",
            {"field": "file", "detail": "上传文件为空"},
        )

    # 真实内容嗅探：识别出的格式必须是受支持格式，且与扩展名一致
    detected = _detect_image_format(content)
    expected = _EXT_FORMAT_MAP.get(ext)
    if detected not in _ALLOWED_FORMATS or detected != expected:
        raise BusinessError(
            CODE_PARAM_ERROR,
            "文件内容不是有效的图片，或与扩展名不符（仅支持真实的 JPG / PNG / WEBP）",
            {"field": "file", "detail": "文件内容不是有效图片，或与扩展名不符"},
        )

    settings.upload_public_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid4().hex}.{ext}"
    target = settings.upload_public_dir / stored_name
    target.write_bytes(content)

    width, height = _read_image_size(target)
    return ok({"url": f"/uploads/upload/{stored_name}", "width": width, "height": height})
