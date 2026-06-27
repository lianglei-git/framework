#!/usr/bin/env bash
# unit-auth smoke test: health, providers, openid-configuration
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"

echo "==> Health"
curl -sf "${BASE_URL}/health" | head -c 200
echo ""

echo "==> SSO providers"
curl -sf "${BASE_URL}/api/v1/sso/providers" | head -c 400
echo ""

echo "==> Auth providers"
curl -sf "${BASE_URL}/api/v1/auth/providers" | head -c 400
echo ""

echo "==> OpenID configuration"
curl -sf "${BASE_URL}/api/v1/openid-configuration" | head -c 400
echo ""

echo "Smoke test passed."
