#!/bin/bash

# 微信扫码登录测试脚本

echo "🧪 开始测试微信扫码登录功能..."

BASE_URL="http://localhost:8080"

echo "📡 检查服务状态..."
curl -s $BASE_URL/health | jq .

echo -e "\n\n🔍 获取可用认证提供者..."
curl -s $BASE_URL/api/v1/auth/providers | jq .

echo -e "\n\n📱 生成微信扫码登录二维码..."
QR_RESPONSE=$(curl -s $BASE_URL/api/v1/auth/wechat/qr-code)
echo $QR_RESPONSE | jq .

# 提取state
STATE=$(echo $QR_RESPONSE | jq -r '.data.state')
if [ "$STATE" != "null" ] && [ "$STATE" != "" ]; then
    echo -e "\n\n📋 获取到的State: $STATE"
    
    echo -e "\n\n⏳ 检查扫码登录状态..."
    curl -s $BASE_URL/api/v1/auth/wechat/status/$STATE | jq .
    
    echo -e "\n\n💡 测试说明："
    echo "1. 使用微信扫描二维码进行登录"
    echo "2. 每2秒轮询一次状态检查接口"
    echo "3. 登录成功后会自动返回JWT Token"
    echo ""
    echo "📱 二维码URL: $(echo $QR_RESPONSE | jq -r '.data.qr_url')"
    echo "⏰ 过期时间: $(echo $QR_RESPONSE | jq -r '.data.expires_at')"
    
    echo -e "\n\n🔄 开始轮询状态（按Ctrl+C停止）..."
    while true; do
        sleep 2
        STATUS_RESPONSE=$(curl -s $BASE_URL/api/v1/auth/wechat/status/$STATE)
        echo "$(date '+%H:%M:%S') - $(echo $STATUS_RESPONSE | jq -r '.data.status // .message')"
        
        # 如果登录成功，显示用户信息
        if echo $STATUS_RESPONSE | jq -e '.data.token' > /dev/null; then
            echo -e "\n🎉 登录成功！"
            echo "用户信息:"
            echo $STATUS_RESPONSE | jq '.data.user'
            echo "Token: $(echo $STATUS_RESPONSE | jq -r '.data.token')"
            break
        fi
    done
else
    echo -e "\n❌ 生成二维码失败"
fi

echo -e "\n\n✅ 微信扫码登录测试完成！" 