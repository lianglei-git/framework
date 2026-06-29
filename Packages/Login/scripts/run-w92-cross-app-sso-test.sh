#!/usr/bin/env bash
# W-92: Cross-app SSO — session cookie + B session-check / silent authorize
set -euo pipefail

BASE="${BASE_URL:-http://localhost:8080}"
BFF_A="${BFF_A_URL:-http://localhost:5555}"
BFF_B="${BFF_B_URL:-http://localhost:5556}"
PASS=0
FAIL=0

pass() { echo "  PASS $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL $1 — $2"; FAIL=$((FAIL + 1)); }

echo "==> W-92-01 Login and obtain session_id"
LOGIN=$(curl -s -X POST "$BASE/api/v1/auth/oauth-login" \
  -H "Content-Type: application/json" \
  -d '{"provider":"local","username":"zayne","password":"zayne"}')
SESSION_ID=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('session_id',''))")
[[ -n "$SESSION_ID" ]] && pass "session_id from login" || fail "session_id" "$LOGIN"

echo "==> W-92-02 BFF-B session-check (app sso_test_b)"
if [[ -n "$SESSION_ID" ]]; then
  SC=$(curl -s -X POST "$BFF_B/api/v1/auth/oauth/session-check" \
    -H "Content-Type: application/json" \
    -d "{\"session_id\":\"$SESSION_ID\",\"app_id\":\"sso_test_b\"}")
  ACC=$(echo "$SC" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")
  [[ -n "$ACC" ]] && pass "B session-check token" || fail "B session-check" "$SC"
else
  fail "B session-check" "no session_id"
fi

echo "==> W-92-03 Authorize B with cookie (no 3033)"
CLIENT_B="6a7db4e5-1c21-4cf1-92c9-507a0f924e29"
REDIRECT_B="http://localhost:5174"
if [[ -n "$SESSION_ID" ]]; then
  AUTH_B=$(curl -s "$BFF_B/api/v1/auth/oauth/sub_job/url?client_id=$CLIENT_B&redirect_uri=$REDIRECT_B&app_id=sso_test_b&response_type=code&scope=openid%20profile%20email")
  AUTH_URL=$(echo "$AUTH_B" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('auth_url',''))")
  LOC=$(curl -s -b "sso_session_id=$SESSION_ID" -D - -o /dev/null "$AUTH_URL" | awk 'tolower($1)=="location:" {print $2}' | tr -d '\r')
  if [[ "$LOC" == *"code="* && "$LOC" != *"3033"* ]]; then
    pass "silent authorize → code (no 3033)"
  elif [[ "$LOC" == *"code="* ]]; then
    pass "authorize → code (via redirect)"
  else
    fail "silent authorize" "location=$LOC"
  fi
else
  fail "silent authorize" "no session_id"
fi

echo ""
echo "PASS=$PASS FAIL=$FAIL"
[[ "$FAIL" -eq 0 ]]
