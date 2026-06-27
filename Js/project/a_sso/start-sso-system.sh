#!/bin/bash

# SSO系统启动脚本
# 启动 unit-auth 后端、Packages/Login/web 登录页、SSOA 子项目

echo "🚀 启动 Sparrow SSO 系统"
echo "========================"

LOGIN_WEB_DIR="../../../Packages/Login/web"
UNIT_AUTH_DIR="../../../Packages/Login/unit-auth"
LOGIN_PORT=3033

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "❌ 端口 $port 已被占用"
        exit 1
    fi
}

check_services() {
    echo "📋 检查系统要求..."
    command -v node >/dev/null || { echo "❌ Node.js 未安装"; exit 1; }
    command -v pnpm >/dev/null || { echo "❌ pnpm 未安装"; exit 1; }
    check_port 8080
    check_port "$LOGIN_PORT"
    check_port 5174
    echo "✅ 所有检查通过"
}

start_backend() {
    echo "🔧 启动 unit-auth 后端 (http://localhost:8080)..."
    if [ ! -d "$UNIT_AUTH_DIR" ]; then
        echo "❌ 目录不存在: $UNIT_AUTH_DIR"
        exit 1
    fi
    (cd "$UNIT_AUTH_DIR" && go run main.go > ../../sso-backend.log 2>&1 &)
    BACKEND_PID=$!
    sleep 5
    if curl -sf http://localhost:8080/health >/dev/null; then
        echo "✅ 后端健康检查通过"
    else
        echo "⚠️  后端可能未完全启动，请查看 sso-backend.log"
    fi
}

start_login_frontend() {
    echo "🔧 启动登录页 (http://localhost:${LOGIN_PORT})..."
    if [ ! -d "$LOGIN_WEB_DIR" ]; then
        echo "❌ 目录不存在: $LOGIN_WEB_DIR"
        exit 1
    fi
    (cd "$LOGIN_WEB_DIR" && pnpm start > ../../sso-frontend.log 2>&1 &)
    FRONTEND_PID=$!
    echo "✅ 登录页已启动 (PID: $FRONTEND_PID)"
}

start_ssoa() {
    echo "🔧 启动 SSOA 子项目 (http://localhost:5174)..."
    if [ ! -d "node_modules" ]; then
        pnpm install
    fi
    pnpm run dev > ../sso-ssoa.log 2>&1 &
    SSOA_PID=$!
    echo "✅ SSOA 已启动 (PID: $SSOA_PID)"
}

show_status() {
    echo ""
    echo "🎉 服务已启动"
    echo "  unit-auth:  http://localhost:8080"
    echo "  登录页:     http://localhost:${LOGIN_PORT}"
    echo "  SSOA:       http://localhost:5174"
    echo ""
    echo "测试: 打开 SSOA → 登录 → 跳转登录页完成认证"
}

cleanup() {
    echo "🛑 停止服务..."
    [ -n "${BACKEND_PID:-}" ] && kill "$BACKEND_PID" 2>/dev/null
    [ -n "${FRONTEND_PID:-}" ] && kill "$FRONTEND_PID" 2>/dev/null
    [ -n "${SSOA_PID:-}" ] && kill "$SSOA_PID" 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

check_services
start_backend
start_login_frontend
start_ssoa
show_status
echo "按 Ctrl+C 停止..."
wait
