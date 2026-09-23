"""分发记录模型（distributions 表，限时分享链接）。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, func
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.collection import Collection


class Distribution(Base):
    """分发记录。``customer_*`` 仅后台可见，绝不输出到分享页。"""

    __tablename__ = "distributions"
    __table_args__ = (
        Index("idx_dist_status", "status"),
        Index("idx_dist_expires", "expires_at"),
        Index("idx_dist_coll", "collection_id"),
    )

    id: Mapped[int] = mapped_column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    collection_id: Mapped[int] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("collections.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    customer_name: Mapped[str] = mapped_column(String(64), nullable=False)
    customer_contact: Mapped[str | None] = mapped_column(String(64), nullable=True)
    duration_type: Mapped[str] = mapped_column(
        Enum("30m", "1h", "6h", "1d", "3d", "custom", name="distributions_duration_type"),
        nullable=False,
        default="1h",
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("active", "closed", "expired", name="distributions_status"),
        nullable=False,
        default="active",
    )
    created_by: Mapped[int | None] = mapped_column(BIGINT(unsigned=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    collection: Mapped[Collection] = relationship()
