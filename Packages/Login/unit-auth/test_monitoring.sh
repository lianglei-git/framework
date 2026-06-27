#!/bin/bash

# 监控功能测试脚本
BASE_URL="http://localhost:8080"

echo "=== 监控功能测试 ==="

# 测试Prometheus指标端点
echo "1. 测试Prometheus指标端点"
curl -s "$BASE_URL/metrics" | head -20
echo -e "\n"

# 测试自定义指标API
echo "2. 测试自定义指标API"
curl -s "$BASE_URL/api/monitoring/metrics" | jq .
echo -e "\n"

# 测试用户活跃度统计
echo "3. 测试用户活跃度统计"
curl -s "$BASE_URL/api/monitoring/user-activity/stats" | jq .
echo -e "\n"

# 测试日活跃用户
echo "4. 测试日活跃用户"
curl -s "$BASE_URL/api/monitoring/user-activity/daily" | jq .
echo -e "\n"

# 测试月活跃用户
echo "5. 测试月活跃用户"
curl -s "$BASE_URL/api/monitoring/user-activity/monthly" | jq .
echo -e "\n"

# 测试系统健康状态
echo "6. 测试系统健康状态"
curl -s "$BASE_URL/api/monitoring/health" | jq .
echo -e "\n"

# 测试指标摘要
echo "7. 测试指标摘要"
curl -s "$BASE_URL/api/monitoring/summary" | jq .
echo -e "\n"

# 测试按时间段获取指标
echo "8. 测试按时间段获取指标"
curl -s "$BASE_URL/api/monitoring/metrics/by-period?period=daily" | jq .
echo -e "\n"

# 测试最活跃用户
echo "9. 测试最活跃用户"
curl -s "$BASE_URL/api/monitoring/user-activity/top?limit=5" | jq .
echo -e "\n"

# 测试用户活跃度详情
echo "10. 测试用户活跃度详情"
curl -s "$BASE_URL/api/monitoring/user-activity/details" | jq .
echo -e "\n"

# 测试指标导出
echo "11. 测试指标导出"
curl -s -X POST "$BASE_URL/api/monitoring/export" | jq .
echo -e "\n"

echo "=== 监控功能测试完成 ===" 