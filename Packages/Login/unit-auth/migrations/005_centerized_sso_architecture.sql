-- 中心化SSO架构数据库迁移
-- 支持Refresh Token后端中心化管理

-- ===============================================
-- 1. 创建Token刷新审计日志表
-- ===============================================
CREATE TABLE token_refresh_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(128) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    app_id VARCHAR(64) NOT NULL,
    old_token_hash VARCHAR(256),
    new_token_hash VARCHAR(256),
    refreshed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    ip_address VARCHAR(45),
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_reason VARCHAR(64),
    refresh_count INT DEFAULT 1,
    processing_time_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_refresh_logs_session (session_id),
    INDEX idx_refresh_logs_user (user_id),
    INDEX idx_refresh_logs_app (app_id),
    INDEX idx_refresh_logs_time (refreshed_at),
    INDEX idx_refresh_logs_success (success),
    INDEX idx_refresh_logs_user_time (user_id, refreshed_at),
    INDEX idx_refresh_logs_session_success (session_id, success)
);

-- ===============================================
-- 2. 优化sso_sessions表结构
-- ===============================================


-- 2.3 修改ID字段长度以支持新架构
ALTER TABLE sso_sessions MODIFY COLUMN id VARCHAR(128);

-- 2.4 添加新架构需要的字段
ALTER TABLE sso_sessions ADD COLUMN (
    current_access_token_hash VARCHAR(256) COMMENT '当前Access Token哈希值',
    refresh_token_hash VARCHAR(256) NOT NULL COMMENT 'Refresh Token哈希值（新增）',
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后活动时间',
    device_fingerprint VARCHAR(128) COMMENT '设备指纹',
    refresh_count INT DEFAULT 0 COMMENT '刷新次数',
    last_refresh_at TIMESTAMP NULL COMMENT '最后刷新时间',
    status VARCHAR(20) DEFAULT 'active' COMMENT '会话状态'
);

-- 2.4.1 修复last_activity字段类型（避免MySQL 5.7+的datetime默认值问题）
ALTER TABLE sso_sessions MODIFY COLUMN last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 2.5 为现有记录设置默认值
UPDATE sso_sessions
SET refresh_token_hash = 'placeholder_hash',
    status = 'active',
    last_activity = COALESCE(last_activity, created_at)
WHERE refresh_token_hash = '' OR refresh_token_hash IS NULL;

-- 2.6 添加备注说明
ALTER TABLE sso_sessions COMMENT = '中心化SSO会话管理表';

-- ===============================================
-- 3. 添加性能优化索引
-- ===============================================

-- 3.1 主要查询优化索引

-- 3.2 活跃会话查询优化
CREATE INDEX idx_sessions_active ON sso_sessions
(user_id, status, expires_at, last_activity);

-- 3.3 刷新频率监控索引
CREATE INDEX idx_sessions_refresh_monitor ON sso_sessions
(user_id, last_refresh_at, refresh_count);

-- 3.4 清理过期会话索引
CREATE INDEX idx_sessions_cleanup ON sso_sessions
(expires_at, status)
WHERE status = 'active';

-- 3.5 设备指纹索引（安全检查）
CREATE INDEX idx_sessions_device ON sso_sessions
(device_fingerprint, user_id, status);

-- ===============================================
-- 4. 数据迁移和清理
-- ===============================================

-- 4.1 将现有数据迁移到新结构
UPDATE sso_sessions
SET refresh_token_hash = 'placeholder_hash',
    status = 'active',
    last_activity = COALESCE(last_activity, created_at)
WHERE refresh_token_hash IS NULL;

-- 4.2 清理无效会话
DELETE FROM sso_sessions
WHERE expires_at < NOW() - INTERVAL 30 DAY;

-- 4.3 清理无用索引（如果存在）
-- DROP INDEX IF EXISTS idx_sso_sessions_code ON sso_sessions;

-- ===============================================
-- 5. 创建清理存储过程
-- ===============================================
DELIMITER //

-- 清理过期的Token刷新日志
CREATE PROCEDURE CleanupExpiredRefreshLogs()
BEGIN
    DELETE FROM token_refresh_logs
    WHERE refreshed_at < NOW() - INTERVAL 90 DAY;
END //

-- 清理过期的会话
CREATE PROCEDURE CleanupExpiredSessions()
BEGIN
    DELETE FROM sso_sessions
    WHERE expires_at < NOW() - INTERVAL 7 DAY;
END //

-- 更新会话活动时间
CREATE PROCEDURE UpdateSessionActivity(IN sessionId VARCHAR(128))
BEGIN
    UPDATE sso_sessions
    SET last_activity = NOW()
    WHERE id = sessionId;
END //

-- 获取会话刷新统计
CREATE PROCEDURE GetRefreshStatistics(IN days INT)
BEGIN
    SELECT
        COUNT(*) as total_refreshes,
        COUNT(CASE WHEN success = 1 THEN 1 END) as successful_refreshes,
        COUNT(CASE WHEN success = 0 THEN 1 END) as failed_refreshes,
        AVG(processing_time_ms) as avg_processing_time,
        MAX(processing_time_ms) as max_processing_time
    FROM token_refresh_logs
    WHERE refreshed_at >= NOW() - INTERVAL days DAY;
END //

DELIMITER ;

-- ===============================================
-- 6. 创建监控视图
-- ===============================================

-- 活跃会话视图
CREATE VIEW v_active_sessions AS
SELECT
    s.*,
    TIMESTAMPDIFF(SECOND, s.last_activity, NOW()) as seconds_since_activity,
    TIMESTAMPDIFF(SECOND, s.expires_at, NOW()) as seconds_until_expiry,
    CASE
        WHEN s.expires_at < NOW() THEN 'expired'
        WHEN TIMESTAMPDIFF(HOUR, s.last_activity, NOW()) > 24 THEN 'inactive'
        ELSE 'active'
    END as session_status
FROM sso_sessions s
WHERE s.status = 'active'
ORDER BY s.last_activity DESC;

-- 刷新统计视图
CREATE VIEW v_refresh_statistics AS
SELECT
    DATE(refreshed_at) as refresh_date,
    app_id,
    COUNT(*) as total_refreshes,
    COUNT(CASE WHEN success = 1 THEN 1 END) as successful,
    COUNT(CASE WHEN success = 0 THEN 1 END) as failed,
    AVG(processing_time_ms) as avg_time,
    MIN(processing_time_ms) as min_time,
    MAX(processing_time_ms) as max_time
FROM token_refresh_logs
GROUP BY DATE(refreshed_at), app_id
ORDER BY refresh_date DESC, app_id;

-- ===============================================
-- 7. 性能监控和告警
-- ===============================================

-- 7.1 创建监控事件表
CREATE TABLE system_monitoring (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    alert_level VARCHAR(20) DEFAULT 'info', -- info, warning, error, critical

    INDEX idx_monitoring_metric (metric_name),
    INDEX idx_monitoring_time (timestamp),
    INDEX idx_monitoring_level (alert_level)
);

-- 7.2 创建性能指标计算函数
DELIMITER //

CREATE FUNCTION CalculateRefreshSuccessRate(days INT)
RETURNS DECIMAL(5,4)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE total_refreshes INT;
    DECLARE successful_refreshes INT;

    SELECT COUNT(*), COUNT(CASE WHEN success = 1 THEN 1 END)
    INTO total_refreshes, successful_refreshes
    FROM token_refresh_logs
    WHERE refreshed_at >= NOW() - INTERVAL days DAY;

    IF total_refreshes = 0 THEN
        RETURN 1.0000;
    END IF;

    RETURN successful_refreshes / total_refreshes;
END //

DELIMITER ;

-- ===============================================
-- 8. 最终验证和统计
-- ===============================================

-- 8.1 验证表结构
SELECT 'sso_sessions' as table_name, COUNT(*) as record_count FROM sso_sessions
UNION ALL
SELECT 'token_refresh_logs' as table_name, COUNT(*) as record_count FROM token_refresh_logs
UNION ALL
SELECT 'system_monitoring' as table_name, COUNT(*) as record_count FROM system_monitoring;

-- 8.2 显示索引信息
SELECT
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    INDEX_TYPE,
    CARDINALITY
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME IN ('sso_sessions', 'token_refresh_logs')
ORDER BY TABLE_NAME, INDEX_NAME;

-- 8.3 迁移完成确认
INSERT INTO system_monitoring (metric_name, metric_value, alert_level)
VALUES ('db_migration_completed', 1.0, 'info');

COMMIT;
