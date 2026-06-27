#!/bin/bash

# 管理员功能测试脚本
BASE_URL="http://localhost:8080/api/v1"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== 管理员功能测试脚本 ===${NC}"

# 1. 管理员登录
echo -e "\n${YELLOW}1. 管理员登录${NC}"
ADMIN_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"account":"admin@example.com","password":"admin123"}')

echo "$ADMIN_LOGIN_RESPONSE" | jq '.'

# 提取token
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN_RESPONSE" | jq -r '.data.token')

if [ "$ADMIN_TOKEN" = "null" ] || [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${RED}❌ 管理员登录失败${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 管理员登录成功${NC}"

# 2. 获取用户列表
echo -e "\n${YELLOW}2. 获取用户列表${NC}"
USERS_RESPONSE=$(curl -s -X GET "$BASE_URL/admin/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "$USERS_RESPONSE" | jq '.'

# 3. 获取用户统计
echo -e "\n${YELLOW}3. 获取用户统计${NC}"
STATS_RESPONSE=$(curl -s -X GET "$BASE_URL/admin/stats/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "$STATS_RESPONSE" | jq '.'

# 4. 获取登录日志
echo -e "\n${YELLOW}4. 获取登录日志${NC}"
LOGS_RESPONSE=$(curl -s -X GET "$BASE_URL/admin/stats/login-logs" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "$LOGS_RESPONSE" | jq '.'

# 5. 获取单个用户信息
echo -e "\n${YELLOW}5. 获取单个用户信息${NC}"
USER_ID=$(echo "$USERS_RESPONSE" | jq -r '.data.users[0].id')
USER_DETAIL_RESPONSE=$(curl -s -X GET "$BASE_URL/admin/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "$USER_DETAIL_RESPONSE" | jq '.'

# 6. 更新用户信息
echo -e "\n${YELLOW}6. 更新用户信息${NC}"
UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/admin/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nickname": "测试更新昵称",
    "role": "user",
    "status": "active"
  }')

echo "$UPDATE_RESPONSE" | jq '.'

# 7. 批量更新用户
echo -e "\n${YELLOW}7. 批量更新用户${NC}"
# 获取前两个用户的ID
USER_IDS=$(echo "$USERS_RESPONSE" | jq -r '.data.users[0:2] | map(.id) | join(",")' | tr ',' '\n' | head -2 | tr '\n' ',' | sed 's/,$//')

BULK_UPDATE_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/users/bulk-update" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_ids\": [$(echo "$USER_IDS" | sed 's/,/","/g' | sed 's/^/"/' | sed 's/$/"/')],
    \"action\": \"activate\"
  }")

echo "$BULK_UPDATE_RESPONSE" | jq '.'

# 8. 测试搜索和过滤
echo -e "\n${YELLOW}8. 测试搜索和过滤${NC}"
SEARCH_RESPONSE=$(curl -s -X GET "$BASE_URL/admin/users?search=admin&status=active&page=1&page_size=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "$SEARCH_RESPONSE" | jq '.'

# 9. 测试验证码统计
echo -e "\n${YELLOW}9. 获取验证码统计${NC}"
VERIFICATION_STATS_RESPONSE=$(curl -s -X GET "$BASE_URL/admin/verification-stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "$VERIFICATION_STATS_RESPONSE" | jq '.'

# 10. 测试清理验证码
echo -e "\n${YELLOW}10. 清理过期验证码${NC}"
CLEANUP_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/cleanup-verifications" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "$CLEANUP_RESPONSE" | jq '.'

echo -e "\n${GREEN}=== 管理员功能测试完成 ===${NC}"

# 测试权限控制
echo -e "\n${YELLOW}11. 测试权限控制（普通用户访问管理员接口）${NC}"
# 使用普通用户token测试
NORMAL_USER_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"account":"test7@example.com","password":"password123"}')

NORMAL_TOKEN=$(echo "$NORMAL_USER_LOGIN" | jq -r '.data.token')

if [ "$NORMAL_TOKEN" != "null" ] && [ -n "$NORMAL_TOKEN" ]; then
    PERMISSION_TEST=$(curl -s -X GET "$BASE_URL/admin/users" \
      -H "Authorization: Bearer $NORMAL_TOKEN")
    
    echo "$PERMISSION_TEST" | jq '.'
    
    if echo "$PERMISSION_TEST" | jq -e '.code == 403' > /dev/null; then
        echo -e "${GREEN}✅ 权限控制正常，普通用户无法访问管理员接口${NC}"
    else
        echo -e "${RED}❌ 权限控制异常${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  无法获取普通用户token，跳过权限测试${NC}"
fi

echo -e "\n${GREEN}=== 所有测试完成 ===${NC}" 