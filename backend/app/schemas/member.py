"""成员管理 Pydantic 模型。"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

RoleLiteral = Literal["admin", "editor", "viewer"]


class MemberOut(BaseModel):
    """成员列表项。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: str
    last_login_at: datetime | None = None
    created_at: datetime | None = None


class MemberCreateIn(BaseModel):
    """邀请成员请求体。"""

    name: str = Field(min_length=1, max_length=32)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    role: RoleLiteral = "viewer"


class MemberUpdateIn(BaseModel):
    """编辑成员请求体（字段均可选）。"""

    name: str | None = Field(default=None, min_length=1, max_length=32)
    role: RoleLiteral | None = None
    password: str | None = Field(default=None, min_length=6, max_length=128)
