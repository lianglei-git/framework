#!/usr/bin/env bash
# 启动 c_sso 独立后端（使用 unit-auth/sdk）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
exec bash -c "cd '$ROOT/Js/project/c_sso/server' && go run ."
