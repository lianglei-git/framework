#!/bin/bash

echo "🧪 开始测试 Unit Auth API..."

BASE_URL="http://localhost:8080"

echo "1. 测试健康检查..."
curl -s "$BASE_URL/health" | jq '.'

echo -e "\n2. 测试获取认证提供者..."
curl -s "$BASE_URL/api/v1/auth/providers" | jq '.'

echo -e "\n3. 测试发送邮件验证码（预期失败，因为邮件配置问题）..."
curl -s -X POST "$BASE_URL/api/v1/auth/send-email-code" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","type":"register"}' | jq '.'

echo -e "\n4. 测试注册（预期失败，因为验证码无效）..."
curl -s -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","nickname":"Test User","password":"123456","code":"123456"}' | jq '.'

echo -e "\n5. 测试登录（预期失败，因为用户不存在）..."
curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}' | jq '.'

echo -e "\n6. 测试统计功能（预期失败，因为需要认证）..."
curl -s "$BASE_URL/api/v1/stats/overall" | jq '.'

echo -e "\n7. 测试指标端点..."
curl -s "$BASE_URL/metrics" | jq '.'

echo -e "\n✅ API 测试完成！"
echo "📝 注意：某些测试预期会失败，这是正常的，因为："
echo "   - 邮件配置未设置"
echo "   - 用户未注册"
echo "   - 需要认证的端点" 