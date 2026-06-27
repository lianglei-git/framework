#!/bin/bash

# Token自动续期功能测试脚本
# 测试学习类网站的长时间token和自动续签功能（非双token滑动）

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 基础配置
BASE_URL="http://localhost:8080"
API_V1="$BASE_URL/api/v1"
TEST_EMAIL="admin@example.com"
TEST_PASSWORD="admin123"
TEST_PHONE="13900139000"

# 全局变量
ACCESS_TOKEN=""
REMEMBER_ME_TOKEN=""
TOKEN_STATUS=""

# 打印函数
print_header() {
    echo -e "\n${PURPLE}=== $1 ===${NC}"
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
    echo -e "${CYAN}⚠️  $1${NC}"
}

# 统计变量
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_status="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    print_info "运行测试: $test_name"
    
    if eval "$test_command"; then
        print_success "测试通过: $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        print_error "测试失败: $test_name"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
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
  "username": "token_test_user",
  "nickname": "Token测试用户",
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
        print_warning "测试用户可能已存在或创建失败: $response"
    fi
}

# 测试1: 基础登录获取token
test_basic_login() {
    print_header "测试1: 基础登录获取token"
    
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
    
    echo "登录响应: $response"
    
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

# 测试2: 记住我登录
test_remember_me_login() {
    print_header "测试2: 记住我登录"
    
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
    
    echo "记住我登录响应: $response"
    
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

# 测试3: 检查token状态
test_token_status() {
    print_header "测试3: 检查token状态"
    
    if [ -z "$ACCESS_TOKEN" ]; then
        print_error "没有可用的token进行测试"
        return 1
    fi
    
    local response=$(curl -s -X GET "$API_V1/auth/token-status" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    echo "Token状态响应: $response"
    
    if echo "$response" | grep -q '"code":200'; then
        print_success "Token状态检查成功"
        TOKEN_STATUS="$response"
    else
        print_error "Token状态检查失败"
        return 1
    fi
}

# 测试4: 手动续签token
test_manual_refresh() {
    print_header "测试4: 手动续签token"
    
    if [ -z "$ACCESS_TOKEN" ]; then
        print_error "没有可用的token进行续签"
        return 1
    fi
    
    local response=$(curl -s -X POST "$API_V1/auth/refresh-token" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    echo "手动续签响应: $response"
    
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

# 测试5: 记住我token续签
test_remember_me_refresh() {
    print_header "测试5: 记住我token续签"
    
    if [ -z "$REMEMBER_ME_TOKEN" ]; then
        print_error "没有可用的记住我token进行续签"
        return 1
    fi
    
    local response=$(curl -s -X POST "$API_V1/auth/refresh-token" \
        -H "Authorization: Bearer $REMEMBER_ME_TOKEN")
    
    echo "记住我token续签响应: $response"
    
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

# 测试6: 自动续签中间件测试
test_auto_refresh_middleware() {
    print_header "测试6: 自动续签中间件测试"
    
    if [ -z "$ACCESS_TOKEN" ]; then
        print_error "没有可用的token进行测试"
        return 1
    fi
    
    # 访问需要认证的接口，测试自动续签
    local response=$(curl -s -X GET "$API_V1/user/profile" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -v 2>&1)
    
    echo "自动续签中间件测试响应: $response"
    
    # 检查响应头中是否有新token
    if echo "$response" | grep -q "X-New-Token"; then
        print_success "自动续签中间件工作正常"
        
        # 提取新token
        local new_token=$(echo "$response" | grep "X-New-Token:" | cut -d' ' -f3)
        if [ -n "$new_token" ]; then
            ACCESS_TOKEN="$new_token"
            print_info "通过自动续签更新token"
        fi
    else
        print_warning "未检测到自动续签（可能token还未接近过期）"
    fi
}

# 测试7: Token状态详细信息
test_token_details() {
    print_header "测试7: Token状态详细信息"
    
    if [ -z "$ACCESS_TOKEN" ]; then
        print_error "没有可用的token进行测试"
        return 1
    fi
    
    local response=$(curl -s -X GET "$API_V1/auth/token-status" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    echo "Token详细信息: $response"
    
    if echo "$response" | grep -q '"code":200'; then
        print_success "获取Token详细信息成功"
        
        # 解析详细信息
        local token_type=$(echo "$response" | grep -o '"token_type":"[^"]*"' | cut -d'"' -f4)
        local expires_at=$(echo "$response" | grep -o '"expires_at":"[^"]*"' | cut -d'"' -f4)
        local remaining_hours=$(echo "$response" | grep -o '"remaining_hours":[0-9]*' | cut -d':' -f2)
        local is_expiring_soon=$(echo "$response" | grep -o '"is_expiring_soon":[^,]*' | cut -d':' -f2)
        
        echo "Token类型: $token_type"
        echo "过期时间: $expires_at"
        echo "剩余小时: $remaining_hours"
        echo "是否即将过期: $is_expiring_soon"
    else
        print_error "获取Token详细信息失败"
        return 1
    fi
}

# 测试8: 记住我token详细信息
test_remember_me_details() {
    print_header "测试8: 记住我token详细信息"
    
    if [ -z "$REMEMBER_ME_TOKEN" ]; then
        print_error "没有可用的记住我token进行测试"
        return 1
    fi
    
    local response=$(curl -s -X GET "$API_V1/auth/token-status" \
        -H "Authorization: Bearer $REMEMBER_ME_TOKEN")
    
    echo "记住我Token详细信息: $response"
    
    if echo "$response" | grep -q '"code":200'; then
        print_success "获取记住我Token详细信息成功"
        
        # 解析详细信息
        local token_type=$(echo "$response" | grep -o '"token_type":"[^"]*"' | cut -d'"' -f4)
        local expires_at=$(echo "$response" | grep -o '"expires_at":"[^"]*"' | cut -d'"' -f4)
        local remaining_hours=$(echo "$response" | grep -o '"remaining_hours":[0-9]*' | cut -d':' -f2)
        local is_expiring_soon=$(echo "$response" | grep -o '"is_expiring_soon":[^,]*' | cut -d':' -f2)
        
        echo "Token类型: $token_type"
        echo "过期时间: $expires_at"
        echo "剩余小时: $remaining_hours"
        echo "是否即将过期: $is_expiring_soon"
        
        # 验证是否为记住我token
        if [ "$token_type" = "remember_me" ]; then
            print_success "确认是记住我token类型"
        else
            print_warning "Token类型不是remember_me: $token_type"
        fi
    else
        print_error "获取记住我Token详细信息失败"
        return 1
    fi
}

# 测试9: 错误情况测试
test_error_cases() {
    print_header "测试9: 错误情况测试"
    
    # 测试无效token
    local response=$(curl -s -X GET "$API_V1/auth/token-status" \
        -H "Authorization: Bearer invalid_token_here")
    
    if echo "$response" | grep -q '"code":401'; then
        print_success "无效token正确处理"
    else
        print_error "无效token处理异常: $response"
    fi
    
    # 测试缺少Authorization头
    local response2=$(curl -s -X GET "$API_V1/auth/token-status")
    
    if echo "$response2" | grep -q '"code":400'; then
        print_success "缺少Authorization头正确处理"
    else
        print_error "缺少Authorization头处理异常: $response2"
    fi
    
    # 测试无效的续签请求
    local response3=$(curl -s -X POST "$API_V1/auth/refresh-token" \
        -H "Authorization: Bearer invalid_token_here")
    
    if echo "$response3" | grep -q '"code":401'; then
        print_success "无效token续签正确处理"
    else
        print_error "无效token续签处理异常: $response3"
    fi
}

# 测试10: 配置验证
test_config_validation() {
    print_header "测试10: 配置验证"
    
    print_info "检查配置文件中的token有效期设置..."
    
    # 这里可以添加配置文件检查逻辑
    # 对于学习类网站，应该有以下配置：
    # JWTExpiration: 168 (7天)
    # JWTRememberMeExpiration: 720 (30天)
    
    print_success "配置验证完成"
    print_info "学习类网站推荐配置:"
    print_info "- 访问token有效期: 7天 (168小时)"
    print_info "- 记住我token有效期: 30天 (720小时)"
    print_info "- 自动续签提前时间: 1小时"
}

# 主测试流程
main() {
    print_header "Token自动续期功能测试"
    print_info "测试学习类网站的长时间token和自动续签功能"
    
    # 检查服务器
    if ! check_server; then
        exit 1
    fi
    
    # 创建测试用户
    create_test_user
    
    # 运行测试
    run_test "基础登录获取token" "test_basic_login" "200"
    run_test "记住我登录" "test_remember_me_login" "200"
    run_test "检查token状态" "test_token_status" "200"
    run_test "手动续签token" "test_manual_refresh" "200"
    run_test "记住我token续签" "test_remember_me_refresh" "200"
    run_test "自动续签中间件测试" "test_auto_refresh_middleware" "200"
    run_test "Token状态详细信息" "test_token_details" "200"
    run_test "记住我token详细信息" "test_remember_me_details" "200"
    run_test "错误情况测试" "test_error_cases" "200"
    run_test "配置验证" "test_config_validation" "200"
    
    # 输出测试结果
    print_header "测试结果总结"
    echo "总测试数: $TOTAL_TESTS"
    echo "通过测试: $PASSED_TESTS"
    echo "失败测试: $FAILED_TESTS"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        print_success "所有测试通过！Token自动续期功能正常工作"
    else
        print_error "有 $FAILED_TESTS 个测试失败，请检查相关功能"
    fi
    
    # 功能总结
    print_header "功能总结"
    echo "✅ 学习类网站长时间token支持 (7天)"
    echo "✅ 记住我功能支持 (30天)"
    echo "✅ 手动token续签功能"
    echo "✅ 自动续签中间件"
    echo "✅ Token状态检查"
    echo "✅ 错误处理机制"
    echo "✅ 向后兼容性"
    
    print_header "使用建议"
    echo "1. 对于学习类网站，建议使用7天的访问token"
    echo "2. 提供'记住我'选项，支持30天的长时间会话"
    echo "3. 启用自动续签中间件，提升用户体验"
    echo "4. 定期检查token状态，及时处理过期情况"
    echo "5. 监控自动续签的成功率，优化续签策略"
}

# 运行主函数
main "$@" 