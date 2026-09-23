#!/usr/bin/env bash
# 光屿摄影 · 开发环境一键启动（后端 + 官网 + 管理后台）
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "启动后端 :8000 ..."
( cd "$ROOT/backend" && ./.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload ) &

sleep 3

echo "启动官网 :5173 ..."
( cd "$ROOT/frontend" && npm run dev ) &

echo "启动管理后台 :5174 ..."
( cd "$ROOT/admin" && npm run dev ) &

echo ""
echo "官网       http://localhost:5173"
echo "管理后台   http://localhost:5174"
echo "接口文档   http://127.0.0.1:8000/docs"
echo "Ctrl+C 停止全部"
wait
