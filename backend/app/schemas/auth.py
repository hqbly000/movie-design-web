"""鉴权相关 Pydantic 模型。"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginIn(BaseModel):
    """登录请求体。"""

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserBriefOut(BaseModel):
    """用户简要信息。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: str


class LoginOut(BaseModel):
    """登录响应。"""

    token: str
    user: UserBriefOut


class MeOut(BaseModel):
    """当前用户信息。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: str
    last_login_at: datetime | None = None
