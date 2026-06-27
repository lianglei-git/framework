#!/bin/bash

# 测试授权码数据库存储功能
# 使用方法：./test-authorization-code.sh

BASE_URL="http://localhost:8080"
CLIENT_ID="test_client"
CLIENT_SECRET="test_secret"
REDIRECT_URI="http://localhost:3000/callback"

echo "🧪 测试授权码数据库存储功能"
echo "========================================"

echo ""
echo "1. 首先创建测试客户端..."
curl -X POST "$BASE_URL/api/v1/sso/clients" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "'$CLIENT_ID'",
    "name": "Test Client",
    "secret": "'$CLIENT_SECRET'",
    "redirect_uris": "'$REDIRECT_URI'",
    "grant_types": "authorization_code",
    "response_types": "code",
    "scope": "openid profile email"
  }' \
  -s | jq .

echo ""
echo "2. 测试授权端点（生成授权码）..."
echo "请求: GET $BASE_URL/oauth/authorize?client_id=$CLIENT_ID&redirect_uri=$REDIRECT_URI&response_type=code&scope=openid&state=test_state"
echo ""
echo "注意：这个请求需要用户登录，实际测试时需要先访问登录页面"
echo "预期行为："
echo "  - 如果用户未登录，会重定向到登录页面"
echo "  - 如果用户已登录，会生成授权码并保存到数据库"
echo "  - 授权码会重定向回 redirect_uri?code=xxx&state=xxx"

echo ""
echo "3. 模拟授权码验证..."
echo "假设我们获得了授权码：test_authorization_code_12345"
echo ""
echo "请求: POST $BASE_URL/oauth/token"
echo "Content-Type: application/x-www-form-urlencoded"
echo ""
echo "grant_type=authorization_code"
echo "code=test_authorization_code_12345"
echo "redirect_uri=$REDIRECT_URI"
echo "client_id=$CLIENT_ID"
echo "client_secret=$CLIENT_SECRET"
echo ""
echo "预期响应："
echo '{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "eyJhbGciOiJSUzI1NiIs...",
  "scope": "openid profile email"
}'

echo ""
echo "4. 检查数据库中的授权码..."
echo "在数据库中应该能看到："
echo "  - sso_sessions表中有一条新记录"
echo "  - authorization_code字段包含生成的JWT"
echo "  - used字段为false（未使用）"
echo "  - expires_at字段为当前时间+10分钟"

echo ""
echo "5. 数据库查询示例："
echo "SELECT id, user_id, client_id, authorization_code, used, expires_at, created_at"
echo "FROM sso_sessions"
echo "WHERE client_id = '$CLIENT_ID'"
echo "ORDER BY created_at DESC"
echo "LIMIT 5;"

echo ""
echo "6. 清理测试数据..."
echo "DELETE FROM sso_sessions WHERE client_id = '$CLIENT_ID';"
echo "DELETE FROM sso_clients WHERE id = '$CLIENT_ID';"

echo ""
echo "✅ 数据库存储功能测试完成"
echo "如果授权码能正确保存到数据库并在验证时被正确使用，"
echo "说明授权码数据库存储功能工作正常。"
