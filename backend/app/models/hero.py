"""首屏轮播模型（hero_slides 表，恰好 3 条）。"""

from __future__ import annotations

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.mysql import BIGINT, TINYINT
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class HeroSlide(Base):
    """首屏轮播条目（业务约束：恰好 3 条，sort 0/1/2 唯一）。"""

    __tablename__ = "hero_slides"

    id: Mapped[int] = mapped_column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    image_id: Mapped[int | None] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("assets.id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )
    image_url: Mapped[str] = mapped_column(String(255), nullable=False)
    slogan: Mapped[str] = mapped_column(String(32), nullable=False)
    sub_slogan: Mapped[str | None] = mapped_column(String(64), nullable=True)
    sort: Mapped[int] = mapped_column(TINYINT, nullable=False, default=0, unique=True)
