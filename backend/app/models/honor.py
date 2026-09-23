"""荣誉条目模型（honors 表，最多 6 条）。"""

from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.dialects.mysql import BIGINT, TINYINT
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Honor(Base):
    """荣誉条目（业务约束：最多 6 条，由 Service 校验）。"""

    __tablename__ = "honors"

    id: Mapped[int] = mapped_column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str | None] = mapped_column(String(160), nullable=True)
    issuer: Mapped[str] = mapped_column(String(96), nullable=False)
    level: Mapped[str] = mapped_column(String(16), nullable=False)
    sort: Mapped[int] = mapped_column(TINYINT, nullable=False, default=0)
