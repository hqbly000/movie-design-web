@echo off
chcp 65001 >nul
title 光屿摄影 · 开发环境启动器

echo ============================================================
echo   光屿摄影 LIGHT ISLE STUDIO · 开发环境
echo   backend :8000   frontend :5173   admin :5174
echo ============================================================
echo.

if not exist "%~dp0backend\.venv\Scripts\python.exe" (
  echo [X] 未找到 backend\.venv，请先创建虚拟环境并安装依赖。
  pause
  exit /b 1
)

echo [1/3] 启动后端 API (8000) ...
start "LightIsle-API" cmd /k "cd /d %~dp0backend && .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo [2/3] 启动官网 (5173) ...
start "LightIsle-Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo [3/3] 启动管理后台 (5174) ...
start "LightIsle-Admin" cmd /k "cd /d %~dp0admin && npm run dev"

echo.
echo 已全部启动。等待约 5 秒后在浏览器打开：
echo   官网       http://localhost:5173
echo   管理后台   http://localhost:5174
echo   接口文档   http://127.0.0.1:8000/docs
echo.
echo 关闭对应窗口即可停止服务。
pause
