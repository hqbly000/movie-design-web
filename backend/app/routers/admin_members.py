"""账号与权限后台接口（/api/admin/members）。

仅 admin 可访问；editor/viewer 访问 → 1003。
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_role
from app.models.user import User
from app.schemas.member import MemberCreateIn, MemberUpdateIn
from app.security import hash_password
from app.utils.errors import CODE_PARAM_ERROR, BusinessError
from app.utils.response import ok

router = APIRouter(prefix="/api/admin", tags=["后台·账号与权限"])

# 所有成员接口统一要求 admin 角色
_admin_guard = require_role("admin")


def _member_to_dict(user: User) -> dict:
    """成员 → 响应字典。"""
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "last_login_at": user.last_login_at,
        "created_at": user.created_at,
    }


@router.get("/members", summary="成员列表")
def list_members(
    db: Session = Depends(get_db),
    _user: User = Depends(_admin_guard),
) -> dict:
    """返回全部成员（含最近登录时间）。"""
    rows = db.execute(select(User).order_by(User.id.asc())).scalars().all()
    return ok([_member_to_dict(row) for row in rows])


@router.post("/members", summary="邀请成员")
def create_member(
    payload: MemberCreateIn,
    db: Session = Depends(get_db),
    _user: User = Depends(_admin_guard),
) -> dict:
    """新增成员；邮箱重复 → 1001。"""
    email = str(payload.email).strip().lower()
    exists = db.scalar(select(User.id).where(User.email == email))
    if exists:
        raise BusinessError(CODE_PARAM_ERROR, "该邮箱已被使用")

    user = User(
        name=payload.name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return ok({"id": user.id})


@router.put("/members/{member_id}", summary="编辑成员")
def update_member(
    member_id: int,
    payload: MemberUpdateIn,
    db: Session = Depends(get_db),
    _user: User = Depends(_admin_guard),
) -> dict:
    """编辑成员姓名/角色/重置密码（字段均可选）。"""
    user = db.get(User, member_id)
    if user is None:
        raise BusinessError(CODE_PARAM_ERROR, "成员不存在")

    if payload.name is not None:
        user.name = payload.name.strip()
    if payload.role is not None:
        user.role = payload.role
    if payload.password:
        user.password_hash = hash_password(payload.password)

    db.commit()
    db.refresh(user)
    return ok({"id": user.id})
