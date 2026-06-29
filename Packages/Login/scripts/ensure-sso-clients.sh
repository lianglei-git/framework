#!/usr/bin/env bash
# Ensure SSO clients for a_sso / b_sso have correct redirect URIs
set -euo pipefail

BASE="${BASE_URL:-http://localhost:8080}"
ADMIN_USER="${ADMIN_USER:-zayne}"
ADMIN_PASS="${ADMIN_PASS:-zayne}"

login() {
  curl -s -X POST "$BASE/api/v1/auth/oauth-login" \
    -H "Content-Type: application/json" \
    -d "{\"provider\":\"local\",\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))"
}

patch_client() {
  local id="$1" uri="$2" name="$3"
  local token
  token=$(login)
  if [[ -z "$token" ]]; then
    echo "FAIL: admin login"
    exit 1
  fi
  code=$(curl -s -o /tmp/patch-sso.json -w "%{http_code}" \
    -X PUT "$BASE/api/v1/admin/sso-clients/$id" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -d "{\"redirect_uris\":[\"$uri\"],\"is_active\":true,\"name\":\"$name\"}")
  echo "  PATCH $id -> $uri HTTP $code"
  cat /tmp/patch-sso.json
  echo ""
}

echo "==> Patching SSO clients"
patch_client "8c1dd65d-7d2a-4ba4-aff1-610960a295e7" "http://localhost:5173" "sso_test_a"
patch_client "6a7db4e5-1c21-4cf1-92c9-507a0f924e29" "http://localhost:5174" "sso_test_b"
patch_client "f3e8a2b1-9c4d-4e5f-a6b7-c8d9e0f1a2b3" "http://localhost:5175" "sso_test_c"
echo "Done."
