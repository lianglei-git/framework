# Unit-Auth 扩展功能完整文档

## 📊 概述

Unit-Auth 已从单纯的认证服务升级为功能完整的用户中心化管理系统，包含以下四大核心扩展功能：

1. **用户画像系统** - 智能用户分析和标签管理
2. **权限管理系统** - 细粒度权限控制和审计
3. **数据同步机制** - 跨项目数据同步和一致性保证
4. **监控告警系统** - 实时监控和智能告警

## 🎯 1. 用户画像系统

### 功能特性

#### 1.1 用户画像数据管理
- **多维度画像数据**：基础信息、行为特征、兴趣偏好、消费能力、社交特征、风险特征、生命周期
- **灵活标签系统**：支持自定义标签分类和置信度
- **动态评分机制**：用户价值评分和等级管理

#### 1.2 用户行为分析
- **行为记录**：详细记录用户在各项目的操作行为
- **偏好学习**：自动学习用户偏好和习惯
- **行为模式识别**：识别异常行为和风险行为

#### 1.3 用户分群管理
- **智能分群**：基于规则的用户自动分群
- **分群统计**：实时统计各分群用户数量
- **分群分析**：分析分群特征和行为模式

### 数据库表结构

```sql
-- 用户画像表
CREATE TABLE user_profiles (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    profile_data JSON COMMENT '画像数据',
    tags JSON COMMENT '用户标签',
    score DOUBLE DEFAULT 0 COMMENT '用户价值评分',
    level VARCHAR(20) DEFAULT 'normal' COMMENT '用户等级',
    last_updated TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 用户行为记录表
CREATE TABLE user_behaviors (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(36) NOT NULL,
    project_name VARCHAR(50) NOT NULL,
    behavior_type VARCHAR(50) NOT NULL COMMENT '行为类型',
    action VARCHAR(100) NOT NULL COMMENT '具体动作',
    target VARCHAR(200) COMMENT '操作目标',
    duration INT DEFAULT 0 COMMENT '持续时间（秒）',
    value DOUBLE DEFAULT 0 COMMENT '行为价值',
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户偏好表
CREATE TABLE user_preferences (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(36) NOT NULL,
    category VARCHAR(50) NOT NULL COMMENT '偏好类别',
    `key` VARCHAR(100) NOT NULL COMMENT '偏好键',
    value JSON COMMENT '偏好值',
    weight DOUBLE DEFAULT 1 COMMENT '权重',
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 用户分群表
CREATE TABLE user_segments (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    rules JSON COMMENT '分群规则',
    user_count INT DEFAULT 0 COMMENT '用户数量',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 用户分群映射表
CREATE TABLE user_segment_mappings (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(36) NOT NULL,
    segment_id BIGINT UNSIGNED NOT NULL,
    score DOUBLE DEFAULT 0 COMMENT '匹配度评分',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API 接口

#### 用户画像管理
```http
# 获取用户画像
GET /api/v1/profiles/{userId}

# 更新用户画像
PUT /api/v1/profiles/{userId}

# 添加用户标签
POST /api/v1/profiles/{userId}/tags

# 移除用户标签
DELETE /api/v1/profiles/{userId}/tags/{category}/{name}
```

#### 用户行为记录
```http
# 记录用户行为
POST /api/v1/behaviors

# 获取用户行为历史
GET /api/v1/behaviors/{userId}?page=1&pageSize=10
```

#### 用户分群管理
```http
# 创建用户分群
POST /api/v1/segments

# 获取分群列表
GET /api/v1/segments?page=1&pageSize=10

# 获取分群用户
GET /api/v1/segments/{segmentId}/users
```

## 🔐 2. 权限管理系统

### 功能特性

#### 2.1 角色权限管理
- **多级角色系统**：支持角色等级和继承关系
- **细粒度权限**：精确到资源级别的权限控制
- **项目隔离**：支持项目特定的权限管理

#### 2.2 访问控制
- **条件访问**：支持复杂条件的访问控制
- **优先级管理**：访问规则优先级控制
- **动态权限**：支持临时权限和过期时间

#### 2.3 审计日志
- **完整审计**：记录所有权限相关操作
- **实时监控**：实时监控权限使用情况
- **合规报告**：生成合规性审计报告

### 数据库表结构

```sql
-- 角色表
CREATE TABLE roles (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(500),
    level INT DEFAULT 0 COMMENT '角色等级',
    is_system BOOLEAN DEFAULT FALSE COMMENT '是否为系统角色',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 权限表
CREATE TABLE permissions (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    resource VARCHAR(100) NOT NULL COMMENT '资源名称',
    action VARCHAR(50) NOT NULL COMMENT '操作类型',
    project VARCHAR(50) COMMENT '所属项目',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 角色权限关联表
CREATE TABLE role_permissions (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    role_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by VARCHAR(36) COMMENT '授权人ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户角色关联表
CREATE TABLE user_roles (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(36) NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    project VARCHAR(50) COMMENT '项目特定角色',
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by VARCHAR(36) COMMENT '授权人ID',
    expires_at TIMESTAMP NULL COMMENT '角色过期时间',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 访问控制表
CREATE TABLE access_controls (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(36) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    project VARCHAR(50),
    `condition` JSON COMMENT '访问条件',
    is_allowed BOOLEAN DEFAULT TRUE,
    priority INT DEFAULT 0 COMMENT '优先级',
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 审计日志表
CREATE TABLE audit_logs (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(36),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100),
    project VARCHAR(50),
    details JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    status VARCHAR(20) COMMENT 'success, failed, denied',
    error_msg VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API 接口

#### 角色管理
```http
# 创建角色
POST /api/v1/roles

# 获取角色列表
GET /api/v1/roles?page=1&pageSize=10

# 更新角色
PUT /api/v1/roles/{roleId}

# 删除角色
DELETE /api/v1/roles/{roleId}
```

#### 权限管理
```http
# 创建权限
POST /api/v1/permissions

# 获取权限列表
GET /api/v1/permissions?page=1&pageSize=10

# 分配权限给角色
POST /api/v1/roles/{roleId}/permissions
```

#### 用户权限管理
```http
# 分配角色给用户
POST /api/v1/users/{userId}/roles

# 检查用户权限
POST /api/v1/permissions/check

# 获取用户权限
GET /api/v1/users/{userId}/permissions
```

#### 审计日志
```http
# 获取审计日志
GET /api/v1/audit-logs?page=1&pageSize=10

# 导出审计报告
GET /api/v1/audit-logs/export
```

## 🔄 3. 数据同步机制

### 功能特性

#### 3.1 多类型同步
- **全量同步**：完整数据同步
- **增量同步**：基于变更的增量同步
- **实时同步**：实时数据变更同步

#### 3.2 冲突处理
- **冲突检测**：自动检测数据冲突
- **冲突解决**：多种冲突解决策略
- **手动干预**：支持手动解决复杂冲突

#### 3.3 同步监控
- **同步状态**：实时监控同步状态
- **性能优化**：同步性能监控和优化
- **错误处理**：完善的错误处理和重试机制

### 数据库表结构

```sql
-- 同步任务表
CREATE TABLE sync_tasks (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    source_project VARCHAR(50) NOT NULL,
    target_project VARCHAR(50) NOT NULL,
    sync_type VARCHAR(20) NOT NULL COMMENT 'full, incremental, realtime',
    status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending, running, completed, failed',
    config JSON COMMENT '同步配置',
    schedule VARCHAR(100) COMMENT 'Cron 表达式',
    last_sync_at TIMESTAMP NULL,
    next_sync_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 同步日志表
CREATE TABLE sync_logs (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    task_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(20) NOT NULL COMMENT 'success, failed, partial',
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NULL,
    records_processed BIGINT DEFAULT 0,
    records_success BIGINT DEFAULT 0,
    records_failed BIGINT DEFAULT 0,
    error_msg VARCHAR(1000),
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 数据变更记录表
CREATE TABLE data_changes (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    change_type VARCHAR(20) NOT NULL COMMENT 'insert, update, delete',
    old_data JSON,
    new_data JSON,
    project VARCHAR(50),
    user_id VARCHAR(36),
    sync_status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending, synced, failed',
    retry_count INT DEFAULT 0,
    last_retry_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 同步映射表
CREATE TABLE sync_mappings (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    task_id BIGINT UNSIGNED NOT NULL,
    source_table VARCHAR(100) NOT NULL,
    target_table VARCHAR(100) NOT NULL,
    field_mapping JSON COMMENT '字段映射关系',
    transform_rule JSON COMMENT '数据转换规则',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 同步冲突表
CREATE TABLE sync_conflicts (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    task_id BIGINT UNSIGNED NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    conflict_type VARCHAR(50) NOT NULL COMMENT 'duplicate_key, constraint_violation, data_inconsistency',
    source_data JSON,
    target_data JSON,
    resolution VARCHAR(20) COMMENT 'source_wins, target_wins, manual, ignore',
    resolved_by VARCHAR(36),
    resolved_at TIMESTAMP NULL,
    notes VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 同步检查点表
CREATE TABLE sync_checkpoints (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    task_id BIGINT UNSIGNED NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    checkpoint JSON COMMENT '检查点数据',
    last_sync_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### API 接口

#### 同步任务管理
```http
# 创建同步任务
POST /api/v1/sync/tasks

# 获取同步任务列表
GET /api/v1/sync/tasks?page=1&pageSize=10

# 启动同步任务
POST /api/v1/sync/tasks/{taskId}/start

# 停止同步任务
POST /api/v1/sync/tasks/{taskId}/stop
```

#### 同步监控
```http
# 获取同步日志
GET /api/v1/sync/logs?taskId={taskId}&page=1&pageSize=10

# 获取同步状态
GET /api/v1/sync/tasks/{taskId}/status

# 获取数据变更记录
GET /api/v1/sync/changes?page=1&pageSize=10
```

#### 冲突处理
```http
# 获取同步冲突
GET /api/v1/sync/conflicts?page=1&pageSize=10

# 解决冲突
PUT /api/v1/sync/conflicts/{conflictId}
```

## 📊 4. 监控告警系统

### 功能特性

#### 4.1 指标监控
- **多类型指标**：计数器、仪表盘、直方图、摘要
- **自定义指标**：支持业务自定义指标
- **实时监控**：实时指标数据收集和展示

#### 4.2 智能告警
- **灵活规则**：支持复杂告警条件
- **多级告警**：信息、警告、错误、严重等级别
- **智能抑制**：避免告警风暴

#### 4.3 通知管理
- **多渠道通知**：邮件、短信、Webhook、Slack
- **通知模板**：支持模板化通知内容
- **通知策略**：灵活的通知策略配置

### 数据库表结构

```sql
-- 指标表
CREATE TABLE metrics (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    type VARCHAR(20) NOT NULL COMMENT 'counter, gauge, histogram, summary',
    unit VARCHAR(20) COMMENT '单位',
    project VARCHAR(50) COMMENT '所属项目',
    labels JSON COMMENT '标签',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 指标值表
CREATE TABLE metric_values (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    metric_id BIGINT UNSIGNED NOT NULL,
    value DOUBLE NOT NULL,
    labels JSON COMMENT '标签值',
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 告警规则表
CREATE TABLE alert_rules (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    metric_id BIGINT UNSIGNED NOT NULL,
    condition VARCHAR(500) NOT NULL COMMENT '告警条件表达式',
    threshold DOUBLE NOT NULL COMMENT '阈值',
    operator VARCHAR(10) NOT NULL COMMENT '操作符',
    duration INT DEFAULT 0 COMMENT '持续时间（秒）',
    severity VARCHAR(20) DEFAULT 'warning' COMMENT '严重程度',
    project VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 告警表
CREATE TABLE alerts (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    rule_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    status VARCHAR(20) DEFAULT 'firing' COMMENT 'firing, resolved',
    severity VARCHAR(20) NOT NULL,
    value DOUBLE NOT NULL,
    threshold DOUBLE NOT NULL,
    labels JSON,
    project VARCHAR(50),
    fired_at TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP NULL,
    resolved_by VARCHAR(36),
    notes VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 通知表
CREATE TABLE notifications (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    alert_id BIGINT UNSIGNED NOT NULL,
    type VARCHAR(20) NOT NULL COMMENT 'email, sms, webhook, slack',
    recipient VARCHAR(200) NOT NULL,
    subject VARCHAR(200),
    content TEXT,
    status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending, sent, failed',
    sent_at TIMESTAMP NULL,
    error_msg VARCHAR(500),
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 通知模板表
CREATE TABLE notification_templates (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    type VARCHAR(20) NOT NULL COMMENT 'email, sms, webhook, slack',
    subject VARCHAR(200),
    content TEXT,
    variables JSON COMMENT '模板变量',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 系统健康状态表
CREATE TABLE system_health (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    component VARCHAR(50) NOT NULL COMMENT '组件名称',
    status VARCHAR(20) NOT NULL COMMENT 'healthy, degraded, unhealthy',
    message VARCHAR(500),
    details JSON,
    last_check_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 性能日志表
CREATE TABLE performance_logs (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    user_id VARCHAR(36),
    project VARCHAR(50),
    duration INT NOT NULL COMMENT '响应时间（毫秒）',
    status_code INT NOT NULL,
    request_size INT DEFAULT 0,
    response_size INT DEFAULT 0,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API 接口

#### 指标管理
```http
# 创建指标
POST /api/v1/metrics

# 记录指标值
POST /api/v1/metrics/{metricId}/values

# 获取指标数据
GET /api/v1/metrics/{metricId}/values?start={start}&end={end}
```

#### 告警管理
```http
# 创建告警规则
POST /api/v1/alerts/rules

# 获取告警列表
GET /api/v1/alerts?status={status}&severity={severity}

# 解决告警
PUT /api/v1/alerts/{alertId}/resolve
```

#### 通知管理
```http
# 创建通知模板
POST /api/v1/notifications/templates

# 发送通知
POST /api/v1/notifications

# 获取通知历史
GET /api/v1/notifications?page=1&pageSize=10
```

#### 系统监控
```http
# 获取系统健康状态
GET /api/v1/health

# 获取性能统计
GET /api/v1/performance/stats

# 获取性能日志
GET /api/v1/performance/logs?page=1&pageSize=10
```

## 🚀 使用示例

### 1. 用户画像分析

```go
// 创建用户画像
profile := &models.UserProfile{
    UserID: "user123",
    Score:  85.5,
    Level:  "vip",
}

// 设置画像数据
profileData := &models.ProfileData{
    BasicInfo: struct {
        Age        int    `json:"age,omitempty"`
        Gender     string `json:"gender,omitempty"`
        Location   string `json:"location,omitempty"`
        Occupation string `json:"occupation,omitempty"`
        Education  string `json:"education,omitempty"`
        Income     string `json:"income,omitempty"`
    }{
        Age:        28,
        Gender:     "male",
        Location:   "北京",
        Occupation: "软件工程师",
        Education:  "本科",
        Income:     "15k-25k",
    },
    Behavioral: struct {
        LoginFrequency    float64 `json:"login_frequency"`
        SessionDuration   float64 `json:"session_duration"`
        ActiveTime        string  `json:"active_time"`
        DevicePreference  string  `json:"device_preference"`
        BrowserPreference string  `json:"browser_preference"`
        OSPreference      string  `json:"os_preference"`
    }{
        LoginFrequency:    2.5,
        SessionDuration:   45.0,
        ActiveTime:        "19:00-22:00",
        DevicePreference:  "desktop",
        BrowserPreference: "Chrome",
        OSPreference:      "Windows",
    },
}

profile.SetProfileData(profileData)
db.Create(profile)
```

### 2. 权限控制

```go
// 检查用户权限
hasPermission, err := user.HasPermission(db, "users", "read", "server")
if err != nil {
    log.Printf("权限检查失败: %v", err)
    return
}

if !hasPermission {
    c.JSON(http.StatusForbidden, gin.H{"error": "权限不足"})
    return
}

// 记录审计日志
auditLog := &models.AuditLog{
    UserID:     user.ID,
    Action:     "read_users",
    Resource:   "users",
    Project:    "server",
    Status:     "success",
    IPAddress:  c.ClientIP(),
    UserAgent:  c.GetHeader("User-Agent"),
}
db.Create(auditLog)
```

### 3. 数据同步

```go
// 创建同步任务
syncTask := &models.SyncTask{
    Name:          "user_sync",
    Description:   "用户数据同步",
    SourceProject: "server",
    TargetProject: "mobile",
    SyncType:      "incremental",
    Status:        "pending",
    Schedule:      "0 */5 * * * *", // 每5分钟执行一次
}

config := map[string]interface{}{
    "batch_size": 1000,
    "timeout":    300,
    "retry_count": 3,
}
syncTask.SetConfig(config)
db.Create(syncTask)
```

### 4. 监控告警

```go
// 记录指标值
metricValue := &models.MetricValue{
    MetricID:  1,
    Value:     95.5,
    Timestamp: time.Now(),
}

labels := map[string]string{
    "project": "server",
    "endpoint": "/api/users",
}
metricValue.SetLabels(labels)
db.Create(metricValue)

// 检查告警规则
var alertRule models.AlertRule
db.Where("metric_id = ? AND is_active = ?", 1, true).First(&alertRule)

if metricValue.Value > alertRule.Threshold {
    // 创建告警
    alert := &models.Alert{
        RuleID:    alertRule.ID,
        Name:      alertRule.Name,
        Status:    "firing",
        Severity:  alertRule.Severity,
        Value:     metricValue.Value,
        Threshold: alertRule.Threshold,
        FiredAt:   time.Now(),
    }
    db.Create(alert)
}
```

## 📈 统计视图

系统提供了多个统计视图，方便数据分析和报表生成：

### 1. 跨项目统计视图
```sql
SELECT * FROM cross_project_stats;
```

### 2. 用户画像统计视图
```sql
SELECT * FROM user_profile_stats;
```

### 3. 权限统计视图
```sql
SELECT * FROM permission_stats;
```

### 4. 监控统计视图
```sql
SELECT * FROM monitoring_stats;
```

## 🔧 配置说明

### 环境变量配置
```bash
# 用户画像配置
USER_PROFILE_ENABLED=true
USER_BEHAVIOR_TRACKING=true
USER_SEGMENT_AUTO_UPDATE=true

# 权限管理配置
PERMISSION_ENABLED=true
AUDIT_LOG_ENABLED=true
ACCESS_CONTROL_ENABLED=true

# 数据同步配置
SYNC_ENABLED=true
SYNC_WORKER_COUNT=5
SYNC_BATCH_SIZE=1000

# 监控告警配置
MONITORING_ENABLED=true
ALERT_ENABLED=true
NOTIFICATION_ENABLED=true
```

### 数据库配置
```sql
-- 创建必要的索引
CREATE INDEX idx_user_behaviors_user_id ON user_behaviors(user_id);
CREATE INDEX idx_user_behaviors_created_at ON user_behaviors(created_at);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_metric_values_metric_id ON metric_values(metric_id);
CREATE INDEX idx_metric_values_timestamp ON metric_values(timestamp);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_fired_at ON alerts(fired_at);
```

## 🎉 总结

通过这四大扩展功能，Unit-Auth 已经成为一个功能完整的企业级用户中心化管理系统：

1. **用户画像系统** 提供了深度的用户分析和个性化服务能力
2. **权限管理系统** 确保了系统安全和合规性
3. **数据同步机制** 保证了多项目间数据的一致性和可靠性
4. **监控告警系统** 提供了实时的系统监控和问题预警

这些功能相互配合，为多项目架构提供了完整的用户管理解决方案，支持从用户注册到数据分析的全生命周期管理。 