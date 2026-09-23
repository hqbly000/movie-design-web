"""分享页接口（/api/share）—— 无需鉴权。

响应结构由 ``ShareCollectionOut`` 保证：**绝不存在 customer_name / customer_contact**。
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import distribution as distribution_service
from app.utils.response import ok

router = APIRouter(prefix="/api/share", tags=["分享页"])


@router.get("/{token}", summary="打开分享合集")
def get_share(token: str, db: Session = Depends(get_db)) -> dict:
    """按 token 返回合集预览数据；无效/关闭/过期 → code 4001。"""
    result = distribution_service.resolve_share(db, token)
    return ok(result.model_dump())
