"""图片素材模型（asset_groups / assets 表）。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AssetGroup(Base):
    """图集分组。"""

    __tablename__ = "asset_groups"

    id: Mapped[int] = mapped_column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    type: Mapped[str] = mapped_column(
        Enum("hero", "segment_preview", "gallery", name="asset_groups_type"),
        nullable=False,
        default="gallery",
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    assets: Mapped[list["Asset"]] = relationship(
        back_populates="group",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Asset(Base):
    """图片素材。``url`` 存相对路径（如 /uploads/cover/xxx.png）。"""

    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    group_id: Mapped[int | None] = mapped_column(
        BIGINT(unsigned=True),
        ForeignKey("asset_groups.id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )
    url: Mapped[str] = mapped_column(String(255), nullable=False)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sort: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    group: Mapped[AssetGroup | None] = relationship(back_populates="assets")
