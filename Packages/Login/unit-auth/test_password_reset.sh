#!/bin/bash

# 密码重置功能测试脚本
# 测试完整的密码重置流程

echo "🔐 密码重置功能测试"
echo "=================="

# 配置
BASE_URL="http://localhost:8080/api/v1"
TEST_EMAIL="test7@example.com"
NEW_PASSWORD="SecurePassword123!"

echo ""
echo "📧 1. 发送密码重置邮件"
echo "------------------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\"}")

echo "响应: $RESPONSE"

# 等待邮件发送
echo ""
echo "⏳ 等待邮件发送..."
sleep 3

# 获取验证码
echo ""
echo "🔍 2. 获取验证码"
echo "----------------"
VERIFICATION_CODE=$(go run utils/verification_tool.go latest $TEST_EMAIL 2>/dev/null | grep "验证码:" | awk '{print $2}')

if [ -z "$VERIFICATION_CODE" ]; then
    echo "❌ 无法获取验证码"
    exit 1
fi

echo "验证码: $VERIFICATION_CODE"

# 重置密码
echo ""
echo "🔄 3. 重置密码"
echo "--------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"code\":\"$VERIFICATION_CODE\",\"password\":\"$NEW_PASSWORD\"}")

echo "响应: $RESPONSE"

# 验证新密码登录
echo ""
echo "✅ 4. 验证新密码登录"
echo "-------------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$NEW_PASSWORD\"}")

echo "响应: $RESPONSE"

# 验证旧密码失效
echo ""
echo "❌ 5. 验证旧密码失效"
echo "-------------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"123456\"}")

echo "响应: $RESPONSE"

# 测试验证码重复使用
echo ""
echo "🔄 6. 测试验证码重复使用"
echo "----------------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"code\":\"$VERIFICATION_CODE\",\"password\":\"anotherpassword\"}")

echo "响应: $RESPONSE"

# 测试错误验证码
echo ""
echo "❌ 7. 测试错误验证码"
echo "------------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"code\":\"000000\",\"password\":\"wrongpassword\"}")

echo "响应: $RESPONSE"

# 测试不存在的用户
echo ""
echo "❌ 8. 测试不存在的用户"
echo "-------------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"nonexistent@example.com\"}")

echo "响应: $RESPONSE"

echo ""
echo "🎉 密码重置功能测试完成！"
echo "========================" 