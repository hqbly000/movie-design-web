@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "PATH=%SystemRoot%\System32;%PATH%"
title LightIsle Dev Stopper

rem ============================================================
rem  光屿摄影 · 一键停止开发环境（backend / frontend / admin）
rem  先按窗口标题结束（连 --reload 子进程一起杀），
rem  再兜底检查端口上是否还有残留监听。
rem ============================================================

echo 光屿摄影 · 停止开发环境
echo.

echo [1/2] 按窗口标题结束...
taskkill /F /T /FI "WINDOWTITLE eq LightIsle-API :8000*" >nul 2>&1 && (echo   [OK] backend 窗口已结束) || (echo   [i] backend 窗口未在运行)
taskkill /F /T /FI "WINDOWTITLE eq LightIsle-Frontend :5173*" >nul 2>&1 && (echo   [OK] frontend 窗口已结束) || (echo   [i] frontend 窗口未在运行)
taskkill /F /T /FI "WINDOWTITLE eq LightIsle-Admin :5174*" >nul 2>&1 && (echo   [OK] admin 窗口已结束) || (echo   [i] admin 窗口未在运行)

echo.
echo [2/2] 检查端口残留监听...
call :kill_port 8000
call :kill_port 5173
call :kill_port 5174

echo.
echo 完成。若个别命令行窗口还开着，直接关掉即可。
echo.
pause
exit /b 0

:kill_port
set "PORT=%~1"
set "FOUND=0"
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /C:":%PORT% " ^| findstr /C:"LISTENING"') do call :kill_one %PORT% %%p
if "%FOUND%"=="0" echo   [OK] 端口 %PORT% 无监听进程
exit /b 0

:kill_one
set "FOUND=1"
set "PNAME="
for /f "tokens=1" %%n in ('tasklist /FI "PID eq %2" /NH 2^>nul') do if not defined PNAME set "PNAME=%%n"
echo   端口 %1  PID=%2  进程=%PNAME%
if /i "%PNAME%"=="node.exe" goto do_kill
if /i "%PNAME%"=="python.exe" goto do_kill
echo   [i] 不是 node/python，可能是其他程序占用，已跳过
echo       如需强杀：taskkill /F /PID %2
exit /b 0

:do_kill
taskkill /F /T /PID %2 >nul 2>&1
if errorlevel 1 (
  echo   [X] 结束失败，可手动执行 taskkill /F /PID %2
) else (
  echo   [OK] 已停止
)
exit /b 0
