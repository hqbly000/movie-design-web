"""业务板块模型（segments / segment_items 表）。"""

from __future__ import annotations

from sqlalchemy import Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.mysql import BIGINT, TINYINT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Segment(Base):
    """业务板块（业务约束：恰好 5 条，sort 0~4 唯一）。"""

    __tablename__ = "segments"

    id: Mapped[int] = mapped_column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(32), nullable=False)
    preview_image_id: Mapped[int | None] = mapped_column(BIGINT(unsigned=True), nullable=True)
    preview_image_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    content_type: Mapped[str] = mapped_column(
        Enum("video", "gallery", "article", name="segments_content_type"),
        nullable=False,
        default="video",
    )
    sort: Mapped[int] = mapped_column(TINYINT, nullable=False, default=0, unique=True)

    items: Mapped[list["SegmentItem"]] = relationship(
        back_populates="segment",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="SegmentItem.sort",
    )


class SegmentItem(Base):
    """板块内容清单（视频/图片/文章）。"""

    __tablename__ = "segment_items"
    __table_args__ = (
        UniqueConstraint("segment_id", "target_type", "target_id", name="uk_seg_target"),
    )

    id: Mapped[int] = mapped_column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    segment_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("segments.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    target_type: Mapped[str] = mapped_column(
        Enum("video", "asset", "article", name="segment_items_target_type"),
        nullable=False,
        default="video",
    )
    target_id: Mapped[int] = mapped_column(BIGINT(unsigned=True), nullable=False)
    sort: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    segment: Mapped[Segment] = relationship(back_populates="items")
