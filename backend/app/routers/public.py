"""官网公开接口（/api/public）。

- ``GET /site``：首页聚合配置（60s 内存缓存，不含大文本字段）；
- ``GET /segments/{id}/videos``：某板块视频列表（仅 published，按 segment_items.sort）；
- ``GET /segments/{id}/content``：某板块详情内容（按 content_type 返回视频 / 图片 / 图文）；
- ``GET /company/detail``：公司详情长文（按需取，不进聚合缓存）；
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
from app.models.asset import Asset
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

    # 业务板块（含已发布内容数量；article 类型以正文有无计 1/0）
    segments_rows = db.execute(select(Segment).order_by(Segment.sort.asc())).scalars().all()
    segments: list[dict[str, Any]] = []
    for seg in segments_rows:
        if seg.content_type == "article":
            item_count = 1 if (seg.body or "").strip() else 0
        else:
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

    # 已发布视频总数（公司详情统计条派生用）
    video_count = db.scalar(
        select(func.count(Video.id)).where(Video.status == "published")
    ) or 0

    data = {
        "hero_slides": hero_slides,
        "company_profile": company_profile,
        "segments": segments,
        "honors": honors,
        "site_settings": site_settings,
        "video_count": video_count,
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


@router.get("/segments/{segment_id}/content", summary="板块详情内容")
def get_segment_content(segment_id: int, db: Session = Depends(get_db)) -> dict:
    """按板块内容类型返回详情数据：video → videos，gallery → images，article → body。

    body 对 video / gallery 类型为可选板块简介，对 article 类型即正文（空行分段）。
    大文本不进 /site 聚合缓存，本接口在遮罩打开时按需调用。
    """
    segment = db.get(Segment, segment_id)
    if segment is None:
        raise BusinessError(CODE_PARAM_ERROR, "板块不存在")

    videos: list[dict[str, Any]] = []
    images: list[dict[str, Any]] = []

    if segment.content_type == "video":
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
    elif segment.content_type == "gallery":
        rows = db.execute(
            select(SegmentItem, Asset)
            .join(Asset, SegmentItem.target_id == Asset.id)
            .where(
                SegmentItem.segment_id == segment_id,
                SegmentItem.target_type == "asset",
            )
            .order_by(SegmentItem.sort.asc(), SegmentItem.id.asc())
        ).all()
        images = [
            {"id": asset.id, "url": asset.url, "width": asset.width, "height": asset.height}
            for _item, asset in rows
        ]

    return ok(
        {
            "segment_id": segment.id,
            "name": segment.name,
            "content_type": segment.content_type,
            "body": segment.body,
            "videos": videos,
            "images": images,
        }
    )


@router.get("/company/detail", summary="公司详情长文")
def get_company_detail(db: Session = Depends(get_db)) -> dict:
    """返回公司详情页长文（long_intro，空行分段）。按需取，不进聚合缓存。"""
    company = db.execute(
        select(CompanyProfile).order_by(CompanyProfile.id.asc()).limit(1)
    ).scalar_one_or_none()
    return ok({"long_intro": company.long_intro if company else None})


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
