#!/bin/bash

# 手机号登录调试脚本
BASE_URL="http://localhost:8080"

echo "=== 手机号登录调试脚本 ==="

# 错误处理函数
print_error() {
    echo "❌ 错误: $1"
}

print_success() {
    echo "✅ 成功: $1"
}

print_info() {
    echo "ℹ️  $1"
}

# 测试1: 检查服务器是否运行
echo "1. 检查服务器状态"
health_response=$(curl -s "$BASE_URL/health")
echo "健康检查响应: $health_response"
echo -e "\n"

# 测试2: 发送验证码
echo "2. 发送验证码"
send_code_response=$(curl -s -X POST "$BASE_URL/api/v1/auth/send-sms-code" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13900139000",
    "type": "login"
  }')

echo "发送验证码响应: $send_code_response"
echo -e "\n"

# 测试3: 使用固定验证码测试（模拟验证码）
echo "3. 使用固定验证码测试"
test_response=$(curl -s -X POST "$BASE_URL/api/v1/auth/phone-direct-login" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13900139000",
    "code": "123456"
  }')

echo "固定验证码测试响应: $test_response"
echo -e "\n"

# 测试4: 测试无效验证码
echo "4. 测试无效验证码"
invalid_response=$(curl -s -X POST "$BASE_URL/api/v1/auth/phone-direct-login" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13900139000",
    "code": "000000"
  }')

echo "无效验证码测试响应: $invalid_response"
echo -e "\n"

# 测试5: 测试无效手机号格式
echo "5. 测试无效手机号格式"
invalid_phone_response=$(curl -s -X POST "$BASE_URL/api/v1/auth/phone-direct-login" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "invalid-phone",
    "code": "123456"
  }')

echo "无效手机号测试响应: $invalid_phone_response"
echo -e "\n"

# 测试6: 测试缺少参数
echo "6. 测试缺少参数"
missing_param_response=$(curl -s -X POST "$BASE_URL/api/v1/auth/phone-direct-login" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13900139000"
  }')

echo "缺少参数测试响应: $missing_param_response"
echo -e "\n"

echo "=== 调试完成 ==="
echo "请检查以上响应，找出问题所在："
echo "1. 如果健康检查失败，说明服务器未运行"
echo "2. 如果发送验证码失败，检查短信服务配置"
echo "3. 如果固定验证码测试失败，检查验证码验证逻辑"
echo "4. 如果所有测试都返回相同错误，可能是请求格式问题" 