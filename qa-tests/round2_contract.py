"""第二轮 · C 组（1001 data 契约）+ A4（上传有界分块读 / 边界 / 目录卫生）。

只调用 HTTP 接口与文件系统检查，不修改任何业务源码。
运行：cd backend && ./.venv/Scripts/python.exe ../qa-tests/round2_contract.py
"""
from __future__ import annotations

import io
import json
import statistics
import time
from pathlib import Path

import requests
from PIL import Image

requests.Session.trust_env = False
BASE = "http://127.0.0.1:8000"
UPLOAD_DIR = Path(r"D:\Dev\DevCode_wornary\backend\uploads\upload")
LIMIT = 5 * 1024 * 1024
ROWS: list[tuple[str, str, bool, str]] = []


def rec(name: str, expected: str, got: str, ok: bool) -> None:
    ROWS.append((name, expected, got, ok))
    print(f"  [{'PASS' if ok else 'FAIL'}] {name} | 期望={expected} | 实际={got}")


def tok(email="admin@lightisle.studio", pwd="Admin@123456") -> str:
    r = requests.post(f"{BASE}/api/auth/login", json={"email": email, "password": pwd}, timeout=15)
    return r.json()["data"]["token"]


def snapshot() -> set[str]:
    return {p.name for p in UPLOAD_DIR.glob("*")} if UPLOAD_DIR.exists() else set()


def main() -> None:
    t = tok()
    H = {"Authorization": f"Bearer {t}"}

    # ================= C. 1001 的 data 契约 =================
    print("\n[C1] 1001 的 `data:{field,detail}` 契约（query / body / path / json / 业务 / 框架）")
    cases = []

    # C1-a query 校验失败
    r = requests.get(f"{BASE}/api/admin/videos", params={"page": 1, "size": 200}, headers=H, timeout=15)
    j = r.json()
    cases.append(("query(size=200)", j, "size"))

    # C1-b body 校验失败（缺必填 title）
    r = requests.post(f"{BASE}/api/admin/videos", json={"bv_id": "BV1zz411c7m9"}, headers=H, timeout=15)
    cases.append(("body(缺 title)", r.json(), None))

    # C1-c path 校验失败（路径参数 id 非整数）—— 用已存在的 PUT 路由，避免落到 404
    r = requests.put(f"{BASE}/api/admin/videos/abc", json={"title": "x"}, headers=H, timeout=15)
    cases.append(("path(/videos/abc)", r.json(), None))

    # C1-d JSON 解析失败 → field 必须为 null
    r = requests.post(
        f"{BASE}/api/admin/videos",
        data="{not json",
        headers={**H, "Content-Type": "application/json"},
        timeout=15,
    )
    cases.append(("json 解析失败", r.json(), None))

    print("  形态 | code | http | data.field | data.detail")
    for label, j, expect_field in cases:
        data = j.get("data")
        field = data.get("field") if isinstance(data, dict) else None
        detail = data.get("detail") if isinstance(data, dict) else None
        print(f"   {label:<20} | {j.get('code')} | {'-':<4} | {field!r} | {str(detail)[:60]!r}")
    c = cases[0][1]
    rec("query 校验失败 → code=1001 且 data.field='size'",
        "1001 + field=size",
        f"code={c.get('code')} field={(c.get('data') or {}).get('field')!r}",
        c.get("code") == 1001 and isinstance(c.get("data"), dict) and c["data"].get("field") == "size")
    b = cases[1][1]
    rec("body 校验失败 → code=1001 且 data.field 为真实字段名",
        "1001 + field 非空字符串",
        f"code={b.get('code')} field={(b.get('data') or {}).get('field')!r}",
        b.get("code") == 1001 and isinstance(b.get("data"), dict) and isinstance(b["data"].get("field"), str))
    p = cases[2][1]
    rec("path 校验失败 → code=1001 且 data.field 为路径参数名",
        "1001 + field 非空字符串",
        f"code={p.get('code')} field={(p.get('data') or {}).get('field')!r}",
        p.get("code") == 1001 and isinstance(p.get("data"), dict) and isinstance(p["data"].get("field"), str))
    js = cases[3][1]
    rec("JSON 解析失败 → code=1001 且 data.field is None",
        "1001 + field=None",
        f"code={js.get('code')} data={js.get('data')!r}",
        js.get("code") == 1001 and isinstance(js.get("data"), dict) and js["data"].get("field") is None)

    # C1-e 手动业务 1001（hero 顺序违反 0/1/2）→ data 必须为 null
    r = requests.put(
        f"{BASE}/api/admin/hero-slides",
        json={"slides": [
            {"id": 1, "image_url": "/uploads/cover/cinematic-wide.png", "slogan": "a", "sort": 0},
            {"id": 2, "image_url": "/uploads/cover/cinematic-wide.png", "slogan": "b", "sort": 0},
            {"id": 3, "image_url": "/uploads/cover/cinematic-wide.png", "slogan": "c", "sort": 1},
        ]},
        headers=H, timeout=15,
    )
    j = r.json()
    rec("手动业务 1001（hero 顺序非法）→ code=1001 且 data is None",
        "1001 + data=None", f"code={j.get('code')} data={j.get('data')!r}",
        j.get("code") == 1001 and j.get("data") is None)

    # C1-f 框架级 HTTPException（404 / 405）→ data 必须为 null
    r404 = requests.get(f"{BASE}/api/admin/definitely-not-a-route", headers=H, timeout=15)
    j404 = r404.json() if r404.headers.get("content-type", "").startswith("application/json") else {}
    r405 = requests.delete(f"{BASE}/api/health", timeout=15)
    j405 = r405.json() if r405.headers.get("content-type", "").startswith("application/json") else {}
    rec("框架级 404 → data is None", "data=None",
        f"http={r404.status_code} code={j404.get('code')} data={j404.get('data')!r}",
        j404.get("data") is None and j404.get("code") == 1001)
    rec("框架级 405 → data is None", "data=None",
        f"http={r405.status_code} code={j405.get('code')} data={j405.get('data')!r}",
        j405.get("data") is None and j405.get("code") == 1001)

    # ================= A4. 上传：有界分块读 / 边界 / 分块语义 =================
    print("\n[A4] 上传有界分块读、5MB 边界、目录卫生")

    buf = io.BytesIO()
    Image.new("RGB", (640, 480), (180, 60, 40)).save(buf, format="JPEG", quality=50)
    jpg = buf.getvalue()
    print(f"  基准 JPEG = {len(jpg)}B（有效图片，Pillow 可 verify）")

    def pad_to(n: int) -> bytes:
        assert len(jpg) <= n, f"基准图 {len(jpg)}B 大于目标 {n}B"
        return jpg + b"\x00" * (n - len(jpg))

    def up(name: str, data: bytes, timeout=180):
        t0 = time.perf_counter()
        r = requests.post(f"{BASE}/api/admin/uploads", headers=H,
                          files={"file": (name, data, "image/png" if name.endswith("png") else "image/jpeg")},
                          timeout=timeout)
        return time.perf_counter() - t0, r.json(), r

    before = snapshot()

    # 3MB → 接受
    _, j3, _ = up("ok3.jpg", pad_to(3 * 1024 * 1024))
    rec("3MB 真实图片 → code 0", "0", f"code={j3.get('code')}", j3.get("code") == 0)
    # 6MB → 拒绝
    _, j6, _ = up("big6.jpg", pad_to(6 * 1024 * 1024))
    rec("6MB → 1001", "1001", f"code={j6.get('code')}", j6.get("code") == 1001)
    # 恰好 5,242,880B → 接受
    _, jb, _ = up("edge_eq.jpg", pad_to(LIMIT))
    rec("恰好 5,242,880B → code 0（边界含）", "0", f"code={jb.get('code')}", jb.get("code") == 0)
    # 5,242,881B → 拒绝
    _, jb2, _ = up("edge_plus1.jpg", pad_to(LIMIT + 1))
    rec("5,242,881B → 1001（边界外）", "1001", f"code={jb2.get('code')}", jb2.get("code") == 1001)
    j = jb.get("data") or {}
    rec("上传失败返回 data:{field:'file',detail}", "field=file",
        f"{str(jb2.get('data'))[:80]}", isinstance(jb2.get("data"), dict) and jb2["data"].get("field") == "file")

    # 30MB：耗时对比（是否随体量线性增长）
    t6a = [up("big6.jpg", pad_to(6 * 1024 * 1024))[0] for _ in range(3)]
    t30 = [up("big30.jpg", pad_to(30 * 1024 * 1024))[0] for _ in range(3)]
    # 对照组：30MB 但扩展名非法（在读取前就被拒），用于判断耗时是否被「传输」主导
    t30txt = [up("big30.txt", pad_to(30 * 1024 * 1024))[0] for _ in range(3)]
    m6, m30, m30txt = statistics.median(t6a), statistics.median(t30), statistics.median(t30txt)
    print(f"  耗时中位数：6MB={m6:.3f}s  30MB={m30:.3f}s  30MB(非法扩展名,读前即拒)={m30txt:.3f}s")
    print(f"  比值 T30/T6 = {m30 / m6:.2f}（线性≈5.0；提前中止应显著小于 5）")
    print(f"  比值 T30txt/T6 = {m30txt / m6:.2f}（对照组：传输/框架开销的量级）")
    rec("30MB 未出现 5 倍线性增长的「先读满再判」", "< 4.0",
        f"T30/T6={m30 / m6:.2f}（对照 T30txt/T6={m30txt / m6:.2f}）", (m30 / m6) < 4.0)

    # 目录卫生：失败用例不得留下半成品；成功用例各 1 个真实文件
    after = snapshot()
    new = sorted(after - before)
    print(f"  新增文件 {len(new)} 个：{new}")
    # 本轮成功用例恰为 2 个：3MB、恰好 5,242,880B；其余（6MB / 5,242,881B / 30MB×N）均应失败且不落盘
    rec("失败用例未留下任何半成品文件（新增数 == 成功用例数 2）", "2",
        f"新增 {len(new)} 个", len(new) == 2)
    sizes = [(UPLOAD_DIR / n).stat().st_size for n in new]
    rec("落盘文件均为非空完整文件", "全部 >0",
        f"{sizes}", all(s > 0 for s in sizes))
    rec("无 .tmp/临时半成品命名", "无",
        f"{[n for n in new if n.endswith('.tmp')]}", not [n for n in new if n.endswith(".tmp")])

    # 清理：删除本轮上传产生的文件（属 QA 测试产物，非种子数据）
    removed = 0
    for n in new:
        p = UPLOAD_DIR / n
        if p.exists():
            p.unlink()
            removed += 1
    print(f"  已清理本轮上传产物 {removed} 个")
    rec("测试产物已清理（uploads/upload 回到测试前集合）", "0",
        f"残留 {len(snapshot() - before)} 个", snapshot() - before == set())

    print("\n" + "=" * 78)
    passed = sum(1 for *_, ok in ROWS if ok)
    print(f"C+A4 合计 {len(ROWS)} | PASS {passed} | FAIL {len(ROWS) - passed}")
    if passed != len(ROWS):
        print("失败明细：")
        for name, exp, got, ok in ROWS:
            if not ok:
                print(f"  {name} | 期望={exp} | 实际={got}")
    print("=" * 78)
    Path(__file__).with_name("round2_contract_results.json").write_text(
        json.dumps([{"name": n, "expected": e, "got": g, "ok": o} for n, e, g, o in ROWS], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
