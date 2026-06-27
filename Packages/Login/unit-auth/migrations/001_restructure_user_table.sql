-- 数据库迁移脚本：重构用户表结构
-- 将非必要信息移到 meta 字段，添加中心化相关表

-- 1. 备份现有数据
-- 注意：在生产环境中执行前请先备份数据库

-- 2. 创建临时表保存现有数据
CREATE TABLE users_backup AS SELECT * FROM users;

-- 3. 添加 meta 字段到用户表
ALTER TABLE users ADD COLUMN meta JSON DEFAULT NULL COMMENT '用户元数据';

-- 4. 迁移现有数据到 meta 字段
UPDATE users SET meta = JSON_OBJECT(
    'avatar', avatar,
    'gender', NULL,
    'birthday', NULL,
    'real_name', NULL,
    'bio', NULL,
    'location', NULL,
    'website', NULL,
    'company', NULL,
    'job_title', NULL,
    'education', NULL,
    'interests', NULL,
    'language', NULL,
    'timezone', NULL,
    'custom', JSON_OBJECT()
) WHERE meta IS NULL;

-- 5. 删除旧的 avatar 字段（可选，如果需要保持向后兼容可以保留）
-- ALTER TABLE users DROP COLUMN avatar;

-- 6. 创建项目映射表
CREATE TABLE IF NOT EXISTS project_mappings (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id VARCHAR(36) NOT NULL COMMENT '全局用户ID',
    project_name VARCHAR(50) NOT NULL COMMENT '项目名称',
    local_user_id VARCHAR(50) NOT NULL COMMENT '项目本地用户ID',
    mapping_type VARCHAR(20) DEFAULT 'direct' COMMENT '映射类型：direct, alias, federated',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_project_local (project_name, local_user_id),
    UNIQUE KEY uk_user_project (user_id, project_name),
    KEY idx_user_id (user_id),
    KEY idx_project_name (project_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目映射表';

-- 7. 创建全局用户统计表
CREATE TABLE IF NOT EXISTS global_user_stats (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    project_name VARCHAR(50) NOT NULL COMMENT '项目名称',
    login_count INT DEFAULT 0 COMMENT '登录次数',
    last_login_at DATETIME NULL COMMENT '最后登录时间',
    total_usage_time INT DEFAULT 0 COMMENT '总使用时间（秒）',
    last_activity_at DATETIME NULL COMMENT '最后活动时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_project (user_id, project_name),
    KEY idx_user_id (user_id),
    KEY idx_project_name (project_name),
    KEY idx_last_activity (last_activity_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='全局用户统计表';

-- 8. 创建认证日志表
CREATE TABLE IF NOT EXISTS auth_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    project_name VARCHAR(50) NOT NULL COMMENT '项目名称',
    auth_type VARCHAR(20) NOT NULL COMMENT '认证类型：login, logout, register, password_reset',
    ip_address VARCHAR(45) NULL COMMENT 'IP地址',
    user_agent VARCHAR(500) NULL COMMENT '用户代理',
    success BOOLEAN DEFAULT TRUE COMMENT '是否成功',
    error_msg VARCHAR(500) NULL COMMENT '错误信息',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_user_id (user_id),
    KEY idx_project_name (project_name),
    KEY idx_auth_type (auth_type),
    KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='认证日志表';

-- 9. 创建跨项目统计视图
CREATE OR REPLACE VIEW cross_project_stats AS
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    COUNT(DISTINCT gus.project_name) as active_projects,
    SUM(gus.login_count) as total_logins,
    MAX(gus.last_activity_at) as last_activity,
    SUM(gus.total_usage_time) as total_usage_time,
    u.created_at
FROM users u
LEFT JOIN global_user_stats gus ON u.id = gus.user_id
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.username, u.email, u.created_at;

-- 10. 插入示例项目映射数据（可选）
-- INSERT INTO project_mappings (user_id, project_name, local_user_id, mapping_type) 
-- SELECT id, 'unit-auth', id, 'direct' FROM users WHERE deleted_at IS NULL;

-- 11. 验证迁移结果
SELECT 
    'users' as table_name,
    COUNT(*) as record_count
FROM users
UNION ALL
SELECT 
    'project_mappings' as table_name,
    COUNT(*) as record_count
FROM project_mappings
UNION ALL
SELECT 
    'global_user_stats' as table_name,
    COUNT(*) as record_count
FROM global_user_stats
UNION ALL
SELECT 
    'auth_logs' as table_name,
    COUNT(*) as record_count
FROM auth_logs;

-- 12. 显示用户元数据示例
SELECT 
    id,
    username,
    email,
    JSON_EXTRACT(meta, '$.avatar') as avatar,
    JSON_EXTRACT(meta, '$.gender') as gender,
    JSON_EXTRACT(meta, '$.birthday') as birthday
FROM users 
LIMIT 5; 