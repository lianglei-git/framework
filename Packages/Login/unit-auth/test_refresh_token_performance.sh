#!/bin/bash

# Refresh Token 性能测试脚本
# 用于验证方案4优化效果

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
API_URL="${API_URL:-http://localhost:8080}"
TOKEN_ENDPOINT="${API_URL}/api/v1/auth/oauth/token"

echo -e "${BLUE}=== Refresh Token 性能测试 ===${NC}\n"

# 检查依赖
if ! command -v curl &> /dev/null; then
    echo -e "${RED}错误: curl 未安装${NC}"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}警告: jq 未安装，建议安装以获得更好的输出: brew install jq${NC}\n"
fi

# 读取测试配置
read -p "请输入 client_id [默认: test_client]: " CLIENT_ID
CLIENT_ID=${CLIENT_ID:-test_client}

read -p "请输入 client_secret [默认: test_secret]: " CLIENT_SECRET
CLIENT_SECRET=${CLIENT_SECRET:-test_secret}

read -p "请输入测试次数 [默认: 10]: " TEST_COUNT
TEST_COUNT=${TEST_COUNT:-10}

# 首先需要获取一个有效的 refresh_token
echo -e "\n${YELLOW}步骤1: 获取测试用的 refresh_token${NC}"
echo "请先登录获取 refresh_token，或直接提供一个有效的 refresh_token"
read -p "请输入 refresh_token: " REFRESH_TOKEN

if [ -z "$REFRESH_TOKEN" ]; then
    echo -e "${RED}错误: refresh_token 不能为空${NC}"
    exit 1
fi

# 测试刷新token性能
echo -e "\n${YELLOW}步骤2: 性能测试（${TEST_COUNT}次请求）${NC}"

# 存储响应时间
RESPONSE_TIMES=()
SUCCESS_COUNT=0
FAIL_COUNT=0

for i in $(seq 1 $TEST_COUNT); do
    START_TIME=$(date +%s%N)
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$TOKEN_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "{
            \"grant_type\": \"refresh_token\",
            \"refresh_token\": \"$REFRESH_TOKEN\",
            \"client_id\": \"$CLIENT_ID\",
            \"client_secret\": \"$CLIENT_SECRET\",
            \"app_id\": \"centralized\"
        }")
    
    END_TIME=$(date +%s%N)
    ELAPSED=$((($END_TIME - $START_TIME) / 1000000))  # 转换为毫秒
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    
    if [ "$HTTP_CODE" == "200" ]; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        RESPONSE_TIMES+=($ELAPSED)
        echo -e "${GREEN}✓${NC} 请求 $i: ${ELAPSED}ms"
        
        # 更新 refresh_token（如果返回了新的）
        if command -v jq &> /dev/null; then
            NEW_REFRESH_TOKEN=$(echo "$BODY" | jq -r '.refresh_token // empty')
            if [ ! -z "$NEW_REFRESH_TOKEN" ]; then
                REFRESH_TOKEN=$NEW_REFRESH_TOKEN
                echo -e "  ${YELLOW}→ Refresh token已轮换${NC}"
            fi
        fi
    else
        FAIL_COUNT=$((FAIL_COUNT + 1))
        echo -e "${RED}✗${NC} 请求 $i: 失败 (HTTP $HTTP_CODE)"
        if command -v jq &> /dev/null; then
            echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
        else
            echo "$BODY"
        fi
    fi
    
    # 短暂延迟，避免过载
    sleep 0.1
done

# 计算统计数据
if [ $SUCCESS_COUNT -gt 0 ]; then
    echo -e "\n${BLUE}=== 测试结果 ===${NC}"
    echo -e "总请求数: $TEST_COUNT"
    echo -e "成功: ${GREEN}$SUCCESS_COUNT${NC}"
    echo -e "失败: ${RED}$FAIL_COUNT${NC}"
    echo -e "成功率: $((SUCCESS_COUNT * 100 / TEST_COUNT))%"
    
    # 计算平均响应时间
    TOTAL_TIME=0
    for TIME in "${RESPONSE_TIMES[@]}"; do
        TOTAL_TIME=$((TOTAL_TIME + TIME))
    done
    AVG_TIME=$((TOTAL_TIME / SUCCESS_COUNT))
    
    # 排序获取 p50, p95, p99
    SORTED_TIMES=($(printf '%s\n' "${RESPONSE_TIMES[@]}" | sort -n))
    P50_INDEX=$((SUCCESS_COUNT / 2))
    P95_INDEX=$((SUCCESS_COUNT * 95 / 100))
    P99_INDEX=$((SUCCESS_COUNT * 99 / 100))
    
    P50=${SORTED_TIMES[$P50_INDEX]}
    P95=${SORTED_TIMES[$P95_INDEX]}
    P99=${SORTED_TIMES[$P99_INDEX]}
    
    echo -e "\n${BLUE}=== 响应时间统计 ===${NC}"
    echo -e "平均: ${YELLOW}${AVG_TIME}ms${NC}"
    echo -e "P50:  ${GREEN}${P50}ms${NC}"
    echo -e "P95:  ${YELLOW}${P95}ms${NC}"
    echo -e "P99:  ${RED}${P99}ms${NC}"
    
    # 性能评估
    echo -e "\n${BLUE}=== 性能评估 ===${NC}"
    if [ $AVG_TIME -lt 20 ]; then
        echo -e "${GREEN}✓ 优秀${NC} - 响应时间 < 20ms（已达到优化目标）"
    elif [ $AVG_TIME -lt 30 ]; then
        echo -e "${YELLOW}✓ 良好${NC} - 响应时间 < 30ms"
    elif [ $AVG_TIME -lt 50 ]; then
        echo -e "${YELLOW}△ 一般${NC} - 响应时间 < 50ms（与优化前相当）"
    else
        echo -e "${RED}✗ 需要优化${NC} - 响应时间 > 50ms"
    fi
    
    echo -e "\n${BLUE}=== 对比基准 ===${NC}"
    echo -e "优化前预期: ~50ms"
    echo -e "优化后预期: ~20ms"
    echo -e "实际结果:   ${YELLOW}${AVG_TIME}ms${NC}"
    if [ $AVG_TIME -lt 50 ]; then
        IMPROVEMENT=$(((50 - AVG_TIME) * 100 / 50))
        echo -e "性能提升:   ${GREEN}${IMPROVEMENT}%${NC} ⚡️"
    fi
else
    echo -e "\n${RED}所有请求都失败了，请检查配置${NC}"
fi

echo -e "\n${BLUE}=== 测试完成 ===${NC}"
echo -e "详细优化报告: ${YELLOW}REFRESH_TOKEN_OPTIMIZATION.md${NC}"

