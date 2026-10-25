@echo off
chcp 65001 >nul
title Dev DB tunnel - lightisle (13306 -> 124.223.29.189:3306)
setlocal

set KEY=D:\Dev\VM\workbuddy.pem
set OLDHOST=124.223.29.189
set LOCALPORT=13306
set SSH=C:\Windows\System32\OpenSSH\ssh.exe

echo ============================================================
echo  Local dev database tunnel
echo  localhost:%LOCALPORT%  --^>  %OLDHOST% : 3306 (MySQL on old server)
echo ============================================================
echo.

if not exist "%KEY%" (
  echo [ERROR] key not found: %KEY%
  pause
  exit /b 1
)

if not exist "%SSH%" (
  echo [ERROR] ssh not found: %SSH%
  pause
  exit /b 1
)

echo Starting tunnel... keep this window OPEN.
echo Press Ctrl+C to stop.
echo.

"%SSH%" -i "%KEY%" -o BatchMode=yes -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ExitOnForwardFailure=yes -N -L %LOCALPORT%:127.0.0.1:3306 root@%OLDHOST%

echo.
echo Tunnel closed.
pause
