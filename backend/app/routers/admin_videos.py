"""视频库后台接口（/api/admin/videos）。

写操作需 editor+（§3.3 权限矩阵）。
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_role
from app.models.segment import SegmentItem
from app.models.user import User
from app.models.video import Video
from app.schemas.video import ParseBvIn, VideoCreateIn, VideoUpdateIn
from app.services.bilibili import is_valid_bv, parse_bv
from app.utils.errors import (
    CODE_BV_DUPLICATE,
    CODE_BV_FORMAT,
    CODE_PARAM_ERROR,
    BusinessError,
)
from app.utils.response import ok

router = APIRouter(prefix="/api/admin", tags=["后台·视频库"])

# 未分类筛选哨兵值（前端筛「未分类」时传 category_id=__none__）
NONE_SENTINEL = "__none__"


def _video_to_dict(video: Video, created_by_name: str | None = None) -> dict[str, Any]:
    """将 Video ORM 转换为响应字典（含 created_by_name）。"""
    return {
        "id": video.id,
        "title": video.title,
        "bv_id": video.bv_id,
        "category_id": video.category_id,
        "year": video.year,
        "cover_url": video.cover_url,
        "status": video.status,
        "sort": video.sort,
        "created_by": video.created_by,
        "created_by_name": created_by_name,
        "created_at": video.created_at,
        "updated_at": video.updated_at,
    }


@router.get("/videos", summary="视频列表")
def list_videos(
    category_id: str | None = Query(default=None),
    status: str | None = Query(default=None),
    keyword: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    """分页查询视频，支持分类（含未分类）/状态/关键字（标题或 BV）。"""
    filters = []
    if category_id == NONE_SENTINEL:
        filters.append(Video.category_id.is_(None))
    elif category_id:
        filters.append(Video.category_id == category_id)
    if status:
        filters.append(Video.status == status)
    if keyword:
        kw = f"%{keyword.strip()}%"
        filters.append(or_(Video.title.like(kw), Video.bv_id.like(kw)))

    total = db.scalar(select(func.count(Video.id)).where(*filters)) or 0
    rows = db.execute(
        select(Video, User.name)
        .outerjoin(User, Video.created_by == User.id)
        .where(*filters)
        .order_by(Video.created_at.desc(), Video.id.desc())
        .offset((page - 1) * size)
        .limit(size)
    ).all()

    items = [_video_to_dict(video, name) for video, name in rows]
    return ok({"total": total, "page": page, "size": size, "items": items})


@router.post("/videos/parse-bv", summary="解析 BV 号")
def parse_bv_endpoint(
    payload: ParseBvIn,
    _user: User = Depends(require_role("editor")),
) -> dict:
    """从输入串抽取 BV 号并尝试获取标题/封面；格式非法 2001，解析失败 2002。"""
    meta = parse_bv(payload.input)
    return ok(meta)


@router.post("/videos", summary="新增视频")
def create_video(
    payload: VideoCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("editor")),
) -> dict:
    """新增视频（默认 draft）；BV 格式 2001 / 重复 2003。"""
    bv_id = payload.bv_id.strip()
    if not is_valid_bv(bv_id):
        raise BusinessError(CODE_BV_FORMAT, "BV 号格式错误，应为 BV 加 10 位字母或数字")

    exists = db.scalar(select(Video.id).where(Video.bv_id == bv_id))
    if exists:
        raise BusinessError(CODE_BV_DUPLICATE, "该 BV 号已存在，请勿重复添加")

    video = Video(
        title=payload.title.strip(),
        bv_id=bv_id,
        category_id=payload.category_id or None,
        year=payload.year,
        cover_url=payload.cover_url,
        status=payload.status,
        created_by=current_user.id,
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    return ok({"id": video.id})


@router.put("/videos/{video_id}", summary="编辑视频")
def update_video(
    video_id: int,
    payload: VideoUpdateIn,
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("editor")),
) -> dict:
    """编辑视频（字段可选；改动 BV 时重新校验格式与唯一性）。"""
    video = db.get(Video, video_id)
    if video is None:
        raise BusinessError(CODE_PARAM_ERROR, "视频不存在")

    data = payload.model_dump(exclude_unset=True)

    if "bv_id" in data and data["bv_id"] is not None:
        new_bv = str(data["bv_id"]).strip()
        if not is_valid_bv(new_bv):
            raise BusinessError(CODE_BV_FORMAT, "BV 号格式错误，应为 BV 加 10 位字母或数字")
        if new_bv != video.bv_id:
            exists = db.scalar(
                select(Video.id).where(Video.bv_id == new_bv, Video.id != video_id)
            )
            if exists:
                raise BusinessError(CODE_BV_DUPLICATE, "该 BV 号已存在，请勿重复添加")
        data["bv_id"] = new_bv

    for field, value in data.items():
        if field == "title" and value is not None:
            value = str(value).strip()
        if field == "category_id" and value == "":
            value = None
        setattr(video, field, value)

    db.commit()
    db.refresh(video)
    return ok({"id": video.id})


@router.delete("/videos/{video_id}", summary="删除视频")
def delete_video(
    video_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("editor")),
) -> dict:
    """删除视频，并清理板块清单中的孤立引用（合集明细由外键级联删除）。"""
    video = db.get(Video, video_id)
    if video is None:
        raise BusinessError(CODE_PARAM_ERROR, "视频不存在")

    db.execute(
        delete(SegmentItem).where(
            SegmentItem.target_type == "video",
            SegmentItem.target_id == video_id,
        )
    )
    db.delete(video)
    db.commit()
    return ok({})
