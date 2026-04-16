#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
EDEIN_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"

WEB_PORT="${1:-3000}"
API_PORT="${2:-8000}"

MONGO_DBPATH=".local/mongo"
MONGO_LOG="$MONGO_DBPATH/mongod.log"
MONGO_STARTED=0


cd $EDEIN_ROOT

mkdir -p $MONGO_DBPATH

#===--- Building Wasm ---===#
wasm-pack build web/wasm --target web --out-dir ../pkg

#===--- Installing Frontend Dependencies ---===#
cd web
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
cd $EDEIN_ROOT


#===--- Installing Python Dependencies ---===#
cd server
uv sync --no-dev

#===--- Starting Servers ---===#
# MongoDB
# server
#===------------------------===#
cd $EDEIN_ROOT
if mongod --dbpath "$MONGO_DBPATH" --bind_ip 127.0.0.1 --port 27017 --logpath "$MONGO_LOG" --fork; then
  MONGO_STARTED=1
  echo "==> started mongo on :27017"
else
  echo "==> mongo already running or failed to start (see $MONGO_LOG)"
fi

cd server
uv run uvicorn main:app --host 0.0.0.0 --port "$API_PORT" &
API_PID=$!
cd $EDEIN_ROOT

cleanup() {
  kill "$API_PID" 2>/dev/null || true
  if [ "$MONGO_STARTED" -eq 1 ]; then
    mongod --shutdown --dbpath "$MONGO_DBPATH" >/dev/null 2>&1 || true
  fi
  exit
}

trap cleanup INT TERM

cd web
pnpm exec vite --host 0.0.0.0 --port "$WEB_PORT"
