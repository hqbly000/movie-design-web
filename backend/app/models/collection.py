"""临时合集模型（collections / collection_items 表）。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Collection(Base):
    """临时合集（R15）。"""

    __tablename__ = "collections"

    id: Mapped[int] = mapped_column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int | None] = mapped_column(BIGINT(unsigned=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    items: Mapped[list["CollectionItem"]] = relationship(
        back_populates="collection",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="CollectionItem.sort",
    )


class CollectionItem(Base):
    """合集视频明细。``sort`` = 后台勾选顺序（R15）。"""

    __tablename__ = "collection_items"
    __table_args__ = (
        UniqueConstraint("collection_id", "video_id", name="uk_coll_video"),
    )

    id: Mapped[int] = mapped_column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    collection_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("collections.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    video_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("videos.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    sort: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    collection: Mapped[Collection] = relationship(back_populates="items")
