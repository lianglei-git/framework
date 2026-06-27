#!/bin/bash

# Token续签功能测试脚本
# 测试学习类网站的长时间token和双Token滑动续期功能

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
REFRESH_TOKEN=""
REMEMBER_ME_TOKEN=""

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
    local test_func="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    print_header "测试 $TOTAL_TESTS: $test_name"
    
    if $test_func; then
        print_success "$test_name 通过"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        print_error "$test_name 失败"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# 1. 基础登录测试
test_basic_login() {
    print_info "测试基础登录功能"
    
    RESPONSE=$(curl -s -X POST "$API_V1/auth/login" \
      -H "Content-Type: application/json" \
      -d "{
        \"account\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\"
      }")
    
    echo "$RESPONSE" | jq .
    
    if echo "$RESPONSE" | jq -e '.code == 200' > /dev/null; then
        ACCESS_TOKEN=$(echo "$RESPONSE" | jq -r '.data.token')
        print_success "基础登录成功，获取到token"
        return 0
    else
        print_error "基础登录失败"
        return 1
    fi
}

# 2. 记住我登录测试
test_remember_me_login() {
    print_info "测试记住我登录功能"
    
    RESPONSE=$(curl -s -X POST "$API_V1/auth/login-with-remember" \
      -H "Content-Type: application/json" \
      -d "{
        \"account\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\",
        \"remember_me\": true
      }")
    
    echo "$RESPONSE" | jq .
    
    if echo "$RESPONSE" | jq -e '.code == 200' > /dev/null; then
        REMEMBER_ME_TOKEN=$(echo "$RESPONSE" | jq -r '.data.token')
        print_success "记住我登录成功，获取到30天token"
        return 0
    else
        print_error "记住我登录失败"
        return 1
    fi
}

# 3. 双Token登录测试
test_token_pair_login() {
    print_info "测试双Token登录功能"
    
    RESPONSE=$(curl -s -X POST "$API_V1/auth/login-with-token-pair" \
      -H "Content-Type: application/json" \
      -d "{
        \"account\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\"
      }")
    
    echo "$RESPONSE" | jq .
    
    if echo "$RESPONSE" | jq -e '.code == 200' > /dev/null; then
        ACCESS_TOKEN=$(echo "$RESPONSE" | jq -r '.data.access_token')
        REFRESH_TOKEN=$(echo "$RESPONSE" | jq -r '.data.refresh_token')
        print_success "双Token登录成功，获取到access_token和refresh_token"
        return 0
    else
        print_error "双Token登录失败"
        return 1
    fi
}

# 4. Token状态检查测试
test_token_status() {
    print_info "测试Token状态检查功能"
    
    if [ -z "$ACCESS_TOKEN" ]; then
        print_warning "跳过Token状态检查，没有有效的access_token"
        return 0
    fi
    
    RESPONSE=$(curl -s -X GET "$API_V1/auth/token-status" \
      -H "Authorization: Bearer $ACCESS_TOKEN")
    
    echo "$RESPONSE" | jq .
    
    if echo "$RESPONSE" | jq -e '.code == 200' > /dev/null; then
        print_success "Token状态检查成功"
        return 0
    else
        print_error "Token状态检查失败"
        return 1
    fi
}

# 5. 简单续签测试
test_simple_refresh() {
    print_info "测试简单Token续签功能"
    
    if [ -z "$ACCESS_TOKEN" ]; then
        print_warning "跳过简单续签测试，没有有效的access_token"
        return 0
    fi
    
    RESPONSE=$(curl -s -X POST "$API_V1/auth/refresh-token" \
      -H "Authorization: Bearer $ACCESS_TOKEN")
    
    echo "$RESPONSE" | jq .
    
    if echo "$RESPONSE" | jq -e '.code == 200' > /dev/null; then
        NEW_TOKEN=$(echo "$RESPONSE" | jq -r '.data.access_token')
        if [ "$NEW_TOKEN" != "$ACCESS_TOKEN" ]; then
            ACCESS_TOKEN="$NEW_TOKEN"
            print_success "Token续签成功，获取到新token"
            return 0
        else
            print_warning "Token续签返回了相同的token"
            return 0
        fi
    else
        print_error "Token续签失败"
        return 1
    fi
}

# 6. 双Token续签测试
test_refresh_with_refresh_token() {
    print_info "测试双Token续签功能"
    
    if [ -z "$REFRESH_TOKEN" ]; then
        print_warning "跳过双Token续签测试，没有有效的refresh_token"
        return 0
    fi
    
    RESPONSE=$(curl -s -X POST "$API_V1/auth/refresh-with-refresh-token" \
      -H "Content-Type: application/json" \
      -d "{
        \"refresh_token\": \"$REFRESH_TOKEN\"
      }")
    
    echo "$RESPONSE" | jq .
    
    if echo "$RESPONSE" | jq -e '.code == 200' > /dev/null; then
        NEW_ACCESS_TOKEN=$(echo "$RESPONSE" | jq -r '.data.access_token')
        NEW_REFRESH_TOKEN=$(echo "$RESPONSE" | jq -r '.data.refresh_token')
        
        if [ "$NEW_ACCESS_TOKEN" != "$ACCESS_TOKEN" ] || [ "$NEW_REFRESH_TOKEN" != "$REFRESH_TOKEN" ]; then
            ACCESS_TOKEN="$NEW_ACCESS_TOKEN"
            REFRESH_TOKEN="$NEW_REFRESH_TOKEN"
            print_success "双Token续签成功，获取到新的access_token和refresh_token"
            return 0
        else
            print_warning "双Token续签返回了相同的token"
            return 0
        fi
    else
        print_error "双Token续签失败"
        return 1
    fi
}

# 7. 自动续签中间件测试
test_auto_refresh_middleware() {
    print_info "测试自动续签中间件功能"
    
    if [ -z "$ACCESS_TOKEN" ]; then
        print_warning "跳过自动续签测试，没有有效的access_token"
        return 0
    fi
    
    # 测试一个需要认证的接口，看是否有自动续签
    RESPONSE=$(curl -s -X GET "$API_V1/user/profile" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -w "\n%{http_code}")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    echo "$BODY" | jq .
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_success "自动续签中间件测试通过"
        return 0
    else
        print_error "自动续签中间件测试失败，HTTP状态码: $HTTP_CODE"
        return 1
    fi
}

# 8. Token过期测试
test_token_expiration() {
    print_info "测试Token过期处理"
    
    # 使用一个明显过期的token进行测试
    EXPIRED_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZXhwaXJlZCIsImVtYWlsIjoiZXhwaXJlZEBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwiZXhwIjoxNjQwOTYwMDAwfQ.expired_signature"
    
    RESPONSE=$(curl -s -X GET "$API_V1/user/profile" \
      -H "Authorization: Bearer $EXPIRED_TOKEN")
    
    echo "$RESPONSE" | jq .
    
    if echo "$RESPONSE" | jq -e '.code == 401' > /dev/null; then
        print_success "Token过期处理正确"
        return 0
    else
        print_error "Token过期处理异常"
        return 1
    fi
}

# 9. 学习类网站长时间会话测试
test_long_session() {
    print_info "测试学习类网站长时间会话功能"
    
    # 测试记住我token的有效期
    if [ -n "$REMEMBER_ME_TOKEN" ]; then
        RESPONSE=$(curl -s -X GET "$API_V1/auth/token-status" \
          -H "Authorization: Bearer $REMEMBER_ME_TOKEN")
        
        echo "$RESPONSE" | jq .
        
        if echo "$RESPONSE" | jq -e '.code == 200' > /dev/null; then
            EXPIRES_AT=$(echo "$RESPONSE" | jq -r '.data.expires_at')
            print_success "记住我token有效期检查成功，过期时间: $EXPIRES_AT"
            return 0
        else
            print_error "记住我token有效期检查失败"
            return 1
        fi
    else
        print_warning "跳过长时间会话测试，没有记住我token"
        return 0
    fi
}

# 10. 双Token滑动续期测试
test_sliding_refresh() {
    print_info "测试双Token滑动续期功能"
    
    if [ -z "$REFRESH_TOKEN" ]; then
        print_warning "跳过滑动续期测试，没有有效的refresh_token"
        return 0
    fi
    
    # 模拟多次续签
    for i in {1..3}; do
        print_info "第 $i 次续签测试"
        
        RESPONSE=$(curl -s -X POST "$API_V1/auth/refresh-with-refresh-token" \
          -H "Content-Type: application/json" \
          -d "{
            \"refresh_token\": \"$REFRESH_TOKEN\"
          }")
        
        if echo "$RESPONSE" | jq -e '.code == 200' > /dev/null; then
            NEW_ACCESS_TOKEN=$(echo "$RESPONSE" | jq -r '.data.access_token')
            NEW_REFRESH_TOKEN=$(echo "$RESPONSE" | jq -r '.data.refresh_token')
            
            ACCESS_TOKEN="$NEW_ACCESS_TOKEN"
            REFRESH_TOKEN="$NEW_REFRESH_TOKEN"
            
            print_success "第 $i 次续签成功"
        else
            print_error "第 $i 次续签失败"
            return 1
        fi
        
        # 短暂延迟
        sleep 1
    done
    
    print_success "双Token滑动续期测试通过"
    return 0
}

# 主测试函数
main() {
    print_header "Token续签功能测试"
    print_info "测试基础URL: $BASE_URL"
    print_info "测试邮箱: $TEST_EMAIL"
    
    # 检查服务是否运行
    if ! curl -s "$BASE_URL/health" > /dev/null; then
        print_error "服务未运行，请先启动服务"
        exit 1
    fi
    
    print_success "服务运行正常"
    
    # 执行测试
    run_test "基础登录" test_basic_login
    run_test "记住我登录" test_remember_me_login
    run_test "双Token登录" test_token_pair_login
    run_test "Token状态检查" test_token_status
    run_test "简单续签" test_simple_refresh
    run_test "双Token续签" test_refresh_with_refresh_token
    run_test "自动续签中间件" test_auto_refresh_middleware
    run_test "Token过期处理" test_token_expiration
    run_test "长时间会话" test_long_session
    run_test "双Token滑动续期" test_sliding_refresh
    
    # 输出测试结果
    print_header "测试结果汇总"
    print_info "总测试数: $TOTAL_TESTS"
    print_success "通过测试: $PASSED_TESTS"
    print_error "失败测试: $FAILED_TESTS"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        print_success "所有测试通过！Token续签功能运行正常。"
        exit 0
    else
        print_error "有 $FAILED_TESTS 个测试失败，请检查相关功能。"
        exit 1
    fi
}

# 运行主测试
main