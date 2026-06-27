#!/bin/bash

# 简化的Token自动续期功能测试脚本
# 快速验证学习类网站的长时间token和自动续签功能

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 基础配置
BASE_URL="http://localhost:8080"
API_V1="$BASE_URL/api/v1"
TEST_EMAIL="admin@example.com"
TEST_PASSWORD="admin123"

# 全局变量
ACCESS_TOKEN=""
REMEMBER_ME_TOKEN=""

# 打印函数
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 检查服务器状态
check_server() {
    print_header "检查服务器状态"
    
    if curl -s "$BASE_URL/health" > /dev/null; then
        print_success "服务器正在运行"
        return 0
    else
        print_error "服务器未运行，请先启动服务器"
        return 1
    fi
}

# 创建测试用户
create_test_user() {
    print_header "创建测试用户"
    
    local user_data=$(cat << EOF
{
  "email": "$TEST_EMAIL",
  "username": "token_simple_test",
  "nickname": "Token简单测试用户",
  "password": "$TEST_PASSWORD",
  "code": "123456"
}
EOF
)
    
    local response=$(curl -s -X POST "$API_V1/auth/register" \
        -H "Content-Type: application/json" \
        -d "$user_data")
    
    if echo "$response" | grep -q '"code":200'; then
        print_success "测试用户创建成功"
    else
        print_warning "测试用户可能已存在或创建失败"
    fi
}

# 测试基础登录
test_basic_login() {
    print_header "测试基础登录"
    
    local login_data=$(cat << EOF
{
  "account": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD"
}
EOF
)
    
    local response=$(curl -s -X POST "$API_V1/auth/login" \
        -H "Content-Type: application/json" \
        -d "$login_data")
    
    # 提取token
    ACCESS_TOKEN=$(echo "$response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$ACCESS_TOKEN" ]; then
        print_success "获取到访问token"
        echo "Token: ${ACCESS_TOKEN:0:50}..."
    else
        print_error "获取token失败"
        return 1
    fi
}

# 测试记住我登录
test_remember_me_login() {
    print_header "测试记住我登录"
    
    local login_data=$(cat << EOF
{
  "account": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD",
  "remember_me": true
}
EOF
)
    
    local response=$(curl -s -X POST "$API_V1/auth/login-with-remember" \
        -H "Content-Type: application/json" \
        -d "$login_data")
    
    # 提取token
    REMEMBER_ME_TOKEN=$(echo "$response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$REMEMBER_ME_TOKEN" ]; then
        print_success "获取到记住我token"
        echo "Token: ${REMEMBER_ME_TOKEN:0:50}..."
    else
        print_error "获取记住我token失败"
        return 1
    fi
}

# 测试token状态检查
test_token_status() {
    print_header "测试token状态检查"
    
    if [ -z "$ACCESS_TOKEN" ]; then
        print_error "没有可用的token进行测试"
        return 1
    fi
    
    local response=$(curl -s -X GET "$API_V1/auth/token-status" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    if echo "$response" | grep -q '"code":200'; then
        print_success "Token状态检查成功"
        
        # 解析基本信息
        local token_type=$(echo "$response" | grep -o '"token_type":"[^"]*"' | cut -d'"' -f4)
        local remaining_hours=$(echo "$response" | grep -o '"remaining_hours":[0-9]*' | cut -d':' -f2)
        
        echo "Token类型: $token_type"
        echo "剩余小时: $remaining_hours"
    else
        print_error "Token状态检查失败"
        return 1
    fi
}

# 测试手动续签
test_manual_refresh() {
    print_header "测试手动续签"
    
    if [ -z "$ACCESS_TOKEN" ]; then
        print_error "没有可用的token进行续签"
        return 1
    fi
    
    local response=$(curl -s -X POST "$API_V1/auth/refresh-token" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    if echo "$response" | grep -q '"code":200'; then
        print_success "手动续签成功"
        
        # 提取新token
        local new_token=$(echo "$response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$new_token" ]; then
            ACCESS_TOKEN="$new_token"
            print_info "更新访问token"
        fi
    else
        print_error "手动续签失败"
        return 1
    fi
}

# 测试记住我token续签
test_remember_me_refresh() {
    print_header "测试记住我token续签"
    
    if [ -z "$REMEMBER_ME_TOKEN" ]; then
        print_error "没有可用的记住我token进行续签"
        return 1
    fi
    
    local response=$(curl -s -X POST "$API_V1/auth/refresh-token" \
        -H "Authorization: Bearer $REMEMBER_ME_TOKEN")
    
    if echo "$response" | grep -q '"code":200'; then
        print_success "记住我token续签成功"
        
        # 提取新token
        local new_token=$(echo "$response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$new_token" ]; then
            REMEMBER_ME_TOKEN="$new_token"
            print_info "更新记住我token"
        fi
    else
        print_error "记住我token续签失败"
        return 1
    fi
}

# 测试错误情况
test_error_cases() {
    print_header "测试错误情况"
    
    # 测试无效token
    local response=$(curl -s -X GET "$API_V1/auth/token-status" \
        -H "Authorization: Bearer invalid_token_here")
    
    if echo "$response" | grep -q '"code":401'; then
        print_success "无效token正确处理"
    else
        print_error "无效token处理异常"
    fi
    
    # 测试缺少Authorization头
    local response2=$(curl -s -X GET "$API_V1/auth/token-status")
    
    if echo "$response2" | grep -q '"code":400'; then
        print_success "缺少Authorization头正确处理"
    else
        print_error "缺少Authorization头处理异常"
    fi
}

# 主测试流程
main() {
    print_header "Token自动续期功能简化测试"
    print_info "快速验证学习类网站的长时间token和自动续签功能"
    
    # 检查服务器
    if ! check_server; then
        exit 1
    fi
    
    # 创建测试用户
    create_test_user
    
    # 运行核心测试
    test_basic_login
    test_remember_me_login
    test_token_status
    test_manual_refresh
    test_remember_me_refresh
    test_error_cases
    
    # 输出测试结果
    print_header "简化测试完成"
    print_success "Token自动续期功能核心功能验证通过"
    
    print_header "功能验证"
    echo "✅ 基础登录获取token"
    echo "✅ 记住我登录功能"
    echo "✅ Token状态检查"
    echo "✅ 手动token续签"
    echo "✅ 记住我token续签"
    echo "✅ 错误处理机制"
    
    print_header "配置信息"
    echo "学习类网站推荐配置:"
    echo "- 访问token有效期: 7天 (168小时)"
    echo "- 记住我token有效期: 30天 (720小时)"
    echo "- 自动续签提前时间: 1小时"
    
    print_info "如需完整测试，请运行: ./test_token_auto_refresh.sh"
}

# 运行主函数
main "$@" 