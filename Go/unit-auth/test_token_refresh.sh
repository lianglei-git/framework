#!/bin/bash

# Token续签功能测试脚本
# 使用方法：./test_token_refresh.sh [base_url]

BASE_URL=${1:-"http://localhost:8080"}
TEST_EMAIL="2838370086@qq.com"
TEST_PASSWORD="lianglei1216"

echo "🔄 Token续签功能测试"
echo "📍 测试服务器: $BASE_URL"
echo "📧 测试账号: $TEST_EMAIL"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_info() {
    echo -e "ℹ️  $1"
}

# 测试1: 简单Token续签
test_simple_refresh() {
    print_info "测试1: 简单Token续签"

    # 先登录获取token
    print_info "  步骤1: 登录获取Access Token"
    LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"account\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

    # print_info "  登录响应: $LOGIN_RESPONSE"
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

    if [ -z "$ACCESS_TOKEN" ]; then
        print_error "  登录失败，无法获取Access Token"
        return 1
    fi

    print_status "  登录成功，获取到Access Token"

    # 等待1秒模拟使用
    sleep 1

    # 使用简单续签
    print_info "  步骤2: 使用简单Token续签"
    REFRESH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/refresh-token" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{}")

    NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

    if [ -n "$NEW_ACCESS_TOKEN" ]; then
        print_status "  简单Token续签成功"
        return 0
    else
        print_error "  简单Token续签失败"
        return 1
    fi
}

# 测试2: 双Token续签
test_double_token_refresh() {
    print_info "测试2: 双Token续签"

    # 使用双Token登录
    print_info "  步骤1: 双Token登录"
    DOUBLE_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/login-with-token-pair" \
        -H "Content-Type: application/json" \
        -d "{\"account\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

    ACCESS_TOKEN=$(echo "$DOUBLE_LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    REFRESH_TOKEN=$(echo "$DOUBLE_LOGIN_RESPONSE" | grep -o '"refresh_token":"[^"]*"' | cut -d'"' -f4)

    if [ -z "$ACCESS_TOKEN" ] || [ -z "$REFRESH_TOKEN" ]; then
        print_error "  双Token登录失败"
        return 1
    fi

    print_status "  双Token登录成功"

    # 等待1秒模拟使用
    sleep 1

    # 使用Refresh Token续签
    print_info "  步骤2: 使用Refresh Token续签"
    REFRESH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/refresh-with-refresh-token" \
        -H "Content-Type: application/json" \
        -d "{\"refresh_token\":\"$REFRESH_TOKEN\"}")

    print_info "  续签响应: $REFRESH_RESPONSE"
    NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    NEW_REFRESH_TOKEN=$(echo "$REFRESH_RESPONSE" | grep -o '"refresh_token":"[^"]*"' | cut -d'"' -f4)

    if [ -n "$NEW_ACCESS_TOKEN" ] && [ -n "$NEW_REFRESH_TOKEN" ]; then
        print_status "  双Token续签成功"
        print_info "  新的Refresh Token已生成，旧的Refresh Token已撤销"
        return 0
    else
        print_error "  双Token续签失败"
        return 1
    fi
}

# 测试3: Token状态检查
test_token_status() {
    print_info "测试3: Token状态检查"

    # 先登录获取token
    LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"account\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

    if [ -z "$ACCESS_TOKEN" ]; then
        print_error "  登录失败"
        return 1
    fi

    # 检查token状态
    STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/v1/auth/token-status" \
        -H "Authorization: Bearer $ACCESS_TOKEN")

    if echo "$STATUS_RESPONSE" | grep -q '"is_valid":true'; then
        print_status "  Token状态检查成功"

        # 提取详细信息
        EXPIRES_AT=$(echo "$STATUS_RESPONSE" | grep -o '"expires_at":"[^"]*"' | cut -d'"' -f4)
        REMAINING_HOURS=$(echo "$STATUS_RESPONSE" | grep -o '"remaining_hours":[0-9]*' | cut -d':' -f2)
        TOKEN_TYPE=$(echo "$STATUS_RESPONSE" | grep -o '"token_type":"[^"]*"' | cut -d'"' -f4)

        print_info "  Token类型: $TOKEN_TYPE"
        print_info "  过期时间: $EXPIRES_AT"
        print_info "  剩余小时: $REMAINING_HOURS"

        return 0
    else
        print_error "  Token状态检查失败"
        return 1
    fi
}

# 测试4: 记住我功能
test_remember_me() {
    print_info "测试4: 记住我功能"

    # 使用记住我登录
    REMEMBER_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/login-with-remember" \
        -H "Content-Type: application/json" \
        -d "{\"account\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"remember_me\":true}")

    REMEMBER_TOKEN=$(echo "$REMEMBER_LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

    if [ -n "$REMEMBER_TOKEN" ]; then
        print_status "  记住我登录成功"
        print_info "  记住我Token通常有更长的过期时间"
        return 0
    else
        print_error "  记住我登录失败"
        return 1
    fi
}

# 主测试流程
main() {
    echo "🚀 开始Token续签功能测试"
    echo ""

    # 检查服务器是否可用
    if ! curl -s "$BASE_URL/health" > /dev/null; then
        print_error "服务器 $BASE_URL 不可用，请先启动服务器"
        exit 1
    fi

    print_status "服务器连接正常"

    # 运行各个测试
    tests=(
        test_simple_refresh
        test_double_token_refresh
        test_token_status
        test_remember_me
    )

    passed=0
    failed=0

    for test in "${tests[@]}"; do
        echo ""
        if $test; then
            ((passed++))
        else
            ((failed++))
        fi
    done

    echo ""
    echo "📊 测试结果汇总"
    echo "✅ 通过: $passed"
    echo "❌ 失败: $failed"
    echo "📈 成功率: $(echo "scale=1; $passed * 100 / ($passed + $failed)" | bc -l)%"

    if [ $failed -eq 0 ]; then
        print_status "🎉 所有测试通过！Token续签功能正常工作"
        exit 0
    else
        print_error "⚠️  有 $failed 个测试失败，需要检查Token续签功能"
        exit 1
    fi
}

# 运行主测试
main
