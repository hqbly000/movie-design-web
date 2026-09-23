"""FastAPI 依赖：数据库会话、当前用户、角色守卫。"""

from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.security import decode_token
from app.utils.errors import CODE_FORBIDDEN, CODE_UNAUTHORIZED, BusinessError

# auto_error=False：缺失 token 时自行抛出业务错误码 1002，保证响应结构统一
bearer_scheme = HTTPBearer(auto_error=False)

# 角色权限等级：数值越大权限越高
ROLE_RANK: dict[str, int] = {"viewer": 1, "editor": 2, "admin": 3}


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """解析 Bearer Token 并返回当前用户。

    Args:
        credentials: HTTP Bearer 凭据。
        db: 数据库会话。

    Returns:
        当前登录用户。

    Raises:
        BusinessError: 1002（未登录 / token 无效或过期）。
    """
    if credentials is None or not credentials.credentials:
        raise BusinessError(CODE_UNAUTHORIZED, "未登录或登录已过期，请重新登录")

    try:
        payload = decode_token(credentials.credentials)
    except JWTError as exc:  # 签名错误 / 过期 / 格式非法
        raise BusinessError(CODE_UNAUTHORIZED, "登录凭证无效或已过期，请重新登录") from exc

    sub = payload.get("sub")
    if sub is None:
        raise BusinessError(CODE_UNAUTHORIZED, "登录凭证无效，请重新登录")

    try:
        user_id = int(sub)
    except (TypeError, ValueError) as exc:
        raise BusinessError(CODE_UNAUTHORIZED, "登录凭证无效，请重新登录") from exc

    user = db.get(User, user_id)
    if user is None:
        raise BusinessError(CODE_UNAUTHORIZED, "账号不存在或已被移除")
    return user


def require_role(*roles: str) -> Callable[[User], User]:
    """生成角色守卫依赖。

    传入允许的最小角色集合，按 ``ROLE_RANK`` 做等级判定（高角色自动通过）。
    例：``require_role("editor")`` 允许 admin/editor；``require_role("admin")`` 仅 admin。

    Args:
        *roles: 允许的角色字面量。

    Returns:
        依赖函数，返回通过校验的当前用户。
    """

    min_rank = min(ROLE_RANK.get(r, 99) for r in roles) if roles else 99

    def _guard(current_user: User = Depends(get_current_user)) -> User:
        if ROLE_RANK.get(current_user.role, 0) < min_rank:
            raise BusinessError(CODE_FORBIDDEN, "当前角色无权执行此操作")
        return current_user

    return _guard
