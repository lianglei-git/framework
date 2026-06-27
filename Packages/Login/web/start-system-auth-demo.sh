#!/bin/bash

# 🏢 系统内用户认证前端架构演示启动脚本
# System Internal User Authentication Frontend Architecture Demo Startup Script

echo "🏢 系统内用户认证前端架构演示"
echo "System Internal User Authentication Frontend Architecture Demo"
echo "================================================================"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查Node.js版本
echo -e "${BLUE}📋 检查环境要求...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装，请先安装 Node.js${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'.' -f1 | cut -d'v' -f2)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${RED}❌ 需要 Node.js 16+ 版本，当前版本: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js 版本: $(node -v)${NC}"

# 检查npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm 未安装${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm 版本: $(npm -v)${NC}"

# 检查后端服务
echo -e "${BLUE}🔍 检查后端服务...${NC}"
if curl -s http://localhost:8080/api/v1/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 后端服务运行中 (http://localhost:8080)${NC}"
else
    echo -e "${YELLOW}⚠️  后端服务未运行，建议启动 unit-auth 服务${NC}"
    echo -e "${YELLOW}   请在另一个终端运行: cd ../Go/unit-auth && go run main.go${NC}"
fi

# 进入项目目录
cd "$(dirname "$0")"
echo -e "${BLUE}📁 进入项目目录: $(pwd)${NC}"

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 安装项目依赖...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ 依赖安装失败${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ 依赖安装完成${NC}"
else
    echo -e "${GREEN}✅ 依赖已存在${NC}"
fi

# 构建项目
echo -e "${BLUE}🔨 构建项目...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 项目构建失败${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 项目构建完成${NC}"

# 启动开发服务器
echo ""
echo "================================================================"
echo -e "${GREEN}🎉 系统内用户认证前端架构演示启动中...${NC}"
echo "================================================================"
echo ""
echo -e "${BLUE}🚀 启动开发服务器...${NC}"
echo -e "${YELLOW}📱 访问地址: ${GREEN}http://localhost:5173${NC}"
echo ""
echo -e "${BLUE}🔧 演示功能:${NC}"
echo -e "  ${GREEN}✅${NC} 统一认证UI组件"
echo -e "  ${GREEN}✅${NC} 子应用分层架构"
echo -e "  ${GREEN}✅${NC} 多认证方式支持"
echo -e "  ${GREEN}✅${NC} 第三方登录集成"
echo -e "  ${GREEN}✅${NC} 完整认证流程"
echo ""
echo -e "${BLUE}📱 测试应用:${NC}"
echo -e "  ${YELLOW}默认应用${NC}: http://localhost:5173/?appid=default"
echo -e "  ${YELLOW}用户管理${NC}: http://localhost:5173/?appid=user-management"
echo -e "  ${YELLOW}订单管理${NC}: http://localhost:5173/?appid=order-management"
echo -e "  ${YELLOW}数据分析${NC}: http://localhost:5173/?appid=analytics-dashboard"
echo ""
echo -e "${BLUE}🔐 支持的认证方式:${NC}"
echo -e "  ${GREEN}👤${NC} 本地账号认证 (用户名/邮箱/手机号 + 密码)"
echo -e "  ${GREEN}🐙${NC} GitHub登录 (OAuth 2.1 + PKCE)"
echo -e "  ${GREEN}🔍${NC} Google登录 (OpenID Connect)"
echo -e "  ${GREEN}💬${NC} 微信登录 (OAuth授权)"
echo ""
echo "================================================================"
echo -e "${GREEN}🎊 演示系统已启动！请在浏览器中访问上述地址体验功能${NC}"
echo "================================================================"

# 启动开发服务器
npm run dev
