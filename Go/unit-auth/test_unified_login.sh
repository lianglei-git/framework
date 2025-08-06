#!/bin/bash

# 统一登录功能测试脚本
# 测试邮箱、用户名、手机号三种登录方式

echo "🔐 统一登录功能测试"
echo "=================="

# 配置
BASE_URL="http://localhost:8080/api/v1"
TEST_EMAIL="test7@example.com"
TEST_USERNAME="testuser7"
TEST_PHONE="13800138000"
TEST_PASSWORD="SecurePassword123!"
NEW_PASSWORD="newphone123"

echo ""
echo "📧 1. 测试邮箱登录"
echo "----------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"account\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

echo "响应: $RESPONSE"

echo ""
echo "👤 2. 测试用户名登录"
echo "----------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"account\":\"$TEST_USERNAME\",\"password\":\"$TEST_PASSWORD\"}")

echo "响应: $RESPONSE"

echo ""
echo "📱 3. 测试手机号登录"
echo "----------------"
# 发送手机验证码
echo "发送手机验证码..."
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/send-sms-code" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"$TEST_PHONE\",\"type\":\"login\"}")

echo "发送验证码响应: $RESPONSE"

# 等待验证码发送
sleep 3

# 使用验证码登录
echo "使用验证码登录..."
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/phone-login" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"$TEST_PHONE\",\"code\":\"251126\"}")

echo "手机登录响应: $RESPONSE"

echo ""
echo "🔄 4. 测试手机号重置密码"
echo "----------------------"
# 发送重置密码验证码
echo "发送重置密码验证码..."
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/send-sms-code" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"$TEST_PHONE\",\"type\":\"reset_password\"}")

echo "发送重置验证码响应: $RESPONSE"

# 等待验证码发送
sleep 3

# 重置密码
echo "重置密码..."
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/phone-reset-password" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"$TEST_PHONE\",\"code\":\"566208\",\"password\":\"$NEW_PASSWORD\"}")

echo "重置密码响应: $RESPONSE"

echo ""
echo "❌ 5. 测试错误情况"
echo "----------------"
# 测试错误的账号格式
echo "测试错误账号格式..."
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"account\":\"invalid-account\",\"password\":\"$TEST_PASSWORD\"}")

echo "错误账号响应: $RESPONSE"

# 测试错误的密码
echo "测试错误密码..."
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"account\":\"$TEST_EMAIL\",\"password\":\"wrongpassword\"}")

echo "错误密码响应: $RESPONSE"

# 测试错误的手机号格式
echo "测试错误手机号格式..."
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/send-sms-code" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"123\",\"type\":\"login\"}")

echo "错误手机号响应: $RESPONSE"

echo ""
echo "🎉 统一登录功能测试完成！"
echo "========================" 