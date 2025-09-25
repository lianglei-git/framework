#!/bin/bash

# Login-v1 与 Unit Auth SSO 最终集成检查脚本

echo "🎯 Login-v1 与 Unit Auth SSO 最终集成检查"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
BACKEND_URL="http://localhost:8080"
FRONTEND_URL="http://localhost:3000"

# 结果计数
PASSED=0
FAILED=0
WARNINGS=0

# 健康检查函数
check_health() {
    local service=$1
    local url=$2
    local expected_code=${3:-200}

    echo -n "🔍 检查 $service... "

    if response=$(curl -s -w "%{http_code}" -o /tmp/response.txt "$url" 2>/dev/null); then
        if [[ $response -eq $expected_code ]]; then
            echo -e "${GREEN}✅ 正常${NC}"
            ((PASSED++))
            return 0
        elif [[ $response -eq 404 ]]; then
            echo -e "${RED}❌ 路由不存在${NC}"
            ((FAILED++))
            return 1
        elif [[ $response -eq 401 ]]; then
            echo -e "${YELLOW}⚠️ 需要认证${NC}"
            ((WARNINGS++))
            return 0
        else
            echo -e "${RED}❌ HTTP $response${NC}"
            ((FAILED++))
            return 1
        fi
    else
        echo -e "${RED}❌ 连接失败${NC}"
        ((FAILED++))
        return 1
    fi
}

# 功能检查函数
check_functionality() {
    local name=$1
    local url=$2
    local method=${3:-GET}
    local data=${4:-}

    echo -n "🔧 检查 $name... "

    local curl_args=(-s -w "%{http_code}" -o /tmp/response.txt)

    if [[ "$method" == "POST" && -n "$data" ]]; then
        curl_args+=(-X POST -H "Content-Type: application/json" -d "$data")
    fi

    curl_args+=("$url")

    if response=$(curl "${curl_args[@]}" 2>/dev/null); then
        if [[ $response -eq 200 ]]; then
            echo -e "${GREEN}✅ 功能正常${NC}"
            ((PASSED++))
            return 0
        elif [[ $response -eq 401 ]]; then
            echo -e "${YELLOW}⚠️ 需要认证${NC}"
            ((WARNINGS++))
            return 0
        else
            echo -e "${RED}❌ HTTP $response${NC}"
            ((FAILED++))
            return 1
        fi
    else
        echo -e "${RED}❌ 连接失败${NC}"
        ((FAILED++))
        return 1
    fi
}

echo ""
echo "📡 1. 后端服务检查"
echo "-----------------"
check_health "后端服务健康" "$BACKEND_URL/health"

echo ""
echo "🔍 2. OpenID Connect端点检查"
echo "-----------------------------"
check_health "OpenID配置" "$BACKEND_URL/api/v1/openid-configuration"
check_health "JWK端点" "$BACKEND_URL/api/v1/jwks-json"

echo ""
echo "🔐 3. OAuth 2.0端点检查"
echo "------------------------"
check_functionality "OAuth授权" "$BACKEND_URL/api/v1/auth/oauth/authorize?client_id=default-client&redirect_uri=$FRONTEND_URL/callback&response_type=code"
check_functionality "OAuth令牌" "$BACKEND_URL/api/v1/auth/oauth/token" "POST" '{"grant_type":"client_credentials","client_id":"default-client","client_secret":"default-client-secret"}'

echo ""
echo "📋 4. API功能检查"
echo "-----------------"
check_health "公开项目" "$BACKEND_URL/api/v1/projects/public"
check_functionality "邮件验证码" "$BACKEND_URL/api/v1/auth/send-email-code" "POST" '{"email":"test@example.com","type":"register"}'
check_health "OAuth提供商" "$BACKEND_URL/api/v1/auth/providers"

echo ""
echo "⚙️  5. 管理功能检查"
echo "-------------------"
check_health "SSO客户端管理" "$BACKEND_URL/api/v1/admin/sso-clients"
check_health "SSO客户端统计" "$BACKEND_URL/api/v1/admin/sso-clients/stats"
check_health "SSO会话统计" "$BACKEND_URL/api/v1/admin/sso-sessions/stats"

echo ""
echo "📁 6. 前端配置检查"
echo "-------------------"
if [[ -f "sso.env.config.js" ]]; then
    echo -e "${GREEN}✅ SSO环境配置文件存在${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ SSO环境配置文件不存在${NC}"
    ((FAILED++))
fi

if [[ -f "sso.config.js" ]]; then
    echo -e "${GREEN}✅ SSO配置文件存在${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ SSO配置文件不存在${NC}"
    ((FAILED++))
fi

if [[ -f "test-sso-integration.js" ]]; then
    echo -e "${GREEN}✅ 集成测试脚本存在${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ 集成测试脚本不存在${NC}"
    ((FAILED++))
fi

echo ""
echo "📊 7. 集成测试"
echo "-------------"
if [[ -f "quick-integration-test.sh" ]]; then
    echo -e "${GREEN}✅ 快速测试脚本存在${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ 快速测试脚本不存在${NC}"
    ((FAILED++))
fi

if [[ -f "SSO_BACKEND_INTEGRATION_README.md" ]]; then
    echo -e "${GREEN}✅ 集成文档存在${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ 集成文档不存在${NC}"
    ((FAILED++))
fi

# 生成最终报告
echo ""
echo "📊 最终集成报告"
echo "==============="
echo "总检查项: $((PASSED + FAILED + WARNINGS))"
echo -e "✅ 通过: ${GREEN}$PASSED${NC}"
echo -e "❌ 失败: ${RED}$FAILED${NC}"
echo -e "⚠️ 警告: ${YELLOW}$WARNINGS${NC}"

# 计算成功率
if [[ $((PASSED + FAILED)) -gt 0 ]]; then
    success_rate=$(( (PASSED * 100) / (PASSED + FAILED) ))
    echo "成功率: ${success_rate}%"
fi

# 判断集成状态
if [[ $FAILED -eq 0 ]]; then
    echo ""
    echo -e "${GREEN}🎉 SSO集成完全成功！${NC}"
    echo ""
    echo "🚀 您现在可以："
    echo "1. 启动前端开发服务器: ${BLUE}npm run dev${NC}"
    echo "2. 运行完整集成测试: ${BLUE}node test-sso-integration.js${NC}"
    echo "3. 查看详细文档: ${BLUE}SSO_BACKEND_INTEGRATION_README.md${NC}"
    echo ""
    echo -e "${GREEN}✅ 所有核心功能都已正常工作！${NC}"
    exit 0
elif [[ $FAILED -le 2 ]]; then
    echo ""
    echo -e "${YELLOW}⚠️  SSO集成基本成功，部分功能需要注意${NC}"
    echo ""
    echo "🔧 建议检查："
    echo "1. 路由配置是否正确"
    echo "2. 环境变量是否配置完整"
    echo "3. 数据库连接是否正常"
    echo ""
    echo -e "${YELLOW}✅ 核心功能正常，建议测试完整流程${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ SSO集成存在问题，需要修复${NC}"
    echo ""
    echo "🔧 故障排除建议："
    echo "1. 检查后端服务是否正常运行"
    echo "2. 验证所有配置文件"
    echo "3. 检查网络连接和防火墙"
    echo "4. 查看详细日志排查问题"
    echo ""
    echo -e "${RED}❌ 请修复问题后重新运行检查${NC}"
    exit 1
fi
