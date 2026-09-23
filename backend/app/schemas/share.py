"""分享页 Pydantic 模型。

⚠️ 硬性要求：分享页响应结构**绝不能包含** customer_name / customer_contact。
本模块的 Out 模型中不存在这两个字段，从数据结构上杜绝泄露。
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class ShareVideoOut(BaseModel):
    """分享页视频项（仅 5 个字段）。"""

    title: str
    cover_url: str | None = None
    bv_id: str
    year: int | None = None
    category_id: str | None = None


class ShareCollectionOut(BaseModel):
    """分享页合集信息（无任何客户字段）。"""

    collection_name: str
    note: str | None = None
    generated_at: datetime | None = None
    videos: list[ShareVideoOut]
