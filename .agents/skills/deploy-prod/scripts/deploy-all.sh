#!/usr/bin/env bash
# ============================================================
# 交点影视 · 生产部署一键脚本（构建 → 上传 → 备份 → 重启 → 校验）
#
# 用法（在仓库根目录或任意位置执行均可）：
#   bash deploy-all.sh verify               # 只做线上健康检查，不改任何东西
#   bash deploy-all.sh                      # 全量：frontend + admin + backend（含构建）
#   bash deploy-all.sh frontend admin       # 只部署指定组件
#   bash deploy-all.sh --skip-build admin   # 跳过 npm build，直接用现成 dist
#   bash deploy-all.sh --sql <file.sql> ... # 部署前先在生产库执行迁移 SQL（自动先 dump 备份）
#
# 服务器约定见 SKILL.md。出问题回滚方法也见 SKILL.md。
# ============================================================
set -euo pipefail

HOST="${LIGHTISLE_HOST:-root@124.223.29.189}"
BASE="${LIGHTISLE_BASE:-/srv/lightisle}"
IP="${HOST#*@}"
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
TS="$(date +%Y%m%d-%H%M%S)"

run_remote() { ssh -o BatchMode=yes "$HOST" "$@" </dev/null; }

# 所有 ssh 一律重定向 stdin：不这样偶尔会挂住等输入
# 密码类解析一律在服务器端用 sed 从 .env 现读：本机与脚本不落库密码

verify() {
  echo "==== 线上健康检查 ===="
  echo "-- 官网标题"
  curl -s --max-time 10 "http://$IP/" | grep -o "<title>[^<]*</title>" || { echo "[X] 官网无响应"; return 1; }
  echo "-- 后台标题"
  curl -s --max-time 10 "http://$IP:19010/" | grep -o "<title>[^<]*</title>" || { echo "[X] 后台无响应"; return 1; }
  echo "-- API 站点数据"
  curl -s --max-time 10 "http://$IP/api/public/site" | python -c "import sys,json;d=json.load(sys.stdin)['data'];s=d['site_settings'];print('copyright:',s['copyright']);print('email:',s['email'])" || { echo "[X] API 无响应"; return 1; }
  echo "-- 产物完整性（chunk 缺失会导致路由懒加载静默失败）"
  node "$ROOT/scripts/verify-static-integrity.mjs" "http://$IP:19010" | tail -1
  node "$ROOT/scripts/verify-static-integrity.mjs" "http://$IP" | tail -1
  echo "-- 服务状态"
  run_remote "systemctl is-active lightisle-api"
}

# ---------- 模式一：只校验 ----------
if [ "${1:-}" = "verify" ]; then verify; exit 0; fi

# ---------- 参数解析 ----------
COMPONENTS=()
SQL_FILE=""
SKIP_BUILD=0
while [ $# -gt 0 ]; do
  case "$1" in
    --sql) SQL_FILE="$2"; shift 2 ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    frontend|admin|backend) COMPONENTS+=("$1"); shift ;;
    *) echo "未知参数: $1"; exit 1 ;;
  esac
done
[ ${#COMPONENTS[@]} -eq 0 ] && COMPONENTS=(frontend admin backend)

# ---------- 本地构建 ----------
if [ "$SKIP_BUILD" -eq 0 ] && [[ " ${COMPONENTS[*]} " == *" frontend "* || " ${COMPONENTS[*]} " == *" admin "* ]]; then
  pushd "$ROOT" >/dev/null
  [[ " ${COMPONENTS[*]} " == *" frontend "* ]] && (cd frontend && npm run build)
  [[ " ${COMPONENTS[*]} " == *" admin "* ]] && (cd admin && npm run build)
  popd >/dev/null
fi

# ---------- 数据库迁移（可选） ----------
if [ -n "$SQL_FILE" ]; then
  echo "==== 数据库迁移（先备份） ===="
  scp -q "$SQL_FILE" "$HOST:/tmp/deploy-sql.sql"
  run_remote "set -e
    export MYSQL_PWD=\$(sed -n 's/^DB_URL=mysql+pymysql:\/\/lightisle:\([^@]*\)@.*/\1/p' $BASE/backend/.env)
    [ -n \"\$MYSQL_PWD\" ] || { echo '[X] 未能从 .env 解析出数据库密码'; exit 1; }
    mkdir -p /root/backups
    BK=/root/backups/lightisle-pre-deploy-$TS.sql
    mysqldump -u lightisle --single-transaction lightisle < /dev/null > \$BK 2>/dev/null
    echo \"  dump: \$(du -h \$BK | cut -f1) -> \$BK\"
    mysql -u lightisle lightisle < /tmp/deploy-sql.sql
    rm -f /tmp/deploy-sql.sql
    echo '  SQL 已执行'"
fi

# ---------- 上传与切换 ----------
tar czf /tmp/lisd-admin.tar.gz    -C "$ROOT/admin/dist"    .
tar czf /tmp/lisd-frontend.tar.gz -C "$ROOT/frontend/dist" .
tar czf /tmp/lisd-backend.tar.gz  -C "$ROOT/backend" app
scp -q /tmp/lisd-admin.tar.gz /tmp/lisd-frontend.tar.gz /tmp/lisd-backend.tar.gz "$HOST:/tmp/"

echo "==== 服务器切换（旧版本备份为 *.bak-$TS） ===="
NGINX_USER="$(run_remote "sed -n 's/^[[:space:]]*user[[:space:]]\\+\\([^;]\\+\\);.*/\\1/p' /etc/nginx/nginx.conf | head -1 | tr -d ' '")"
NGINX_USER="${NGINX_USER:-nginx}"

if [[ " ${COMPONENTS[*]} " == *" admin "* ]]; then
  run_remote "set -e
    mv $BASE/admin/dist $BASE/admin/dist.bak-$TS
    mkdir -p $BASE/admin/dist && tar xzf /tmp/lisd-admin.tar.gz -C $BASE/admin/dist
    chown -R $NGINX_USER:$NGINX_USER $BASE/admin/dist
    echo '  admin/dist OK'"
fi
if [[ " ${COMPONENTS[*]} " == *" frontend "* ]]; then
  run_remote "set -e
    mv $BASE/frontend/dist $BASE/frontend/dist.bak-$TS
    mkdir -p $BASE/frontend/dist && tar xzf /tmp/lisd-frontend.tar.gz -C $BASE/frontend/dist
    chown -R $NGINX_USER:$NGINX_USER $BASE/frontend/dist
    nginx -t && systemctl reload nginx
    echo '  frontend/dist OK + nginx reloaded'"
fi
if [[ " ${COMPONENTS[*]} " == *" backend "* ]]; then
  run_remote "set -e
    cp -r $BASE/backend/app $BASE/backend/app.bak-$TS
    rm -rf $BASE/backend/app.new && tar xzf /tmp/lisd-backend.tar.gz -C $BASE/backend/ --transform 's/^app/app.new/'
    rm -rf $BASE/backend/app && mv $BASE/backend/app.new $BASE/backend/app
    systemctl restart lightisle-api && sleep 3
    systemctl is-active lightisle-api
    echo '  backend/app OK + service restarted'"
  echo "  ⚠️ 提醒：若本地模型新加了数据库列而生产库未迁移，API 会 500——"
  echo "     部署后立即看 verify 的 API 步骤；异常则做 schema 漂移检查（见 SKILL.md 坑清单第 1 条）"
fi

rm -f /tmp/lisd-admin.tar.gz /tmp/lisd-frontend.tar.gz /tmp/lisd-backend.tar.gz
run_remote "rm -f /tmp/lisd-admin.tar.gz /tmp/lisd-frontend.tar.gz /tmp/lisd-backend.tar.gz"

echo
verify
echo "==== 部署完成。回滚：把对应 *.bak-$TS 改回 dist/app 即可（详见 SKILL.md） ===="
