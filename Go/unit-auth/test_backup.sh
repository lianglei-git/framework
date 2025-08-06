#!/bin/bash

# 用户数据备份功能测试脚本
BASE_URL="http://localhost:8080"

echo "=== 用户数据备份功能测试 ==="

# 错误处理函数
print_error() {
    echo "❌ 错误: $1"
}

print_success() {
    echo "✅ 成功: $1"
}

print_info() {
    echo "ℹ️  $1"
}

# 检查服务器是否运行
echo "1. 检查服务器状态"
health_response=$(curl -s "$BASE_URL/health")
if [ $? -ne 0 ]; then
    print_error "服务器未运行，请先启动服务器"
    exit 1
fi
print_success "服务器正在运行"
echo -e "\n"

# 获取管理员token
echo "2. 获取管理员token"
print_info "请提供管理员JWT token:"
read -p "请输入Bearer token (格式: Bearer xxx): " ADMIN_TOKEN

if [ -z "$ADMIN_TOKEN" ]; then
    print_error "未提供token，无法测试备份功能"
    exit 1
fi

# 测试3: 获取备份信息
echo "3. 测试获取备份信息"
print_info "GET /api/v1/admin/backup/info"
response=$(curl -s -X GET "$BASE_URL/api/v1/admin/backup/info" \
  -H "Authorization: $ADMIN_TOKEN")
echo "响应: $response"
echo -e "\n"

# 测试4: 导出备份
echo "4. 测试导出备份"
print_info "POST /api/v1/admin/backup/export"
print_info "导出包含日志的完整备份..."

# 创建临时JSON文件
cat > /tmp/backup_request.json << EOF
{
  "description": "测试备份 - $(date)",
  "include_logs": true
}
EOF

# 导出备份
response=$(curl -s -X POST "$BASE_URL/api/v1/admin/backup/export" \
  -H "Authorization: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d @/tmp/backup_request.json \
  -o backup_test.zip)

if [ $? -eq 0 ] && [ -f "backup_test.zip" ]; then
    print_success "备份文件导出成功: backup_test.zip"
    ls -la backup_test.zip
else
    print_error "备份导出失败"
    echo "响应: $response"
fi
echo -e "\n"

# 测试5: 验证备份文件
echo "5. 测试验证备份文件"
print_info "POST /api/v1/admin/backup/validate"

# 上传备份文件进行验证
response=$(curl -s -X POST "$BASE_URL/api/v1/admin/backup/validate" \
  -H "Authorization: $ADMIN_TOKEN" \
  -F "backup_file=@backup_test.zip")
echo "验证响应: $response"
echo -e "\n"

# 测试6: 创建测试数据（可选）
echo "6. 创建测试数据"
print_info "是否要创建一些测试用户数据？(y/n)"
read -p "请输入选择: " CREATE_TEST_DATA

if [ "$CREATE_TEST_DATA" = "y" ] || [ "$CREATE_TEST_DATA" = "Y" ]; then
    print_info "创建测试用户..."
    
    # 创建测试用户
    for i in {1..3}; do
        user_data=$(cat << EOF
{
  "email": "testuser${i}@example.com",
  "username": "testuser${i}",
  "nickname": "测试用户${i}",
  "password": "password123",
  "code": "123456"
}
EOF
)
        
        response=$(curl -s -X POST "$BASE_URL/api/v1/auth/register" \
          -H "Content-Type: application/json" \
          -d "$user_data")
        
        echo "创建用户${i}响应: $response"
    done
    echo -e "\n"
fi

# 测试7: 导出新的备份
echo "7. 导出新的备份（包含测试数据）"
print_info "POST /api/v1/admin/backup/export"

cat > /tmp/backup_request2.json << EOF
{
  "description": "包含测试数据的备份 - $(date)",
  "include_logs": true
}
EOF

response=$(curl -s -X POST "$BASE_URL/api/v1/admin/backup/export" \
  -H "Authorization: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d @/tmp/backup_request2.json \
  -o backup_with_test_data.zip)

if [ $? -eq 0 ] && [ -f "backup_with_test_data.zip" ]; then
    print_success "新备份文件导出成功: backup_with_test_data.zip"
    ls -la backup_with_test_data.zip
else
    print_error "新备份导出失败"
    echo "响应: $response"
fi
echo -e "\n"

# 测试8: 验证新备份文件
echo "8. 验证新备份文件"
print_info "POST /api/v1/admin/backup/validate"

response=$(curl -s -X POST "$BASE_URL/api/v1/admin/backup/validate" \
  -H "Authorization: $ADMIN_TOKEN" \
  -F "backup_file=@backup_with_test_data.zip")
echo "验证响应: $response"
echo -e "\n"

# 清理临时文件
echo "9. 清理临时文件"
rm -f /tmp/backup_request.json /tmp/backup_request2.json
print_success "临时文件已清理"

echo -e "\n=== 测试完成 ==="
echo "备份功能总结："
echo "1. ✅ 获取备份信息 - GET /api/v1/admin/backup/info"
echo "2. ✅ 导出备份 - POST /api/v1/admin/backup/export"
echo "3. ✅ 验证备份 - POST /api/v1/admin/backup/validate"
echo "4. ⚠️  导入备份 - POST /api/v1/admin/backup/import (需要手动测试)"
echo ""
echo "注意事项："
echo "1. 所有备份API都需要管理员权限"
echo "2. 备份文件包含敏感信息，请妥善保管"
echo "3. 导入备份会覆盖现有数据，请谨慎操作"
echo "4. 建议在导入前先导出当前数据作为备份"
echo ""
echo "生成的文件："
echo "- backup_test.zip: 初始备份文件"
echo "- backup_with_test_data.zip: 包含测试数据的备份文件"
echo ""
echo "下一步操作："
echo "1. 检查备份文件内容: unzip -l backup_test.zip"
echo "2. 测试导入功能（谨慎操作）"
echo "3. 验证备份数据的完整性" 