"""B 站服务：BV 号校验、解析与嵌入地址构造。

设计要点（architecture.md §10-7）：
- 优先请求 B 站公开接口获取标题/封面；
- 网络失败**仅提示** 2002，不阻断保存（不抛 500）。
"""

from __future__ import annotations

import re
from typing import Any

import requests

from app.utils.errors import CODE_BV_FORMAT, CODE_BV_PARSE_FAILED, BusinessError

# BV 号格式：BV + 10 位 [0-9A-Za-z]
BV_RE = re.compile(r"^BV[0-9A-Za-z]{10}$")
# 从任意文本（链接/分享文案）中抽取 BV 号
BV_EXTRACT_RE = re.compile(r"BV[0-9A-Za-z]{10}")

# B 站视频信息公开接口
BILIBILI_VIEW_API = "https://api.bilibili.com/x/web-interface/view"
REQUEST_TIMEOUT = 6  # 秒

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/122.0 Safari/537.36"
    ),
    "Referer": "https://www.bilibili.com/",
}


def is_valid_bv(bv: str | None) -> bool:
    """判断字符串是否为格式合法的 BV 号。"""
    return bool(bv) and bool(BV_RE.match(bv.strip()))


def extract_bv(text: str | None) -> str | None:
    """从任意文本中抽取第一个 BV 号，抽不到返回 None。"""
    if not text:
        return None
    match = BV_EXTRACT_RE.search(text)
    return match.group(0) if match else None


def parse_bv(raw_input: str) -> dict[str, Any]:
    """解析用户输入的 B 站链接 / BV 号。

    Args:
        raw_input: B 站链接、分享文案或纯 BV 号。

    Returns:
        ``{"bv_id": str, "title": str | None, "cover_url": str | None}``。

    Raises:
        BusinessError: 2001（未识别到合法 BV 号）；
           2002（格式合法但请求 B 站接口失败，data 中回传 bv_id）。
    """
    bv_id = extract_bv(raw_input)
    if not bv_id:
        raise BusinessError(CODE_BV_FORMAT, "未能识别 BV 号，请检查链接")

    meta: dict[str, Any] = {"bv_id": bv_id, "title": None, "cover_url": None}

    try:
        resp = requests.get(
            BILIBILI_VIEW_API,
            params={"bvid": bv_id},
            headers=_HEADERS,
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        payload = resp.json()
        if payload.get("code") != 0:
            raise ValueError(f"bilibili api code={payload.get('code')}")
        data = payload.get("data") or {}
        meta["title"] = data.get("title")
        pic = data.get("pic")
        if pic:
            # B 站封面返回 http://，统一升级为 https 避免混合内容
            meta["cover_url"] = str(pic).replace("http://", "https://")
        return meta
    except Exception:  # noqa: BLE001 - 网络/解析异常一律优雅降级
        # 不抛 500：返回 2002 提示，同时回传已识别的 bv_id，便于前端保留输入
        raise BusinessError(
            CODE_BV_PARSE_FAILED,
            "未能从 B 站获取视频信息，可手动填写标题与封面",
            data=meta,
        ) from None


def build_embed_url(bv_id: str, autoplay: bool = False) -> str:
    """构造 B 站 iframe 嵌入地址（前端亦可用，协议用 // 自适应）。"""
    auto = 1 if autoplay else 0
    return (
        f"//player.bilibili.com/player.html?bvid={bv_id}"
        f"&autoplay={auto}&high_quality=1"
    )
