#!/bin/bash

# 用户统计功能测试脚本
BASE_URL="http://localhost:8080"

echo "=== 用户统计功能测试 ==="

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

# 检查服务器是否运行
echo "1. 检查服务器状态"
health_response=$(curl -s "$BASE_URL/health")
if [ $? -ne 0 ]; then
    print_error "服务器未运行，请先启动服务器"
    exit 1
fi
print_success "服务器正在运行"
echo -e "\n"

# 测试1: 获取用户统计
echo "2. 测试用户统计 API"
print_info "GET /api/v1/stats/users"
print_info "注意：此接口需要JWT认证"
echo "请提供有效的JWT token:"
read -p "请输入Bearer token (格式: Bearer xxx): " TOKEN

if [ -z "$TOKEN" ]; then
    print_error "未提供token，跳过认证测试"
    echo "响应: 需要认证"
else
    response=$(curl -s -X GET "$BASE_URL/api/v1/stats/users" \
      -H "Authorization: $TOKEN")
    echo "响应: $response"
fi
echo -e "\n"

# 测试2: 获取登录统计
echo "3. 测试登录统计 API"
print_info "GET /api/v1/stats/logins"
if [ -n "$TOKEN" ]; then
    response=$(curl -s -X GET "$BASE_URL/api/v1/stats/logins" \
      -H "Authorization: $TOKEN")
    echo "响应: $response"
else
    echo "响应: 需要认证"
fi
echo -e "\n"

# 测试3: 获取每日统计
echo "4. 测试每日统计 API"
print_info "GET /api/v1/stats/daily-enhanced"
if [ -n "$TOKEN" ]; then
    response=$(curl -s -X GET "$BASE_URL/api/v1/stats/daily-enhanced" \
      -H "Authorization: $TOKEN")
    echo "响应: $response"
else
    echo "响应: 需要认证"
fi
echo -e "\n"

# 测试4: 带参数的登录统计
echo "5. 测试带参数的登录统计 API"
print_info "GET /api/v1/stats/logins?start_date=2025-08-01&end_date=2025-08-05&provider=email"
if [ -n "$TOKEN" ]; then
    response=$(curl -s -X GET "$BASE_URL/api/v1/stats/logins?start_date=2025-08-01&end_date=2025-08-05&provider=email" \
      -H "Authorization: $TOKEN")
    echo "响应: $response"
else
    echo "响应: 需要认证"
fi
echo -e "\n"

# 测试5: 带参数的每日统计
echo "6. 测试带参数的每日统计 API"
print_info "GET /api/v1/stats/daily-enhanced?date=2025-08-05&days=7"
if [ -n "$TOKEN" ]; then
    response=$(curl -s -X GET "$BASE_URL/api/v1/stats/daily-enhanced?date=2025-08-05&days=7" \
      -H "Authorization: $TOKEN")
    echo "响应: $response"
else
    echo "响应: 需要认证"
fi
echo -e "\n"

# 测试6: 无认证访问（应该返回401）
echo "7. 测试无认证访问"
print_info "无认证访问应该返回401"
response=$(curl -s -X GET "$BASE_URL/api/v1/stats/users")
echo "响应: $response"
echo -e "\n"

echo "=== 测试完成 ==="
echo "API端点总结："
echo "1. GET /api/v1/stats/users - 用户统计"
echo "2. GET /api/v1/stats/logins - 登录统计"
echo "3. GET /api/v1/stats/daily-enhanced - 每日统计"
echo ""
echo "注意事项："
echo "1. 所有API都需要JWT认证"
echo "2. 可以通过查询参数自定义统计范围"
echo "3. 支持按提供商过滤登录统计"
echo "4. 支持自定义日期范围和天数"
echo ""
echo "获取JWT token的方法："
echo "1. 先注册或登录用户"
echo "2. 使用返回的token作为Authorization header"
echo "3. 格式: Authorization: Bearer <your_token>" 