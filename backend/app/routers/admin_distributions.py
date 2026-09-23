"""合集分发后台接口（/api/admin/distributions）。

写操作需 editor+。
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user, require_role
from app.models.distribution import Distribution
from app.models.user import User
from app.schemas.distribution import DistributionCreateIn, DistributionRegenerateIn
from app.services import distribution as distribution_service
from app.utils.errors import CODE_PARAM_ERROR, BusinessError
from app.utils.response import ok

router = APIRouter(prefix="/api/admin", tags=["后台·合集分发"])


@router.get("/distributions", summary="分发列表")
def list_distributions(
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    """分页返回分发记录，客户信息脱敏，含 share_url。"""
    total, items = distribution_service.list_distributions(db, status, page, size)
    return ok({"total": total, "page": page, "size": size, "items": items})


@router.post("/distributions", summary="新建分发")
def create_distribution(
    payload: DistributionCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("editor")),
) -> dict:
    """创建合集 + 明细 + 分发记录，返回 token 与分享地址。"""
    distribution = distribution_service.create_distribution(db, payload, current_user.id)
    return ok(
        {
            "id": distribution.id,
            "token": distribution.token,
            "share_url": settings.share_url(distribution.token),
            "expires_at": distribution.expires_at,
        }
    )


@router.post("/distributions/{distribution_id}/close", summary="关闭分发")
def close_distribution(
    distribution_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("editor")),
) -> dict:
    """手动关闭分发（status=closed，链接立即失效）。"""
    distribution = db.get(Distribution, distribution_id)
    if distribution is None:
        raise BusinessError(CODE_PARAM_ERROR, "分发记录不存在")
    distribution_service.close_distribution(db, distribution)
    return ok({"id": distribution.id, "status": distribution.status})


@router.post("/distributions/{distribution_id}/regenerate", summary="重新生成链接")
def regenerate_distribution(
    distribution_id: int,
    payload: DistributionRegenerateIn,
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("editor")),
) -> dict:
    """生成新 token 与新有效期，复用客户信息（旧链接立即失效）。"""
    distribution = db.get(Distribution, distribution_id)
    if distribution is None:
        raise BusinessError(CODE_PARAM_ERROR, "分发记录不存在")

    updated = distribution_service.regenerate_distribution(
        db,
        distribution,
        payload.duration_type,
        payload.custom_expires_at,
    )
    return ok(
        {
            "id": updated.id,
            "token": updated.token,
            "share_url": settings.share_url(updated.token),
            "expires_at": updated.expires_at,
            "status": updated.status,
        }
    )
