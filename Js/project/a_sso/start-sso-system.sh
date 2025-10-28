#!/bin/bash

# SSO系统启动脚本
# 用于启动完整的SSO认证系统，包括unit-auth后端、Login-v1前端和SSOA子项目

echo "🚀 启动Sparrow SSO系统"
echo "========================"

# 检查端口是否被占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null; then
        echo "❌ 端口 $port 已被占用"
        echo "请先停止占用该端口的进程或修改配置"
        exit 1
    fi
}

# 检查必要的服务
check_services() {
    echo "📋 检查系统要求..."

    # 检查Node.js
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js 未安装"
        echo "请安装Node.js: https://nodejs.org/"
        exit 1
    fi

    # 检查pnpm
    if ! command -v pnpm &> /dev/null; then
        echo "❌ pnpm 未安装"
        echo "请安装pnpm: npm install -g pnpm"
        exit 1
    fi

    # 检查端口
    echo "📡 检查端口可用性..."
    check_port 8080  # unit-auth
    check_port 5173  # Login-v1前端
    check_port 5174  # SSOA前端 + API服务器

    echo "✅ 所有检查通过"
}

# 启动unit-auth后端
start_backend() {
    echo "🔧 启动unit-auth后端服务..."
    echo "📍 后端服务: http://localhost:8080"

    # 检查unit-auth目录
    if [ ! -d "../Go/unit-auth" ]; then
        echo "❌ unit-auth目录不存在"
        echo "请确保unit-auth项目在正确位置"
        exit 1
    fi

    # 启动后端服务（在后台运行）
    cd ../Go/unit-auth
    go run main.go > ../sso-backend.log 2>&1 &
    BACKEND_PID=$!

    echo "✅ 后端服务已启动 (PID: $BACKEND_PID)"
    echo "📝 后端日志: ../sso-backend.log"

    # 等待后端启动
    echo "⏳ 等待后端服务启动..."
    sleep 5

    # 检查后端是否成功启动
    if curl -s http://localhost:8080/api/v1/health > /dev/null; then
        echo "✅ 后端服务健康检查通过"
    else
        echo "⚠️  后端服务可能未完全启动，请检查日志"
    fi

    cd - > /dev/null
}

# 启动Login-v1 API服务器
start_login_v1_api() {
    echo "🔧 启动Login-v1 API服务器..."
    echo "📍 API服务器: http://localhost:5174"

    # 检查Login-v1目录
    if [ ! -d "../Views/React/Login-v1" ]; then
        echo "❌ Login-v1目录不存在"
        echo "请确保Login-v1项目在正确位置"
        exit 1
    fi

    # 启动API服务器（在后台运行）
    cd ../Views/React/Login-v1
    node api-server.js > ../sso-api.log 2>&1 &
    API_PID=$!

    echo "✅ API服务器已启动 (PID: $API_PID)"
    echo "📝 API日志: ../sso-api.log"

    # 等待API服务器启动
    echo "⏳ 等待API服务器启动..."
    sleep 3

    cd - > /dev/null
}

# 启动Login-v1前端
start_login_v1_frontend() {
    echo "🔧 启动Login-v1前端应用..."
    echo "📍 前端应用: http://localhost:5173"

    cd ../Views/React/Login-v1

    # 启动前端开发服务器（在后台运行）
    pnpm run dev > ../sso-frontend.log 2>&1 &
    FRONTEND_PID=$!

    echo "✅ Login-v1前端已启动 (PID: $FRONTEND_PID)"
    echo "📝 前端日志: ../sso-frontend.log"

    cd - > /dev/null
}

# 启动SSOA应用
start_ssoa() {
    echo "🔧 启动SSOA子项目应用..."
    echo "📍 子项目应用: http://localhost:5174"

    # 确保依赖已安装
    if [ ! -d "node_modules" ]; then
        echo "📦 安装SSOA依赖..."
        pnpm install
    fi

    # 启动SSOA开发服务器（在后台运行）
    pnpm run dev > ../sso-ssoa.log 2>&1 &
    SSOA_PID=$!

    echo "✅ SSOA应用已启动 (PID: $SSOA_PID)"
    echo "📝 SSOA日志: ../sso-ssoa.log"
}

# 显示服务状态
show_status() {
    echo ""
    echo "🎉 所有服务已启动!"
    echo "========================"
    echo ""
    echo "📋 服务状态:"
    echo "🔧 unit-auth后端: http://localhost:8080 (PID: $BACKEND_PID)"
    echo "🌐 Login-v1前端: http://localhost:5173 (PID: $FRONTEND_PID)"
    echo "🔗 SSO API服务: http://localhost:5174/api (PID: $API_PID)"
    echo "📱 SSOA子项目: http://localhost:5174 (PID: $SSOA_PID)"
    echo ""
    echo "📝 日志文件:"
    echo "📄 后端日志: sso-backend.log"
    echo "📄 API日志: sso-api.log"
    echo "📄 前端日志: sso-frontend.log"
    echo "📄 SSOA日志: sso-ssoa.log"
    echo ""
    echo "🚀 测试步骤:"
    echo "1. 打开浏览器访问: http://localhost:5174"
    echo "2. 点击SSOA应用中的任意登录按钮"
    echo "3. 浏览器会重定向到Login-v1登录页面"
    echo "4. 在Login-v1中完成认证"
    echo "5. 认证成功后自动返回SSOA应用"
    echo ""
    echo "🛑 停止所有服务:"
    echo "按 Ctrl+C 或运行: kill $BACKEND_PID $API_PID $FRONTEND_PID $SSOA_PID"
}

# 清理函数
cleanup() {
    echo ""
    echo "🛑 正在停止所有服务..."

    # 停止所有后台进程
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo "✅ 后端服务已停止"
    fi

    if [ ! -z "$API_PID" ]; then
        kill $API_PID 2>/dev/null
        echo "✅ API服务已停止"
    fi

    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo "✅ 前端服务已停止"
    fi

    if [ ! -z "$SSOA_PID" ]; then
        kill $SSOA_PID 2>/dev/null
        echo "✅ SSOA服务已停止"
    fi

    echo "🎯 所有服务已停止"
    exit 0
}

# 主函数
main() {
    # 设置信号处理
    trap cleanup SIGINT SIGTERM

    # 检查系统要求
    check_services

    echo ""
    echo "📋 启动服务..."

    # 启动所有服务
    start_backend
    start_login_v1_api
    start_login_v1_frontend
    start_ssoa

    # 显示状态
    show_status

    # 等待用户输入
    echo ""
    echo "按 Ctrl+C 停止所有服务..."
    wait
}

# 运行主函数
main
