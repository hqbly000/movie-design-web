"""官网公开接口（/api/public）。

- ``GET /site``：首页聚合配置（60s 内存缓存）；
- ``GET /segments/{id}/videos``：某板块作品列表（仅 published，按 segment_items.sort）；
- ``POST /leads``：提交预约（校验见设计方案 §7.4）。
"""

from __future__ import annotations

import re
import time
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.company import CompanyProfile
from app.models.hero import HeroSlide
from app.models.honor import Honor
from app.models.lead import Lead
from app.models.segment import Segment, SegmentItem
from app.models.setting import SiteSetting
from app.models.video import Video
from app.schemas.lead import LeadCreateIn
from app.utils.errors import CODE_PARAM_ERROR, BusinessError
from app.utils.response import ok

router = APIRouter(prefix="/api/public", tags=["官网公开"])

# ---------------- 简单内存缓存（60s） ----------------
_CACHE: dict[str, tuple[float, Any]] = {}


def _cache_get(key: str) -> Any | None:
    """读取缓存；过期返回 None。"""
    entry = _CACHE.get(key)
    if entry is None:
        return None
    ts, value = entry
    if time.time() - ts > settings.SITE_CACHE_TTL:
        return None
    return value


def _cache_set(key: str, value: Any) -> None:
    """写入缓存。"""
    _CACHE[key] = (time.time(), value)


def invalidate_site_cache() -> None:
    """清除站点聚合缓存（后台保存后调用，使前台更快生效）。"""
    _CACHE.pop("site", None)


# ---------------- 电话校验（§7.4） ----------------
_MOBILE_RE = re.compile(r"^1[3-9]\d{9}$")
_TEL_RE = re.compile(r"^0\d{2,3}-?\d{7,8}$")


def _is_valid_phone(phone: str) -> bool:
    """11 位手机号或含区号固话均视为合法。"""
    return bool(_MOBILE_RE.match(phone) or _TEL_RE.match(phone))


@router.get("/site", summary="首页聚合配置")
def get_site(db: Session = Depends(get_db)) -> dict:
    """一次性返回 hero_slides / company_profile / segments(含 item_count) / honors / site_settings。"""
    cached = _cache_get("site")
    if cached is not None:
        return ok(cached)

    # 首屏轮播
    slides = db.execute(select(HeroSlide).order_by(HeroSlide.sort.asc())).scalars().all()
    hero_slides = [
        {
            "id": s.id,
            "image_url": s.image_url,
            "slogan": s.slogan,
            "sub_slogan": s.sub_slogan,
            "sort": s.sort,
        }
        for s in slides
    ]

    # 公司介绍（单行）
    company = db.execute(
        select(CompanyProfile).order_by(CompanyProfile.id.asc()).limit(1)
    ).scalar_one_or_none()
    company_profile = (
        {
            "section_title": company.section_title,
            "company_name": company.company_name,
            "founded_year": company.founded_year,
            "intro_text": company.intro_text,
        }
        if company
        else None
    )

    # 业务板块（含已发布内容数量）
    segments_rows = db.execute(select(Segment).order_by(Segment.sort.asc())).scalars().all()
    segments: list[dict[str, Any]] = []
    for seg in segments_rows:
        target_type = "asset" if seg.content_type == "gallery" else seg.content_type
        count_query = select(func.count(SegmentItem.id)).where(
            SegmentItem.segment_id == seg.id,
            SegmentItem.target_type == target_type,
        )
        if seg.content_type == "video":
            count_query = count_query.join(
                Video, SegmentItem.target_id == Video.id
            ).where(Video.status == "published")
        item_count = db.scalar(count_query) or 0
        segments.append(
            {
                "id": seg.id,
                "name": seg.name,
                "preview_image_url": seg.preview_image_url,
                "content_type": seg.content_type,
                "sort": seg.sort,
                "item_count": item_count,
            }
        )

    # 荣誉
    honors_rows = db.execute(select(Honor).order_by(Honor.sort.asc(), Honor.id.asc())).scalars().all()
    honors = [
        {
            "id": h.id,
            "title": h.title,
            "description": h.description,
            "issuer": h.issuer,
            "level": h.level,
            "sort": h.sort,
        }
        for h in honors_rows
    ]

    # 站点配置
    setting_rows = db.execute(select(SiteSetting)).scalars().all()
    site_settings: dict[str, str | None] = {row.key: row.value for row in setting_rows}

    data = {
        "hero_slides": hero_slides,
        "company_profile": company_profile,
        "segments": segments,
        "honors": honors,
        "site_settings": site_settings,
    }
    _cache_set("site", data)
    return ok(data)


@router.get("/segments/{segment_id}/videos", summary="板块作品列表")
def get_segment_videos(segment_id: int, db: Session = Depends(get_db)) -> dict:
    """返回某板块下已发布的视频，按 segment_items.sort 排序。"""
    segment = db.get(Segment, segment_id)
    if segment is None:
        raise BusinessError(CODE_PARAM_ERROR, "板块不存在")

    rows = db.execute(
        select(SegmentItem, Video)
        .join(Video, SegmentItem.target_id == Video.id)
        .where(
            SegmentItem.segment_id == segment_id,
            SegmentItem.target_type == "video",
            Video.status == "published",
        )
        .order_by(SegmentItem.sort.asc(), SegmentItem.id.asc())
    ).all()

    videos = [
        {
            "id": video.id,
            "title": video.title,
            "bv_id": video.bv_id,
            "category_id": video.category_id,
            "year": video.year,
            "cover_url": video.cover_url,
            "sort": item.sort,
        }
        for item, video in rows
    ]
    return ok(
        {
            "segment_id": segment.id,
            "name": segment.name,
            "content_type": segment.content_type,
            "videos": videos,
        }
    )


@router.post("/leads", summary="提交预约")
def create_lead(payload: LeadCreateIn, db: Session = Depends(get_db)) -> dict:
    """校验并落库预约留言，status=unread。"""
    phone = payload.phone.strip()
    if not _is_valid_phone(phone):
        raise BusinessError(CODE_PARAM_ERROR, "请填写正确的 11 位手机号或含区号固话")

    lead = Lead(
        name=payload.name.strip(),
        phone=phone,
        demand_type=payload.demand_type,
        demand_date=payload.demand_date,
        demand_note=payload.demand_note,
        status="unread",
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return ok({"id": lead.id})
