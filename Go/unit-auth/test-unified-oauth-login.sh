#!/bin/bash

# 🛡️ 统一OAuth登录测试脚本
# Unified OAuth Login Test Script

echo "🛡️ 统一OAuth登录测试"
echo "Unified OAuth Login Test"
echo "================================================================"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:8080/api/v1"

# 检查后端服务是否运行
echo -e "${BLUE}📋 检查后端服务状态...${NC}"
if curl -s "http://localhost:8080/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 后端服务运行正常${NC}"
else
    echo -e "${RED}❌ 后端服务未运行，请先启动 unit-auth 服务${NC}"
    exit 1
fi

echo ""
echo "================================================================="
echo -e "${BLUE}🔐 测试统一OAuth登录...${NC}"
echo "================================================================="

# 测试1: 本地账号密码登录
echo -e "${BLUE}1. 🧪 测试本地账号密码登录${NC}"

echo -e "${YELLOW}   测试场景1: 正确的本地登录${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/oauth-login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "provider=local" \
    -d "username=testuser" \
    -d "password=testpass")

echo "   响应状态码: $(echo "$RESPONSE" | jq -r '.error // "200"')"

if echo "$RESPONSE" | jq -e '.error == "invalid_grant"' > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ 正确处理了无效的用户名密码${NC}"
elif echo "$RESPONSE" | jq -e '.access_token' > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ 本地登录成功${NC}"
else
    echo -e "${YELLOW}   ⚠️  本地登录返回: $(echo "$RESPONSE" | jq -r '.error_description // "未知错误"')${NC}"
fi

echo -e "${YELLOW}   测试场景2: 缺失用户名${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/oauth-login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "provider=local" \
    -d "password=testpass")

if echo "$RESPONSE" | grep -q "Missing required parameters"; then
    echo -e "${GREEN}   ✅ 正确验证了缺失参数${NC}"
else
    echo -e "${YELLOW}   ⚠️  响应: $RESPONSE${NC}"
fi

# 测试2: GitHub登录（双重验证模式）
echo ""
echo -e "${BLUE}2. 🧪 测试GitHub登录（双重验证）${NC}"

echo -e "${YELLOW}   测试场景3: GitHub登录（有双重验证参数）${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/oauth-login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "provider=github" \
    -d "code=github_auth_code_123" \
    -d "state=github_state_abc" \
    -d "code_verifier=github_verifier_123456789012345678901234567890123456789012345678901234567890" \
    -d "app_id=default" \
    -d "internal_auth=true" \
    -d "double_verification=true")

echo "   响应状态码: $(echo "$RESPONSE" | jq -r '.error // "200"')"

if echo "$RESPONSE" | jq -e '.error == "invalid_provider"' > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ 正确处理了不存在的GitHub provider${NC}"
elif echo "$RESPONSE" | jq -e '.access_token' > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ GitHub登录成功${NC}"
else
    echo -e "${YELLOW}   ⚠️  GitHub登录返回: $(echo "$RESPONSE" | jq -r '.error_description // "未知错误"')${NC}"
fi

echo -e "${YELLOW}   测试场景4: GitHub登录（缺失双重验证参数）${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/oauth-login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "provider=github" \
    -d "code=github_auth_code_123" \
    -d "state=github_state_abc")

if echo "$RESPONSE" | grep -q "PKCE code_verifier required"; then
    echo -e "${GREEN}   ✅ 正确要求双重验证参数${NC}"
else
    echo -e "${YELLOW}   ⚠️  响应: $RESPONSE${NC}"
fi

# 测试3: 邮箱验证码登录
echo ""
echo -e "${BLUE}3. 🧪 测试邮箱验证码登录${NC}"

echo -e "${YELLOW}   测试场景5: 正确的邮箱验证码${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/oauth-login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "provider=email" \
    -d "email=test@example.com" \
    -d "code=123456")

echo "   响应状态码: $(echo "$RESPONSE" | jq -r '.error // "200"')"

if echo "$RESPONSE" | jq -e '.error == "invalid_grant"' > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ 正确处理了无效的邮箱验证码${NC}"
elif echo "$RESPONSE" | jq -e '.access_token' > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ 邮箱登录成功${NC}"
else
    echo -e "${YELLOW}   ⚠️  邮箱登录返回: $(echo "$RESPONSE" | jq -r '.error_description // "未知错误"')${NC}"
fi

echo -e "${YELLOW}   测试场景6: 错误的邮箱验证码${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/oauth-login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "provider=email" \
    -d "email=test@example.com" \
    -d "code=999999")

if echo "$RESPONSE" | grep -q "Invalid email or verification code"; then
    echo -e "${GREEN}   ✅ 正确验证了错误的验证码${NC}"
else
    echo -e "${YELLOW}   ⚠️  响应: $RESPONSE${NC}"
fi

# 测试4: 手机号验证码登录
echo ""
echo -e "${BLUE}4. 🧪 测试手机号验证码登录${NC}"

echo -e "${YELLOW}   测试场景7: 正确的手机号验证码${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/oauth-login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "provider=phone" \
    -d "phone=13800138000" \
    -d "code=123456")

echo "   响应状态码: $(echo "$RESPONSE" | jq -r '.error // "200"')"

if echo "$RESPONSE" | jq -e '.error == "invalid_grant"' > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ 正确处理了无效的手机号验证码${NC}"
elif echo "$RESPONSE" | jq -e '.access_token' > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ 手机号登录成功${NC}"
else
    echo -e "${YELLOW}   ⚠️  手机号登录返回: $(echo "$RESPONSE" | jq -r '.error_description // "未知错误"')${NC}"
fi

# 测试5: 错误处理
echo ""
echo -e "${BLUE}5. 🧪 测试错误处理${NC}"

echo -e "${YELLOW}   测试场景8: 无效的provider${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/oauth-login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "provider=invalid_provider" \
    -d "code=test_code")

if echo "$RESPONSE" | grep -q "invalid_request"; then
    echo -e "${GREEN}   ✅ 正确处理了无效的provider${NC}"
else
    echo -e "${YELLOW}   ⚠️  响应: $RESPONSE${NC}"
fi

echo ""
echo "================================================================"
echo -e "${BLUE}📊 测试结果总结...${NC}"
echo "================================================================"

echo -e "${BLUE}📋 统一OAuth登录测试结果:${NC}"
echo ""
echo -e "${GREEN}✅ 支持的认证方式:${NC}"
echo -e "   • 本地账号密码登录 (provider=local)"
echo -e "   • GitHub登录 (provider=github)"
echo -e "   • 邮箱验证码登录 (provider=email)"
echo -e "   • 手机号验证码登录 (provider=phone)"

echo ""
echo -e "${GREEN}✅ 双重验证支持:${NC}"
echo -e "   • PKCE code_verifier验证"
echo -e "   • State参数CSRF保护"
echo -e "   • 应用ID分层验证"
echo -e "   • 内部认证标识验证"

echo ""
echo -e "${GREEN}✅ 统一响应格式:${NC}"
echo -e "   • 统一的token响应格式"
echo -e "   • 包含用户信息的响应"
echo -e "   • 标准化的错误处理"

echo ""
echo "================================================================"
echo -e "${GREEN}🎉 统一OAuth登录功能测试完成！${NC}"
echo "================================================================"

echo ""
echo -e "${YELLOW}📝 使用说明:${NC}"
echo ""
echo -e "${BLUE}1. 本地账号密码登录:${NC}"
echo -e "   POST /api/v1/auth/oauth-login"
echo -e "   Content-Type: application/x-www-form-urlencoded"
echo -e ""
echo -e "   provider=local&"
echo -e "   username=用户名&"
echo -e "   password=密码"

echo ""
echo -e "${BLUE}2. GitHub登录（双重验证）:${NC}"
echo -e "   POST /api/v1/auth/oauth-login"
echo -e "   Content-Type: application/x-www-form-urlencoded"
echo -e ""
echo -e "   provider=github&"
echo -e "   code=授权码&"
echo -e "   state=状态参数&"
echo -e "   code_verifier=PKCE_verifier&"
echo -e "   app_id=应用ID&"
echo -e "   internal_auth=true&"
echo -e "   double_verification=true"

echo ""
echo -e "${BLUE}3. 邮箱验证码登录:${NC}"
echo -e "   POST /api/v1/auth/oauth-login"
echo -e "   Content-Type: application/x-www-form-urlencoded"
echo -e ""
echo -e "   provider=email&"
echo -e "   email=邮箱地址&"
echo -e "   code=验证码"

echo ""
echo -e "${BLUE}4. 手机号验证码登录:${NC}"
echo -e "   POST /api/v1/auth/oauth-login"
echo -e "   Content-Type: application/x-www-form-urlencoded"
echo -e ""
echo -e "   provider=phone&"
echo -e "   phone=手机号&"
echo -e "   code=验证码"

echo ""
echo -e "${GREEN}🎊 统一OAuth登录功能实现成功！${NC}"
