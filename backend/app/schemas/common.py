"""通用 Pydantic 模型：统一响应与分页结果。"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class ApiResponse(BaseModel):
    """统一响应结构 ``{code, data, message}``。"""

    code: int = 0
    data: Any = None
    message: str = "ok"


class PageResult(BaseModel):
    """分页结果结构。"""

    total: int
    page: int
    size: int
    items: list[Any]
