"""业务异常与全局异常处理器。

错误码表（与 architecture.md §3.1 严格一致）：

| 错误码 | 含义 |
|---|---|
| 0    | 成功 |
| 1001 | 参数校验失败 |
| 1002 | 未登录 / token 无效或过期 |
| 1003 | 权限不足 |
| 1004 | 登录失败 |
| 2001 | BV 号格式错误 |
| 2002 | BV 解析失败 |
| 2003 | BV 号已存在 |
| 3001 | 荣誉数量超上限 |
| 3002 | 固定数量约束（hero_slides / segments） |
| 4001 | 分享链接无效 / 已失效 |
| 5000 | 服务器内部错误 |
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.utils.response import fail

logger = logging.getLogger("lightisle")

# ---------------- 错误码常量 ----------------
CODE_OK = 0
CODE_PARAM_ERROR = 1001
CODE_UNAUTHORIZED = 1002
CODE_FORBIDDEN = 1003
CODE_LOGIN_FAILED = 1004
CODE_BV_FORMAT = 2001
CODE_BV_PARSE_FAILED = 2002
CODE_BV_DUPLICATE = 2003
CODE_HONOR_LIMIT = 3001
CODE_FIXED_COUNT = 3002
CODE_SHARE_INVALID = 4001
CODE_SERVER_ERROR = 5000

# 错误码 → HTTP 状态码映射。
# 说明：参数/业务错误统一返回 HTTP 200（前端统一读 body 中的 code）；
# 仅鉴权失败(1002→401) / 权限不足(1003→403) 使用对应 HTTP 语义状态，
# 以便前端拦截器能自动处理登录过期。
ERROR_HTTP_STATUS: dict[int, int] = {
    CODE_PARAM_ERROR: 200,
    CODE_UNAUTHORIZED: 401,
    CODE_FORBIDDEN: 403,
    CODE_LOGIN_FAILED: 200,
    CODE_BV_FORMAT: 200,
    CODE_BV_PARSE_FAILED: 200,
    CODE_BV_DUPLICATE: 200,
    CODE_HONOR_LIMIT: 200,
    CODE_FIXED_COUNT: 200,
    CODE_SHARE_INVALID: 200,
    CODE_SERVER_ERROR: 500,
}


def http_status_for(code: int) -> int:
    """根据业务错误码返回对应 HTTP 状态码（默认 200）。"""
    return ERROR_HTTP_STATUS.get(code, 200)


class BusinessError(Exception):
    """业务异常。

    Attributes:
        code: 业务错误码（见模块顶部错误码表）。
        message: 面向用户的提示文案。
        data: 可选的附加数据（例如 parse-bv 失败时回传 bv_id）。
        http_status: 覆盖默认 HTTP 状态码，None 时按 code 推导。
    """

    def __init__(
        self,
        code: int,
        message: str,
        data: Any = None,
        http_status: int | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.data = data
        self.http_status = http_status if http_status is not None else http_status_for(code)


def register_exception_handlers(app: FastAPI) -> None:
    """在 FastAPI 实例上注册全局异常处理器。"""

    @app.exception_handler(BusinessError)
    async def _handle_business_error(_: Request, exc: BusinessError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.http_status,
            content=fail(exc.code, exc.message, exc.data),
        )

    @app.exception_handler(RequestValidationError)
    async def _handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        # Pydantic 请求校验失败 → 1001。
        # 干净两态契约：
        #   - data 非 null 且 field 为字符串字段名 → 字段级提示；
        #   - data 为 null 或 field 为 null      → 通用提示。
        # 非字段级错误（如 JSON 解析失败 type=json_invalid、或 loc 首段非字段名）
        # 统一把 field 规范为 null，避免前端拿到「像字段名的位置数字」。
        # 对 body / query / path 三类校验保持同一规则。
        errors = exc.errors()
        first = errors[0] if errors else {}
        err_type = first.get("type")
        loc_parts = [
            p for p in first.get("loc", []) if p not in ("body", "query", "path", "header", "cookie")
        ]
        field: str | None = None
        if err_type != "json_invalid" and loc_parts and isinstance(loc_parts[0], str):
            field = ".".join(str(p) for p in loc_parts)
        detail = first.get("msg", "参数校验失败")
        return JSONResponse(
            status_code=200,
            content=fail(
                CODE_PARAM_ERROR,
                "参数校验失败",
                {"field": field, "detail": detail},
            ),
        )

    @app.exception_handler(StarletteHTTPException)
    async def _handle_http_exception(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        # 将框架级 HTTP 异常也包装成统一结构；401/403 使用对应语义状态码
        code = CODE_UNAUTHORIZED if exc.status_code == 401 else (
            CODE_FORBIDDEN if exc.status_code == 403 else CODE_PARAM_ERROR
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=fail(code, str(exc.detail)),
        )

    @app.exception_handler(Exception)
    async def _handle_unexpected(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled server error: %s", exc)
        return JSONResponse(
            status_code=500,
            content=fail(CODE_SERVER_ERROR, "服务器内部错误"),
        )
