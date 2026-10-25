#!/bin/bash
# ============================================================
# 本地开发数据库隧道：把老服务器 124.223.29.189 的 MySQL 3306
# 映射到本机 127.0.0.1:13306（不让数据库直接暴露公网）
#
# 用法：
#   bash scripts/dev-db-tunnel.sh          # 前台常驻，Ctrl+C 断开
#   bash scripts/dev-db-tunnel.sh --bg     # 后台常驻，pid 写入 .dev-tunnel.pid
#   bash scripts/dev-db-tunnel.sh --stop   # 停掉后台隧道
# ============================================================
set -u

KEY="${DEV_DB_KEY:-D:/Dev/VM/workbuddy.pem}"
OLDHOST="${DEV_DB_HOST:-124.223.29.189}"
LOCALPORT="${DEV_DB_PORT:-13306}"
PIDFILE="$(dirname "$0")/../.dev-tunnel.pid"

SSH_BIN="/c/Windows/System32/OpenSSH/ssh.exe"
[ -x "$SSH_BIN" ] || SSH_BIN="$(command -v ssh)"

stop_tunnel() {
  if [ -f "$PIDFILE" ]; then
    PID=$(cat "$PIDFILE")
    if kill -0 "$PID" 2>/dev/null; then kill "$PID" && echo "已停止隧道（pid=$PID）"; else echo "pid=$PID 已不在运行"; fi
    rm -f "$PIDFILE"
  else
    echo "没有找到 pid 文件，可能未以后台方式启动过"
  fi
}

case "${1:-}" in
  --stop) stop_tunnel; exit 0 ;;
esac

if [ ! -f "$KEY" ] && [ ! -f "/${KEY#?}" ]; then
  echo "密钥不存在：$KEY" >&2; exit 1
fi

ARGS="-i $KEY -o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ServerAliveInterval=30 -o ExitOnForwardFailure=yes -N -L $LOCALPORT:127.0.0.1:3306 root@$OLDHOST"

if [ "${1:-}" = "--bg" ]; then
  nohup "$SSH_BIN" $ARGS >/dev/null 2>&1 &
  echo $! > "$PIDFILE"
  sleep 2
  if timeout 5 bash -c "exec 3<>/dev/tcp/127.0.0.1/$LOCALPORT" 2>/dev/null; then
    echo "隧道已后台启动：127.0.0.1:$LOCALPORT -> $OLDHOST:3306（pid=$(cat "$PIDFILE")）"
  else
    echo "隧道启动失败，请前台运行看报错" >&2; rm -f "$PIDFILE"; exit 1
  fi
else
  echo "隧道：127.0.0.1:$LOCALPORT -> $OLDHOST:3306     Ctrl+C 断开"
  exec "$SSH_BIN" $ARGS
fi
