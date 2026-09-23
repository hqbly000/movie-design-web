"""分发服务：限时合集创建、关闭、重生成与分享页解析。"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.collection import Collection, CollectionItem
from app.models.distribution import Distribution
from app.models.user import User
from app.models.video import Video
from app.schemas.distribution import DistributionCreateIn
from app.schemas.share import ShareCollectionOut, ShareVideoOut
from app.services import tokens as token_service
from app.utils.errors import (
    CODE_PARAM_ERROR,
    CODE_SHARE_INVALID,
    BusinessError,
)

# 各限时类型对应的时长
DURATION_DELTAS: dict[str, timedelta] = {
    "30m": timedelta(minutes=30),
    "1h": timedelta(hours=1),
    "6h": timedelta(hours=6),
    "1d": timedelta(days=1),
    "3d": timedelta(days=3),
}

# 限时类型 → 中文文案（供后台列表展示，便于前端二次使用）
DURATION_LABELS: dict[str, str] = {
    "30m": "30 分钟",
    "1h": "1 小时",
    "6h": "6 小时",
    "1d": "1 天",
    "3d": "3 天",
    "custom": "自定义",
}


def _naive_local(value: datetime | None) -> datetime | None:
    """将可能带时区的 datetime 归一化为本地无时区时间（本项目不做 UTC 转换）。"""
    if value is None:
        return None
    if value.tzinfo is not None:
        return value.astimezone().replace(tzinfo=None)
    return value


def compute_expires(
    duration_type: str,
    custom_expires_at: datetime | None,
    now: datetime,
) -> datetime:
    """根据限时类型计算到期时刻（默认 1 小时）。

    Args:
        duration_type: 30m/1h/6h/1d/3d/custom。
        custom_expires_at: 自定义到期时刻（custom 时必填）。
        now: 当前本地时间。

    Returns:
        到期时刻（本地无时区 datetime）。

    Raises:
        BusinessError: 1001（custom 缺少到期时刻）。
    """
    if duration_type == "custom":
        custom = _naive_local(custom_expires_at)
        if custom is None:
            raise BusinessError(CODE_PARAM_ERROR, "选择自定义限时需提供到期时刻")
        return custom
    return now + DURATION_DELTAS.get(duration_type, DURATION_DELTAS["1h"])


def mask_customer(name: str, contact: str | None) -> str:
    """生成脱敏客户展示串，如 ``王女士 · 138****8821``。"""
    name = (name or "").strip()
    if not contact:
        return name
    contact = contact.strip()
    digits = "".join(ch for ch in contact if ch.isdigit())
    if len(digits) >= 7:
        masked = f"{digits[:3]}****{digits[-4:]}"
    else:
        masked = contact[:2] + "****"
    return f"{name} · {masked}" if name else masked


def create_distribution(
    db: Session,
    payload: DistributionCreateIn,
    created_by: int | None,
) -> Distribution:
    """创建合集 + 明细 + 分发记录。

    Args:
        db: 数据库会话。
        payload: 新建分发请求体。
        created_by: 生成人用户 id。

    Returns:
        新建的 Distribution 实例（已 flush，含 id/token/expires_at）。

    Raises:
        BusinessError: 1001（video_ids 为空或包含不存在的视频）。
    """
    video_ids = list(dict.fromkeys(payload.video_ids))  # 去重且保留勾选顺序
    if not video_ids:
        raise BusinessError(CODE_PARAM_ERROR, "请至少选择 1 支视频")

    existing_ids = {
        row[0]
        for row in db.execute(select(Video.id).where(Video.id.in_(video_ids))).all()
    }
    missing = [vid for vid in video_ids if vid not in existing_ids]
    if missing:
        raise BusinessError(CODE_PARAM_ERROR, f"视频不存在：{missing}")

    now = datetime.now()
    collection = Collection(
        name=payload.collection_name,
        note=payload.note,
        created_by=created_by,
    )
    db.add(collection)
    db.flush()  # 取 collection.id

    # sort = 传入 video_ids 的顺序（= 后台勾选顺序，R15）
    for index, vid in enumerate(video_ids):
        db.add(CollectionItem(collection_id=collection.id, video_id=vid, sort=index))

    distribution = Distribution(
        collection_id=collection.id,
        token=token_service.generate(),
        customer_name=payload.customer_name,
        customer_contact=payload.customer_contact,
        duration_type=payload.duration_type,
        expires_at=compute_expires(payload.duration_type, payload.custom_expires_at, now),
        status="active",
        created_by=created_by,
    )
    db.add(distribution)
    db.commit()
    db.refresh(distribution)
    return distribution


def close_distribution(db: Session, distribution: Distribution) -> Distribution:
    """手动关闭分发（status=closed）。"""
    distribution.status = "closed"
    db.commit()
    db.refresh(distribution)
    return distribution


def regenerate_distribution(
    db: Session,
    distribution: Distribution,
    duration_type: str | None,
    custom_expires_at: datetime | None,
) -> Distribution:
    """重新生成 token 与有效期，复用客户信息（旧链接立即失效）。"""
    now = datetime.now()
    new_duration = duration_type or distribution.duration_type
    distribution.token = token_service.generate()
    distribution.duration_type = new_duration  # type: ignore[assignment]
    distribution.expires_at = compute_expires(new_duration, custom_expires_at, now)
    distribution.status = "active"
    db.commit()
    db.refresh(distribution)
    return distribution


def resolve_share(db: Session, token: str) -> ShareCollectionOut:
    """解析分享 token 并返回分享页数据（惰性判定过期）。

    Args:
        db: 数据库会话。
        token: 分享 token。

    Returns:
        ShareCollectionOut（**不含任何 customer_* 字段**）。

    Raises:
        BusinessError: 4001（token 不存在 / 已关闭 / 已过期）。
    """
    distribution = db.execute(
        select(Distribution).where(Distribution.token == token)
    ).scalar_one_or_none()
    if distribution is None:
        raise BusinessError(CODE_SHARE_INVALID, "该预览链接已失效，请联系摄影师重新获取")

    now = datetime.now()
    state = token_service.resolve(distribution.status, distribution.expires_at, now)
    if state != "active":
        # 惰性归档：将自然过期的记录落库为 expired（仅影响后台列表展示）
        if state == "expired" and distribution.status == "active":
            distribution.status = "expired"
            db.commit()
        raise BusinessError(CODE_SHARE_INVALID, "该预览链接已失效，请联系摄影师重新获取")

    collection = db.get(Collection, distribution.collection_id)
    if collection is None:
        raise BusinessError(CODE_SHARE_INVALID, "该预览链接已失效，请联系摄影师重新获取")

    rows: list[tuple[CollectionItem, Video]] = db.execute(
        select(CollectionItem, Video)
        .join(Video, CollectionItem.video_id == Video.id)
        .where(CollectionItem.collection_id == collection.id)
        .order_by(CollectionItem.sort.asc(), CollectionItem.id.asc())
    ).all()  # type: ignore[assignment]

    videos = [
        ShareVideoOut(
            title=video.title,
            cover_url=video.cover_url,
            bv_id=video.bv_id,
            year=video.year,
            category_id=video.category_id,
        )
        for _, video in rows
    ]

    return ShareCollectionOut(
        collection_name=collection.name,
        note=collection.note,
        generated_at=distribution.created_at or collection.created_at,
        videos=videos,
    )


def list_distributions(
    db: Session,
    status: str | None,
    page: int,
    size: int,
) -> tuple[int, list[dict[str, Any]]]:
    """查询分发列表（含脱敏客户、视频数、share_url、生成人名称）。

    ``created_by_name`` 通过一次 ``outerjoin(users)`` 取得，避免逐条查用户（N+1）；
    生成人为空或对应用户已删除时返回 ``None``。

    Returns:
        ``(total, items)``；items 为可直接返回给前端的字典列表。
    """
    now = datetime.now()
    query = (
        select(Distribution, Collection, User.name)
        .join(Collection, Distribution.collection_id == Collection.id)
        .outerjoin(User, Distribution.created_by == User.id)
    )
    if status:
        query = query.where(Distribution.status == status)

    all_rows = db.execute(query.order_by(Distribution.created_at.desc(), Distribution.id.desc())).all()
    total = len(all_rows)
    start = max(0, (page - 1) * size)
    rows = all_rows[start : start + size]

    items: list[dict[str, Any]] = []
    for distribution, collection, creator_name in rows:
        video_count = len(
            db.execute(
                select(CollectionItem.id).where(CollectionItem.collection_id == collection.id)
            ).all()
        )
        # 惰性判定：仅影响展示状态（自然过期展示为 expired）
        display_status = token_service.resolve(distribution.status, distribution.expires_at, now)
        items.append(
            {
                "id": distribution.id,
                "collection_id": collection.id,
                "collection_name": collection.name,
                "customer_masked": mask_customer(distribution.customer_name, distribution.customer_contact),
                "video_count": video_count,
                "created_at": distribution.created_at or collection.created_at,
                "duration_type": distribution.duration_type,
                "expires_at": distribution.expires_at,
                "status": display_status,
                "share_url": settings.share_url(distribution.token),
                "created_by": distribution.created_by,
                "created_by_name": creator_name,
            }
        )
    return total, items
