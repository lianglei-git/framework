#!/usr/bin/env bash
# 统一读取管理员测试账号（与 unit-auth 种子用户 / .env 一致）
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT/unit-auth/.env"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  source <(grep -E '^(ADMIN_USERNAME|ADMIN_INITIAL_PASSWORD)=' "$ENV_FILE" 2>/dev/null || true)
  set +a
fi

export ADMIN_USERNAME="${ADMIN_USERNAME:-zayne}"
export ADMIN_INITIAL_PASSWORD="${ADMIN_INITIAL_PASSWORD:-Sparrow@Admin2026}"
export ADMIN_USER="${ADMIN_USER:-$ADMIN_USERNAME}"
export ADMIN_PASS="${ADMIN_PASS:-$ADMIN_INITIAL_PASSWORD}"
