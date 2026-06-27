#!/bin/bash

# 邮箱认证服务启动脚本

echo "🚀 启动邮箱认证服务..."

# 检查Go是否安装
if ! command -v go &> /dev/null; then
    echo "❌ Go未安装，请先安装Go 1.21+"
    exit 1
fi

# 检查MySQL是否运行
if ! command -v mysql &> /dev/null; then
    echo "⚠️  MySQL未安装，请先安装MySQL或使用Docker"
    echo "   使用Docker启动: docker-compose up -d"
    exit 1
fi

# 检查.env文件
if [ ! -f .env ]; then
    echo "📝 创建.env文件..."
    cp env.example .env
    echo "⚠️  请编辑.env文件配置数据库和邮件服务"
    echo "   然后重新运行此脚本"
    exit 1
fi

# 安装依赖
echo "📦 安装依赖..."
go mod tidy

# 运行服务
echo "🌟 启动服务..."
go run main.go 