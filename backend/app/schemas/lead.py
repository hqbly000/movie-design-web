"""预约留言 Pydantic 模型。"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LeadCreateIn(BaseModel):
    """前台提交预约请求体。

    校验规则见设计方案 §7.4：
    - 姓名：必填，≤20 字；
    - 联系电话：必填，11 位手机号或含区号固话（格式在路由层用正则二次校验）；
    - 拍摄需求：选填，≤200 字。
    """

    name: str = Field(min_length=1, max_length=20)
    phone: str = Field(min_length=7, max_length=32)
    demand_note: str | None = Field(default=None, max_length=200)
    demand_type: str | None = Field(default=None, max_length=64)
    demand_date: str | None = Field(default=None, max_length=32)


class LeadCreateOut(BaseModel):
    """提交预约响应。"""

    id: int


class LeadOut(BaseModel):
    """留言列表项。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: str
    demand_type: str | None = None
    demand_date: str | None = None
    demand_note: str | None = None
    status: str
    created_at: datetime | None = None
