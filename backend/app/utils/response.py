"""统一响应包装。

所有接口返回结构固定为 ``{code, data, message}``：
- 成功：``{"code": 0, "data": ..., "message": "ok"}``
- 失败：``{"code": <错误码>, "data": null, "message": "<提示>"}``
"""

from __future__ import annotations

from typing import Any


def ok(data: Any = None, message: str = "ok") -> dict[str, Any]:
    """构造成功响应体。"""
    return {"code": 0, "data": data, "message": message}


def fail(code: int, message: str, data: Any = None) -> dict[str, Any]:
    """构造失败响应体。"""
    return {"code": code, "data": data, "message": message}
