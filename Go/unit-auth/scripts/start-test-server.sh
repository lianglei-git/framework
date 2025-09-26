#!/bin/bash

# Start Test Server Script
# 用于快速启动unit-auth服务器并启用测试模式
# 这样create-sso-client.sh脚本就可以正常工作

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

# 检查是否在正确的目录
check_directory() {
    if [[ ! -f "main.go" ]]; then
        log_error "请在unit-auth项目根目录下运行此脚本"
        log_info "当前目录: $(pwd)"
        log_info "请运行: cd /path/to/unit-auth && ./scripts/start-test-server.sh"
        exit 1
    fi
}

# 检查依赖
check_dependencies() {
    if ! command -v go &> /dev/null; then
        log_error "Go 未安装，请先安装 Go"
        exit 1
    fi

    # 检查版本
    GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
    REQUIRED_VERSION="1.19"

    if [[ "$(printf '%s\n' "$REQUIRED_VERSION" "$GO_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]]; then
        log_warning "Go版本为 $GO_VERSION，建议使用 Go $REQUIRED_VERSION 或更高版本"
    fi
}

# 构建项目
build_project() {
    log_info "正在构建项目..."
    go build -o unit-auth .
    if [[ $? -ne 0 ]]; then
        log_error "构建失败"
        exit 1
    fi
    log_success "项目构建成功"
}

# 检查配置文件
check_config() {
    if [[ ! -f "env.example" ]]; then
        log_warning "未找到 env.example 文件"
        return
    fi

    if [[ ! -f ".env" ]]; then
        log_info "创建默认配置文件..."
        cp env.example .env
        log_success "已创建 .env 文件，请根据需要修改配置"
    fi
}

# 启动服务器
start_server() {
    local port=${1:-8080}

    log_info "启动测试服务器..."
    log_info "端口: $port"
    log_info "测试模式: 已启用"
    log_info "访问地址: http://localhost:$port"

    # 设置测试环境变量
    export UNIT_AUTH_TEST_MODE=true

    # 启动服务器（在后台运行）
    ./unit-auth &
    SERVER_PID=$!

    log_success "服务器已启动 (PID: $SERVER_PID)"

    # 等待服务器启动
    log_info "等待服务器启动..."
    sleep 3

    # 检查服务器是否正常运行
    if curl -s http://localhost:$port/api/v1/health > /dev/null; then
        log_success "服务器健康检查通过"
    else
        log_error "服务器启动失败"
        kill $SERVER_PID 2>/dev/null
        exit 1
    fi

    echo ""
    log_success "=== 服务器启动完成 ==="
    echo ""
    log_info "测试脚本现在可以正常使用："
    echo "  ./scripts/create-sso-client.sh"
    echo "  ./scripts/test-create-sso-client.sh"
    echo ""
    log_info "API文档地址: http://localhost:$port/api/v1/docs"
    log_info "健康检查地址: http://localhost:$port/api/v1/health"
    echo ""
    log_warning "按 Ctrl+C 停止服务器"

    # 等待服务器进程
    wait $SERVER_PID
}

# 清理函数
cleanup() {
    log_info "正在停止服务器..."
    if [[ -n "$SERVER_PID" ]]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    log_success "服务器已停止"
}

# 主函数
main() {
    local port=${1:-8080}

    echo "🚀 Unit Auth 测试服务器启动脚本"
    echo "=================================="

    # 设置信号处理
    trap cleanup EXIT INT TERM

    # 检查环境
    check_directory
    check_dependencies
    check_config
    build_project

    # 启动服务器
    start_server "$port"
}

# 显示帮助
show_help() {
    echo "Unit Auth 测试服务器启动脚本"
    echo "=============================="
    echo ""
    echo "用法:"
    echo "  $0 [端口号]"
    echo ""
    echo "参数:"
    echo "  端口号    - 服务器监听端口 (默认: 8080)"
    echo ""
    echo "环境变量:"
    echo "  UNIT_AUTH_TEST_MODE=true  # 启用测试模式（自动设置）"
    echo ""
    echo "示例:"
    echo "  $0                    # 使用默认端口8080"
    echo "  $0 3000              # 使用端口3000"
    echo ""
    echo "功能:"
    echo "  - 自动构建项目"
    echo "  - 检查配置文件"
    echo "  - 启用测试模式"
    echo "  - 启动服务器"
    echo "  - 健康检查"
    echo ""
    echo "测试模式说明:"
    echo "  启用测试模式后，create-sso-client.sh 脚本可以正常工作，"
    echo "  服务器会允许以 test-client- 开头的客户端绕过管理员权限检查。"
}

# 处理命令行参数
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_help
    exit 0
fi

# 运行主函数
main "$@"
