"""荣誉条目后台接口（/api/admin/honors）。写操作需 editor+。

业务约束：最多 6 条，新增第 7 条 → 3001。
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_role
from app.models.honor import Honor
from app.models.user import User
from app.routers.public import invalidate_site_cache
from app.schemas.honor import HonorIn
from app.utils.errors import CODE_HONOR_LIMIT, CODE_PARAM_ERROR, BusinessError
from app.utils.response import ok

router = APIRouter(prefix="/api/admin", tags=["后台·荣誉条目"])

HONOR_LIMIT = 6
HONOR_LIMIT_MESSAGE = "展厅仅展示 6 条，请先删除或调整"


def _honor_to_dict(honor: Honor) -> dict:
    """荣誉项 → 响应字典。"""
    return {
        "id": honor.id,
        "title": honor.title,
        "description": honor.description,
        "issuer": honor.issuer,
        "level": honor.level,
        "sort": honor.sort,
    }


@router.get("/honors", summary="荣誉列表")
def list_honors(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    """返回荣誉列表（按 sort 倒序维护，展示按 sort 升序）。"""
    rows = db.execute(select(Honor).order_by(Honor.sort.asc(), Honor.id.asc())).scalars().all()
    return ok([_honor_to_dict(row) for row in rows])


@router.post("/honors", summary="新增荣誉")
def create_honor(
    payload: HonorIn,
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("editor")),
) -> dict:
    """新增荣誉；已达上限 → 3001。"""
    total = db.scalar(select(func.count(Honor.id))) or 0
    if total >= HONOR_LIMIT:
        raise BusinessError(CODE_HONOR_LIMIT, HONOR_LIMIT_MESSAGE)

    max_sort = db.scalar(select(func.max(Honor.sort)))
    honor = Honor(
        title=payload.title,
        description=payload.description,
        issuer=payload.issuer,
        level=payload.level,
        sort=(int(max_sort) + 1) if max_sort is not None else 0,
    )
    db.add(honor)
    db.commit()
    db.refresh(honor)
    invalidate_site_cache()
    return ok({"id": honor.id})


@router.put("/honors/{honor_id}", summary="编辑荣誉")
def update_honor(
    honor_id: int,
    payload: HonorIn,
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("editor")),
) -> dict:
    """编辑荣誉。"""
    honor = db.get(Honor, honor_id)
    if honor is None:
        raise BusinessError(CODE_PARAM_ERROR, "荣誉条目不存在")

    honor.title = payload.title
    honor.description = payload.description
    honor.issuer = payload.issuer
    honor.level = payload.level
    db.commit()
    invalidate_site_cache()
    return ok({"id": honor.id})


@router.delete("/honors/{honor_id}", summary="删除荣誉")
def delete_honor(
    honor_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("editor")),
) -> dict:
    """删除荣誉。"""
    honor = db.get(Honor, honor_id)
    if honor is None:
        raise BusinessError(CODE_PARAM_ERROR, "荣誉条目不存在")
    db.delete(honor)
    db.commit()
    invalidate_site_cache()
    return ok({})
