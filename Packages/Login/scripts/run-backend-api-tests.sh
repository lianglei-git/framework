#!/usr/bin/env bash
# Packages/Login backend API test runner (plan section B)
set -euo pipefail

BASE="${BASE_URL:-http://localhost:8080}"
PASS=0
FAIL=0
SKIP=0

pass() { echo "  PASS $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL $1 — $2"; FAIL=$((FAIL + 1)); }
skip() { echo "  SKIP $1 — $2"; SKIP=$((SKIP + 1)); }

section() { echo ""; echo "==> $1"; }

# --- B-01 health ---
section "B-01 GET /health"
code=$(curl -s -o /tmp/b-health.json -w "%{http_code}" "$BASE/health")
[[ "$code" == "200" ]] && pass "B-01" || fail "B-01" "status=$code"

# --- B-05 B-06 OIDC ---
section "B-05 openid-configuration"
code=$(curl -s -o /tmp/b-oidc.json -w "%{http_code}" "$BASE/api/v1/openid-configuration")
[[ "$code" == "200" ]] && pass "B-05" || fail "B-05" "status=$code"

section "B-06 jwks-json"
code=$(curl -s -o /tmp/b-jwks.json -w "%{http_code}" "$BASE/api/v1/jwks-json")
[[ "$code" == "200" ]] && pass "B-06" || fail "B-06" "status=$code"

# --- B-07 CORS ---
section "B-07 CORS preflight"
code=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$BASE/api/v1/auth/oauth-login" \
  -H "Origin: http://localhost:3040" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization,Content-Type")
[[ "$code" == "204" || "$code" == "200" ]] && pass "B-07" || fail "B-07" "status=$code"

# --- B-10 login success ---
section "B-10 oauth-login success"
LOGIN_JSON=$(curl -s -X POST "$BASE/api/v1/auth/oauth-login" \
  -H "Content-Type: application/json" \
  -d '{"provider":"local","username":"zayne","password":"zayne"}')
ADMIN_TOKEN=$(echo "$LOGIN_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null || true)
if [[ -n "$ADMIN_TOKEN" ]]; then
  pass "B-10"
else
  fail "B-10" "no access_token"
fi

# --- B-11 wrong password ---
section "B-11 wrong password"
code=$(curl -s -o /tmp/b-bad.json -w "%{http_code}" -X POST "$BASE/api/v1/auth/oauth-login" \
  -H "Content-Type: application/json" \
  -d '{"provider":"local","username":"zayne","password":"wrong"}')
[[ "$code" == "401" ]] && pass "B-11" || fail "B-11" "status=$code expected 401"

# --- B-12 unknown user ---
section "B-12 unknown user"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/v1/auth/oauth-login" \
  -H "Content-Type: application/json" \
  -d '{"provider":"local","username":"nonexistent_user_xyz","password":"x"}')
[[ "$code" == "401" ]] && pass "B-12" || fail "B-12" "status=$code"

# --- B-13 username login ---
section "B-13 login by username"
code=$(curl -s -o /tmp/b-u.json -w "%{http_code}" -X POST "$BASE/api/v1/auth/oauth-login" \
  -H "Content-Type: application/json" \
  -d '{"provider":"local","username":"zayne","password":"zayne"}')
[[ "$code" == "200" ]] && pass "B-13 username" || fail "B-13 username" "status=$code"

# --- B-30 profile with RS256 token ---
section "B-30 GET /user/profile with RS256 token"
if [[ -n "${ADMIN_TOKEN:-}" ]]; then
  code=$(curl -s -o /tmp/b-profile.json -w "%{http_code}" "$BASE/api/v1/user/profile" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  [[ "$code" == "200" ]] && pass "B-30" || fail "B-30" "status=$code body=$(cat /tmp/b-profile.json)"
else
  skip "B-30" "no token"
fi

# --- B-31 no token ---
section "B-31 no token"
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/user/profile")
[[ "$code" == "401" ]] && pass "B-31" || fail "B-31" "status=$code"

# --- B-33 admin users ---
section "B-33 admin users with admin token"
if [[ -n "${ADMIN_TOKEN:-}" ]]; then
  code=$(curl -s -o /tmp/b-admin.json -w "%{http_code}" "$BASE/api/v1/admin/users?page=1&page_size=5" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  [[ "$code" == "200" ]] && pass "B-33" || fail "B-33" "status=$code"
else
  skip "B-33" "no token"
fi

# --- B-40 providers ---
section "B-40 GET /auth/providers"
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/auth/providers")
[[ "$code" == "200" ]] && pass "B-40" || fail "B-40" "status=$code"

# --- B-50-B-52 user self-service ---
section "B-50-B-51 profile read/update"
if [[ -n "${ADMIN_TOKEN:-}" ]]; then
  code=$(curl -s -o /tmp/b-prof.json -w "%{http_code}" "$BASE/api/v1/user/profile" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  [[ "$code" == "200" ]] && pass "B-50" || fail "B-50" "status=$code"
  code=$(curl -s -o /tmp/b-put.json -w "%{http_code}" -X PUT "$BASE/api/v1/user/profile" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"nickname":"zayne-test"}')
  [[ "$code" == "200" ]] && pass "B-51" || fail "B-51" "status=$code"
  # restore nickname
  curl -s -o /dev/null -X PUT "$BASE/api/v1/user/profile" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"nickname":"zayne"}' || true
else
  skip "B-50" "no token"
  skip "B-51" "no token"
fi

# --- B-60 stats ---
section "B-60 stats endpoints"
if [[ -n "${ADMIN_TOKEN:-}" ]]; then
  for ep in overall daily users logins; do
    code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/stats/$ep" \
      -H "Authorization: Bearer $ADMIN_TOKEN")
    [[ "$code" == "200" ]] && pass "B-60/$ep" || fail "B-60/$ep" "status=$code"
  done
else
  skip "B-60" "no token"
fi

# --- B-70 B-71 admin stats ---
section "B-70 B-71 admin stats"
if [[ -n "${ADMIN_TOKEN:-}" ]]; then
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/admin/stats/users" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  [[ "$code" == "200" ]] && pass "B-70" || fail "B-70" "status=$code"
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/admin/stats/login-logs?page=1&page_size=5" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  [[ "$code" == "200" ]] && pass "B-71" || fail "B-71" "status=$code"
else
  skip "B-70" "no token"
  skip "B-71" "no token"
fi

section "Summary"
echo "PASS=$PASS FAIL=$FAIL SKIP=$SKIP"
[[ "$FAIL" -eq 0 ]]
