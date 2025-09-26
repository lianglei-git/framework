#!/bin/bash

# Generate RSA Keys Script
# 用于生成新的RSA密钥对并显示PEM格式
# 使用方法：./generate-rsa-keys.sh

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
    if ! command -v go &> /dev/null; then
        log_error "Go 未安装，请先安装 Go"
        exit 1
    fi

    if ! command -v grep &> /dev/null; then
        log_error "grep 未安装，请先安装 grep"
        exit 1
    fi
}

# 检查项目是否能编译
check_compilation() {
    log_info "检查项目编译..."
    if go build -o unit-auth . 2>/dev/null; then
        log_success "✅ 项目编译成功"
        return 0
    else
        log_error "❌ 项目编译失败"
        return 1
    fi
}

# 运行服务器生成密钥
generate_keys() {
    log_info "启动服务器生成RSA密钥对..."

    # 设置环境变量确保生成新密钥
    unset RSA_PRIVATE_KEY

    # 启动服务器（捕获输出但不显示）
    # 使用后台运行和等待机制来限制执行时间
    ./unit-auth > /tmp/rsa-keys.log 2>&1 &
    SERVER_PID=$!

    # 等待5秒或直到服务器退出
    for i in {1..5}; do
        if ! kill -0 $SERVER_PID 2>/dev/null; then
            break
        fi
        sleep 1
    done

    # 停止服务器
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true

    # 检查是否生成了密钥
    if grep -q "RSA Private Key" /tmp/rsa-keys.log; then
        log_success "✅ 成功生成了RSA密钥对"
        return 0
    else
        log_error "❌ 未找到生成的RSA密钥对"
        log_warning "服务器输出:"
        cat /tmp/rsa-keys.log
        return 1
    fi
}

# 提取和显示密钥
extract_and_display_keys() {
    log_info "提取生成的RSA密钥对..."

    local keys_log="/tmp/rsa-keys.log"

    # 提取私钥
    private_key_start=$(grep -n "RSA Private Key" "$keys_log" | cut -d: -f1)
    private_key_end=$(grep -n "^-----END RSA PRIVATE KEY-----" "$keys_log" | head -1 | cut -d: -f1)

    if [[ -n "$private_key_start" && -n "$private_key_end" ]]; then
        echo ""
        echo "🔐 RSA Private Key (PEM格式):"
        echo "=============================="
        sed -n "${private_key_start},${private_key_end}p" "$keys_log"
        echo ""
        echo "💡 请将以上私钥内容设置为环境变量 RSA_PRIVATE_KEY"
        echo ""
    fi

    # 提取公钥
    public_key_start=$(grep -n "RSA Public Key" "$keys_log" | cut -d: -f1)
    public_key_end=$(grep -n "^-----END PUBLIC KEY-----" "$keys_log" | head -1 | cut -d: -f1)

    if [[ -n "$public_key_start" && -n "$public_key_end" ]]; then
        echo "🔓 RSA Public Key (PEM格式):"
        echo "============================="
        sed -n "${public_key_start},${public_key_end}p" "$keys_log"
        echo ""
    fi

    # 提取环境变量格式
    env_var_line=$(grep "RSA_PRIVATE_KEY=" "$keys_log" | head -1)
    if [[ -n "$env_var_line" ]]; then
        echo "📝 环境变量格式 (复制到 .env 文件):"
        echo "===================================="
        echo "$env_var_line"
        echo ""
        echo "💡 使用方法:"
        echo "   1. 复制上面的 RSA_PRIVATE_KEY= 行"
        echo "   2. 粘贴到 .env 文件中"
        echo "   3. 重启服务器"
        echo ""
    fi
}

# 保存密钥到文件
save_keys_to_files() {
    log_info "保存密钥到文件..."

    local keys_log="/tmp/rsa-keys.log"

    # 保存私钥
    private_key_start=$(grep -n "RSA Private Key" "$keys_log" | cut -d: -f1)
    private_key_end=$(grep -n "^-----END RSA PRIVATE KEY-----" "$keys_log" | head -1 | cut -d: -f1)

    if [[ -n "$private_key_start" && -n "$private_key_end" ]]; then
        sed -n "${private_key_start},${private_key_end}p" "$keys_log" > rsa-private-key.pem
        log_success "✅ 私钥已保存到 rsa-private-key.pem"
    fi

    # 保存公钥
    public_key_start=$(grep -n "RSA Public Key" "$keys_log" | cut -d: -f1)
    public_key_end=$(grep -n "^-----END PUBLIC KEY-----" "$keys_log" | head -1 | cut -d: -f1)

    if [[ -n "$public_key_start" && -n "$public_key_end" ]]; then
        sed -n "${public_key_start},${public_key_end}p" "$keys_log" > rsa-public-key.pem
        log_success "✅ 公钥已保存到 rsa-public-key.pem"
    fi

    # 保存环境变量格式
    env_var_line=$(grep "RSA_PRIVATE_KEY=" "$keys_log" | head -1)
    if [[ -n "$env_var_line" ]]; then
        echo "$env_var_line" > .env.rsa-key
        log_success "✅ 环境变量配置已保存到 .env.rsa-key"
    fi
}

# 清理临时文件
cleanup() {
    rm -f /tmp/rsa-keys.log
}

# 显示帮助
show_help() {
    echo "Generate RSA Keys Script"
    echo "========================"
    echo ""
    echo "用法:"
    echo "  $0"
    echo ""
    echo "功能:"
    echo "  - 启动服务器生成新的RSA密钥对"
    echo "  - 显示PEM格式的私钥和公钥"
    echo "  - 保存密钥到文件"
    echo "  - 生成环境变量配置"
    echo ""
    echo "输出文件:"
    echo "  - rsa-private-key.pem    - RSA私钥文件"
    echo "  - rsa-public-key.pem     - RSA公钥文件"
    echo "  - .env.rsa-key           - 环境变量配置"
    echo ""
    echo "使用方法:"
    echo "  1. 运行脚本: $0"
    echo "  2. 复制显示的私钥内容"
    echo "  3. 设置环境变量: export RSA_PRIVATE_KEY='私钥内容'"
    echo "  4. 或者保存到 .env 文件中"
    echo "  5. 重启服务器"
    echo ""
    echo "注意事项:"
    echo "  - 私钥是敏感信息，请妥善保管"
    echo "  - 建议定期更换密钥对"
    echo "  - 不要将私钥提交到版本控制系统"
}

# 主函数
main() {
    echo "🔑 RSA密钥对生成工具"
    echo "===================="

    # 处理命令行参数
    if [[ "$1" == "-h" || "$1" == "--help" ]]; then
        show_help
        exit 0
    fi

    # 检查环境
    check_dependencies
    check_compilation

    # 生成密钥
    if generate_keys; then
        extract_and_display_keys
        save_keys_to_files

        echo ""
        log_success "🎉 RSA密钥对生成完成！"
        echo ""
        log_info "重要提醒："
        echo "1. 🔒 请妥善保管私钥文件 (rsa-private-key.pem)"
        echo "2. 🔑 私钥内容需要设置为环境变量 RSA_PRIVATE_KEY"
        echo "3. 📁 公钥文件 (rsa-public-key.pem) 可以分享给需要验证签名的一方"
        echo "4. 🔄 重启服务器后新密钥对将生效"
        echo ""
        log_warning "⚠️  安全提醒："
        echo "  - 私钥是敏感信息，不要泄露给他人"
        echo "  - 建议定期更换密钥对"
        echo "  - 不要将私钥文件提交到版本控制系统"
    fi

    # 清理
    cleanup
}

# 运行主函数
main "$@"
