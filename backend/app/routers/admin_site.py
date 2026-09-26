"""内容维护后台接口（/api/admin）。

覆盖：首页首屏 / 公司介绍 / 业务板块 / 图集素材。写操作需 editor+。
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_role
from app.models.asset import Asset, AssetGroup
from app.models.company import CompanyProfile
from app.models.hero import HeroSlide
from app.models.segment import Segment, SegmentItem
from app.models.user import User
from app.routers.public import invalidate_site_cache
from app.schemas.company import CompanyProfileIn
from app.schemas.hero import HeroSlidesSaveIn
from app.schemas.segment import SegmentOrderIn, SegmentUpdateIn
from app.utils.errors import (
    CODE_FIXED_COUNT,
    CODE_PARAM_ERROR,
    BusinessError,
)
from app.utils.response import ok

router = APIRouter(prefix="/api/admin", tags=["后台·内容维护"])

# 内容类型 → 板块清单目标类型
_CONTENT_TO_TARGET = {"video": "video", "gallery": "asset", "article": "article"}


# ============================ 首页首屏 ============================
@router.get("/hero-slides", summary="首屏轮播列表（3 条）")
def list_hero_slides(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    """返回 3 条首屏轮播。"""
    rows = db.execute(select(HeroSlide).order_by(HeroSlide.sort.asc())).scalars().all()
    items = [
        {
            "id": row.id,
            "image_id": row.image_id,
            "image_url": row.image_url,
            "slogan": row.slogan,
            "sub_slogan": row.sub_slogan,
            "sort": row.sort,
        }
        for row in rows
    ]
    return ok(items)


@router.put("/hero-slides", summary="批量保存首屏（恰好 3 条）")
def save_hero_slides(
    payload: HeroSlidesSaveIn,
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("editor")),
) -> dict:
    """批量保存 3 条首屏；数量不为 3 或顺序非 0/1/2 → 3002。"""
    if len(payload.slides) != 3:
        raise BusinessError(CODE_FIXED_COUNT, "首屏轮播固定为 3 条，不支持增删")

    sorts = sorted(s.sort for s in payload.slides)
    if sorts != [0, 1, 2]:
        raise BusinessError(CODE_PARAM_ERROR, "首屏顺序必须为 0 / 1 / 2 且不重复")

    existing = {row.id: row for row in db.execute(select(HeroSlide)).scalars().all()}
    if set(existing.keys()) != {s.id for s in payload.slides}:
        raise BusinessError(CODE_PARAM_ERROR, "首屏条目与现有数据不匹配")

    # 先写入临时负 sort，规避 UNIQUE(sort) 更新冲突
    for index, row in enumerate(existing.values()):
        row.sort = -(index + 1)
    db.flush()

    id_to_url = {asset.id: asset.url for asset in db.execute(select(Asset)).scalars().all()}
    url_to_id = {url: asset_id for asset_id, url in id_to_url.items()}

    for slide in payload.slides:
        row = existing[slide.id]
        row.image_url = slide.image_url
        row.slogan = slide.slogan
        row.sub_slogan = slide.sub_slogan
        row.sort = slide.sort
        row.image_id = url_to_id.get(slide.image_url, row.image_id)

    db.commit()
    invalidate_site_cache()
    return ok({})


# ============================ 公司介绍 ============================
@router.get("/company-profile", summary="公司介绍")
def get_company_profile(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    """返回公司介绍（单行）。"""
    company = db.execute(
        select(CompanyProfile).order_by(CompanyProfile.id.asc()).limit(1)
    ).scalar_one_or_none()
    if company is None:
        return ok(None)
    return ok(
        {
            "section_title": company.section_title,
            "company_name": company.company_name,
            "founded_year": company.founded_year,
            "intro_text": company.intro_text,
            "long_intro": company.long_intro,
        }
    )


@router.put("/company-profile", summary="保存公司介绍")
def save_company_profile(
    payload: CompanyProfileIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("editor")),
) -> dict:
    """保存公司介绍（不存在则创建）。"""
    company = db.execute(
        select(CompanyProfile).order_by(CompanyProfile.id.asc()).limit(1)
    ).scalar_one_or_none()
    if company is None:
        company = CompanyProfile()
        db.add(company)

    company.section_title = payload.section_title
    company.company_name = payload.company_name
    company.founded_year = payload.founded_year
    company.intro_text = payload.intro_text
    company.long_intro = payload.long_intro
    company.updated_by = current_user.id

    db.commit()
    invalidate_site_cache()
    return ok({})


# ============================ 业务板块 ============================
def _segment_to_dict(db: Session, segment: Segment) -> dict[str, Any]:
    """组装板块响应（含 item_ids 与 item_count）。"""
    items = db.execute(
        select(SegmentItem)
        .where(SegmentItem.segment_id == segment.id)
        .order_by(SegmentItem.sort.asc(), SegmentItem.id.asc())
    ).scalars().all()
    return {
        "id": segment.id,
        "name": segment.name,
        "preview_image_id": segment.preview_image_id,
        "preview_image_url": segment.preview_image_url,
        "content_type": segment.content_type,
        "body": segment.body,
        "sort": segment.sort,
        "item_ids": [item.target_id for item in items],
        "item_count": len(items),
    }


@router.get("/segments", summary="业务板块列表（5 条）")
def list_segments(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    """返回 5 个板块（含内容类型与已选清单）。"""
    rows = db.execute(select(Segment).order_by(Segment.sort.asc())).scalars().all()
    return ok([_segment_to_dict(db, seg) for seg in rows])


@router.put("/segments/order", summary="板块排序")
def order_segments(
    payload: SegmentOrderIn,
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("editor")),
) -> dict:
    """按传入 id 顺序重排板块；长度不为 5 → 3002。"""
    if len(payload.ids) != 5:
        raise BusinessError(CODE_FIXED_COUNT, "业务板块固定为 5 个，排序需提交 5 个 id")

    segments = {seg.id: seg for seg in db.execute(select(Segment)).scalars().all()}
    if set(payload.ids) != set(segments.keys()):
        raise BusinessError(CODE_PARAM_ERROR, "排序 id 与现有板块不匹配")

    for index, seg in enumerate(segments.values()):
        seg.sort = -(index + 1)  # 临时值规避 UNIQUE(sort)
    db.flush()

    for index, seg_id in enumerate(payload.ids):
        segments[seg_id].sort = index

    db.commit()
    invalidate_site_cache()
    return ok({})


@router.put("/segments/{segment_id}", summary="编辑板块")
def update_segment(
    segment_id: int,
    payload: SegmentUpdateIn,
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("editor")),
) -> dict:
    """编辑板块（名称/预览图/内容类型/内容清单）。"""
    segment = db.get(Segment, segment_id)
    if segment is None:
        raise BusinessError(CODE_PARAM_ERROR, "板块不存在")

    segment.name = payload.name
    segment.content_type = payload.content_type
    segment.body = payload.body
    if payload.preview_image_url is not None:
        segment.preview_image_url = payload.preview_image_url
        asset_id = db.scalar(select(Asset.id).where(Asset.url == payload.preview_image_url))
        segment.preview_image_id = asset_id

    # 重建内容清单
    db.execute(delete(SegmentItem).where(SegmentItem.segment_id == segment.id))
    target_type = payload.item_type or _CONTENT_TO_TARGET.get(payload.content_type, "video")
    seen: set[int] = set()
    for index, target_id in enumerate(payload.item_ids):
        if target_id in seen:
            continue
        seen.add(target_id)
        db.add(
            SegmentItem(
                segment_id=segment.id,
                target_type=target_type,
                target_id=target_id,
                sort=index,
            )
        )

    db.commit()
    invalidate_site_cache()
    return ok({})


# ============================ 图集素材 ============================
@router.get("/assets", summary="图集素材列表")
def list_assets(
    group_id: int | None = Query(default=None),
    type: str | None = Query(default=None),  # noqa: A002 - 与契约字段名保持一致
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    """按分组或分组类型查询素材（供「从图集选择」）。"""
    query = select(Asset, AssetGroup.type, AssetGroup.name).outerjoin(
        AssetGroup, Asset.group_id == AssetGroup.id
    )
    if group_id is not None:
        query = query.where(Asset.group_id == group_id)
    if type:
        query = query.where(AssetGroup.type == type)

    rows = db.execute(query.order_by(Asset.sort.asc(), Asset.id.asc())).all()
    items = [
        {
            "id": asset.id,
            "group_id": asset.group_id,
            "group_type": group_type,
            "group_name": group_name,
            "url": asset.url,
            "width": asset.width,
            "height": asset.height,
            "sort": asset.sort,
        }
        for asset, group_type, group_name in rows
    ]
    return ok(items)
