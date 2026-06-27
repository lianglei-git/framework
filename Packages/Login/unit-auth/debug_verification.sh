#!/bin/bash

echo "🔍 调试验证码问题..."

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

echo "发送响应: $RESPONSE"

# 等待1秒
sleep 1

# 测试2: 检查数据库中的验证码记录
echo ""
echo "🔍 测试2: 检查数据库中的验证码记录..."
echo "请手动检查数据库中的 email_verifications 表："
echo ""
echo "MySQL命令："
echo "mysql -u root -p unit_auth"
echo "SELECT * FROM email_verifications ORDER BY created_at DESC LIMIT 5;"
echo ""

# 测试3: 尝试验证验证码
echo ""
echo "✅ 测试3: 尝试验证验证码..."
echo "请从数据库中获取最新的验证码，然后运行："
echo ""
echo "curl -X POST http://localhost:8080/api/v1/auth/verify-email \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"email\":\"test@example.com\",\"code\":\"从数据库获取的验证码\"}'"
echo ""

# 测试4: 检查清理服务是否过早清理了验证码
echo ""
echo "🧹 测试4: 检查清理服务..."
echo "查看应用日志，确认清理服务是否过早清理了验证码"
echo ""

echo "📝 调试步骤："
echo "1. 检查验证码是否成功保存到数据库"
echo "2. 确认验证码没有立即被清理服务删除"
echo "3. 验证码的 expires_at 时间是否正确"
echo "4. 确认验证码的 used 字段为 false"
echo ""
echo "💡 可能的解决方案："
echo "1. 如果验证码没有保存到数据库，检查数据库连接"
echo "2. 如果验证码被过早清理，调整清理服务的时间间隔"
echo "3. 如果验证码过期时间不对，检查时区设置" 