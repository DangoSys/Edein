#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
EDEIN_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"

MONGO_DBPATH="$EDEIN_ROOT/.local/mongo"
MONGO_LOG="$MONGO_DBPATH/mongod.log"
MONGO_PIDFILE="$MONGO_DBPATH/mongod.pid"

is_running() {
  if [ ! -f "$MONGO_PIDFILE" ]; then
    return 1
  fi
  local pid
  pid="$(cat "$MONGO_PIDFILE")"
  if [ -z "$pid" ]; then
    return 1
  fi
  kill -0 "$pid" 2>/dev/null
}

start_mongo() {
  mkdir -p "$MONGO_DBPATH"
  if is_running; then
    echo "mongo already running (pid $(cat "$MONGO_PIDFILE"))"
    return 0
  fi

  mongod \
    --dbpath "$MONGO_DBPATH" \
    --bind_ip 127.0.0.1 \
    --port 27017 \
    --logpath "$MONGO_LOG" \
    --pidfilepath "$MONGO_PIDFILE" \
    --fork
  echo "mongo started on 127.0.0.1:27017"
}

stop_mongo() {
  if ! is_running; then
    echo "mongo is not running"
    return 0
  fi

  mongod --shutdown --dbpath "$MONGO_DBPATH" >/dev/null
  rm -f "$MONGO_PIDFILE"
  echo "mongo stopped"
}

status_mongo() {
  if is_running; then
    echo "mongo running (pid $(cat "$MONGO_PIDFILE"))"
  else
    echo "mongo stopped"
  fi
}

cmd="${1:-start}"
case "$cmd" in
  start)
    start_mongo
    ;;
  stop)
    stop_mongo
    ;;
  restart)
    stop_mongo
    start_mongo
    ;;
  status)
    status_mongo
    ;;
  *)
    echo "usage: $0 {start|stop|restart|status}" >&2
    exit 1
    ;;
esac

