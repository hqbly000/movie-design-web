"""预约留言后台接口（/api/admin/leads）。

列表 viewer+；标记已回复 editor+。
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_role
from app.models.lead import Lead
from app.models.user import User
from app.utils.errors import CODE_PARAM_ERROR, BusinessError
from app.utils.response import ok

router = APIRouter(prefix="/api/admin", tags=["后台·预约留言"])


def _lead_to_dict(lead: Lead) -> dict:
    """留言 → 响应字典。"""
    return {
        "id": lead.id,
        "name": lead.name,
        "phone": lead.phone,
        "demand_type": lead.demand_type,
        "demand_date": lead.demand_date,
        "demand_note": lead.demand_note,
        "status": lead.status,
        "created_at": lead.created_at,
    }


@router.get("/leads", summary="留言列表")
def list_leads(
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    """分页查询留言，可按 status（unread/replied）筛选。"""
    filters = []
    if status:
        filters.append(Lead.status == status)

    total = db.scalar(select(func.count(Lead.id)).where(*filters)) or 0
    rows = db.execute(
        select(Lead)
        .where(*filters)
        .order_by(Lead.created_at.desc(), Lead.id.desc())
        .offset((page - 1) * size)
        .limit(size)
    ).scalars().all()

    return ok({"total": total, "page": page, "size": size, "items": [_lead_to_dict(r) for r in rows]})


@router.put("/leads/{lead_id}/reply", summary="标记已回复")
def reply_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("editor")),
) -> dict:
    """将留言标记为已回复。"""
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise BusinessError(CODE_PARAM_ERROR, "留言不存在")
    lead.status = "replied"
    db.commit()
    return ok({"id": lead.id, "status": lead.status})
