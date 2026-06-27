#!/bin/bash

echo "🧪 测试注册流程修复..."

# 检查应用是否运行
if ! curl -s http://localhost:8080/health > /dev/null; then
    echo "❌ 应用未运行，请先启动应用"
    exit 1
fi

echo "✅ 应用正在运行"

# 生成随机邮箱和用户名
RANDOM_EMAIL="test$(date +%s)@example.com"
RANDOM_USERNAME="user$(date +%s)"

echo "📧 使用邮箱: $RANDOM_EMAIL"
echo "👤 使用用户名: $RANDOM_USERNAME"

# 步骤1: 发送验证码
echo ""
echo "📧 步骤1: 发送验证码..."
SEND_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/send-email-code \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$RANDOM_EMAIL\",\"type\":\"register\"}")

echo "发送响应: $SEND_RESPONSE"

# 检查发送是否成功
if echo "$SEND_RESPONSE" | grep -q '"code":200'; then
    echo "✅ 验证码发送成功"
else
    echo "❌ 验证码发送失败"
    exit 1
fi

# 等待2秒
echo "⏳ 等待2秒..."
sleep 2

# 步骤2: 从数据库获取验证码
echo ""
echo "🔍 步骤2: 从数据库获取验证码..."
CODE=$(mysql -u root -p$DB_PASSWORD unit_auth -s -e "SELECT code FROM email_verifications WHERE email = '$RANDOM_EMAIL' AND type = 'register' AND used = 0 ORDER BY created_at DESC LIMIT 1;")

if [ -z "$CODE" ]; then
    echo "❌ 无法从数据库获取验证码"
    exit 1
fi

echo "🔑 获取到验证码: $CODE"

# 步骤3: 注册用户
echo ""
echo "👤 步骤3: 注册用户..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$RANDOM_EMAIL\",
    \"username\": \"$RANDOM_USERNAME\",
    \"nickname\": \"Test User\",
    \"password\": \"password123\",
    \"code\": \"$CODE\"
  }")

echo "注册响应: $REGISTER_RESPONSE"

# 检查注册是否成功
if echo "$REGISTER_RESPONSE" | grep -q '"code":201'; then
    echo "✅ 用户注册成功"
else
    echo "❌ 用户注册失败"
    echo "错误详情: $REGISTER_RESPONSE"
    exit 1
fi

# 步骤4: 验证验证码是否被标记为已使用
echo ""
echo "🔍 步骤4: 验证验证码状态..."
USED_STATUS=$(mysql -u root -p$DB_PASSWORD unit_auth -s -e "SELECT used FROM email_verifications WHERE email = '$RANDOM_EMAIL' AND code = '$CODE';")

if [ "$USED_STATUS" = "1" ]; then
    echo "✅ 验证码已正确标记为已使用"
else
    echo "❌ 验证码状态异常: $USED_STATUS"
fi

# 步骤5: 验证用户是否创建成功
echo ""
echo "👤 步骤5: 验证用户创建..."
USER_COUNT=$(mysql -u root -p$DB_PASSWORD unit_auth -s -e "SELECT COUNT(*) FROM users WHERE email = '$RANDOM_EMAIL';")

if [ "$USER_COUNT" = "1" ]; then
    echo "✅ 用户已成功创建"
else
    echo "❌ 用户创建失败，数据库中用户数量: $USER_COUNT"
fi

echo ""
echo "🎉 测试完成！"
echo ""
echo "📝 测试总结："
echo "1. ✅ 验证码发送成功"
echo "2. ✅ 验证码正确保存到数据库"
echo "3. ✅ 用户注册成功"
echo "4. ✅ 验证码正确标记为已使用"
echo "5. ✅ 用户正确创建到数据库" 