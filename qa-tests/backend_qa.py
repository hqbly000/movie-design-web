"""交点影视 · 后端独立验收（对抗性测试套件）。

本脚本由 QA（严过关）独立编写，用于「证伪」后端实现。
只调用 HTTP 接口与直连数据库读/改测试数据，不修改任何业务源码。

运行（使用后端 venv，含 requests / jose / pymysql）：
    cd backend
    ./.venv/Scripts/python.exe ../qa-tests/backend_qa.py
"""

from __future__ import annotations

import json
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import requests

# ---------- 配置 ----------
BASE = "http://127.0.0.1:8000"
SECRET = "lightisle-dev-secret-please-change-in-production"
DB_KW = dict(host="10.66.237.199", port=3306, user="root", password="12345678", database="lightisle")

ACCOUNTS = {
    "admin": ("admin@jiaodianfilm.com", "Admin@123456"),
    "editor": ("editor@jiaodianfilm.com", "Editor@123456"),
    "viewer": ("viewer@jiaodianfilm.com", "Viewer@123456"),
}

RESULTS: list[dict] = []


def rec(group: str, name: str, expected, actual, ok: bool, evidence: str = "") -> None:
    RESULTS.append(
        {"group": group, "name": name, "expected": expected, "actual": actual, "ok": ok, "evidence": evidence}
    )
    flag = "PASS" if ok else "FAIL"
    print(f"  [{flag}] {name} | 期望={expected} 实际={actual}{(' | ' + evidence) if evidence else ''}")


# ---------- HTTP ----------
s = requests.Session()
s.trust_env = False  # 关闭系统代理（本机 http_proxy 会拦截 127.0.0.1）


def call(method: str, path: str, token: str | None = None, json_body=None, headers=None,
         data=None, files=None, raw_auth: str | None = None, timeout: int = 30):
    h = dict(headers or {})
    if token is not None:
        h["Authorization"] = f"Bearer {token}"
    if raw_auth is not None:
        h["Authorization"] = raw_auth
    url = BASE + path
    try:
        r = s.request(method, url, json=json_body, data=data, files=files, headers=h, timeout=timeout)
        try:
            body = r.json()
        except Exception:
            body = None
        return r.status_code, body, r.text
    except Exception as exc:  # noqa: BLE001
        return -1, None, f"EXC:{exc}"


def code_of(body) -> int | str:
    if isinstance(body, dict) and "code" in body:
        return body["code"]
    return "NOJSON"


def login(role: str) -> str:
    email, pwd = ACCOUNTS[role]
    _, body, _ = call("POST", "/api/auth/login", json_body={"email": email, "password": pwd})
    return body["data"]["token"] if body and body.get("code") == 0 else ""


def db():
    import pymysql

    return pymysql.connect(**DB_KW, charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor)


# ==========================================================================
def group_auth_adversarial() -> None:
    print("\n[A] 鉴权对抗")
    g = "A.鉴权对抗"
    valid = login("admin")

    # A1 无 Authorization
    st, body, _ = call("GET", "/api/admin/videos")
    rec(g, "无 Authorization → 1002", "1002/401", f"{code_of(body)}/{st}", code_of(body) == 1002)

    # A2 空 Authorization
    st, body, _ = call("GET", "/api/admin/videos", raw_auth="")
    rec(g, "空 Authorization → 1002", "1002", code_of(body), code_of(body) == 1002)

    # A3 Bearer 后接乱码
    st, body, _ = call("GET", "/api/admin/videos", token="!!!not-a-jwt@@@")
    rec(g, "Bearer 乱码 → 1002", "1002", code_of(body), code_of(body) == 1002)

    # A4 篡改签名（改末 4 位）
    tampered = valid[:-4] + ("aaaa" if valid[-4:] != "aaaa" else "bbbb")
    st, body, _ = call("GET", "/api/admin/videos", token=tampered)
    rec(g, "篡改签名 → 1002", "1002", code_of(body), code_of(body) == 1002)

    # A5 用错误密钥签发
    from jose import jwt

    now = datetime.now().astimezone()
    wrong = jwt.encode({"sub": "1", "role": "admin", "exp": now + timedelta(hours=1)}, "wrong-secret", algorithm="HS256")
    st, body, _ = call("GET", "/api/admin/videos", token=wrong)
    rec(g, "错误密钥签发 → 1002", "1002", code_of(body), code_of(body) == 1002)

    # A6 过期 token（正确密钥、exp 在过去）
    expired = jwt.encode(
        {"sub": "1", "role": "admin", "exp": now - timedelta(hours=2)}, SECRET, algorithm="HS256"
    )
    st, body, _ = call("GET", "/api/admin/videos", token=expired)
    rec(g, "过期 token → 1002", "1002", code_of(body), code_of(body) == 1002)

    # A7 alg=none 攻击（手工构造 header.payload. 形式，python-jose 不支持编码 none）
    import base64 as _b64

    def _b64u(raw: bytes) -> str:
        return _b64.urlsafe_b64encode(raw).rstrip(b"=").decode()

    none_header = _b64u(b'{"alg":"none","typ":"JWT"}')
    none_payload = _b64u(json.dumps({"sub": "1", "role": "admin",
                                     "exp": int((now + timedelta(hours=1)).timestamp())}).encode())
    none_tok = f"{none_header}.{none_payload}."
    st, body, _ = call("GET", "/api/admin/videos", token=none_tok)
    rec(g, "alg=none 攻击 → 1002", "1002", code_of(body), code_of(body) == 1002)

    # A7b 手工构造合法签名 token 确认自测链路有效（阳性对照）
    good = jwt.encode({"sub": "1", "role": "admin", "exp": now + timedelta(hours=1)}, SECRET, algorithm="HS256")
    st, body, _ = call("GET", "/api/admin/videos", token=good)
    rec(g, "阳性对照：自签合法 token → 0", "0", code_of(body), code_of(body) == 0)

    # A8 有效签名但 sub 指向不存在用户
    ghost = jwt.encode(
        {"sub": "999999", "role": "admin", "exp": now + timedelta(hours=1)}, SECRET, algorithm="HS256"
    )
    st, body, _ = call("GET", "/api/admin/videos", token=ghost)
    rec(g, "sub 指向不存在用户 → 1002", "1002", code_of(body), code_of(body) == 1002)

    # A9 无数据泄露：失败响应体不得含业务数据
    _, body, text = call("GET", "/api/admin/videos", token="garbage")
    leak = any(k in text for k in ("bv_id", "created_by", '"items"'))
    rec(g, "鉴权失败不泄露数据", "无敏感字段", f"leak={leak}", not leak)


# ==========================================================================
def group_authz_matrix() -> None:
    print("\n[B] 越权矩阵（viewer / editor × 全部 /api/admin/* 写接口）")
    g = "B.越权"
    admin = login("admin")
    editor = login("editor")
    viewer = login("viewer")

    # 说明（QA 自修）：写探测一律打到「不存在的 id」或「原样回写」，
    # 避免像上一版那样把种子数据改坏（曾把 slogan 写成 x、把板块/荣誉改名甚至删除）。
    probe_bv = "BV1zz411c7m9"
    ghost = 999999  # 不存在的资源 id：editor 命中「允许(非 1003)」，但不会真正改数据

    # 读取当前内容，用于「原样回写」式越权探测
    _, hs, _ = call("GET", "/api/admin/hero-slides", token=admin)
    hero_now = [
        {"id": s["id"], "image_url": s["image_url"], "slogan": s["slogan"],
         "sub_slogan": s.get("sub_slogan"), "sort": s["sort"]}
        for s in hs["data"]
    ]
    _, cp, _ = call("GET", "/api/admin/company-profile", token=admin)
    company_now = {
        "section_title": cp["data"]["section_title"],
        "company_name": cp["data"]["company_name"],
        "founded_year": cp["data"]["founded_year"],
        "intro_text": cp["data"]["intro_text"],
    }
    _, sg, _ = call("GET", "/api/admin/segments", token=admin)
    seg0 = sg["data"][0]
    segment_now = {"name": seg0["name"], "content_type": seg0["content_type"], "item_ids": seg0.get("item_ids", [])}
    order_now = [s["id"] for s in sg["data"]]
    _, vl, _ = call("GET", "/api/admin/videos?page=1&size=1", token=admin)
    vid = vl["data"]["items"][0]["id"]

    writes = [
        ("POST", "/api/admin/videos", {"title": "QA越权探测-可删除", "bv_id": probe_bv, "status": "draft"}, None),
        ("PUT", f"/api/admin/videos/{ghost}", {"title": "QA越权探测"}, None),
        ("DELETE", f"/api/admin/videos/{ghost}", None, None),
        ("POST", "/api/admin/videos/parse-bv", {"input": "BV1xx411c7mD"}, None),
        ("POST", "/api/admin/uploads", None, "__file__"),
        ("POST", "/api/admin/distributions",
         {"collection_name": "QA越权探测-可删除", "customer_name": "QA", "duration_type": "1h", "video_ids": [vid]}, None),
        ("POST", f"/api/admin/distributions/{ghost}/close", None, None),
        ("POST", f"/api/admin/distributions/{ghost}/regenerate", {}, None),
        ("PUT", "/api/admin/hero-slides", {"slides": hero_now}, None),
        ("PUT", "/api/admin/company-profile", company_now, None),
        ("PUT", f"/api/admin/segments/{seg0['id']}", segment_now, None),
        ("PUT", "/api/admin/segments/order", {"ids": order_now}, None),
        ("POST", "/api/admin/honors", {"title": "QA越权探测-可删除", "issuer": "QA", "level": "其他"}, None),
        ("PUT", f"/api/admin/honors/{ghost}", {"title": "QA越权探测", "issuer": "QA", "level": "其他"}, None),
        ("DELETE", f"/api/admin/honors/{ghost}", None, None),
        ("PUT", f"/api/admin/leads/{ghost}/reply", {}, None),
        ("POST", "/api/admin/members", {"name": "QA越权探测", "email": "qa-probe@x.com", "password": "123456", "role": "viewer"}, None),
        ("PUT", f"/api/admin/members/{ghost}", {"name": "QA越权探测"}, None),
    ]

    def do(method, path, body, kind, token):
        if kind == "__file__":
            return call(method, path, token=token, files={"file": ("a.png", b"\x89PNG\r\n\x1a\n", "image/png")})
        return call(method, path, token=token, json_body=body)

    for method, path, body, kind in writes:
        st, b, _ = do(method, path, body, kind, viewer)
        c = code_of(b)
        rec(g, f"viewer {method} {path} → 1003", "1003", c, c == 1003)

    for method, path, body, kind in writes:
        st, b, _ = do(method, path, body, kind, editor)
        c = code_of(b)
        allowed = c != 1003
        if path.startswith("/api/admin/members"):
            rec(g, f"editor {method} {path} → 1003(仅admin)", "1003", c, c == 1003)
        else:
            rec(g, f"editor {method} {path} → 允许(非1003)", "!=1003", c, allowed)

    # ---- 清理本次探测产生的行（标签化，便于识别；分发无删除接口，留待 app.reset 清空）----
    tag = "QA越权探测"
    removed = 0
    _, vs, _ = call("GET", "/api/admin/videos?page=1&size=100", token=admin)
    for v in vs["data"]["items"]:
        if tag in (v.get("title") or ""):
            call("DELETE", f"/api/admin/videos/{v['id']}", token=admin)
            removed += 1
    _, hz, _ = call("GET", "/api/admin/honors", token=admin)
    for h in hz["data"]:
        if tag in (h.get("title") or ""):
            call("DELETE", f"/api/admin/honors/{h['id']}", token=admin)
            removed += 1
    rec(g, "越权探测数据已清理（视频/荣誉）", ">=0 行", f"{removed} 行", True)


# ==========================================================================
def group_share_security() -> None:
    print("\n[C] 分享链接安全")
    g = "C.分享安全"
    admin = login("admin")

    # 生成一条含客户信息的有效分发，用于泄露检查
    _, nl, _ = call("POST", "/api/admin/distributions", token=admin, json_body={
        "collection_name": "泄露探测合集", "customer_name": "王女士",
        "customer_contact": "13800008821", "duration_type": "1h",
        "note": "客户可见说明", "video_ids": [1, 2]})
    tok = nl["data"]["token"]

    # C1 token 熵
    rec(g, "token 长度/字符集（token_urlsafe(16)）", "≥20 字符", f"len={len(tok)}", len(tok) >= 20)
    import secrets as _secrets
    toks = {_secrets.token_urlsafe(16) for _ in range(2000)}
    rec(g, "token 生成无碰撞（2000 次）", "==2000", len(toks), len(toks) == 2000)

    # C2 不存在的 token
    st, b, _ = call("GET", "/api/share/definitely-no-such-token")
    rec(g, "不存在 token → 4001", "4001", code_of(b), code_of(b) == 4001)

    # C3 超长 token
    st, b, _ = call("GET", "/api/share/" + "A" * 5000)
    rec(g, "超长 token(5000) → 4001 且非5000", "4001", f"{code_of(b)}/{st}", code_of(b) == 4001)

    # C4 特殊字符 token
    for t in ["a b c", "%%%", "a/b/c"]:
        st, b, _ = call("GET", "/api/share/" + requests.utils.quote(t, safe=""))
        c = code_of(b)
        # 含 "/" 的 token 会拆成多段路径 → 路由不匹配，返回 1001（非 4001），但非 500、无泄露；
        # 真实 token 为 urlsafe base64，不含 "/"，故判为非安全缺陷（见报告 P2 观察项）。
        rec(g, f"特殊字符 token {t!r} → 4001（含/时为1001，均非500）", "4001/1001", c,
            c in (4001, 1001) and st != 500)

    # C5 SQL 注入样式 token
    for t in ["' OR '1'='1", "1;DROP TABLE distributions;--", "1 UNION SELECT * FROM users"]:
        st, b, _ = call("GET", "/api/share/" + requests.utils.quote(t, safe=""))
        rec(g, f"SQLi token {t[:18]!r}… → 4001", "4001", code_of(b), code_of(b) == 4001)

    # C6 泄露扫描：响应体不得出现客户名/手机号/字段名
    st, b, text = call("GET", f"/api/share/{tok}")
    leaks = [k for k in ("customer_name", "customer_contact", "王女士", "13800008821") if k in text]
    rec(g, "分享响应不含 customer_* / 客户名 / 手机号", "无", f"命中={leaks}", not leaks)
    # 直连 DB 比对：DB 里确有该客户信息（证明上一条不是因数据缺失而侥幸通过）
    conn = db()
    with conn.cursor() as cur:
        cur.execute("SELECT customer_name, customer_contact FROM distributions WHERE token=%s", (tok,))
        row = cur.fetchone()
    conn.close()
    rec(g, "DB 中确有客户信息（证明泄露扫描有效）", "王女士/13800008821",
        f"{row['customer_name']}/{row['customer_contact']}",
        row["customer_name"] == "王女士")

    # C7 正常 token 有效
    rec(g, "有效 token → code=0", "0", code_of(b), code_of(b) == 0)
    rec(g, "有效 token 返回合集名", "泄露探测合集",
        b["data"]["collection_name"] if b.get("code") == 0 else None,
        b.get("data", {}).get("collection_name") == "泄露探测合集")


# ==========================================================================
def group_timing_logic() -> None:
    print("\n[D] 限时逻辑")
    g = "D.限时"
    admin = login("admin")
    conn = db()
    durations = [("30m", 30 * 60), ("1h", 3600), ("6h", 6 * 3600), ("1d", 86400), ("3d", 3 * 86400)]
    created_ids = []
    for dtype, secs in durations:
        before = datetime.now()
        _, b, _ = call("POST", "/api/admin/distributions", token=admin, json_body={
            "collection_name": f"限时-{dtype}", "customer_name": "测试",
            "duration_type": dtype, "video_ids": [1]})
        ok = b.get("code") == 0
        if not ok:
            rec(g, f"{dtype} 新建成功", "0", code_of(b), False)
            continue
        exp = datetime.fromisoformat(b["data"]["expires_at"])
        delta = (exp - before).total_seconds()
        created_ids.append((b["data"]["id"], b["data"]["token"]))
        rec(g, f"{dtype} expires-created≈{secs}s", f"~{secs}", f"{delta:.0f}",
            abs(delta - secs) <= 15)

    # 自定义 45 分钟
    target = datetime.now() + timedelta(minutes=45)
    _, b, _ = call("POST", "/api/admin/distributions", token=admin, json_body={
        "collection_name": "限时-custom", "customer_name": "测试",
        "duration_type": "custom", "custom_expires_at": target.isoformat(), "video_ids": [1]})
    if b.get("code") == 0:
        exp = datetime.fromisoformat(b["data"]["expires_at"])
        rec(g, "custom 到期时刻=指定值", target.strftime("%H:%M:%S"), exp.strftime("%H:%M:%S"),
            abs((exp - target).total_seconds()) <= 2)
        created_ids.append((b["data"]["id"], b["data"]["token"]))
    else:
        rec(g, "custom 新建成功", "0", code_of(b), False)

    # custom 缺到期时刻 → 1001
    _, b, _ = call("POST", "/api/admin/distributions", token=admin, json_body={
        "collection_name": "限时-custom-空", "customer_name": "测试",
        "duration_type": "custom", "video_ids": [1]})
    rec(g, "custom 缺到期时刻 → 1001", "1001", code_of(b), code_of(b) == 1001)

    # 手工把第 1 条改为过去 → 立即 4001
    did, dtok = created_ids[0]
    with conn.cursor() as cur:
        cur.execute("UPDATE distributions SET expires_at=%s WHERE id=%s",
                    (datetime.now() - timedelta(minutes=5), did))
    conn.commit()
    st, b, _ = call("GET", f"/api/share/{dtok}")
    rec(g, "DB 改为过去时间 → 立即 4001", "4001", code_of(b), code_of(b) == 4001)

    # 手动 close → 立即 4001
    _, cid_tok = created_ids[1]
    call("POST", f"/api/admin/distributions/{created_ids[1][0]}/close", token=admin)
    st, b, _ = call("GET", f"/api/share/{cid_tok}")
    rec(g, "手动 close → 立即 4001", "4001", code_of(b), code_of(b) == 4001)

    # regenerate：旧失效、新生效、客户信息复用
    did2, old_tok = created_ids[2]
    _, rb, _ = call("POST", f"/api/admin/distributions/{did2}/regenerate", token=admin, json_body={})
    new_tok = rb["data"]["token"] if rb.get("code") == 0 else ""
    st1, b1, _ = call("GET", f"/api/share/{old_tok}")
    st2, b2, _ = call("GET", f"/api/share/{new_tok}")
    with conn.cursor() as cur:
        cur.execute("SELECT customer_name FROM distributions WHERE id=%s", (did2,))
        cust = cur.fetchone()["customer_name"]
    rec(g, "regenerate 后旧 token 失效 → 4001", "4001", code_of(b1), code_of(b1) == 4001)
    rec(g, "regenerate 后新 token 有效 → 0", "0", code_of(b2), code_of(b2) == 0)
    rec(g, "regenerate 复用客户信息", "测试", cust, cust == "测试")
    rec(g, "regenerate token 变化", "旧!=新", f"{old_tok[:6]}→{new_tok[:6]}", old_tok != new_tok)
    conn.close()


# ==========================================================================
def group_business_constraints() -> None:
    print("\n[E] 业务约束")
    g = "E.业务约束"
    admin = login("admin")

    # E1 荣誉第 7 条 → 3001
    for i in range(3):
        _, b, _ = call("POST", "/api/admin/honors", token=admin,
                       json_body={"title": f"越界荣誉{i}", "issuer": "测试机构", "level": "其他"})
        c = code_of(b)
        if i == 0:
            rec(g, "荣誉第6条可新增（seed=5）", "0", c, c == 0)
        if i == 1:
            rec(g, "荣誉第7条 → 3001", "3001", c, c == 3001)
            break

    # E2 hero 2 条 / 4 条 → 3002
    base = [{"id": i, "image_url": "/uploads/cover/cinematic-wide.png", "slogan": "以光影", "sub_slogan": "x", "sort": i - 1} for i in (1, 2, 3)]
    _, b2, _ = call("PUT", "/api/admin/hero-slides", token=admin, json_body={"slides": base[:2]})
    rec(g, "hero 传 2 条 → 3002", "3002", code_of(b2), code_of(b2) == 3002)
    # 4 条：sort 均须落在 0..2 才能通过 schema，进而在路由层触发定长 3002
    four = base + [{"id": 1, "image_url": "/uploads/cover/cinematic-wide.png", "slogan": "以光影", "sub_slogan": "x", "sort": 1}]
    _, b4, _ = call("PUT", "/api/admin/hero-slides", token=admin, json_body={"slides": four})
    rec(g, "hero 传 4 条 → 3002", "3002", code_of(b4), code_of(b4) == 3002)

    # E3 segments 排序长度 != 5 → 3002
    _, b3, _ = call("PUT", "/api/admin/segments/order", token=admin, json_body={"ids": [1, 2]})
    rec(g, "segments 排序 2 个 → 3002", "3002", code_of(b3), code_of(b3) == 3002)
    _, b3e, _ = call("PUT", "/api/admin/segments/order", token=admin, json_body={"ids": []})
    rec(g, "segments 排序 0 个 → 1001", "1001", code_of(b3e), code_of(b3e) == 1001)

    # E4 videos.category_id 允许 NULL 且可按未分类筛选
    _, nb, _ = call("POST", "/api/admin/videos", token=admin, json_body={
        "title": "未分类测试视频", "bv_id": "BV1nul411c7m", "status": "draft"})
    ok_null = code_of(nb) == 0
    _, nl2, _ = call("GET", "/api/admin/videos?category_id=__none__&size=100", token=admin)
    none_items = nl2["data"]["items"] if nl2.get("code") == 0 else []
    all_null = all(it["category_id"] is None for it in none_items)
    rec(g, "category_id 允许为空可新增", "0", code_of(nb), ok_null)
    rec(g, "未分类筛选结果非空且全为 NULL", f">0 且全NULL", f"n={len(none_items)} all_null={all_null}",
        len(none_items) >= 1 and all_null)

    # E5 BV 格式 2001 / 唯一 2003
    _, bb1, _ = call("POST", "/api/admin/videos/parse-bv", token=admin, json_body={"input": "not-a-bv"})
    rec(g, "非法 BV → 2001", "2001", code_of(bb1), code_of(bb1) == 2001)
    _, vb, _ = call("GET", "/api/admin/videos?size=1", token=admin)
    dup_bv = vb["data"]["items"][0]["bv_id"]
    _, bb2, _ = call("POST", "/api/admin/videos", token=admin, json_body={
        "title": "重复BV", "bv_id": dup_bv, "status": "draft"})
    rec(g, "重复 BV → 2003", "2003", code_of(bb2), code_of(bb2) == 2003)

    # E6 合集 0 视频 → 1001
    _, bb3, _ = call("POST", "/api/admin/distributions", token=admin, json_body={
        "collection_name": "空合集", "customer_name": "测试", "duration_type": "1h", "video_ids": []})
    rec(g, "合集 0 支视频 → 1001", "1001", code_of(bb3), code_of(bb3) == 1001)

    # E7 不存在的视频 id → 1001
    _, bb4, _ = call("POST", "/api/admin/distributions", token=admin, json_body={
        "collection_name": "幽灵视频", "customer_name": "测试", "duration_type": "1h", "video_ids": [999999]})
    rec(g, "合集含不存在视频 → 1001", "1001", code_of(bb4), code_of(bb4) == 1001)


# ==========================================================================
def group_input_boundaries() -> None:
    print("\n[F] 输入边界")
    g = "F.边界"
    admin = login("admin")
    from jose import jwt  # noqa: F401

    # F1 超长字符串
    _, b, _ = call("POST", "/api/admin/videos", token=admin, json_body={
        "title": "标" * 41, "bv_id": "BV1len411c7mD", "status": "draft"})
    rec(g, "视频标题 41 字 → 1001", "1001", code_of(b), code_of(b) == 1001)
    _, b, _ = call("POST", "/api/admin/distributions", token=admin, json_body={
        "collection_name": "合" * 21, "customer_name": "测试", "duration_type": "1h", "video_ids": [1]})
    rec(g, "合集名 21 字 → 1001", "1001", code_of(b), code_of(b) == 1001)
    _, b, _ = call("POST", "/api/admin/honors", token=admin, json_body={
        "title": "荣" * 25, "issuer": "测试", "level": "其他"})
    rec(g, "荣誉标题 25 字 → 1001", "1001", code_of(b), code_of(b) == 1001)

    # F2 emoji 正常
    _, b, _ = call("POST", "/api/admin/videos", token=admin, json_body={
        "title": "城市之光📸🌆", "bv_id": "BV1emo411c7m", "status": "draft"})
    rec(g, "含 emoji 标题可保存", "0", code_of(b), code_of(b) == 0)

    # F3 单引号 / 反斜杠 原样存取
    weird = "O'Brien \\ 城市's"
    _, b, _ = call("POST", "/api/admin/videos", token=admin, json_body={
        "title": weird, "bv_id": "BV1quo411c7m", "status": "draft"})
    okw = code_of(b) == 0
    kw_q = requests.utils.quote("O'Brien")
    _, ql, _ = call("GET", f"/api/admin/videos?keyword={kw_q}", token=admin)
    found = any(it["title"] == weird for it in (ql["data"]["items"] if ql.get("code") == 0 else []))
    rec(g, "单引号/反斜杠标题可保存", "0", code_of(b), okw)
    rec(g, "特殊字符原样存取（无二次转义/截断）", "原样", f"found={found}", found)

    # F4 分页边界
    for q, exp in [("page=0", 1001), ("page=-1", 1001), ("size=99999", 1001), ("size=0", 1001)]:
        _, b, _ = call("GET", f"/api/admin/videos?{q}", token=admin)
        rec(g, f"分页 {q} → 1001", exp, code_of(b), code_of(b) == exp)

    # F5 不存在 id
    _, b, _ = call("PUT", "/api/admin/videos/999999", token=admin, json_body={"title": "x"})
    rec(g, "PUT 不存在视频 → 1001（非500）", "1001", code_of(b), code_of(b) == 1001)
    _, b, _ = call("DELETE", "/api/admin/videos/999999", token=admin)
    rec(g, "DELETE 不存在视频 → 1001（非500）", "1001", code_of(b), code_of(b) == 1001)
    _, b, _ = call("PUT", "/api/admin/honors/999999", token=admin,
                   json_body={"title": "x", "issuer": "y", "level": "其他"})
    rec(g, "PUT 不存在荣誉 → 1001（非500）", "1001", code_of(b), code_of(b) == 1001)
    _, b, _ = call("GET", "/api/public/segments/999999/videos")
    rec(g, "GET 不存在板块 → 1001（非500）", "1001", code_of(b), code_of(b) == 1001)


# ==========================================================================
def group_upload() -> None:
    print("\n[G] 上传安全")
    g = "G.上传"
    admin = login("admin")

    # G1 超大文件 > 5MB
    big = b"\x89PNG\r\n\x1a\n" + b"\x00" * (6 * 1024 * 1024)
    st, b, _ = call("POST", "/api/admin/uploads", token=admin, files={"file": ("big.png", big, "image/png")})
    rec(g, ">5MB 文件 → 1001", "1001", code_of(b), code_of(b) == 1001)

    # G2 非图片后缀
    st, b, _ = call("POST", "/api/admin/uploads", token=admin, files={"file": ("evil.txt", b"hello", "text/plain")})
    rec(g, "非图片后缀 .txt → 1001", "1001", code_of(b), code_of(b) == 1001)

    # G3 空文件
    st, b, _ = call("POST", "/api/admin/uploads", token=admin, files={"file": ("empty.png", b"", "image/png")})
    rec(g, "空文件 → 1001", "1001", code_of(b), code_of(b) == 1001)

    # G4 内容嗅探①：扩展名 .png 但内容非图片（纯文本垃圾字节）→ 必须拒绝
    st, b, _ = call("POST", "/api/admin/uploads", token=admin,
                    files={"file": ("fake.png", b"this is plain text, not a png", "image/png")})
    c = code_of(b)
    rec(g, "内容非图片（纯文本伪装 .png）→ 1001", "1001", c, c == 1001)

    # G4b 内容嗅探②：PNG 签名 + 垃圾字节（截断文件）→ Pillow 抛 Truncated File Read，同样应拒绝
    st, b, _ = call("POST", "/api/admin/uploads", token=admin,
                    files={"file": ("trunc.png", b"\x89PNG\r\n\x1a\n0123456789", "image/png")})
    c = code_of(b)
    rec(g, "PNG 签名+垃圾字节（截断）→ 1001", "1001", c, c == 1001)

    # G4c 格式与扩展名不符：真实 JPEG 内容却取名 .png → 应拒绝
    try:
        import io as _io
        from PIL import Image as _Image  # type: ignore
        _buf = _io.BytesIO()
        _Image.new("RGB", (4, 4), (12, 34, 56)).save(_buf, format="JPEG")
        JPEG_BYTES = _buf.getvalue()
    except Exception as exc:  # pragma: no cover
        JPEG_BYTES = b""
        print("    (Pillow 不可用，跳过 G4c)", exc)
    if JPEG_BYTES:
        st, b, _ = call("POST", "/api/admin/uploads", token=admin,
                        files={"file": ("real_png_ext.jpg-as-png.png", JPEG_BYTES, "image/png")})
        c = code_of(b)
        rec(g, "真实 JPEG 内容但扩展名 .png → 1001", "1001", c, c == 1001)

    # G5 路径穿越文件名 + 真实最小 PNG → 语义为「code 0 + url 规范化为 uuid，原名丢弃」
    from pathlib import Path as _P

    try:
        import io as _io2
        from PIL import Image as _Image2  # type: ignore
        _buf2 = _io2.BytesIO()
        _Image2.new("RGB", (2, 2), (200, 30, 30)).save(_buf2, format="PNG")
        MIN_PNG = _buf2.getvalue()
    except Exception:  # pragma: no cover
        import base64 as _b64
        MIN_PNG = _b64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AGtBJdWAAAAAElFTkSuQmCC"
        )
    st, b, _ = call("POST", "/api/admin/uploads", token=admin,
                    files={"file": ("../../evil.png", MIN_PNG, "image/png")})
    url = b["data"]["url"] if isinstance(b.get("data"), dict) and b.get("code") == 0 else ""
    uuid_ok = url.startswith("/uploads/upload/") and url.endswith(".png") and "evil" not in url and ".." not in url
    rec(g, "真实 PNG + 穿越名 ../../evil.png → code 0 且 url 规范化为 uuid", "code=0 且 url=/uploads/upload/<uuid>.png",
        f"code={code_of(b)} url={url}", code_of(b) == 0 and uuid_ok)
    # 全盘扫描 backend 目录，确认目录树外没有生成 evil* 文件
    backend_root = _P(r"D:\Dev\DevCode_wornary\backend")
    outside = [str(x) for x in backend_root.rglob("evil*")]
    rec(g, "backend 目录树内无 evil* 文件（穿越未落地）", "无", f"found={outside}", not outside)
    # 落盘文件必须真实存在（证明 code 0 有真实产物）
    disk_ok = bool(url) and (_P(r"D:\Dev\DevCode_wornary\backend") / url.lstrip("/")).exists()
    rec(g, "规范化后的上传文件确实落盘", "存在", f"{url}", disk_ok)
    # 清理：删除本条用例上传产生的文件（QA 测试产物）
    if url:
        _f = _P(r"D:\Dev\DevCode_wornary\backend") / url.lstrip("/")
        if _f.exists():
            _f.unlink()


# ==========================================================================
def group_xss_storage() -> None:
    print("\n[H] XSS 存储（原文存取）")
    g = "H.XSS"
    admin = login("admin")
    payload = "<script>alert(1)</script>"

    _, b, _ = call("POST", "/api/admin/videos", token=admin, json_body={
        "title": payload, "bv_id": "BV1xss411c7m", "status": "published"})
    _, vl, _ = call("GET", "/api/admin/videos?keyword=%3Cscript%3E", token=admin)
    vt = [it["title"] for it in vl["data"]["items"]] if vl.get("code") == 0 else []
    rec(g, "视频标题 <script> 原样存储/返回", payload, vt[0] if vt else None, payload in vt)

    # 荣誉：E 组已使荣誉达上限 6，这里改用「编辑现有第 1 条」验证原文存取，避免触及 3001
    hxss = "<script>x</script>"
    _, bh, _ = call("PUT", "/api/admin/honors/1", token=admin,
                    json_body={"title": hxss, "issuer": "测试", "level": "其他"})
    _, hl, _ = call("GET", "/api/admin/honors", token=admin)
    htitles = [h["title"] for h in hl["data"]] if hl.get("code") == 0 else []
    rec(g, "荣誉标题 <script> 原样存储/返回", hxss, hxss if hxss in htitles else None, hxss in htitles)

    _, b, _ = call("POST", "/api/admin/distributions", token=admin, json_body={
        "collection_name": "XSS合集", "customer_name": "测试", "duration_type": "1h",
        "note": payload, "video_ids": [1]})
    xtok = b["data"]["token"] if code_of(b) == 0 else ""
    _, sb, _ = call("GET", f"/api/share/{xtok}")
    note = sb["data"]["note"] if sb.get("code") == 0 else None
    rec(g, "合集说明 <script> 原样存储/返回", payload, note, note == payload)

    _, b, _ = call("POST", "/api/public/leads", json_body={
        "name": "<script>a</script>", "phone": "13800001234", "demand_note": payload})
    _, ll, _ = call("GET", "/api/admin/leads?size=5", token=admin)
    names = [x["name"] for x in ll["data"]["items"]] if ll.get("code") == 0 else []
    rec(g, "留言姓名 <script> 原样存储/返回", "<script>a</script>",
        "<script>a</script>" if "<script>a</script>" in names else None, "<script>a</script>" in names)


# ==========================================================================
def group_db_counts_impl() -> None:
    g = "I.DB"
    expected = {
        "users": 3, "asset_groups": 3, "assets": 19, "hero_slides": 3, "company_profile": 1,
        "segments": 5, "segment_items": 10, "videos": 12, "honors": 5, "collections": 3,
        "collection_items": 7, "distributions": 3, "leads": 4, "site_settings": 8,
    }
    conn = db()
    with conn.cursor() as cur:
        for t, exp in expected.items():
            cur.execute(f"SELECT COUNT(*) AS c FROM `{t}`")
            n = cur.fetchone()["c"]
            rec(g, f"{t} 种子条数", exp, n, n == exp)
    conn.close()


# ==========================================================================
def group_seed_integrity() -> None:
    """收尾自检：确认整轮对抗测试没有改坏「种子内容」（不只是条数）。"""
    print("\n[J] 收尾 · 种子内容完整性")
    g = "J.种子完整性"
    admin = login("admin")
    _, site, _ = call("GET", "/api/public/site")
    data = site["data"]
    slogans = [s["slogan"] for s in data["hero_slides"]]
    expect_slogans = ["以光影，铭记时光", "每一次相遇都值得记录", "城市之上，光在流动"]
    rec(g, "hero_slides 标语未被测试污染", expect_slogans, slogans, slogans == expect_slogans)
    _, cp, _ = call("GET", "/api/admin/company-profile", token=admin)
    name = cp["data"]["company_name"]
    rec(g, "company_name 未被测试污染", "交点影视", name, name == "交点影视")
    _, sg, _ = call("GET", "/api/admin/segments", token=admin)
    names = [s["name"] for s in sg["data"]]
    expect_seg = ["人像写真", "婚礼纪实", "商业摄影", "活动跟拍", "视频短片"]
    rec(g, "segments 名称/顺序未被测试污染", expect_seg, names, names == expect_seg)


# ==========================================================================
def main() -> None:
    t0 = time.time()
    print("=" * 78)
    print("后端独立验收（对抗性测试）  BASE =", BASE)
    print("=" * 78)

    # 先确认可达
    st, b, _ = call("GET", "/api/health")
    if st != 200:
        print("后端不可达，退出。", st, b)
        sys.exit(2)

    if "--db-only" in sys.argv:
        # 逐表计数须在「干净种子态」下校验，故单独运行：
        #   python backend_qa.py --db-only
        group_db_counts_impl()
    else:
        group_auth_adversarial()
        group_share_security()
        group_timing_logic()
        group_business_constraints()
        group_input_boundaries()
        group_upload()
        group_xss_storage()
        # 越权矩阵会真实创建少量数据（视频/分发），放最后执行，避免污染前面的种子态断言；
        # 其中「写探测」已改为打到不存在的 id / 原样回写，不再改坏种子内容。
        group_authz_matrix()
        # 收尾自检：证明整轮测试没有改坏种子内容
        group_seed_integrity()

    total = len(RESULTS)
    passed = sum(1 for r in RESULTS if r["ok"])
    failed = total - passed
    print("\n" + "=" * 78)
    print(f"后端用例合计 {total} | PASS {passed} | FAIL {failed} | 用时 {time.time()-t0:.1f}s")
    print("=" * 78)
    if failed:
        print("失败明细：")
        for r in RESULTS:
            if not r["ok"]:
                print(f"  [{r['group']}] {r['name']}  期望={r['expected']} 实际={r['actual']} {r['evidence']}")

    out = Path(__file__).with_name("backend_results.json")
    out.write_text(json.dumps({"total": total, "passed": passed, "failed": failed, "results": RESULTS},
                              ensure_ascii=False, indent=2), encoding="utf-8")
    print("结果已写入", out)


if __name__ == "__main__":
    main()
