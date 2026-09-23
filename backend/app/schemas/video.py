"""视频库与上传 Pydantic 模型。"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

StatusLiteral = Literal["draft", "published"]


class VideoOut(BaseModel):
    """视频列表/详情项。"""

    id: int
    title: str
    bv_id: str
    category_id: str | None = None
    year: int | None = None
    cover_url: str | None = None
    status: str
    sort: int
    created_by: int | None = None
    created_by_name: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class VideoCreateIn(BaseModel):
    """新增视频请求体。"""

    title: str = Field(min_length=1, max_length=40)
    bv_id: str = Field(min_length=1, max_length=20)
    category_id: str | None = Field(default=None, max_length=32)
    year: int | None = Field(default=None, ge=2015, le=2100)
    cover_url: str | None = Field(default=None, max_length=255)
    status: StatusLiteral = "draft"


class VideoUpdateIn(BaseModel):
    """编辑视频请求体（字段均可选）。"""

    title: str | None = Field(default=None, min_length=1, max_length=40)
    bv_id: str | None = Field(default=None, min_length=1, max_length=20)
    category_id: str | None = Field(default=None, max_length=32)
    year: int | None = Field(default=None, ge=2015, le=2100)
    cover_url: str | None = Field(default=None, max_length=255)
    status: StatusLiteral | None = None


class ParseBvIn(BaseModel):
    """BV 解析请求体。"""

    input: str = Field(min_length=1, max_length=500)


class ParseBvOut(BaseModel):
    """BV 解析结果。"""

    bv_id: str
    title: str | None = None
    cover_url: str | None = None


class UploadOut(BaseModel):
    """上传结果。"""

    url: str
    width: int | None = None
    height: int | None = None
