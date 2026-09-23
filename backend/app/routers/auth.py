"""鉴权路由（/api/auth）。"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.auth import LoginIn, MeOut, UserBriefOut
from app.security import create_access_token, verify_password
from app.utils.errors import CODE_LOGIN_FAILED, BusinessError
from app.utils.response import ok

router = APIRouter(prefix="/api/auth", tags=["鉴权"])


@router.post("/login", summary="登录")
def login(payload: LoginIn, db: Session = Depends(get_db)) -> dict:
    """校验邮箱与密码，签发 JWT 并写入最后登录时间。"""
    user = db.execute(
        select(User).where(User.email == str(payload.email))
    ).scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise BusinessError(CODE_LOGIN_FAILED, "邮箱或密码错误")

    user.last_login_at = datetime.now()
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.role)
    return ok(
        {
            "token": token,
            "user": UserBriefOut.model_validate(user).model_dump(),
        }
    )


@router.get("/me", summary="获取当前用户")
def me(current_user: User = Depends(get_current_user)) -> dict:
    """返回当前登录用户信息。"""
    return ok(MeOut.model_validate(current_user).model_dump())


@router.post("/logout", summary="登出")
def logout(current_user: User = Depends(get_current_user)) -> dict:
    """登出（JWT 无状态，前端清除本地 token 即可）。"""
    return ok({})
