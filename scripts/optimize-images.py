#!/usr/bin/env python3
"""为图片生成同名 WebP 兄弟文件（原图保留，前端用 <picture> 择优加载）。

为什么不用改数据库 / 不覆盖原图：
- `hero_slides.image_url` 等字段仍指向原 .png/.jpg，前端把扩展名换成 .webp 作为
  `<source type="image/webp">`，不支持的浏览器自动回退原图；
- 因此可以随时删除 .webp 回滚，零数据迁移。

策略（按内容类型自动分流）：
- 含透明通道的图（logo、图形、抠图枝）：**无损 WebP**，避免色度子采样把边缘糊掉；
- 照片类（RGB）：有损 WebP，默认 q85、最长边压到 1920（屏幕用不到更大）。

用法：
    python scripts/optimize-images.py                     # 默认处理 uploads 与 public/images
    python scripts/optimize-images.py --dry-run           # 只看会做什么
    python scripts/optimize-images.py --quality 85 --max-side 1920
    python scripts/optimize-images.py --force             # 忽略已有 .webp 强制重建
    python scripts/optimize-images.py backend/uploads/cover frontend/public/images
"""

from __future__ import annotations

import argparse
import os
import sys
import time

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    print("需要 Pillow：pip install Pillow", file=sys.stderr)
    raise SystemExit(1)

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DIRS = [
    os.path.join(REPO_ROOT, "backend", "uploads"),
    os.path.join(REPO_ROOT, "frontend", "public", "images"),
]
SOURCE_EXTS = (".png", ".jpg", ".jpeg")
LOSSLESS_MAX_SIDE = 2048  # 图形类默认不缩尺寸（只防止异常大图）
MIN_SOURCE_BYTES = 1024  # 小于 1KB 的多半是测试残留/空文件，跳过避免生成假图

# 个别图形的原始像素远大于页面显示尺寸，单独压到「显示尺寸 ×2」即可。
# 只影响 .webp 兄弟文件，原 PNG 不动。
MAX_SIDE_OVERRIDE = {
    "laurel-branch.png": 320,  # 荣誉舞台两侧麦穗：CSS 宽 78px
    "logo-on-dark.png": 640,  # 头部/页脚 logo：CSS 高 44px（约 204px 宽）
}


def human(size: int) -> str:
    """字节 → 便于阅读的体积。"""
    if size >= 1024 * 1024:
        return f"{size / 1048576:.1f} MB"
    return f"{size / 1024:.0f} KB"


def is_graphic(im: Image.Image) -> bool:
    """带透明通道的图按图形处理（无损），其余按照片处理（有损）。"""
    return im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)


def convert(src_path: str, quality: int, max_side: int) -> tuple[int, int, str]:
    """生成 .webp，返回 (原图字节, webp 字节, 说明)。"""
    with Image.open(src_path) as raw:
        has_alpha = is_graphic(raw)
        im = raw.copy()

    override = MAX_SIDE_OVERRIDE.get(os.path.basename(src_path))
    if has_alpha:
        # 图形：无损，保住 logo / 文字边缘的锐利度；按显示尺寸适当缩像素
        limit = min(override or LOSSLESS_MAX_SIDE, LOSSLESS_MAX_SIDE)
        if max(im.size) > limit:
            im.thumbnail((limit, limit), Image.LANCZOS)
        dst_path = os.path.splitext(src_path)[0] + ".webp"
        im.save(dst_path, "WEBP", lossless=True, quality=100, method=6, exact=True)
        note = f"无损 {im.width}x{im.height}（透明图）"
    else:
        im = im.convert("RGB")
        limit = override or max_side
        if max(im.size) > limit:
            im.thumbnail((limit, limit), Image.LANCZOS)
        dst_path = os.path.splitext(src_path)[0] + ".webp"
        im.save(dst_path, "WEBP", quality=quality, method=6)
        note = f"q{quality} {im.width}x{im.height}"

    return os.path.getsize(src_path), os.path.getsize(dst_path), note


def walk_images(dirs: list[str]) -> list[str]:
    """收集待处理图片（跳过 .webp 自身）。"""
    found: list[str] = []
    for d in dirs:
        if not os.path.isdir(d):
            print(f"[跳过] 目录不存在：{d}", file=sys.stderr)
            continue
        for root, _dirs, files in os.walk(d):
            for name in sorted(files):
                if name.lower().endswith(SOURCE_EXTS):
                    found.append(os.path.join(root, name))
    return found


def main() -> int:
    parser = argparse.ArgumentParser(description="批量生成 WebP 兄弟文件")
    parser.add_argument("dirs", nargs="*", default=None, help="要扫描的目录（默认 uploads + public/images）")
    parser.add_argument("--quality", type=int, default=85, help="有损质量，默认 85")
    parser.add_argument("--max-side", type=int, default=1920, help="照片最长边上限，默认 1920")
    parser.add_argument("--force", action="store_true", help="已有 .webp 也重做")
    parser.add_argument("--dry-run", action="store_true", help="只列出计划，不写文件")
    args = parser.parse_args()

    dirs = args.dirs or DEFAULT_DIRS
    targets = walk_images(dirs)
    if not targets:
        print("没有找到可处理的图片")
        return 0

    total_src = total_dst = 0
    done = skipped = failed = 0
    started = time.time()

    print(f"{'原图':<46}{'原体积':>10}{'WebP':>10}{'压缩':>8}  说明")
    print("-" * 104)
    for path in targets:
        dst = os.path.splitext(path)[0] + ".webp"
        rel = os.path.relpath(path, REPO_ROOT)
        if os.path.getsize(path) < MIN_SOURCE_BYTES:
            skipped += 1
            print(f"{rel:<46}{human(os.path.getsize(path)):>10}{'—':>10}{'—':>8}  过小，跳过")
            continue
        if os.path.exists(dst) and not args.force:
            src_size = os.path.getsize(path)
            dst_size = os.path.getsize(dst)
            total_src += src_size
            total_dst += dst_size
            skipped += 1
            print(f"{rel:<46}{human(src_size):>10}{human(dst_size):>10}{dst_size / src_size * 100:7.1f}%  已存在，跳过")
            continue
        if args.dry_run:
            print(f"{rel:<46}{human(os.path.getsize(path)):>10}{'—':>10}{'—':>8}  计划生成")
            continue
        try:
            src_size, dst_size, note = convert(path, args.quality, args.max_side)
        except Exception as exc:  # 单张失败不影响整体
            failed += 1
            print(f"{rel:<46}{'':>10}{'':>10}{'':>8}  失败：{exc}", file=sys.stderr)
            continue
        total_src += src_size
        total_dst += dst_size
        done += 1
        print(f"{rel:<46}{human(src_size):>10}{human(dst_size):>10}{dst_size / src_size * 100:7.1f}%  {note}")

    if args.dry_run:
        print("\n（dry-run，未写入任何文件）")
        return 0

    print("-" * 104)
    saved = total_src - total_dst
    ratio = (saved / total_src * 100) if total_src else 0
    print(
        f"生成 {done} 张 / 跳过 {skipped} 张 / 失败 {failed} 张；"
        f"合计 {human(total_src)} → {human(total_dst)}，省 {human(saved)}（{ratio:.1f}%），耗时 {time.time() - started:.1f}s"
    )
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
