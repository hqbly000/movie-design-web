"""合集 Pydantic 模型。"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CollectionOut(BaseModel):
    """合集详情。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    note: str | None = None
    created_by: int | None = None
    created_at: datetime | None = None
    video_ids: list[int] = []
