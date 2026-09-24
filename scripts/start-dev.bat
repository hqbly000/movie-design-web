@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "PATH=%SystemRoot%\System32;%PATH%"
title LightIsle Dev Launcher

rem ============================================================
rem  光屿摄影 LIGHT ISLE STUDIO · 一键启动开发环境
rem  本脚本位于 scripts\ 下，自动向上定位项目根目录
rem  backend :8000   frontend :5173   admin :5174
rem ============================================================

for %%i in ("%~dp0..") do set "ROOT=%%~fi"

echo ============================================================
echo   光屿摄影 LIGHT ISLE STUDIO · 开发环境
echo   backend :8000    frontend :5173    admin :5174
echo   根目录: %ROOT%
echo ============================================================
echo.

rem ---- 0. 前置检查 ----
if not exist "%ROOT%\backend\.venv\Scripts\python.exe" (
  echo [X] 未找到 backend\.venv\Scripts\python.exe
  echo     重建方法：
  echo       cd /d "%ROOT%\backend"
  echo       python -m venv .venv
  echo       .venv\Scripts\python.exe -m pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/
  echo.
  pause
  exit /b 1
)
echo [OK] backend\.venv 就绪

if not exist "%ROOT%\backend\.env" (
  copy "%ROOT%\backend\.env.example" "%ROOT%\backend\.env" >nul
  echo [i] 已生成 backend\.env（来自 .env.example），请确认数据库连接
)

call :ensure_deps frontend
if errorlevel 1 (pause & exit /b 1)
call :ensure_deps admin
if errorlevel 1 (pause & exit /b 1)

rem ---- 1. 端口预检（残留的 dev server 会占住端口）----
call :free_port 8000
call :free_port 5173
call :free_port 5174

rem ---- 2. 启动三个服务（各自独立窗口，关窗即停止）----
echo.
echo [1/3] 启动后端 API :8000 ...
start "LightIsle-API :8000" cmd /k "cd /d "%ROOT%\backend" && .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo [2/3] 启动官网 :5173 ...
start "LightIsle-Frontend :5173" cmd /k "cd /d "%ROOT%\frontend" && npm run dev"

timeout /t 2 /nobreak >nul

echo [3/3] 启动管理后台 :5174 ...
start "LightIsle-Admin :5174" cmd /k "cd /d "%ROOT%\admin" && npm run dev"

rem ---- 3. 打开浏览器 ----
echo.
echo 等待服务就绪...
timeout /t 6 /nobreak >nul
start "" http://localhost:5173
start "" http://localhost:5174
start "" http://127.0.0.1:8000/docs

echo.
echo ============================================================
echo   已启动：
echo     官网       http://localhost:5173
echo     管理后台   http://localhost:5174
echo     接口文档   http://127.0.0.1:8000/docs
echo.
echo   停止：关闭对应命令行窗口，或双击 scripts\stop-dev.bat 一键全停
echo.
echo   提示：若浏览器 502 / 打不开，多半是系统代理拦截了 localhost，
echo         把 127.0.0.1 和 localhost 加入代理的绕过列表即可
echo ============================================================
echo.
pause
exit /b 0

rem ============ 子过程 ============

:ensure_deps
if exist "%ROOT%\%~1\node_modules" (
  echo [OK] %~1 依赖已安装
  exit /b 0
)
echo [..] %~1 缺少 node_modules，开始安装（npmmirror 镜像）...
pushd "%ROOT%\%~1"
call npm install --registry=https://registry.npmmirror.com
set "RC=%errorlevel%"
popd
if not "%RC%"=="0" (
  echo [X] %~1 依赖安装失败，请检查网络后重试
  exit /b 1
)
echo [OK] %~1 依赖安装完成
exit /b 0

:free_port
set "PORT=%~1"
set "HIT="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /C:":%PORT% " ^| findstr /C:"LISTENING"') do set "HIT=%%p"
if not defined HIT (
  echo [OK] 端口 %PORT% 空闲
  exit /b 0
)
set "PNAME="
for /f "tokens=1" %%n in ('tasklist /FI "PID eq %HIT%" /NH 2^>nul') do if not defined PNAME set "PNAME=%%n"
echo [!] 端口 %PORT% 已被占用  PID=%HIT%  进程=%PNAME%
set "ANS="
set /p "ANS=    结束该进程后继续？(Y/N，回车默认N) "
if /i "%ANS%"=="Y" (
  taskkill /F /PID %HIT% >nul 2>&1
  if errorlevel 1 (
    echo     [X] 结束失败，可手动执行 taskkill /F /PID %HIT%
  ) else (
    echo     [OK] 已结束
  )
) else (
  echo     保留原进程继续（Vite 可能自动换端口，后端则会启动失败）
)
exit /b 0
