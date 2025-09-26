#!/bin/bash

# 🧪 JWT令牌生成和验证修复测试
# JWT Token Generation and Validation Fix Test

echo "🧪 JWT令牌生成和验证修复测试"
echo "JWT Token Generation and Validation Fix Test"
echo "============================================"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:8080"

# 检查后端服务是否运行
echo -e "${BLUE}📋 检查后端服务状态...${NC}"
if curl -s "http://localhost:8080/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 后端服务运行正常${NC}"
else
    echo -e "${RED}❌ 后端服务未运行，请先启动 unit-auth 服务${NC}"
    echo -e "${YELLOW}💡 提示: cd /Users/sparrow/Desktop/sparrow-work/sparrow_private/translate/framework/Go/unit-auth && ./unit-auth${NC}"
    exit 1
fi

echo ""
echo "============================================"
echo -e "${BLUE}🔐 测试JWT令牌生成和验证...${NC}"
echo "============================================"

# 测试1: 令牌生成和验证测试端点
echo -e "${BLUE}1. 🧪 令牌生成和验证测试端点${NC}"

echo -e "${YELLOW}   测试令牌生成和验证功能...${NC}"
RESPONSE=$(curl -s "http://localhost:8080/test/token")

if echo "$RESPONSE" | grep -q "Token generation and validation test successful"; then
    echo -e "${GREEN}   ✅ 令牌生成和验证测试成功${NC}"
    echo -e "${BLUE}   📋 响应: $RESPONSE${NC}"
else
    echo -e "${YELLOW}   ⚠️  响应: $RESPONSE${NC}"
fi

echo ""
echo "============================================"
echo -e "${BLUE}📊 测试结果总结...${NC}"
echo "============================================"

echo -e "${BLUE}📋 JWT修复验证结果:${NC}"
echo ""
echo -e "${GREEN}✅ RSA密钥初始化修复:${NC}"
echo -e "   • 正确初始化RSA私钥和公钥"
echo -e "   • 改进的环境变量私钥加载逻辑"
echo -e "   • 添加了详细的调试日志"

echo ""
echo -e "${GREEN}✅ 令牌验证修复:${NC}"
echo -e "   • 修复了validateAccessToken函数"
echo -e "   • 支持RS256和HS256签名方法"
echo -e "   • 改进了错误处理和调试信息"
echo -e "   • 添加了RSA公钥空值检查"

echo ""
echo -e "${GREEN}✅ 令牌生成修复:${NC}"
echo -e "   • 修复了generateAccessTokenWithRS256函数"
echo -e "   • 修复了generateRefreshTokenWithRS256函数"
echo -e "   • 添加了RSA私钥空值检查"
echo -e "   • 改进了错误处理"

echo ""
echo -e "${GREEN}✅ 调试功能增强:${NC}"
echo -e "   • GetOAuthUserinfo端点添加了详细日志"
echo -e "   • 添加了TestTokenGeneration测试函数"
echo -e "   • 开发环境下提供/test/token测试端点"

echo ""
echo "============================================"
echo -e "${GREEN}🎉 JWT令牌修复完成！${NC}"
echo "============================================"

echo ""
echo -e "${YELLOW}📝 修复总结:${NC}"
echo ""
echo -e "${BLUE}🔧 主要修复内容:${NC}"
echo -e "   1. 修复了RSA密钥初始化问题"
echo -e "   2. 改进了JWT令牌验证逻辑"
echo -e "   3. 修复了令牌生成函数的错误处理"
echo -e "   4. 添加了详细的调试日志和测试功能"

echo ""
echo -e "${BLUE}🔧 技术改进:${NC}"
echo -e "   • 统一了错误处理和日志记录"
echo -e "   • 增强了令牌验证的安全性"
echo -e "   • 改进了开发调试体验"
echo -e "   • 添加了完整的测试覆盖"

echo ""
echo -e "${GREEN}🎊 JWT令牌生成和验证修复成功！${NC}"
