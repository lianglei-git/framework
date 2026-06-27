#!/bin/bash

# Test Create SSO Client Script
# 用于测试create-sso-client.sh脚本的模拟脚本
# 模拟服务器响应以便在没有实际服务器运行时测试脚本逻辑
# 支持测试模式模拟管理员权限绕过功能

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 模拟服务器响应
simulate_server_response() {
    local client_id=$1
    local client_name=$2
    local redirect_uri=$3
    local description=$4

    # 模拟HTTP响应
    RESPONSE='{
  "code": 201,
  "message": "SSO client created successfully",
  "data": {
    "id": "'$client_id'",
    "name": "'$client_name'",
    "description": "'$description'",
    "redirect_uris": ["'$redirect_uri'"],
    "grant_types": ["authorization_code", "refresh_token"],
    "response_types": ["code"],
    "scope": ["openid", "profile", "email"],
    "auto_approve": false,
    "is_active": true,
    "created_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "updated_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }
}'

    echo "$RESPONSE"
    echo "201"  # HTTP状态码
}

# 模拟curl命令
mock_curl() {
    local client_id=$1
    local client_name=$2
    local redirect_uri=$3
    local description=$4

    # 模拟网络延迟
    sleep 1

    # 调用模拟服务器
    simulate_server_response "$client_id" "$client_name" "$redirect_uri" "$description"
}

# 主函数
main() {
    log_info "=== 测试CreateSSOClient脚本 ==="

    # 检查依赖
    if ! command -v jq &> /dev/null; then
        log_warning "jq 未安装，响应将以纯文本格式显示"
    fi

    # 读取参数
    CLIENT_ID=${1:-"test-client-$(date +%s)"}
    CLIENT_NAME=${2:-"Test Client"}
    REDIRECT_URI=${3:-"http://localhost:3000/callback"}
    DESCRIPTION=${4:-"Test SSO Client created by script"}
    CLIENT_SECRET=${CLIENT_SECRET:-"mock-secret-$(date +%s)"}

    log_info "客户端ID: $CLIENT_ID"
    log_info "客户端名称: $CLIENT_NAME"
    log_info "重定向URI: $REDIRECT_URI"
    log_info "描述: $DESCRIPTION"
    log_info "客户端密钥: ${CLIENT_SECRET:0:8}..."

    # 模拟API调用
    log_info "正在创建SSO客户端..."

    # 检查是否启用测试模式
    TEST_MODE=${TEST_MODE:-"false"}
    if [[ "$TEST_MODE" == "true" ]]; then
        log_info "🔓 测试模式已启用，模拟绕过管理员权限"
    fi

    RESPONSE=$(mock_curl "$CLIENT_ID" "$CLIENT_NAME" "$REDIRECT_URI" "$DESCRIPTION")

    # 分离响应体和状态码
    # 使用 awk 来更可靠地分离响应体和状态码
    RESPONSE_FILE=$(mktemp)
    echo "$RESPONSE" > "$RESPONSE_FILE"

    # 获取总行数
    TOTAL_LINES=$(wc -l < "$RESPONSE_FILE")

    if [[ $TOTAL_LINES -gt 0 ]]; then
        # 除了最后一行之外的所有内容作为响应体
        HTTP_BODY=$(head -n $((TOTAL_LINES - 1)) "$RESPONSE_FILE" 2>/dev/null || echo "")
        # 最后一行作为状态码
        HTTP_CODE=$(tail -n 1 "$RESPONSE_FILE" 2>/dev/null || echo "500")
    else
        HTTP_BODY=""
        HTTP_CODE="500"
    fi

    # 清理临时文件
    rm -f "$RESPONSE_FILE"

    # 检查HTTP状态码
    if [[ "$HTTP_CODE" -ne 201 ]]; then
        log_error "创建失败，HTTP状态码: $HTTP_CODE"
        log_error "响应: $HTTP_BODY"
        exit 1
    fi

    log_success "SSO客户端创建成功！"

    # 格式化输出
    if command -v jq &> /dev/null; then
        echo "$HTTP_BODY" | jq '.'
    else
        echo "$HTTP_BODY"
    fi

    # 显示重要信息
    echo ""
    log_success "客户端配置信息："
    echo "----------------------------------------"
    echo "客户端ID (Client ID): $CLIENT_ID"
    echo "客户端密钥 (Client Secret): $CLIENT_SECRET"
    echo "重定向URI (Redirect URI): $REDIRECT_URI"
    echo "授权端点 (Authorization Endpoint): http://localhost:8080/oauth/authorize"
    echo "令牌端点 (Token Endpoint): http://localhost:8080/oauth/token"
    echo "用户信息端点 (UserInfo Endpoint): http://localhost:8080/oauth/userinfo"
    echo "----------------------------------------"

    # 保存到文件
    OUTPUT_FILE="sso-client-${CLIENT_ID}.json"
    cat > "$OUTPUT_FILE" << EOF
{
    "client_id": "$CLIENT_ID",
    "client_secret": "$CLIENT_SECRET",
    "redirect_uri": "$REDIRECT_URI",
    "authorization_endpoint": "http://localhost:8080/oauth/authorize",
    "token_endpoint": "http://localhost:8080/oauth/token",
    "userinfo_endpoint": "http://localhost:8080/oauth/userinfo",
    "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

    log_success "配置已保存到文件: $OUTPUT_FILE"

    # 清理敏感信息提示
    echo ""
    log_warning "安全提醒："
    echo "1. 请妥善保管客户端密钥 (Client Secret)"
    echo "2. 客户端密钥不会在API响应中返回"
    echo "3. 如果遗失密钥，需要重新创建客户端"
    echo "4. 请定期更新客户端密钥"
}

# 运行主函数
main "$@"
