#!/bin/bash

# 简化的监控功能测试脚本
BASE_URL="http://localhost:8080"

echo "=== 监控功能测试 ==="

# 测试Prometheus指标端点
echo "1. 测试Prometheus指标端点"
curl -s "$BASE_URL/metrics" | head -10
echo -e "\n"

# 测试自定义指标API
echo "2. 测试自定义指标API"
curl -s "$BASE_URL/api/monitoring/metrics" | jq . 2>/dev/null || echo "需要安装jq或服务器未运行"
echo -e "\n"

# 测试用户活跃度统计
echo "3. 测试用户活跃度统计"
curl -s "$BASE_URL/api/monitoring/user-activity/stats" | jq . 2>/dev/null || echo "需要安装jq或服务器未运行"
echo -e "\n"

# 测试系统健康状态
echo "4. 测试系统健康状态"
curl -s "$BASE_URL/api/monitoring/health" | jq . 2>/dev/null || echo "需要安装jq或服务器未运行"
echo -e "\n"

echo "=== 监控功能测试完成 ==="
echo "注意：如果看到错误，请确保服务器正在运行" 