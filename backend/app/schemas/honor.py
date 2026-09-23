"""荣誉条目管理 Pydantic 模型。"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class HonorOut(BaseModel):
    """荣誉条目详情。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None = None
    issuer: str
    level: str
    sort: int


class HonorIn(BaseModel):
    """新增/编辑荣誉请求体。"""

    title: str = Field(min_length=1, max_length=24)
    description: str | None = Field(default=None, max_length=60)
    issuer: str = Field(min_length=1, max_length=96)
    level: str = Field(min_length=1, max_length=16)
