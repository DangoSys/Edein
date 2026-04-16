#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
EDEIN_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"

WEB_PORT="${1:-3000}"
API_PORT="${2:-8000}"

MONGO_STARTED=0


cd $EDEIN_ROOT

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
if bash ./scripts/nix/mongo-dev.sh start; then
  MONGO_STARTED=1
fi

cd server
uv run uvicorn main:app --host 0.0.0.0 --port "$API_PORT" &
API_PID=$!
cd $EDEIN_ROOT

cleanup() {
  kill "$API_PID" 2>/dev/null || true
  if [ "$MONGO_STARTED" -eq 1 ]; then
    bash ./scripts/nix/mongo-dev.sh stop >/dev/null 2>&1 || true
  fi
  exit
}

trap cleanup INT TERM

cd web
pnpm exec vite --host 0.0.0.0 --port "$WEB_PORT"
