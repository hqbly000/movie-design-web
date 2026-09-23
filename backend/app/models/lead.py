"""预约留言模型（leads 表）。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Enum, String, func
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Lead(Base):
    """官网预约留言。"""

    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    demand_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    demand_date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    demand_note: Mapped[str | None] = mapped_column(String(400), nullable=True)
    status: Mapped[str] = mapped_column(
        Enum("unread", "replied", name="leads_status"),
        nullable=False,
        default="unread",
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
