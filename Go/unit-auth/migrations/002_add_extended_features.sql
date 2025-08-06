-- 数据库迁移脚本：添加扩展功能表结构
-- 用户画像系统、权限管理系统、数据同步机制、监控告警系统

-- 1. 用户画像系统表

-- 用户画像表
CREATE TABLE IF NOT EXISTS user_profiles (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    profile_data JSON COMMENT '画像数据',
    tags JSON COMMENT '用户标签',
    score DOUBLE DEFAULT 0 COMMENT '用户价值评分',
    level VARCHAR(20) DEFAULT 'normal' COMMENT '用户等级',
    last_updated TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_user_id (user_id),
    KEY idx_score (score),
    KEY idx_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户画像表';

-- 用户行为记录表
CREATE TABLE IF NOT EXISTS user_behaviors (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_user_id (user_id),
    KEY idx_project_name (project_name),
    KEY idx_behavior_type (behavior_type),
    KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户行为记录表';

-- 用户偏好表
CREATE TABLE IF NOT EXISTS user_preferences (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(36) NOT NULL,
    category VARCHAR(50) NOT NULL COMMENT '偏好类别',
    `key` VARCHAR(100) NOT NULL COMMENT '偏好键',
    value JSON COMMENT '偏好值',
    weight DOUBLE DEFAULT 1 COMMENT '权重',
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_user_id (user_id),
    KEY idx_category (category),
    KEY idx_key (`key`),
    UNIQUE KEY uk_user_category_key (user_id, category, `key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户偏好表';

-- 用户分群表
CREATE TABLE IF NOT EXISTS user_segments (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    rules JSON COMMENT '分群规则',
    user_count INT DEFAULT 0 COMMENT '用户数量',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户分群表';

-- 用户分群映射表
CREATE TABLE IF NOT EXISTS user_segment_mappings (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(36) NOT NULL,
    segment_id BIGINT UNSIGNED NOT NULL,
    score DOUBLE DEFAULT 0 COMMENT '匹配度评分',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_user_id (user_id),
    KEY idx_segment_id (segment_id),
    UNIQUE KEY uk_user_segment (user_id, segment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户分群映射表';

-- 2. 权限管理系统表

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(500),
    level INT DEFAULT 0 COMMENT '角色等级',
    is_system BOOLEAN DEFAULT FALSE COMMENT '是否为系统角色',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- 权限表
CREATE TABLE IF NOT EXISTS permissions (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    resource VARCHAR(100) NOT NULL COMMENT '资源名称',
    action VARCHAR(50) NOT NULL COMMENT '操作类型',
    project VARCHAR(50) COMMENT '所属项目',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_resource (resource),
    KEY idx_action (action),
    KEY idx_project (project)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

-- 角色权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    role_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by VARCHAR(36) COMMENT '授权人ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_role_permission (role_id, permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';

-- 用户角色关联表
CREATE TABLE IF NOT EXISTS user_roles (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(36) NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    project VARCHAR(50) COMMENT '项目特定角色',
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by VARCHAR(36) COMMENT '授权人ID',
    expires_at TIMESTAMP NULL COMMENT '角色过期时间',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_user_id (user_id),
    KEY idx_role_id (role_id),
    KEY idx_project (project),
    UNIQUE KEY uk_user_role_project (user_id, role_id, project)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';

-- 访问控制表
CREATE TABLE IF NOT EXISTS access_controls (
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_user_id (user_id),
    KEY idx_resource (resource),
    KEY idx_action (action),
    KEY idx_project (project),
    KEY idx_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='访问控制表';

-- 权限组表
CREATE TABLE IF NOT EXISTS permission_groups (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    project VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限组表';

-- 权限组项目表
CREATE TABLE IF NOT EXISTS permission_group_items (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    permission_group_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_group_permission (permission_group_id, permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限组项目表';

-- 审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_user_id (user_id),
    KEY idx_action (action),
    KEY idx_resource (resource),
    KEY idx_project (project),
    KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审计日志表';

-- 3. 数据同步机制表

-- 同步任务表
CREATE TABLE IF NOT EXISTS sync_tasks (
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_source_project (source_project),
    KEY idx_target_project (target_project),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='同步任务表';

-- 同步日志表
CREATE TABLE IF NOT EXISTS sync_logs (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_task_id (task_id),
    KEY idx_status (status),
    KEY idx_start_time (start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='同步日志表';

-- 数据变更记录表
CREATE TABLE IF NOT EXISTS data_changes (
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_table_name (table_name),
    KEY idx_record_id (record_id),
    KEY idx_change_type (change_type),
    KEY idx_project (project),
    KEY idx_sync_status (sync_status),
    KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据变更记录表';

-- 同步映射表
CREATE TABLE IF NOT EXISTS sync_mappings (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    task_id BIGINT UNSIGNED NOT NULL,
    source_table VARCHAR(100) NOT NULL,
    target_table VARCHAR(100) NOT NULL,
    field_mapping JSON COMMENT '字段映射关系',
    transform_rule JSON COMMENT '数据转换规则',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_task_id (task_id),
    KEY idx_source_table (source_table),
    KEY idx_target_table (target_table)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='同步映射表';

-- 同步冲突表
CREATE TABLE IF NOT EXISTS sync_conflicts (
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_task_id (task_id),
    KEY idx_table_name (table_name),
    KEY idx_record_id (record_id),
    KEY idx_conflict_type (conflict_type),
    KEY idx_resolution (resolution)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='同步冲突表';

-- 同步检查点表
CREATE TABLE IF NOT EXISTS sync_checkpoints (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    task_id BIGINT UNSIGNED NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    checkpoint JSON COMMENT '检查点数据',
    last_sync_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_task_table (task_id, table_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='同步检查点表';

-- 4. 监控告警系统表

-- 指标表
CREATE TABLE IF NOT EXISTS metrics (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    type VARCHAR(20) NOT NULL COMMENT 'counter, gauge, histogram, summary',
    unit VARCHAR(20) COMMENT '单位',
    project VARCHAR(50) COMMENT '所属项目',
    labels JSON COMMENT '标签',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_type (type),
    KEY idx_project (project)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='指标表';

-- 指标值表
CREATE TABLE IF NOT EXISTS metric_values (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    metric_id BIGINT UNSIGNED NOT NULL,
    value DOUBLE NOT NULL,
    labels JSON COMMENT '标签值',
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_metric_id (metric_id),
    KEY idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='指标值表';

-- 告警规则表
CREATE TABLE IF NOT EXISTS alert_rules (
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_metric_id (metric_id),
    KEY idx_severity (severity),
    KEY idx_project (project)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='告警规则表';

-- 告警表
CREATE TABLE IF NOT EXISTS alerts (
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_rule_id (rule_id),
    KEY idx_status (status),
    KEY idx_severity (severity),
    KEY idx_project (project),
    KEY idx_fired_at (fired_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='告警表';

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_alert_id (alert_id),
    KEY idx_type (type),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知表';

-- 通知模板表
CREATE TABLE IF NOT EXISTS notification_templates (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知模板表';

-- 系统健康状态表
CREATE TABLE IF NOT EXISTS system_health (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    component VARCHAR(50) NOT NULL COMMENT '组件名称',
    status VARCHAR(20) NOT NULL COMMENT 'healthy, degraded, unhealthy',
    message VARCHAR(500),
    details JSON,
    last_check_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_component (component)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统健康状态表';

-- 性能日志表
CREATE TABLE IF NOT EXISTS performance_logs (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_endpoint (endpoint),
    KEY idx_method (method),
    KEY idx_user_id (user_id),
    KEY idx_project (project),
    KEY idx_duration (duration),
    KEY idx_status_code (status_code),
    KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='性能日志表';

-- 5. 创建统计视图

-- 用户画像统计视图
CREATE OR REPLACE VIEW user_profile_stats AS
SELECT 
    up.user_id,
    u.username,
    u.email,
    up.score,
    up.level,
    COUNT(ub.id) as behavior_count,
    COUNT(upref.id) as preference_count,
    COUNT(usm.id) as segment_count,
    up.last_updated,
    up.created_at
FROM user_profiles up
JOIN users u ON up.user_id = u.id
LEFT JOIN user_behaviors ub ON up.user_id = ub.user_id
LEFT JOIN user_preferences upref ON up.user_id = upref.user_id
LEFT JOIN user_segment_mappings usm ON up.user_id = usm.user_id
WHERE u.deleted_at IS NULL
GROUP BY up.user_id, u.username, u.email, up.score, up.level, up.last_updated, up.created_at;

-- 权限统计视图
CREATE OR REPLACE VIEW permission_stats AS
SELECT 
    r.id as role_id,
    r.name as role_name,
    r.level as role_level,
    COUNT(DISTINCT ur.user_id) as user_count,
    COUNT(DISTINCT rp.permission_id) as permission_count,
    r.is_active,
    r.created_at
FROM roles r
LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.is_active = true
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name, r.level, r.is_active, r.created_at;

-- 监控统计视图
CREATE OR REPLACE VIEW monitoring_stats AS
SELECT 
    m.id as metric_id,
    m.name as metric_name,
    m.type as metric_type,
    m.project,
    COUNT(mv.id) as value_count,
    AVG(mv.value) as avg_value,
    MIN(mv.value) as min_value,
    MAX(mv.value) as max_value,
    COUNT(DISTINCT ar.id) as alert_rule_count,
    COUNT(DISTINCT a.id) as active_alert_count
FROM metrics m
LEFT JOIN metric_values mv ON m.id = mv.metric_id
LEFT JOIN alert_rules ar ON m.id = ar.metric_id AND ar.is_active = true
LEFT JOIN alerts a ON ar.id = a.rule_id AND a.status = 'firing'
WHERE m.is_active = true
GROUP BY m.id, m.name, m.type, m.project;

-- 6. 插入基础数据

-- 插入系统角色
INSERT IGNORE INTO roles (name, description, level, is_system, is_active) VALUES
('super_admin', '超级管理员', 100, true, true),
('admin', '管理员', 80, true, true),
('user', '普通用户', 10, true, true),
('guest', '访客', 1, true, true);

-- 插入基础权限
INSERT IGNORE INTO permissions (name, description, resource, action, project, is_active) VALUES
('user_read', '读取用户信息', 'users', 'read', '', true),
('user_create', '创建用户', 'users', 'create', '', true),
('user_update', '更新用户信息', 'users', 'update', '', true),
('user_delete', '删除用户', 'users', 'delete', '', true),
('profile_read', '读取用户画像', 'profiles', 'read', '', true),
('profile_update', '更新用户画像', 'profiles', 'update', '', true),
('permission_read', '读取权限信息', 'permissions', 'read', '', true),
('permission_manage', '管理权限', 'permissions', 'manage', '', true),
('system_monitor', '系统监控', 'system', 'monitor', '', true);

-- 7. 验证迁移结果
SELECT 
    'user_profiles' as table_name,
    COUNT(*) as record_count
FROM user_profiles
UNION ALL
SELECT 
    'roles' as table_name,
    COUNT(*) as record_count
FROM roles
UNION ALL
SELECT 
    'permissions' as table_name,
    COUNT(*) as record_count
FROM permissions
UNION ALL
SELECT 
    'metrics' as table_name,
    COUNT(*) as record_count
FROM metrics
UNION ALL
SELECT 
    'sync_tasks' as table_name,
    COUNT(*) as record_count
FROM sync_tasks; 