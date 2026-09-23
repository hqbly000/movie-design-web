"""工作台统计接口（/api/admin/dashboard/stats）。viewer+ 可见。"""

from __future__ import annotations

from datetime import datetime, time, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.distribution import Distribution
from app.models.lead import Lead
from app.models.user import User
from app.models.video import Video
from app.utils.response import ok

router = APIRouter(prefix="/api/admin", tags=["后台·工作台"])


def _video_brief(video: Video, uploader: str | None) -> dict:
    """最近上传条目摘要。"""
    return {
        "id": video.id,
        "title": video.title,
        "bv_id": video.bv_id,
        "category_id": video.category_id,
        "year": video.year,
        "cover_url": video.cover_url,
        "status": video.status,
        "created_by_name": uploader,
        "created_at": video.created_at,
    }


def _lead_brief(lead: Lead) -> dict:
    """最近留言条目摘要。"""
    return {
        "id": lead.id,
        "name": lead.name,
        "phone": lead.phone,
        "demand_note": lead.demand_note,
        "status": lead.status,
        "created_at": lead.created_at,
    }


@router.get("/dashboard/stats", summary="工作台统计")
def dashboard_stats(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    """返回工作台所需的全部统计数据。"""
    now = datetime.now()
    today_start = datetime.combine(now.date(), time.min)
    tomorrow_start = today_start + timedelta(days=1)
    yesterday_start = today_start - timedelta(days=1)

    today_leads = db.scalar(
        select(func.count(Lead.id)).where(
            Lead.created_at >= today_start, Lead.created_at < tomorrow_start
        )
    ) or 0
    yesterday_leads = db.scalar(
        select(func.count(Lead.id)).where(
            Lead.created_at >= yesterday_start, Lead.created_at < today_start
        )
    ) or 0

    video_total = db.scalar(select(func.count(Video.id))) or 0
    month_start = datetime(now.year, now.month, 1)
    if now.month == 12:
        next_month_start = datetime(now.year + 1, 1, 1)
    else:
        next_month_start = datetime(now.year, now.month + 1, 1)
    video_added_this_month = db.scalar(
        select(func.count(Video.id)).where(
            Video.created_at >= month_start, Video.created_at < next_month_start
        )
    ) or 0

    active_share = db.scalar(
        select(func.count(Distribution.id)).where(
            Distribution.status == "active", Distribution.expires_at > now
        )
    ) or 0
    expiring_within_7d = db.scalar(
        select(func.count(Distribution.id)).where(
            Distribution.status == "active",
            Distribution.expires_at > now,
            Distribution.expires_at <= now + timedelta(days=7),
        )
    ) or 0

    recent_rows = db.execute(
        select(Video, User.name)
        .outerjoin(User, Video.created_by == User.id)
        .order_by(Video.created_at.desc(), Video.id.desc())
        .limit(3)
    ).all()
    recent_uploads = [_video_brief(video, name) for video, name in recent_rows]

    recent_lead_rows = db.execute(
        select(Lead).order_by(Lead.created_at.desc(), Lead.id.desc()).limit(3)
    ).scalars().all()
    recent_leads = [_lead_brief(lead) for lead in recent_lead_rows]

    return ok(
        {
            "today_leads": today_leads,
            "today_leads_delta": today_leads - yesterday_leads,
            "video_total": video_total,
            "video_added_this_month": video_added_this_month,
            "active_share": active_share,
            "expiring_within_7d": expiring_within_7d,
            "recent_uploads": recent_uploads,
            "recent_leads": recent_leads,
        }
    )
