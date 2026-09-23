"""分发记录 Pydantic 模型。"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

DurationLiteral = Literal["30m", "1h", "6h", "1d", "3d", "custom"]


class DistributionCreateIn(BaseModel):
    """新建分发请求体。"""

    collection_name: str = Field(min_length=1, max_length=20)
    customer_name: str = Field(min_length=1, max_length=20)
    customer_contact: str | None = Field(default=None, max_length=64)
    duration_type: DurationLiteral = "1h"
    custom_expires_at: datetime | None = None
    note: str | None = Field(default=None, max_length=500)
    video_ids: list[int] = Field(min_length=1)


class DistributionCreateOut(BaseModel):
    """新建分发响应。"""

    id: int
    token: str
    share_url: str
    expires_at: datetime


class DistributionRegenerateIn(BaseModel):
    """重新生成请求体（字段均可选）。"""

    duration_type: DurationLiteral | None = None
    custom_expires_at: datetime | None = None


class DistributionOut(BaseModel):
    """分发列表项（客户信息脱敏）。"""

    id: int
    collection_id: int
    collection_name: str
    customer_masked: str
    video_count: int
    created_at: datetime | None = None
    duration_type: str
    expires_at: datetime
    status: str
    share_url: str
    created_by: int | None = None
    created_by_name: str | None = None
