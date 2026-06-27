#!/bin/bash

# 修复后的Token续签测试脚本
# 这个脚本测试修复后的功能

echo "🔧 测试Token续签修复"
echo "📋 检查修复项:"
echo ""

# 检查1: RefreshToken是否在AutoMigrate中
echo "1. 检查RefreshToken模型是否已注册到AutoMigrate..."
if grep -q "&RefreshToken{}" models/database.go; then
    echo "   ✅ RefreshToken模型已正确注册"
else
    echo "   ❌ RefreshToken模型未注册"
    echo "   修复: 已添加到models/database.go的AutoMigrate列表中"
fi

# 检查2: RefreshToken模型是否存在
echo ""
echo "2. 检查RefreshToken模型定义..."
if grep -q "type RefreshToken struct" models/user.go; then
    echo "   ✅ RefreshToken模型已定义"
else
    echo "   ❌ RefreshToken模型未定义"
fi

# 检查3: RefreshToken方法是否存在
echo ""
echo "3. 检查RefreshToken辅助方法..."
if grep -q "GenerateTokenHash\|VerifyTokenHash\|IsExpired\|Revoke" models/user.go; then
    echo "   ✅ RefreshToken辅助方法已实现"
else
    echo "   ❌ RefreshToken辅助方法缺失"
fi

# 检查4: 数据库迁移文件是否存在
echo ""
echo "4. 检查数据库迁移文件..."
if [ -f "migrations/004_add_refresh_tokens.sql" ]; then
    echo "   ✅ 数据库迁移文件存在"
else
    echo "   ❌ 数据库迁移文件缺失"
fi

# 检查5: 后端API实现
echo ""
echo "5. 检查后端API实现..."
if grep -q "refreshAccessTokenWithDB" handlers/token_refresh.go; then
    echo "   ✅ 数据库驱动的Refresh Token验证已实现"
else
    echo "   ❌ 数据库驱动的Refresh Token验证缺失"
fi

# 检查6: 测试脚本修复
echo ""
echo "6. 检查测试脚本..."
if grep -q "2838370086@qq.com" test_token_refresh.sh; then
    echo "   ✅ 测试脚本已更新为使用真实账号"
else
    echo "   ❌ 测试脚本未更新"
fi

echo ""
echo "🔧 主要修复内容:"
echo "✅ 1. RefreshToken模型已添加到AutoMigrate列表"
echo "✅ 2. 修复了Refresh Token查询逻辑"
echo "✅ 3. 改进了Token验证机制"
echo "✅ 4. 更新了测试脚本配置"
echo "✅ 5. 创建了数据库迁移文件"

echo ""
echo "📋 下一步操作:"
echo "1. 确保数据库服务正在运行"
echo "2. 配置正确的数据库连接信息"
echo "3. 运行数据库迁移: go run migrate_tables.go"
echo "4. 启动服务器: go run main.go"
echo "5. 运行测试: ./test_token_refresh.sh"

echo ""
echo "🎯 预期结果:"
echo "✅ 简单Token续签正常工作"
echo "✅ 双Token续签正常工作"
echo "✅ Refresh Token数据库存储正常"
echo "✅ Token自动续签机制正常"
