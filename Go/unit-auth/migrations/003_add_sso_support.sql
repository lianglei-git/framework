-- 添加SSO支持的数据库迁移

-- 创建SSO客户端表
CREATE TABLE sso_clients (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    secret VARCHAR(255) NOT NULL,
    redirect_uris TEXT NOT NULL, -- JSON array of allowed redirect URIs
    grant_types TEXT NOT NULL,   -- JSON array of allowed grant types
    response_types TEXT NOT NULL, -- JSON array of allowed response types
    scope TEXT NOT NULL,         -- JSON array of allowed scopes
    auto_approve BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sso_clients_active (is_active)
);

-- 创建SSO会话表
CREATE TABLE sso_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    client_id VARCHAR(36) NOT NULL,
    authorization_code VARCHAR(500),
    code_challenge VARCHAR(100),
    code_challenge_method VARCHAR(20),
    redirect_uri VARCHAR(500),
    scope TEXT,
    state VARCHAR(100),
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sso_sessions_user (user_id),
    INDEX idx_sso_sessions_client (client_id),
    INDEX idx_sso_sessions_code (authorization_code),
    INDEX idx_sso_sessions_expires (expires_at)
);

-- 创建令牌黑名单表
CREATE TABLE token_blacklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token_jti VARCHAR(100) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_token_blacklist_jti (token_jti),
    INDEX idx_token_blacklist_expires (expires_at)
);

-- 修改用户表，添加第三方认证ID字段
-- 检查并安全地删除现有的约束
-- SET @constraint_exists = (
--     SELECT COUNT(*)
--     FROM information_schema.KEY_COLUMN_USAGE
--     WHERE TABLE_SCHEMA = DATABASE()
--     AND TABLE_NAME = 'users'
--     AND CONSTRAINT_NAME = 'uni_users_email'
-- );

-- -- 如果约束存在，先删除索引
-- SET @index_exists = (
--     SELECT COUNT(*)
--     FROM information_schema.STATISTICS
--     WHERE TABLE_SCHEMA = DATABASE()
--     AND TABLE_NAME = 'users'
--     AND INDEX_NAME = 'uni_users_email'
-- );

-- SET @sql_drop_index = IF(@index_exists > 0,
--     'ALTER TABLE users DROP INDEX uni_users_email;',
--     'SELECT "Index uni_users_email does not exist, skipping drop";'
-- );

-- 安全删除索引（如果存在）
SET @index_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND INDEX_NAME = 'uni_users_email'
);

SET @sql_drop = IF(@index_exists > 0,
    'ALTER TABLE users DROP INDEX uni_users_email;',
    'SELECT "Index uni_users_email does not exist, skipping";'
);

PREPARE stmt FROM @sql_drop;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加第三方认证ID字段
ALTER TABLE users ADD COLUMN google_id VARCHAR(100) UNIQUE;
ALTER TABLE users ADD COLUMN github_id VARCHAR(100) UNIQUE;
ALTER TABLE users ADD COLUMN wechat_id VARCHAR(100) UNIQUE;

-- 创建索引
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_github_id ON users(github_id);
CREATE INDEX idx_users_wechat_id ON users(wechat_id);

-- 添加项目映射表的索引优化
CREATE INDEX idx_project_mappings_project_user ON project_mappings(project_name, user_id);
CREATE INDEX idx_project_mappings_local_user ON project_mappings(project_name, local_user_id);

-- 更新用户统计表结构，添加项目维度
ALTER TABLE global_user_stats ADD COLUMN sso_provider VARCHAR(50) DEFAULT 'local';

-- 添加SSO相关的认证日志类型
ALTER TABLE auth_logs MODIFY COLUMN auth_type VARCHAR(50);

-- 插入默认的SSO客户端（示例）
INSERT INTO sso_clients (id, name, description, secret, redirect_uris, grant_types, response_types, scope, auto_approve, is_active) VALUES
(
    'default-client',
    'Default SSO Client',
    'Default SSO client for internal applications',
    'default-client-secret-replace-in-production',
    '["http://localhost:3000/auth/callback", "https://yourapp.com/auth/callback"]',
    '["authorization_code", "refresh_token", "password"]',
    '["code"]',
    '["openid", "profile", "email"]',
    false,
    true
);

-- 创建清理过期会话的存储过程
DELIMITER //

CREATE PROCEDURE CleanupExpiredSSOSessions()
BEGIN
    DELETE FROM sso_sessions WHERE expires_at < NOW();
    DELETE FROM token_blacklist WHERE expires_at < NOW();
END //

DELIMITER ;

-- 创建清理过期验证码的存储过程（如果还没有的话）
DELIMITER //

CREATE PROCEDURE CleanupExpiredVerifications()
BEGIN
    DELETE FROM email_verifications WHERE expires_at < NOW();
    DELETE FROM sms_verifications WHERE expires_at < NOW();
    DELETE FROM password_resets WHERE expires_at < NOW();
END //

DELIMITER ;

-- 创建事件调度器，每小时清理一次过期数据
CREATE EVENT IF NOT EXISTS cleanup_expired_data
ON SCHEDULE EVERY 1 HOUR
DO
    CALL CleanupExpiredSSOSessions();
    CALL CleanupExpiredVerifications();
