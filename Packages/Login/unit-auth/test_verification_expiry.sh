#!/bin/bash

echo "🧪 测试验证码过期功能..."

# 检查应用是否运行
if ! curl -s http://localhost:8080/health > /dev/null; then
    echo "❌ 应用未运行，请先启动应用"
    exit 1
fi

echo "✅ 应用正在运行"

# 测试1: 发送验证码
echo ""
echo "📧 测试1: 发送邮箱验证码..."
RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/send-email-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","type":"register"}')

echo "响应: $RESPONSE"

# 提取验证码（如果返回了的话）
CODE=$(echo $RESPONSE | grep -o '"code":"[0-9]*"' | cut -d'"' -f4)
if [ -n "$CODE" ]; then
    echo "🔑 验证码: $CODE"
fi

# 测试2: 立即验证（应该成功）
echo ""
echo "✅ 测试2: 立即验证验证码..."
if [ -n "$CODE" ]; then
    VERIFY_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/verify-email \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"test@example.com\",\"code\":\"$CODE\"}")
    
    echo "验证响应: $VERIFY_RESPONSE"
else
    echo "⚠️  无法获取验证码，跳过验证测试"
fi

# 测试3: 查看验证码统计
echo ""
echo "📊 测试3: 查看验证码统计..."
STATS_RESPONSE=$(curl -s -X GET http://localhost:8080/api/v1/admin/verification-stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN")

echo "统计响应: $STATS_RESPONSE"

# 测试4: 手动清理验证码
echo ""
echo "🧹 测试4: 手动清理验证码..."
CLEANUP_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/admin/cleanup-verifications \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN")

echo "清理响应: $CLEANUP_RESPONSE"

echo ""
echo "📝 测试完成！"
echo ""
echo "💡 验证码过期机制说明："
echo "   1. 邮箱验证码: 10分钟过期"
echo "   2. 短信验证码: 5分钟过期"
echo "   3. 密码重置令牌: 10分钟过期"
echo "   4. 微信二维码会话: 5分钟过期"
echo "   5. 自动清理: 每5分钟执行一次"
echo "   6. 清理内容: 过期或已使用的验证码"
echo ""
echo "🔧 管理接口："
echo "   GET  /api/v1/admin/verification-stats     - 查看验证码统计"
echo "   POST /api/v1/admin/cleanup-verifications  - 手动清理验证码"
echo ""
echo "⚠️  注意: 管理接口需要管理员权限，请替换YOUR_ADMIN_TOKEN为实际的JWT令牌" 