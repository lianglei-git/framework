#!/bin/bash

# 简化的手机号验证码直接登录功能测试脚本
BASE_URL="http://localhost:8080"

echo "=== 手机号验证码直接登录功能测试（简化版） ==="

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

# 测试发送登录验证码
echo "1. 发送登录验证码"
response=$(curl -s -X POST "$BASE_URL/api/v1/auth/send-sms-code" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13900139000",
    "type": "login"
  }')

echo "响应: $response"
echo -e "\n"

# 等待用户输入验证码
print_info "请查看控制台输出的验证码，然后输入6位数字验证码"
read -p "请输入6位数字验证码: " VERIFICATION_CODE

if [ -z "$VERIFICATION_CODE" ]; then
    print_error "未输入验证码"
    exit 1
fi

# 验证验证码格式
if [[ ! "$VERIFICATION_CODE" =~ ^[0-9]{6}$ ]]; then
    print_error "验证码必须是6位数字"
    exit 1
fi

print_success "验证码格式正确: $VERIFICATION_CODE"

# 测试手机号直接登录
echo "2. 测试手机号直接登录"
response=$(curl -s -X POST "$BASE_URL/api/v1/auth/phone-direct-login" \
  -H "Content-Type: application/json" \
  -d "{
    \"phone\": \"13900139000\",
    \"code\": \"$VERIFICATION_CODE\"
  }")

echo "响应: $response"
echo -e "\n"

echo "=== 测试完成 ==="
echo "注意："
echo "1. 验证码发送功能目前是模拟的，会在控制台输出验证码"
echo "2. 新用户登录时会自动创建账户并返回 is_new_user: true"
echo "3. 现有用户登录时会更新登录信息并返回正常的登录响应"
echo "4. 如果看到错误，请确保服务器正在运行" 