#!/usr/bin/env bash
# Packages/Login cross-module tests (plan section X)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/admin-credentials.sh
source "$ROOT/scripts/lib/admin-credentials.sh"

BASE="${BASE_URL:-http://localhost:8080}"
PASS=0
FAIL=0

pass() { echo "  PASS $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL $1 — $2"; FAIL=$((FAIL + 1)); }
section() { echo ""; echo "==> $1"; }

section "X-01 3033 login token works on /user/profile"
# Simulate login-web oauth-login
LOGIN=$(curl -s -X POST "$BASE/api/v1/auth/oauth-login" \
  -H "Content-Type: application/json" \
  -d '{"provider":"local","username":"zayne@qq.com","password":"zayne"}')
WEB_TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")
if [[ -n "$WEB_TOKEN" ]]; then
  code=$(curl -s -o /tmp/x-prof.json -w "%{http_code}" "$BASE/api/v1/user/profile" \
    -H "Authorization: Bearer $WEB_TOKEN")
  [[ "$code" == "200" ]] && pass "X-01" || fail "X-01" "profile status=$code"
else
  fail "X-01" "login failed"
fi

section "X-02 3040 vs 3033 token isolation (different storage keys)"
# Admin token from separate login
ADMIN_LOGIN=$(curl -s -X POST "$BASE/api/v1/auth/oauth-login" \
  -H "Content-Type: application/json" \
  -d "{\"provider\":\"local\",\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}")
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")
if [[ -n "$WEB_TOKEN" && -n "$ADMIN_TOKEN" ]]; then
  # Both should work independently (same user but separate client sessions)
  c1=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/admin/stats/users" -H "Authorization: Bearer $ADMIN_TOKEN")
  c2=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/user/profile" -H "Authorization: Bearer $WEB_TOKEN")
  [[ "$c1" == "200" && "$c2" == "200" ]] && pass "X-02 tokens valid independently" || fail "X-02" "admin=$c1 profile=$c2"
else
  fail "X-02" "missing tokens"
fi

section "X-04 login log recorded for local login"
if [[ -n "$WEB_TOKEN" ]]; then
  if [[ -n "$ADMIN_TOKEN" ]]; then
    logs=$(curl -s "$BASE/api/v1/admin/stats/login-logs?page=1&page_size=5&provider=local&success=true" \
      -H "Authorization: Bearer $ADMIN_TOKEN")
    count=$(echo "$logs" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',{}).get('logs',[])))" 2>/dev/null || echo 0)
    [[ "$count" -gt 0 ]] && pass "X-04 ($count recent local success logs)" || fail "X-04" "no logs"
  else
    fail "X-04" "no admin token"
  fi
else
  fail "X-04" "no web token"
fi

section "X-06 services reachable"
for url in "http://localhost:8080/health" "http://localhost:3033/" "http://localhost:3040/"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  [[ "$code" == "200" ]] && pass "X-06 $url" || fail "X-06 $url" "status=$code"
done

section "X-05 (deferred) sub-project OIDC chain"
bash "$(dirname "$0")/run-subproject-oidc-test.sh" && pass "X-05 full OIDC chain" || fail "X-05" "sub-project OIDC failed"

section "Summary"
echo "PASS=$PASS FAIL=$FAIL"
[[ "$FAIL" -eq 0 ]]
