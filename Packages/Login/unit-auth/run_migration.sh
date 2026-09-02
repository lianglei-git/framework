#!/bin/bash

# 数据库迁移脚本
# 使用方法：./run_migration.sh [mysql_connection_string]

MYSQL_CONN=${1:-"unit_auth:unit_auth_password@tcp(localhost:3306)/unit_auth?charset=utf8mb4&parseTime=True&loc=Local"}

echo "🔄 运行数据库迁移..."
echo "📍 MySQL连接: $MYSQL_CONN"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_info() {
    echo -e "ℹ️  $1"
}

# 运行单个迁移文件
run_migration() {
    local file=$1
    local name=$(basename "$file" .sql)

    print_info "运行迁移: $name"

    if mysql -h localhost -u unit_auth -punit_auth_password unit_auth < "$file" 2>/dev/null; then
        print_status "  $name 迁移成功"
        return 0
    else
        print_error "  $name 迁移失败"
        return 1
    fi
}

# 主函数
main() {
    echo "🚀 开始数据库迁移"
    echo ""

    # 查找所有迁移文件
    migration_files=(
        "migrations/001_restructure_user_table.sql"
        "migrations/002_add_extended_features.sql"
        "migrations/003_add_sso_support.sql"
        "migrations/004_add_refresh_tokens.sql"
        "migrations/009_user_status_role_beta.sql"
    )

    passed=0
    failed=0

    for file in "${migration_files[@]}"; do
        if [ -f "$file" ]; then
            if run_migration "$file"; then
                ((passed++))
            else
                ((failed++))
            fi
        else
            print_warning "迁移文件不存在: $file"
            ((failed++))
        fi
    done

    echo ""
    echo "📊 迁移结果汇总"
    echo "✅ 成功: $passed"
    echo "❌ 失败: $failed"

    if [ $failed -eq 0 ]; then
        print_status "🎉 所有迁移完成！数据库已更新"
        echo ""
        print_info "可用的表:"
        mysql -h localhost -u unit_auth -punit_auth_password unit_auth -e "SHOW TABLES;" 2>/dev/null | grep -E "(users|refresh_tokens|sso_|project)" || echo "无法连接到数据库"
    else
        print_error "⚠️  有 $failed 个迁移失败，请检查数据库连接和权限"
        exit 1
    fi
}

# 运行主函数
main
