#!/usr/bin/env bash
# 交点影视 · 后端接口冒烟测试
# 用法：./scripts/smoke-test.sh [API_BASE]   默认 http://127.0.0.1:8000
set -uo pipefail

API="${1:-http://127.0.0.1:8000}"
PASS=0
FAIL=0

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }

# check <名称> <期望条件> <实际值>
check() {
  local name="$1" expect="$2" got="$3"
  if [ "$expect" = "$got" ]; then
    green "  [PASS] $name"
    PASS=$((PASS + 1))
  else
    red   "  [FAIL] $name  (期望 $expect，实际 $got)"
    FAIL=$((FAIL + 1))
  fi
}

code() { echo "$1" | python -c "import sys,json;print(json.load(sys.stdin).get('code'))" 2>/dev/null || echo "PARSE_ERR"; }

echo "==> 目标：$API"
echo

# ---------- 0. 服务可达 ----------
echo "[0] 服务健康"
HTTP=$(curl -s --noproxy '*' -o /dev/null -w "%{http_code}" --max-time 10 "$API/api/public/site")
check "GET /api/public/site 返回 200" "200" "$HTTP"

# ---------- 1. 公开聚合配置 ----------
echo "[1] 公开接口"
SITE=$(curl -s --noproxy '*' --max-time 15 "$API/api/public/site")
check "code=0" "0" "$(code "$SITE")"
HERO=$(echo "$SITE" | python -c "import sys,json;print(len(json.load(sys.stdin)['data']['hero_slides']))" 2>/dev/null || echo 0)
check "hero_slides 恰好 3 条" "3" "$HERO"
SEG=$(echo "$SITE" | python -c "import sys,json;print(len(json.load(sys.stdin)['data']['segments']))" 2>/dev/null || echo 0)
check "segments 恰好 5 条" "5" "$SEG"
SET=$(echo "$SITE" | python -c "import sys,json;print('icp_no' in json.load(sys.stdin)['data']['site_settings'])" 2>/dev/null || echo false)
check "site_settings 含 icp_no（R12 备案）" "True" "$SET"

# ---------- 2. 登录 ----------
echo "[2] 鉴权"
LOGIN=$(curl -s --noproxy '*' --max-time 15 -X POST "$API/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@jiaodianfilm.com","password":"Admin@123456"}')
check "admin 登录 code=0" "0" "$(code "$LOGIN")"
TOKEN=$(echo "$LOGIN" | python -c "import sys,json;print(json.load(sys.stdin)['data']['token'])" 2>/dev/null || echo "")
[ -n "$TOKEN" ] && green "  [PASS] 取得 token" && PASS=$((PASS+1)) || { red "  [FAIL] 未取得 token"; FAIL=$((FAIL+1)); }
AUTH="Authorization: Bearer $TOKEN"

BAD=$(curl -s --noproxy '*' --max-time 15 -X POST "$API/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@jiaodianfilm.com","password":"wrong-password"}')
check "错误密码 → 1004" "1004" "$(code "$BAD")"

# ---------- 3. 权限矩阵 ----------
echo "[3] 权限"
VT=$(curl -s --noproxy '*' --max-time 15 -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"viewer@jiaodianfilm.com","password":"Viewer@123456"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['data']['token'])" 2>/dev/null || echo "")
VD=$(curl -s --noproxy '*' --max-time 15 -X POST "$API/api/admin/honors" -H "Authorization: Bearer $VT" \
  -H 'Content-Type: application/json' -d '{"title":"x","issuer":"y","level":"其他"}')
check "viewer 写操作 → 1003" "1003" "$(code "$VD")"

ET=$(curl -s --noproxy '*' --max-time 15 -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"editor@jiaodianfilm.com","password":"Editor@123456"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['data']['token'])" 2>/dev/null || echo "")
EM=$(curl -s --noproxy '*' --max-time 15 "$API/api/admin/members" -H "Authorization: Bearer $ET")
check "editor 访问成员管理 → 1003" "1003" "$(code "$EM")"

# ---------- 4. 视频库 ----------
echo "[4] 视频库"
VL=$(curl -s --noproxy '*' --max-time 15 "$API/api/admin/videos?page=1&size=10" -H "$AUTH")
check "视频列表 code=0" "0" "$(code "$VL")"
NONE=$(curl -s --noproxy '*' --max-time 15 "$API/api/admin/videos?category_id=__none__" -H "$AUTH")
check "未分类筛选 code=0（R25）" "0" "$(code "$NONE")"
BV=$(curl -s --noproxy '*' --max-time 20 -X POST "$API/api/admin/videos/parse-bv" -H "$AUTH" \
  -H 'Content-Type: application/json' -d '{"input":"https://www.bilibili.com/video/BV1xx411c7mD"}')
BVC=$(code "$BV")
if [ "$BVC" = "0" ] || [ "$BVC" = "2002" ]; then
  green "  [PASS] BV 解析（无网降级为 2002 亦可）code=$BVC"; PASS=$((PASS+1))
else
  red "  [FAIL] BV 解析 code=$BVC"; FAIL=$((FAIL+1))
fi
BADBV=$(curl -s --noproxy '*' --max-time 15 -X POST "$API/api/admin/videos/parse-bv" -H "$AUTH" \
  -H 'Content-Type: application/json' -d '{"input":"not-a-bv"}')
check "非法 BV → 2001" "2001" "$(code "$BADBV")"

# ---------- 5. 合集分发 + 分享页 ----------
echo "[5] 合集分发与分享页"
NEW=$(curl -s --noproxy '*' --max-time 20 -X POST "$API/api/admin/distributions" -H "$AUTH" \
  -H 'Content-Type: application/json' \
  -d '{"collection_name":"冒烟测试合集","customer_name":"张先生","customer_contact":"13800001111","duration_type":"1h","note":"自动化冒烟","video_ids":[1,2,3]}')
check "新建分发 code=0" "0" "$(code "$NEW")"
STOKEN=$(echo "$NEW" | python -c "import sys,json;print(json.load(sys.stdin)['data']['token'])" 2>/dev/null || echo "")
SHARE=$(curl -s --noproxy '*' --max-time 15 "$API/api/share/$STOKEN")
check "分享页 code=0" "0" "$(code "$SHARE")"
LEAK=$(echo "$SHARE" | grep -c "customer_name\|customer_contact\|13800001111\|张先生" || true)
check "分享页不泄露客户信息（R16/R22）" "0" "$LEAK"
BADSHARE=$(curl -s --noproxy '*' --max-time 15 "$API/api/share/no-such-token-xxxxx")
check "无效 token → 4001" "4001" "$(code "$BADSHARE")"

# ---------- 6. 工作台与内容维护 ----------
echo "[6] 工作台与内容维护"
DS=$(curl -s --noproxy '*' --max-time 15 "$API/api/admin/dashboard/stats" -H "$AUTH")
check "工作台统计 code=0" "0" "$(code "$DS")"
HS=$(curl -s --noproxy '*' --max-time 15 "$API/api/admin/hero-slides" -H "$AUTH")
HN=$(echo "$HS" | python -c "import sys,json;print(len(json.load(sys.stdin)['data']))" 2>/dev/null || echo 0)
check "首屏 3 组（R3）" "3" "$HN"
HO=$(curl -s --noproxy '*' --max-time 15 "$API/api/admin/honors" -H "$AUTH")
check "荣誉列表 code=0" "0" "$(code "$HO")"
LD=$(curl -s --noproxy '*' --max-time 15 "$API/api/admin/leads" -H "$AUTH")
check "留言列表 code=0" "0" "$(code "$LD")"

# ---------- 7. 前台预约 ----------
echo "[7] 前台预约"
LEAD=$(curl -s --noproxy '*' --max-time 15 -X POST "$API/api/public/leads" \
  -H 'Content-Type: application/json' -d '{"name":"冒烟测试","phone":"13800002222","demand_note":"自动化"}')
check "提交预约 code=0" "0" "$(code "$LEAD")"
BADLEAD=$(curl -s --noproxy '*' --max-time 15 -X POST "$API/api/public/leads" \
  -H 'Content-Type: application/json' -d '{"name":"","phone":"123"}')
check "非法预约 → 1001" "1001" "$(code "$BADLEAD")"

echo
echo "============================================================"
echo "  PASS: $PASS    FAIL: $FAIL"
echo "============================================================"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
