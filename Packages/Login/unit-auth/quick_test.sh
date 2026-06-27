#!/bin/bash

# 快速API测试脚本

BASE_URL="http://localhost:8080"
TEST_EMAIL="test@example.com"
TEST_PASSWORD="password123"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 显示帮助信息
show_help() {
    echo "快速API测试脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  health              - 健康检查"
    echo "  send-code           - 发送验证码"
    echo "  register            - 用户注册"
    echo "  login               - 用户登录"
    echo "  profile             - 获取用户信息"
    echo "  forgot-password     - 忘记密码"
    echo "  reset-password      - 重置密码"
    echo "  providers           - 获取认证提供者"
    echo "  sms-code            - 发送短信验证码"
    echo "  phone-login         - 手机号登录"
    echo "  all                 - 运行所有测试"
    echo "  help                - 显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 health"
    echo "  $0 send-code"
    echo "  $0 all"
}

# 健康检查
test_health() {
    print_info "测试健康检查..."
    RESPONSE=$(curl -s $BASE_URL/health)
    echo $RESPONSE | jq .
    
    if echo $RESPONSE | jq -e '.status == "ok"' > /dev/null; then
        print_success "健康检查通过"
    else
        print_error "健康检查失败"
    fi
}

# 发送验证码
test_send_code() {
    print_info "测试发送验证码..."
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/send-email-code" \
      -H "Content-Type: application/json" \
      -d "{\"email\": \"$TEST_EMAIL\", \"type\": \"register\"}")
    
    echo $RESPONSE | jq .
    
    if echo $RESPONSE | jq -e '.code == 200' > /dev/null; then
        print_success "验证码发送成功"
    else
        print_error "验证码发送失败"
    fi
}

# 用户注册
test_register() {
    print_info "测试用户注册..."
    read -p "请输入验证码: " CODE
    
    if [ -z "$CODE" ]; then
        print_error "验证码不能为空"
        return
    fi
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/register" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$TEST_EMAIL\",
        \"username\": \"testuser\",
        \"nickname\": \"测试用户\",
        \"password\": \"$TEST_PASSWORD\",
        \"code\": \"$CODE\"
      }")
    
    echo $RESPONSE | jq .
    
    if echo $RESPONSE | jq -e '.code == 201' > /dev/null; then
        print_success "用户注册成功"
    else
        print_error "用户注册失败"
    fi
}

# 用户登录
test_login() {
    print_info "测试用户登录..."
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
      -H "Content-Type: application/json" \
      -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}")
    
    echo $RESPONSE | jq .
    
    if echo $RESPONSE | jq -e '.code == 200' > /dev/null; then
        print_success "用户登录成功"
        TOKEN=$(echo $RESPONSE | jq -r '.data.token')
        echo "Token: $TOKEN"
    else
        print_error "用户登录失败"
    fi
}

# 获取用户信息
test_profile() {
    print_info "测试获取用户信息..."
    if [ -z "$TOKEN" ]; then
        print_error "Token为空，请先登录"
        return
    fi
    
    RESPONSE=$(curl -s -X GET "$BASE_URL/api/v1/user/profile" \
      -H "Authorization: Bearer $TOKEN")
    
    echo $RESPONSE | jq .
    
    if echo $RESPONSE | jq -e '.code == 200' > /dev/null; then
        print_success "获取用户信息成功"
    else
        print_error "获取用户信息失败"
    fi
}

# 忘记密码
test_forgot_password() {
    print_info "测试忘记密码..."
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/forgot-password" \
      -H "Content-Type: application/json" \
      -d "{\"email\": \"$TEST_EMAIL\"}")
    
    echo $RESPONSE | jq .
    
    if echo $RESPONSE | jq -e '.code == 200' > /dev/null; then
        print_success "忘记密码请求成功"
    else
        print_error "忘记密码请求失败"
    fi
}

# 重置密码
test_reset_password() {
    print_info "测试重置密码..."
    read -p "请输入重置验证码: " CODE
    
    if [ -z "$CODE" ]; then
        print_error "验证码不能为空"
        return
    fi
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/reset-password" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$TEST_EMAIL\",
        \"code\": \"$CODE\",
        \"password\": \"newpassword123\"
      }")
    
    echo $RESPONSE | jq .
    
    if echo $RESPONSE | jq -e '.code == 200' > /dev/null; then
        print_success "密码重置成功"
    else
        print_error "密码重置失败"
    fi
}

# 获取认证提供者
test_providers() {
    print_info "测试获取认证提供者..."
    RESPONSE=$(curl -s -X GET "$BASE_URL/api/v1/auth/providers")
    
    echo $RESPONSE | jq .
    
    if echo $RESPONSE | jq -e '.code == 200' > /dev/null; then
        print_success "获取认证提供者成功"
    else
        print_error "获取认证提供者失败"
    fi
}

# 发送短信验证码
test_sms_code() {
    print_info "测试发送短信验证码..."
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/send-sms-code" \
      -H "Content-Type: application/json" \
      -d "{\"phone\": \"18639130611\", \"type\": \"login\"}")
    
    echo $RESPONSE | jq .
    
    if echo $RESPONSE | jq -e '.code == 200' > /dev/null; then
        print_success "短信验证码发送成功"
    else
        print_error "短信验证码发送失败"
    fi
}

# 手机号登录
test_phone_login() {
    print_info "测试手机号登录..."
    read -p "请输入短信验证码: " CODE
    
    if [ -z "$CODE" ]; then
        print_error "验证码不能为空"
        return
    fi
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/phone-login" \
      -H "Content-Type: application/json" \
      -d "{\"phone\": \"18639130611\", \"code\": \"$CODE\"}")
    
    echo $RESPONSE | jq .
    
    if echo $RESPONSE | jq -e '.code == 200' > /dev/null; then
        print_success "手机号登录成功"
    else
        print_error "手机号登录失败"
    fi
}

# 运行所有测试
test_all() {
    echo "🧪 运行所有API测试..."
    echo "=================================="
    
    test_health
    echo ""
    
    test_send_code
    echo ""
    
    test_providers
    echo ""
    
    test_sms_code
    echo ""
    
    print_info "其他测试需要用户交互，请单独运行"
    echo "例如: $0 register"
    echo "例如: $0 login"
    echo "例如: $0 profile"
}

# 主函数
main() {
    case "$1" in
        "health")
            test_health
            ;;
        "send-code")
            test_send_code
            ;;
        "register")
            test_register
            ;;
        "login")
            test_login
            ;;
        "profile")
            test_profile
            ;;
        "forgot-password")
            test_forgot_password
            ;;
        "reset-password")
            test_reset_password
            ;;
        "providers")
            test_providers
            ;;
        "sms-code")
            test_sms_code
            ;;
        "phone-login")
            test_phone_login
            ;;
        "all")
            test_all
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            echo "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@" 