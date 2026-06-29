#!/usr/bin/env bash
# Start full sub-project dev stack (run from repo root or Packages/Login)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
LOGIN="$(cd "$(dirname "$0")/.." && pwd)"
UA="$LOGIN/unit-auth"
LOG_DIR="${TMPDIR:-/tmp}/subproject-sso-logs"
mkdir -p "$LOG_DIR"

echo "Logs: $LOG_DIR"

start_bg() {
  local name="$1"
  shift
  echo "Starting $name ..."
  nohup "$@" >"$LOG_DIR/$name.log" 2>&1 &
  echo $! >"$LOG_DIR/$name.pid"
}

# unit-auth
if curl -sf "http://localhost:8080/health" >/dev/null 2>&1; then
  echo "unit-auth already on :8080"
else
  start_bg unit-auth bash -c "cd '$UA' && go run ."
  for i in $(seq 1 30); do
    curl -sf "http://localhost:8080/health" >/dev/null 2>&1 && break
    sleep 1
  done
fi

# login-web :3033
if curl -sf "http://localhost:3033/" >/dev/null 2>&1; then
  echo "login-web already on :3033"
else
  start_bg login-web bash -c "cd '$LOGIN/web' && pnpm start"
fi

# BFF A :5555
if curl -sf "http://localhost:5555/health" >/dev/null 2>&1; then
  echo "bff-a already on :5555"
else
  start_bg bff-a bash -c "cd '$UA' && go run ./examples/bff/main.go -config ./examples/bff/config-a.json"
fi

# BFF B :5556
if curl -sf "http://localhost:5556/health" >/dev/null 2>&1; then
  echo "bff-b already on :5556"
else
  start_bg bff-b bash -c "cd '$UA' && go run ./examples/bff/main.go -config ./examples/bff/config-b.json"
fi

# BFF C :5557 → c_sso 独立后端
if curl -sf "http://localhost:5557/health" >/dev/null 2>&1; then
  echo "c_sso server already on :5557"
else
  start_bg c-sso-server bash -c "cd '$ROOT/Js/project/c_sso/server' && go run ."
fi

bash "$LOGIN/scripts/ensure-sso-clients.sh" || true

# sub-apps
if curl -sf "http://localhost:5173/" >/dev/null 2>&1; then
  echo "a_sso already on :5173"
else
  start_bg a_sso bash -c "cd '$ROOT/Js/project/a_sso' && pnpm dev"
fi

if curl -sf "http://localhost:5174/" >/dev/null 2>&1; then
  echo "b_sso already on :5174"
else
  start_bg b_sso bash -c "cd '$ROOT/Js/project/b_sso' && pnpm dev"
fi

if curl -sf "http://localhost:5175/" >/dev/null 2>&1; then
  echo "c_sso already on :5175"
else
  start_bg c_sso bash -c "cd '$ROOT/Js/project/c_sso' && pnpm dev"
fi

echo ""
echo "Stack starting. Tail logs: tail -f $LOG_DIR/*.log"
echo "  unit-auth  http://localhost:8080"
echo "  login-web  http://localhost:3033"
echo "  BFF-A      http://localhost:5555"
echo "  BFF-B      http://localhost:5556"
echo "  c_sso API  http://localhost:5557  (Js/project/c_sso/server)"
echo "  a_sso      http://localhost:5173"
echo "  b_sso      http://localhost:5174"
echo "  c_sso      http://localhost:5175"
