#!/usr/bin/env bash
# ============================================================
# 交点影视 · 管理后台一键部署（本地构建 → 上传 → 线上产物完整性校验）
#
# 用法：
#   bash scripts/deploy-admin.sh <user@host> [remoteDir] [publicOrigin]
#
# 例：
#   bash scripts/deploy-admin.sh root@124.223.29.189 /srv/lightisle/admin/dist http://124.223.29.189:19010
#
# remoteDir 默认 /srv/lightisle/admin/dist（与 nginx.conf.example 一致）
#
# 为什么需要它：后台产物是 index.html + assets/*.js 的懒加载图，**整体上传**才有意义。
# 只漏传其中几个 chunk，入口和登录页照样能打开，但登录后的路由懒加载会静默失败
# —— 表现为「登录成功后不跳转」。所以本脚本最后一步强制校验线上产物。
#
# 部署是「先备份旧目录、再解包新目录」，出问题可直接回滚：
#   ssh <host> "rm -rf <remoteDir> && mv <remoteDir>.bak-<时间戳> <remoteDir>"
# ============================================================
set -euo pipefail

HOST="${1:-}"
REMOTE_DIR="${2:-/srv/lightisle/admin/dist}"
PUBLIC_ORIGIN="${3:-}"

if [ -z "$HOST" ]; then
  echo "用法：bash scripts/deploy-admin.sh <user@host> [remoteDir] [publicOrigin]" >&2
  exit 2
fi

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
ADMIN="$ROOT/admin"
NODE="${NODE_BIN:-node}"
SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new"

echo "==> 1/5 构建（vue-tsc + vite）"
cd "$ADMIN"
"$NODE" ./node_modules/vue-tsc/bin/vue-tsc.js --noEmit -p tsconfig.json
"$NODE" ./node_modules/vite/bin/vite.js build
test -f dist/index.html || { echo "构建失败：dist/index.html 不存在" >&2; exit 1; }
echo "    dist 资源数：$(ls dist/assets | wc -l)"

echo "==> 2/5 打包"
PKG="/tmp/lightisle-admin-dist.tar.gz"
tar -czf "$PKG" -C dist .
echo "    $PKG  ($(du -h "$PKG" | cut -f1))"

echo "==> 3/5 上传到 $HOST"
scp $SSH_OPTS "$PKG" "$HOST:/tmp/lightisle-admin-dist.tar.gz"

echo "==> 4/5 远端切换目录（旧目录先备份，可回滚）"
ssh $SSH_OPTS "$HOST" bash -s <<EOF
set -euo pipefail
DIR="$REMOTE_DIR"
TS=\$(date +%Y%m%d-%H%M%S)
if [ -d "\$DIR" ]; then mv "\$DIR" "\$DIR.bak-\$TS"; echo "    旧目录已备份为 \$DIR.bak-\$TS"; fi
mkdir -p "\$DIR"
tar -xzf /tmp/lightisle-admin-dist.tar.gz -C "\$DIR"
rm -f /tmp/lightisle-admin-dist.tar.gz
echo "    已解包：\$(ls "\$DIR/assets" | wc -l) 个资源"
EOF

echo "==> 5/5 线上产物完整性校验"
cd "$ROOT"
if [ -n "$PUBLIC_ORIGIN" ]; then
  "$NODE" scripts/verify-static-integrity.mjs "$PUBLIC_ORIGIN" --quiet
  echo "✅ 部署完成：$PUBLIC_ORIGIN"
else
  echo "（未传 publicOrigin，跳过线上校验。请手动执行："
  echo "  node scripts/verify-static-integrity.mjs <你的后台地址> ）"
fi
