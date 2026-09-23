#!/usr/bin/env bash
# 光屿摄影 · 数据库初始化（建库建表 + 种子数据）
# 目标实例存在他人业务库（ctm / itrial_* 等），本脚本只操作 lightisle
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MYSQL_BIN="${MYSQL_BIN:-/d/Dev/VM/mysql-8.0.27-winx64/bin/mysql}"
DB_HOST="${DB_HOST:-10.66.237.199}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-12345678}"

echo "==> 建库建表：$DB_HOST:$DB_PORT  (库 lightisle)"
"$MYSQL_BIN" -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" \
  --default-character-set=utf8mb4 < "$ROOT/backend/scripts/schema.sql"

echo "==> 校验表"
"$MYSQL_BIN" -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" \
  -e "SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema='lightisle';"

echo "==> 写入种子数据（幂等）"
cd "$ROOT/backend"
./.venv/Scripts/python.exe -m app.seed

echo "==> 完成"
