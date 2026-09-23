"""官网公开接口 Pydantic 模型（/api/public）。"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class HeroSlideOut(BaseModel):
    """首屏轮播项。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    image_url: str
    slogan: str
    sub_slogan: str | None = None
    sort: int


class CompanyProfileOut(BaseModel):
    """公司介绍。"""

    model_config = ConfigDict(from_attributes=True)

    section_title: str
    company_name: str
    founded_year: int
    intro_text: str | None = None


class SegmentOut(BaseModel):
    """业务板块（含内容数量）。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    preview_image_url: str | None = None
    content_type: str
    sort: int
    item_count: int = 0


class HonorOut(BaseModel):
    """荣誉条目。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None = None
    issuer: str
    level: str
    sort: int


class SiteDataOut(BaseModel):
    """首页聚合配置。"""

    hero_slides: list[HeroSlideOut]
    company_profile: CompanyProfileOut | None = None
    segments: list[SegmentOut]
    honors: list[HonorOut]
    site_settings: dict[str, str | None]


class SegmentVideoOut(BaseModel):
    """板块作品项（仅已发布）。"""

    id: int
    title: str
    bv_id: str
    category_id: str | None = None
    year: int | None = None
    cover_url: str | None = None
    sort: int


class SegmentVideosOut(BaseModel):
    """某板块作品列表响应。"""

    segment_id: int
    name: str
    content_type: str
    videos: list[SegmentVideoOut]
