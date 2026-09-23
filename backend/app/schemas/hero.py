"""首页首屏管理 Pydantic 模型。"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class HeroSlideOut(BaseModel):
    """首屏轮播项（后台）。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    image_id: int | None = None
    image_url: str
    slogan: str
    sub_slogan: str | None = None
    sort: int


class HeroSlideIn(BaseModel):
    """首屏轮播保存项。"""

    id: int
    image_url: str = Field(min_length=1, max_length=255)
    slogan: str = Field(min_length=1, max_length=12)
    sub_slogan: str | None = Field(default=None, max_length=30)
    sort: int = Field(ge=0, le=2)


class HeroSlidesSaveIn(BaseModel):
    """首屏批量保存请求体（恰好 3 条）。"""

    slides: list[HeroSlideIn] = Field(min_length=1)
