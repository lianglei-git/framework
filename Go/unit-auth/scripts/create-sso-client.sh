#!/bin/bash

# Create SSO Client Script
# 用于创建SSO客户端的便捷脚本
# 使用方法：./scripts/create-sso-client.sh [客户端ID] [客户端名称] [重定向URI] [描述]

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认配置
DEFAULT_BASE_URL="http://localhost:8080"
DEFAULT_CLIENT_NAME="sso_test_b"
DEFAULT_REDIRECT_URI="http://localhost:5173"
DEFAULT_DESCRIPTION="Test SSO Client created by script"

# 帮助函数
show_help() {
    echo "Create SSO Client Script"
    echo "========================"
    echo ""
    echo "用法:"
    echo "  $0 [客户端ID] [客户端名称] [重定向URI] [描述]"
    echo ""
    echo "参数说明:"
    echo "  客户端ID     - 唯一标识符 (默认: test-client-时间戳)"
    echo "  客户端名称   - 显示名称 (默认: Test Client)"
    echo "  重定向URI    - 回调地址 (默认: http://localhost:3000/callback)"
    echo "  描述         - 客户端描述 (默认: Test SSO Client created by script)"
    echo ""
    echo "环境变量:"
    echo "  BASE_URL     - 服务器地址 (默认: $DEFAULT_BASE_URL)"
    echo "  CLIENT_SECRET - 客户端密钥 (可选，如果不提供会自动生成)"
    echo "  TEST_MODE    - 测试模式 (true/false，默认: false)"
    echo ""
    echo "示例:"
    echo "  $0 my-client \"My App\" \"http://myapp.com/callback\" \"My awesome application\""
    echo "  BASE_URL=http://localhost:8080 $0"
    echo "  TEST_MODE=true $0  # 启用测试模式绕过管理员权限"
    echo ""
    echo "测试模式说明:"
    echo "  当 TEST_MODE=true 时，脚本会发送测试客户端标识，"
    echo "  服务器会允许以 test-client- 开头的客户端绕过管理员权限检查。"
    echo ""
    echo "注意：请确保服务器正在运行且可以访问"
}

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

# 检查依赖
check_dependencies() {
    if ! command -v curl &> /dev/null; then
        log_error "curl 未安装，请先安装 curl"
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        log_warning "jq 未安装，响应将以纯文本格式显示"
    fi
}

# 生成随机密钥
generate_secret() {
    openssl rand -base64 32 2>/dev/null || \
    python3 -c "import secrets; print(secrets.token_urlsafe(32))" 2>/dev/null || \
    echo "fallback-secret-$(date +%s)"
}

# 验证URL格式
validate_url() {
    local url=$1
    if [[ $url =~ ^https?:// ]]; then
        return 0
    else
        log_error "无效的URL格式: $url (应该以 http:// 或 https:// 开头)"
        return 1
    fi
}

# 主函数
main() {
    # 显示帮助
    if [[ "$1" == "-h" || "$1" == "--help" ]]; then
        show_help
        exit 0
    fi

    # 检查依赖
    check_dependencies

    # 读取参数
    CLIENT_ID=${1:-$DEFAULT_CLIENT_ID}
    CLIENT_NAME=${2:-$DEFAULT_CLIENT_NAME}
    REDIRECT_URI=${3:-$DEFAULT_REDIRECT_URI}
    DESCRIPTION=${4:-$DEFAULT_DESCRIPTION}
    BASE_URL=${BASE_URL:-$DEFAULT_BASE_URL}
    CLIENT_SECRET=${CLIENT_SECRET:-$(generate_secret)}

    log_info "创建SSO客户端"
    log_info "客户端ID: $CLIENT_ID"
    log_info "客户端名称: $CLIENT_NAME"
    log_info "重定向URI: $REDIRECT_URI"
    log_info "描述: $DESCRIPTION"
    log_info "服务器地址: $BASE_URL"
    log_info "客户端密钥: ${CLIENT_SECRET:0:8}..."

    # 验证重定向URI
    if ! validate_url "$REDIRECT_URI"; then
        exit 1
    fi

    # 构建请求数据
    REQUEST_DATA=$(cat <<EOF
{
    "name": "$CLIENT_NAME",
    "description": "$DESCRIPTION",
    "redirect_uris": ["$REDIRECT_URI"],
    "grant_types": ["authorization_code", "refresh_token"],
    "response_types": ["code"],
    "scope": ["openid", "profile", "email"],
    "auto_approve": false
}
EOF
    )

    log_info "请求数据: $REQUEST_DATA"

    # 发送请求
    log_info "正在创建SSO客户端..."

    # 检查是否启用测试模式
    TEST_MODE=${TEST_MODE:-"true"}
    if [[ "$TEST_MODE" == "true" ]]; then
        log_info "🔓 测试模式已启用，设置测试环境变量"
        export UNIT_AUTH_TEST_MODE=true
    fi

    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X POST "$BASE_URL/api/v1/admin/sso-clients" \
        -H "Content-Type: application/json" \
        -H "X-Client-ID: $CLIENT_ID" \
        -d "$REQUEST_DATA")

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

    # 调试信息
    log_info "调试信息："
    log_info "HTTP状态码: $HTTP_CODE"
    log_info "响应体长度: ${#HTTP_BODY}"
    if command -v jq &> /dev/null; then
        log_info "响应结构:"
        echo "$HTTP_BODY" | jq 'keys' 2>/dev/null || echo "无法解析JSON结构"
    fi

    # 从响应中提取客户端信息
    if command -v jq &> /dev/null; then
        # 使用 jq 解析响应
        RESPONSE_CLIENT_ID=$(echo "$HTTP_BODY" | jq -r '.data.id // empty')
        RESPONSE_CLIENT_SECRET=$(echo "$HTTP_BODY" | jq -r '.data.secret // empty')
        RESPONSE_NAME=$(echo "$HTTP_BODY" | jq -r '.data.name // empty')
        RESPONSE_DESCRIPTION=$(echo "$HTTP_BODY" | jq -r '.data.description // empty')
        RESPONSE_REDIRECT_URIS=$(echo "$HTTP_BODY" | jq -r '.data.redirect_uris[]? // empty' | tr '\n' ' ')
        RESPONSE_GRANT_TYPES=$(echo "$HTTP_BODY" | jq -r '.data.grant_types[]? // empty' | tr '\n' ' ')
        RESPONSE_RESPONSE_TYPES=$(echo "$HTTP_BODY" | jq -r '.data.response_types[]? // empty' | tr '\n' ' ')
        RESPONSE_SCOPE=$(echo "$HTTP_BODY" | jq -r '.data.scope[]? // empty' | tr '\n' ' ')
        RESPONSE_AUTO_APPROVE=$(echo "$HTTP_BODY" | jq -r '.data.auto_approve // false')
        RESPONSE_IS_ACTIVE=$(echo "$HTTP_BODY" | jq -r '.data.is_active // true')
        RESPONSE_CREATED_AT=$(echo "$HTTP_BODY" | jq -r '.data.created_at // empty')
    else
        # 如果没有 jq，使用默认值
        RESPONSE_CLIENT_ID="$CLIENT_ID"
        RESPONSE_CLIENT_SECRET="$CLIENT_SECRET"
        RESPONSE_NAME="$CLIENT_NAME"
        RESPONSE_DESCRIPTION="$DESCRIPTION"
        RESPONSE_REDIRECT_URIS="$REDIRECT_URI"
        RESPONSE_GRANT_TYPES="authorization_code refresh_token"
        RESPONSE_RESPONSE_TYPES="code"
        RESPONSE_SCOPE="openid profile email"
        RESPONSE_AUTO_APPROVE="false"
        RESPONSE_IS_ACTIVE="true"
        RESPONSE_CREATED_AT=""
    fi

    # 显示重要信息
    echo ""
    log_success "客户端配置信息："
    echo "----------------------------------------"
    echo "客户端ID (Client ID): ${RESPONSE_CLIENT_ID:-$CLIENT_ID}"
    echo "客户端密钥 (Client Secret): ${RESPONSE_CLIENT_SECRET:-$CLIENT_SECRET}"
    echo "客户端名称 (Name): ${RESPONSE_NAME:-$CLIENT_NAME}"
    echo "描述 (Description): ${RESPONSE_DESCRIPTION:-$DESCRIPTION}"
    echo "重定向URI (Redirect URIs): ${RESPONSE_REDIRECT_URIS:-$REDIRECT_URI}"
    echo "授权类型 (Grant Types): ${RESPONSE_GRANT_TYPES:-authorization_code refresh_token}"
    echo "响应类型 (Response Types): ${RESPONSE_RESPONSE_TYPES:-code}"
    echo "权限范围 (Scope): ${RESPONSE_SCOPE:-openid profile email}"
    echo "自动批准 (Auto Approve): ${RESPONSE_AUTO_APPROVE:-false}"
    echo "是否激活 (Is Active): ${RESPONSE_IS_ACTIVE:-true}"
    if [[ -n "$RESPONSE_CREATED_AT" ]]; then
        echo "创建时间 (Created At): $RESPONSE_CREATED_AT"
    fi
    echo ""
    echo "OAuth 2.0 端点信息："
    echo "授权端点 (Authorization Endpoint): $BASE_URL/oauth/authorize"
    echo "令牌端点 (Token Endpoint): $BASE_URL/oauth/token"
    echo "用户信息端点 (UserInfo Endpoint): $BASE_URL/oauth/userinfo"
    echo "----------------------------------------"

    # 保存到文件
    OUTPUT_FILE="sso-client-${RESPONSE_CLIENT_ID:-$CLIENT_ID}.json"
    
    # 处理数组格式
    if command -v jq &> /dev/null; then
        # 使用 jq 生成正确的 JSON 格式
        cat > "$OUTPUT_FILE" << EOF
{
    "client_id": "${RESPONSE_CLIENT_ID:-$CLIENT_ID}",
    "client_secret": "${RESPONSE_CLIENT_SECRET:-$CLIENT_SECRET}",
    "name": "${RESPONSE_NAME:-$CLIENT_NAME}",
    "description": "${RESPONSE_DESCRIPTION:-$DESCRIPTION}",
    "redirect_uris": $(echo "$HTTP_BODY" | jq '.data.redirect_uris // ["'$REDIRECT_URI'"]'),
    "grant_types": $(echo "$HTTP_BODY" | jq '.data.grant_types // ["authorization_code", "refresh_token"]'),
    "response_types": $(echo "$HTTP_BODY" | jq '.data.response_types // ["code"]'),
    "scope": $(echo "$HTTP_BODY" | jq '.data.scope // ["openid", "profile", "email"]'),
    "auto_approve": ${RESPONSE_AUTO_APPROVE:-false},
    "is_active": ${RESPONSE_IS_ACTIVE:-true},
    "authorization_endpoint": "$BASE_URL/oauth/authorize",
    "token_endpoint": "$BASE_URL/oauth/token",
    "userinfo_endpoint": "$BASE_URL/oauth/userinfo",
    "created_at": "${RESPONSE_CREATED_AT:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
}
EOF
    else
        # 如果没有 jq，使用简单的格式
        cat > "$OUTPUT_FILE" << EOF
{
    "client_id": "${RESPONSE_CLIENT_ID:-$CLIENT_ID}",
    "client_secret": "${RESPONSE_CLIENT_SECRET:-$CLIENT_SECRET}",
    "name": "${RESPONSE_NAME:-$CLIENT_NAME}",
    "description": "${RESPONSE_DESCRIPTION:-$DESCRIPTION}",
    "redirect_uris": ["$REDIRECT_URI"],
    "grant_types": ["authorization_code", "refresh_token"],
    "response_types": ["code"],
    "scope": ["openid", "profile", "email"],
    "auto_approve": ${RESPONSE_AUTO_APPROVE:-false},
    "is_active": ${RESPONSE_IS_ACTIVE:-true},
    "authorization_endpoint": "$BASE_URL/oauth/authorize",
    "token_endpoint": "$BASE_URL/oauth/token",
    "userinfo_endpoint": "$BASE_URL/oauth/userinfo",
    "created_at": "${RESPONSE_CREATED_AT:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
}
EOF
    fi

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
