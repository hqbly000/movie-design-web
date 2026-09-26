"""公司介绍管理 Pydantic 模型。"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class CompanyProfileOut(BaseModel):
    """公司介绍详情。"""

    model_config = ConfigDict(from_attributes=True)

    section_title: str
    company_name: str
    founded_year: int
    intro_text: str | None = None
    long_intro: str | None = None


class CompanyProfileIn(BaseModel):
    """公司介绍保存请求体。"""

    section_title: str = Field(default="公司介绍", min_length=1, max_length=32)
    company_name: str = Field(min_length=1, max_length=64)
    founded_year: int = Field(ge=1900, le=2100)
    intro_text: str | None = Field(default=None, max_length=2000)
    long_intro: str | None = Field(default=None, max_length=16000)
