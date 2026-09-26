"""公司介绍模型（company_profile 表，单行）。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, String, Text, func, text
from sqlalchemy.dialects.mysql import BIGINT, SMALLINT
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CompanyProfile(Base):
    """公司介绍（单行）。展示年限 = 当年 - founded_year，前端计算。"""

    __tablename__ = "company_profile"

    id: Mapped[int] = mapped_column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    section_title: Mapped[str] = mapped_column(String(32), nullable=False, default="公司介绍")
    company_name: Mapped[str] = mapped_column(String(64), nullable=False)
    founded_year: Mapped[int] = mapped_column(SMALLINT, nullable=False, default=2017)
    intro_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 公司详情遮罩长文（首页摘要区仍用 intro_text）
    long_intro: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_by: Mapped[int | None] = mapped_column(BIGINT(unsigned=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
    )
