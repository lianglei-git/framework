#!/usr/bin/env bash
# X-05: Sub-project OIDC chain (BFF token exchange)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/admin-credentials.sh
source "$ROOT/scripts/lib/admin-credentials.sh"

BASE="${BASE_URL:-http://localhost:8080}"
BFF_A="${BFF_A_URL:-http://localhost:5555}"
PASS=0
FAIL=0

pass() { echo "  PASS $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL $1 — $2"; FAIL=$((FAIL + 1)); }

CLIENT_A="8c1dd65d-7d2a-4ba4-aff1-610960a295e7"
REDIRECT_A="http://localhost:5173"

echo "==> X-05-01 BFF health"
for url in "$BFF_A/health" "$BASE/health"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  [[ "$code" == "200" ]] && pass "$url" || fail "$url" "status=$code"
done

echo "==> X-05-02 BFF authorize URL"
AUTH_JSON=$(curl -s "$BFF_A/api/v1/auth/oauth/sub_job/url?client_id=$CLIENT_A&redirect_uri=$REDIRECT_A&response_type=code&scope=openid%20profile%20email&state=teststate")
AUTH_URL=$(echo "$AUTH_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('auth_url',''))")
[[ -n "$AUTH_URL" && "$AUTH_URL" == *"authorize"* ]] && pass "auth_url built" || fail "auth_url" "$AUTH_JSON"

echo "==> X-05-03 Login + authorize (session cookie)"
LOGIN=$(curl -s -X POST "$BASE/api/v1/auth/oauth-login" \
  -H "Content-Type: application/json" \
  -d "{\"provider\":\"local\",\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}")
SESSION_ID=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('session_id',''))")
[[ -n "$SESSION_ID" ]] && pass "local login (session_id)" || fail "local login" "$LOGIN"

LOC=$(curl -s -b "sso_session_id=$SESSION_ID" -D - -o /dev/null "$AUTH_URL" | awk 'tolower($1)=="location:" {print $2}' | tr -d '\r')
CODE=""
if [[ "$LOC" == *"code="* ]]; then
  CODE=$(python3 -c "from urllib.parse import urlparse,parse_qs; u='$LOC'; q=parse_qs(urlparse(u).query); print(q.get('code',[''])[0])")
fi
[[ -n "$CODE" ]] && pass "authorization code issued" || fail "authorization code" "location=$LOC"

echo "==> X-05-04 Token exchange via BFF"
if [[ -n "$CODE" ]]; then
  TOKEN_RESP=$(curl -s -X POST "$BFF_A/api/v1/auth/oauth/token" \
    -H "Content-Type: application/json" \
    -d "{\"grant_type\":\"authorization_code\",\"code\":\"$CODE\",\"redirect_uri\":\"$REDIRECT_A\",\"client_id\":\"$CLIENT_A\"}")
  ACCESS=$(echo "$TOKEN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")
  REFRESH=$(echo "$TOKEN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('refresh_token',''))")
  [[ -n "$ACCESS" ]] && pass "access_token" || fail "access_token" "$TOKEN_RESP"

  echo "==> X-05-05 Userinfo"
  if [[ -n "$ACCESS" ]]; then
    UI=$(curl -s -o /tmp/x05-ui.json -w "%{http_code}" "$BFF_A/api/v1/auth/oauth/userinfo" -H "Authorization: Bearer $ACCESS")
    [[ "$UI" == "200" ]] && pass "userinfo 200" || fail "userinfo" "status=$UI $(cat /tmp/x05-ui.json)"
  fi

  echo "==> X-05-06 Refresh token"
  if [[ -n "$REFRESH" ]]; then
    REF=$(curl -s -X POST "$BFF_A/api/v1/auth/oauth/refresh" \
      -H "Content-Type: application/json" \
      -d "{\"grant_type\":\"refresh_token\",\"refresh_token\":\"$REFRESH\"}")
    NEW=$(echo "$REF" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")
    [[ -n "$NEW" ]] && pass "refresh_token" || fail "refresh_token" "$REF"
  else
    fail "refresh_token" "no refresh in token response"
  fi
else
  fail "token exchange" "skipped — no code"
fi

BFF_B="${BFF_B_URL:-http://localhost:5556}"
CLIENT_B="6a7db4e5-1c21-4cf1-92c9-507a0f924e29"
REDIRECT_B="http://localhost:5174"

echo "==> X-05-B BFF-B health + token chain"
code=$(curl -s -o /dev/null -w "%{http_code}" "$BFF_B/health")
[[ "$code" == "200" ]] && pass "BFF-B health" || fail "BFF-B health" "status=$code"

if [[ -n "$SESSION_ID" ]]; then
  AUTH_B=$(curl -s "$BFF_B/api/v1/auth/oauth/sub_job/url?client_id=$CLIENT_B&redirect_uri=$REDIRECT_B&response_type=code&scope=openid%20profile%20email&state=btest")
  AUTH_B_URL=$(echo "$AUTH_B" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('auth_url',''))")
  LOC_B=$(curl -s -b "sso_session_id=$SESSION_ID" -D - -o /dev/null "$AUTH_B_URL" | awk 'tolower($1)=="location:" {print $2}' | tr -d '\r')
  CODE_B=""
  if [[ "$LOC_B" == *"code="* ]]; then
    CODE_B=$(python3 -c "from urllib.parse import urlparse,parse_qs; u='$LOC_B'; q=parse_qs(urlparse(u).query); print(q.get('code',[''])[0])")
  fi
  [[ -n "$CODE_B" ]] && pass "B authorization code" || fail "B authorization code" "location=$LOC_B"
  if [[ -n "$CODE_B" ]]; then
    TOK_B=$(curl -s -X POST "$BFF_B/api/v1/auth/oauth/token" -H "Content-Type: application/json" \
      -d "{\"grant_type\":\"authorization_code\",\"code\":\"$CODE_B\",\"redirect_uri\":\"$REDIRECT_B\",\"client_id\":\"$CLIENT_B\"}")
    ACC_B=$(echo "$TOK_B" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")
    [[ -n "$ACC_B" ]] && pass "B access_token" || fail "B access_token" "$TOK_B"
  fi
fi

echo ""
echo "PASS=$PASS FAIL=$FAIL"
[[ "$FAIL" -eq 0 ]]
