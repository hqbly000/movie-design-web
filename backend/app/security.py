"""安全模块：密码哈希与 JWT 签发/校验。"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

# bcrypt 上下文；passlib 读取 bcrypt 版本时会告警，属正常现象
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """对明文密码做 bcrypt 哈希。

    Args:
        plain_password: 明文密码。

    Returns:
        bcrypt 哈希字符串（含盐）。
    """
    # bcrypt 输入上限 72 字节，超长先截断以避免后端异常
    safe = plain_password[:72]
    return pwd_context.hash(safe)


def verify_password(plain_password: str, password_hash: str) -> bool:
    """校验明文密码与哈希是否匹配。"""
    try:
        return pwd_context.verify(plain_password[:72], password_hash)
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: int, role: str) -> str:
    """签发 JWT 访问令牌。

    payload 含 ``sub``(user id 字符串)、``role``、``exp``、``iat``。

    Args:
        user_id: 用户主键。
        role: 用户角色（admin/editor/viewer）。

    Returns:
        编码后的 JWT 字符串。
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "role": role,
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """解码并校验 JWT。

    Args:
        token: JWT 字符串。

    Returns:
        解码后的 payload 字典。

    Raises:
        JWTError: 令牌无效、签名错误或已过期。
    """
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
