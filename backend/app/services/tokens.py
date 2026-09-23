"""Token 服务：生成不可猜测的分享令牌并判定其有效性状态。"""

from __future__ import annotations

import secrets
from datetime import datetime


def generate() -> str:
    """生成分享 token（``secrets.token_urlsafe(16)``，约 22 个 URL 安全字符）。"""
    return secrets.token_urlsafe(16)


def resolve(status: str, expires_at: datetime, now: datetime) -> str:
    """根据状态与到期时刻判定分享链接的最终状态。

    判定优先级：手动关闭 > 已标记过期 > 到期（惰性判定）。

    Args:
        status: 数据库中的状态（active/closed/expired）。
        expires_at: 到期时刻。
        now: 当前本地时间。

    Returns:
        最终状态字面量：``active`` / ``closed`` / ``expired``。
    """
    if status == "closed":
        return "closed"
    if status == "expired":
        return "expired"
    if expires_at <= now:
        return "expired"
    return "active"
