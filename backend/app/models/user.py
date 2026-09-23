"""用户模型（users 表）。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Enum, String, func, text
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    """后台成员账号。"""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(32), nullable=False, comment="成员姓名")
    email: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, comment="登录账号")
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False, comment="bcrypt 哈希")
    role: Mapped[str] = mapped_column(
        Enum("admin", "editor", "viewer", name="users_role"),
        nullable=False,
        default="viewer",
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
    )
