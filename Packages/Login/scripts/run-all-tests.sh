#!/usr/bin/env bash
# Run all automated Packages/Login tests from the test plan
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAIL=0

# shellcheck source=lib/admin-credentials.sh
source "$ROOT/scripts/lib/admin-credentials.sh"

step() {
  local name="$1"
  shift
  echo ""
  echo "########################################"
  echo "# $name"
  echo "########################################"
  if "$@"; then
    echo ">>> OK: $name"
  else
    echo ">>> FAILED: $name"
    FAIL=$((FAIL + 1))
  fi
}

step "unit-auth smoke" bash "$ROOT/unit-auth/scripts/smoke-test.sh"
step "JWT unit tests" bash -c "cd '$ROOT/unit-auth' && go test ./utils/ -run TestValidateEnhancedToken -count=1"
step "login-web integration" bash -c "cd '$ROOT/web' && pnpm test:integration"
step "admin API smoke" node "$ROOT/admin-web/scripts/smoke-admin.mjs"
step "backend API tests (B)" bash "$ROOT/scripts/run-backend-api-tests.sh"
step "cross-module tests (X)" bash "$ROOT/scripts/run-cross-module-tests.sh"
step "sub-project OIDC (X-05)" bash "$ROOT/scripts/run-subproject-oidc-test.sh"
step "cross-app SSO (W-92)" bash "$ROOT/scripts/run-w92-cross-app-sso-test.sh"

echo ""
if [[ "$FAIL" -eq 0 ]]; then
  echo "All automated test suites passed."
  exit 0
else
  echo "$FAIL suite(s) failed."
  exit 1
fi
