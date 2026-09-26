"""业务板块管理 Pydantic 模型。"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ContentTypeLiteral = Literal["video", "gallery", "article"]
TargetTypeLiteral = Literal["video", "asset", "article"]


class SegmentOut(BaseModel):
    """业务板块详情（后台，含已选清单）。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    preview_image_id: int | None = None
    preview_image_url: str | None = None
    content_type: str
    body: str | None = None
    sort: int
    item_ids: list[int] = []
    item_count: int = 0


class SegmentUpdateIn(BaseModel):
    """编辑板块请求体。"""

    name: str = Field(min_length=1, max_length=6)
    preview_image_url: str | None = Field(default=None, max_length=255)
    content_type: ContentTypeLiteral = "video"
    # article 正文 / 其他类型的板块简介（空行分段，前端按轻格式渲染）
    body: str | None = Field(default=None, max_length=8000)
    item_ids: list[int] = Field(default_factory=list)
    item_type: TargetTypeLiteral | None = None


class SegmentOrderIn(BaseModel):
    """板块排序请求体（恰好 5 个 id）。"""

    ids: list[int] = Field(min_length=1)
