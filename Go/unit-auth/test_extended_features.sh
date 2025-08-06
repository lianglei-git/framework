#!/bin/bash

# 扩展功能测试脚本
# 测试用户画像系统、权限管理系统、数据同步机制、监控告警系统

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 基础配置
BASE_URL="http://localhost:8080"
TEST_EMAIL="test_extended@example.com"
TEST_USERNAME="test_extended_user"
TEST_PASSWORD="password123"

# 打印函数
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# 统计变量
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
run_test() {
    local test_name="$1"
    local test_func="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    print_header "测试 $TOTAL_TESTS: $test_name"
    
    if $test_func; then
        print_success "$test_name 通过"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        print_error "$test_name 失败"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# 1. 用户画像系统测试

test_user_profile_creation() {
    print_info "创建用户画像"
    
    # 先注册用户
    REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$TEST_EMAIL\",
            \"username\": \"$TEST_USERNAME\",
            \"nickname\": \"测试用户\",
            \"password\": \"$TEST_PASSWORD\",
            \"code\": \"123456\"
        }")
    
    echo $REGISTER_RESPONSE | jq .
    
    # 创建用户画像
    PROFILE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/profiles" \
        -H "Content-Type: application/json" \
        -d "{
            \"user_id\": \"test_user_id\",
            \"profile_data\": {
                \"basic_info\": {
                    \"age\": 25,
                    \"gender\": \"male\",
                    \"location\": \"北京\",
                    \"occupation\": \"软件工程师\"
                },
                \"behavioral\": {
                    \"login_frequency\": 2.5,
                    \"session_duration\": 45.0,
                    \"active_time\": \"19:00-22:00\"
                },
                \"interests\": {
                    \"categories\": [\"技术\", \"编程\"],
                    \"keywords\": [\"Go\", \"微服务\"]
                }
            },
            \"tags\": [
                {
                    \"category\": \"技术\",
                    \"name\": \"编程语言\",
                    \"value\": \"Go\",
                    \"confidence\": 0.9,
                    \"source\": \"behavior\"
                }
            ],
            \"score\": 85.5,
            \"level\": \"vip\"
        }")
    
    echo $PROFILE_RESPONSE | jq .
    
    if echo $PROFILE_RESPONSE | jq -e '.code == 200' > /dev/null; then
        return 0
    else
        return 1
    fi
}

test_user_behavior_recording() {
    print_info "记录用户行为"
    
    BEHAVIOR_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/behaviors" \
        -H "Content-Type: application/json" \
        -d "{
            \"user_id\": \"test_user_id\",
            \"project_name\": \"server\",
            \"behavior_type\": \"page_view\",
            \"action\": \"view_profile\",
            \"target\": \"/api/v1/profiles\",
            \"duration\": 30,
            \"value\": 1.0,
            \"ip_address\": \"192.168.1.1\",
            \"user_agent\": \"Mozilla/5.0...\"
        }")
    
    echo $BEHAVIOR_RESPONSE | jq .
    
    if echo $BEHAVIOR_RESPONSE | jq -e '.code == 200' > /dev/null; then
        return 0
    else
        return 1
    fi
}

test_user_segment_creation() {
    print_info "创建用户分群"
    
    SEGMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/segments" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"vip_users\",
            \"description\": \"VIP用户分群\",
            \"rules\": [
                {
                    \"field\": \"score\",
                    \"operator\": \"gte\",
                    \"value\": 80,
                    \"logic\": \"and\"
                },
                {
                    \"field\": \"level\",
                    \"operator\": \"eq\",
                    \"value\": \"vip\",
                    \"logic\": \"and\"
                }
            ]
        }")
    
    echo $SEGMENT_RESPONSE | jq .
    
    if echo $SEGMENT_RESPONSE | jq -e '.code == 200' > /dev/null; then
        return 0
    else
        return 1
    fi
}

# 2. 权限管理系统测试

test_role_creation() {
    print_info "创建角色"
    
    ROLE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/roles" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"content_manager\",
            \"description\": \"内容管理员\",
            \"level\": 50,
            \"is_system\": false
        }")
    
    echo $ROLE_RESPONSE | jq .
    
    if echo $ROLE_RESPONSE | jq -e '.code == 200' > /dev/null; then
        return 0
    else
        return 1
    fi
}

test_permission_creation() {
    print_info "创建权限"
    
    PERMISSION_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/permissions" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"content_publish\",
            \"description\": \"发布内容权限\",
            \"resource\": \"content\",
            \"action\": \"publish\",
            \"project\": \"blog\"
        }")
    
    echo $PERMISSION_RESPONSE | jq .
    
    if echo $PERMISSION_RESPONSE | jq -e '.code == 200' > /dev/null; then
        return 0
    else
        return 1
    fi
}

test_permission_check() {
    print_info "检查权限"
    
    CHECK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/permissions/check" \
        -H "Content-Type: application/json" \
        -d "{
            \"user_id\": \"test_user_id\",
            \"resource\": \"content\",
            \"action\": \"publish\",
            \"project\": \"blog\"
        }")
    
    echo $CHECK_RESPONSE | jq .
    
    if echo $CHECK_RESPONSE | jq -e '.code == 200' > /dev/null; then
        return 0
    else
        return 1
    fi
}

# 3. 数据同步机制测试

test_sync_task_creation() {
    print_info "创建同步任务"
    
    SYNC_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/sync/tasks" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"user_sync_test\",
            \"description\": \"用户数据同步测试\",
            \"source_project\": \"server\",
            \"target_project\": \"mobile\",
            \"sync_type\": \"incremental\",
            \"config\": {
                \"batch_size\": 1000,
                \"timeout\": 300,
                \"retry_count\": 3
            },
            \"schedule\": \"0 */5 * * * *\"
        }")
    
    echo $SYNC_RESPONSE | jq .
    
    if echo $SYNC_RESPONSE | jq -e '.code == 200' > /dev/null; then
        return 0
    else
        return 1
    fi
}

test_sync_mapping_creation() {
    print_info "创建同步映射"
    
    MAPPING_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/sync/mappings" \
        -H "Content-Type: application/json" \
        -d "{
            \"task_id\": 1,
            \"source_table\": \"users\",
            \"target_table\": \"users\",
            \"field_mapping\": {
                \"id\": \"user_id\",
                \"email\": \"email\",
                \"username\": \"username\",
                \"nickname\": \"display_name\"
            },
            \"transform_rule\": {
                \"nickname\": \"CONCAT('User_', username)\"
            }
        }")
    
    echo $MAPPING_RESPONSE | jq .
    
    if echo $MAPPING_RESPONSE | jq -e '.code == 200' > /dev/null; then
        return 0
    else
        return 1
    fi
}

# 4. 监控告警系统测试

test_metric_creation() {
    print_info "创建指标"
    
    METRIC_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/metrics" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"api_response_time\",
            \"description\": \"API响应时间\",
            \"type\": \"histogram\",
            \"unit\": \"ms\",
            \"project\": \"server\",
            \"labels\": {
                \"service\": \"user_service\",
                \"version\": \"v1\"
            }
        }")
    
    echo $METRIC_RESPONSE | jq .
    
    if echo $METRIC_RESPONSE | jq -e '.code == 200' > /dev/null; then
        return 0
    else
        return 1
    fi
}

test_metric_value_recording() {
    print_info "记录指标值"
    
    VALUE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/metrics/1/values" \
        -H "Content-Type: application/json" \
        -d "{
            \"value\": 95.5,
            \"labels\": {
                \"endpoint\": \"/api/v1/users\",
                \"method\": \"GET\"
            },
            \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
        }")
    
    echo $VALUE_RESPONSE | jq .
    
    if echo $VALUE_RESPONSE | jq -e '.code == 200' > /dev/null; then
        return 0
    else
        return 1
    fi
}

test_alert_rule_creation() {
    print_info "创建告警规则"
    
    ALERT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/alerts/rules" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"high_response_time\",
            \"description\": \"响应时间过高告警\",
            \"metric_id\": 1,
            \"condition\": \"value > threshold\",
            \"threshold\": 100.0,
            \"operator\": \">\",
            \"duration\": 60,
            \"severity\": \"warning\",
            \"project\": \"server\"
        }")
    
    echo $ALERT_RESPONSE | jq .
    
    if echo $ALERT_RESPONSE | jq -e '.code == 200' > /dev/null; then
        return 0
    else
        return 1
    fi
}

test_notification_template_creation() {
    print_info "创建通知模板"
    
    TEMPLATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/notifications/templates" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"alert_email_template\",
            \"description\": \"告警邮件模板\",
            \"type\": \"email\",
            \"subject\": \"系统告警: {{.AlertName}}\",
            \"content\": \"告警详情:\\n名称: {{.AlertName}}\\n描述: {{.Description}}\\n严重程度: {{.Severity}}\\n当前值: {{.Value}}\\n阈值: {{.Threshold}}\\n时间: {{.FiredAt}}\",
            \"variables\": {
                \"AlertName\": \"告警名称\",
                \"Description\": \"告警描述\",
                \"Severity\": \"严重程度\",
                \"Value\": \"当前值\",
                \"Threshold\": \"阈值\",
                \"FiredAt\": \"告警时间\"
            }
        }")
    
    echo $TEMPLATE_RESPONSE | jq .
    
    if echo $TEMPLATE_RESPONSE | jq -e '.code == 200' > /dev/null; then
        return 0
    else
        return 1
    fi
}

# 5. 统计查询测试

test_cross_project_stats() {
    print_info "查询跨项目统计"
    
    STATS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/v1/centralized/stats/cross-project?page=1&pageSize=10")
    
    echo $STATS_RESPONSE | jq .
    
    if echo $STATS_RESPONSE | jq -e '.code == 200' > /dev/null; then
        return 0
    else
        return 1
    fi
}

test_user_profile_stats() {
    print_info "查询用户画像统计"
    
    PROFILE_STATS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/v1/profiles/stats?page=1&pageSize=10")
    
    echo $PROFILE_STATS_RESPONSE | jq .
    
    if echo $PROFILE_STATS_RESPONSE | jq -e '.code == 200' > /dev/null; then
        return 0
    else
        return 1
    fi
}

test_permission_stats() {
    print_info "查询权限统计"
    
    PERMISSION_STATS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/v1/permissions/stats?page=1&pageSize=10")
    
    echo $PERMISSION_STATS_RESPONSE | jq .
    
    if echo $PERMISSION_STATS_RESPONSE | jq -e '.code == 200' > /dev/null; then
        return 0
    else
        return 1
    fi
}

test_monitoring_stats() {
    print_info "查询监控统计"
    
    MONITORING_STATS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/v1/monitoring/stats?page=1&pageSize=10")
    
    echo $MONITORING_STATS_RESPONSE | jq .
    
    if echo $MONITORING_STATS_RESPONSE | jq -e '.code == 200' > /dev/null; then
        return 0
    else
        return 1
    fi
}

# 主测试流程
main() {
    print_header "开始扩展功能测试"
    print_info "测试基础URL: $BASE_URL"
    
    # 检查服务是否运行
    if ! curl -s "$BASE_URL/health" > /dev/null; then
        print_error "服务未运行，请先启动服务"
        exit 1
    fi
    
    # 用户画像系统测试
    print_header "用户画像系统测试"
    run_test "用户画像创建" test_user_profile_creation
    run_test "用户行为记录" test_user_behavior_recording
    run_test "用户分群创建" test_user_segment_creation
    
    # 权限管理系统测试
    print_header "权限管理系统测试"
    run_test "角色创建" test_role_creation
    run_test "权限创建" test_permission_creation
    run_test "权限检查" test_permission_check
    
    # 数据同步机制测试
    print_header "数据同步机制测试"
    run_test "同步任务创建" test_sync_task_creation
    run_test "同步映射创建" test_sync_mapping_creation
    
    # 监控告警系统测试
    print_header "监控告警系统测试"
    run_test "指标创建" test_metric_creation
    run_test "指标值记录" test_metric_value_recording
    run_test "告警规则创建" test_alert_rule_creation
    run_test "通知模板创建" test_notification_template_creation
    
    # 统计查询测试
    print_header "统计查询测试"
    run_test "跨项目统计查询" test_cross_project_stats
    run_test "用户画像统计查询" test_user_profile_stats
    run_test "权限统计查询" test_permission_stats
    run_test "监控统计查询" test_monitoring_stats
    
    # 输出测试结果
    print_header "测试结果汇总"
    print_info "总测试数: $TOTAL_TESTS"
    print_success "通过测试: $PASSED_TESTS"
    print_error "失败测试: $FAILED_TESTS"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        print_success "所有测试通过！扩展功能运行正常。"
        exit 0
    else
        print_error "有 $FAILED_TESTS 个测试失败，请检查相关功能。"
        exit 1
    fi
}

# 运行主函数
main "$@" 