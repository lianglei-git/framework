#!/bin/bash

# 简化的用户数据备份功能测试脚本
BASE_URL="http://localhost:8080"

echo "=== 简化备份功能测试 ==="

# 检查服务器状态
echo "1. 检查服务器状态"
if curl -s "$BASE_URL/health" > /dev/null; then
    echo "✅ 服务器正在运行"
else
    echo "❌ 服务器未运行，请先启动服务器"
    exit 1
fi

# 获取管理员token
echo -e "\n2. 获取管理员token"
read -p "请输入管理员Bearer token: " ADMIN_TOKEN

if [ -z "$ADMIN_TOKEN" ]; then
    echo "❌ 未提供token，退出测试"
    exit 1
fi

# 测试获取备份信息
echo -e "\n3. 测试获取备份信息"
echo "GET /api/v1/admin/backup/info"
response=$(curl -s -X GET "$BASE_URL/api/v1/admin/backup/info" \
  -H "Authorization: $ADMIN_TOKEN")
echo "响应: $response"

# 测试导出备份
echo -e "\n4. 测试导出备份"
echo "POST /api/v1/admin/backup/export"
response=$(curl -s -X POST "$BASE_URL/api/v1/admin/backup/export" \
  -H "Authorization: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"测试备份","include_logs":false}' \
  -o backup_simple.zip)

if [ -f "backup_simple.zip" ]; then
    echo "✅ 备份文件导出成功: backup_simple.zip"
    ls -la backup_simple.zip
else
    echo "❌ 备份导出失败"
    echo "响应: $response"
fi

# 测试验证备份
echo -e "\n5. 测试验证备份"
echo "POST /api/v1/admin/backup/validate"
response=$(curl -s -X POST "$BASE_URL/api/v1/admin/backup/validate" \
  -H "Authorization: $ADMIN_TOKEN" \
  -F "backup_file=@backup_simple.zip")
echo "验证响应: $response"

echo -e "\n=== 测试完成 ==="
echo "生成的文件: backup_simple.zip"
echo "下一步: 检查备份文件内容" 