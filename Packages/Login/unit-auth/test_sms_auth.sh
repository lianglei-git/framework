#!/bin/bash

# 短信验证码和手机号登录测试脚本
BASE_URL="http://localhost:8080"

echo "=== 短信验证码和手机号登录测试 ==="

# 测试手机号格式验证
echo "1. 测试手机号格式验证"
curl -s -X POST "$BASE_URL/api/v1/auth/send-sms-code" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "invalid-phone",
    "type": "login"
  }' | jq . 2>/dev/null || echo "需要安装jq或服务器未运行"
echo -e "\n"

# 测试发送登录验证码
echo "2. 测试发送登录验证码"
curl -s -X POST "$BASE_URL/api/v1/auth/send-sms-code" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13800138000",
    "type": "login"
  }' | jq . 2>/dev/null || echo "需要安装jq或服务器未运行"
echo -e "\n"

# 测试发送重置密码验证码
echo "3. 测试发送重置密码验证码"
curl -s -X POST "$BASE_URL/api/v1/auth/send-sms-code" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13800138000",
    "type": "reset_password"
  }' | jq . 2>/dev/null || echo "需要安装jq或服务器未运行"
echo -e "\n"

# 测试手机号登录（使用无效验证码）
echo "4. 测试手机号登录（无效验证码）"
curl -s -X POST "$BASE_URL/api/v1/auth/phone-login" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13800138000",
    "code": "000000"
  }' | jq . 2>/dev/null || echo "需要安装jq或服务器未运行"
echo -e "\n"

# 测试手机号登录（无效手机号格式）
echo "5. 测试手机号登录（无效手机号格式）"
curl -s -X POST "$BASE_URL/api/v1/auth/phone-login" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "invalid-phone",
    "code": "123456"
  }' | jq . 2>/dev/null || echo "需要安装jq或服务器未运行"
echo -e "\n"

# 测试手机号重置密码
echo "6. 测试手机号重置密码"
curl -s -X POST "$BASE_URL/api/v1/auth/phone-reset-password" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13800138000",
    "code": "123456",
    "password": "newpassword123"
  }' | jq . 2>/dev/null || echo "需要安装jq或服务器未运行"
echo -e "\n"

echo "=== 测试完成 ==="
echo "注意："
echo "1. 验证码发送功能目前是模拟的，会在控制台输出验证码"
echo "2. 需要先发送验证码，然后使用正确的验证码进行登录测试"
echo "3. 如果看到错误，请确保服务器正在运行" 