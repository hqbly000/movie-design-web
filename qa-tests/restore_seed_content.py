"""QA 数据还原：把我方对抗用例（authz matrix）误写入的 hero_slides / company_profile
恢复到 app.seed 的原始内容。只调用后端自身接口，不改动任何业务源码。

运行：cd backend && ./.venv/Scripts/python.exe ../qa-tests/restore_seed_content.py
"""
from __future__ import annotations

import requests

requests.Session.trust_env = False
BASE = "http://127.0.0.1:8000"

INTRO = (
    "光屿摄影成立于 2017 年，是一家专注于人像、婚礼与商业影像的文化传媒机构。"
    "我们相信每一次相遇都值得被认真记录。九年来，团队以自然光与电影感为语言，"
    "为个人与品牌留下经得起时间回望的画面。"
)
SLIDES = [
    (1, "/uploads/cover/cinematic-wide.png", "以光影，铭记时光", "人像写真 · 婚礼纪实 · 商业摄影", 0),
    (2, "/uploads/cover/portrait-natural-light.png", "每一次相遇都值得记录", "自然光人像 · 捕捉真实情绪", 1),
    (3, "/uploads/cover/night-cityscape.png", "城市之上，光在流动", "城市影像 · 夜景纪实", 2),
]

tok = requests.post(f"{BASE}/api/auth/login", json={"email": "admin@lightisle.studio", "password": "Admin@123456"}, timeout=10).json()["data"]["token"]
H = {"Authorization": f"Bearer {tok}"}

r1 = requests.put(
    f"{BASE}/api/admin/hero-slides",
    json={"slides": [{"id": i, "image_url": u, "slogan": s, "sub_slogan": ss, "sort": so} for i, u, s, ss, so in SLIDES]},
    headers=H, timeout=10,
).json()
r2 = requests.put(
    f"{BASE}/api/admin/company-profile",
    json={"section_title": "公司介绍", "company_name": "光屿影像文化传媒有限公司", "founded_year": 2017, "intro_text": INTRO},
    headers=H, timeout=10,
).json()
print("hero put ->", r1.get("code"), r1.get("message"))
print("company put ->", r2.get("code"), r2.get("message"))
back = requests.get(f"{BASE}/api/public/site", timeout=10).json()["data"]
print("hero_slides now ->", [(s["id"], s["slogan"], s["image_url"]) for s in back["hero_slides"]])
print("company now ->", back["company_profile"]["company_name"])
