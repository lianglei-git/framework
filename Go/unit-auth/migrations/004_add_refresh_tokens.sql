-- 添加Refresh Tokens支持的数据库迁移

-- 创建Refresh Tokens表
CREATE TABLE refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA256哈希值，64个字符
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    user_agent VARCHAR(500),
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- 索引
    INDEX idx_refresh_tokens_user_id (user_id),
    INDEX idx_refresh_tokens_expires_at (expires_at),
    INDEX idx_refresh_tokens_is_revoked (is_revoked),
    INDEX idx_refresh_tokens_user_expires (user_id, expires_at)
);

-- 创建清理过期Refresh Tokens的存储过程
DELIMITER //

CREATE PROCEDURE CleanupExpiredRefreshTokens()
BEGIN
    DELETE FROM refresh_tokens WHERE expires_at < NOW();
END //

DELIMITER ;

-- 创建撤销用户所有Refresh Tokens的存储过程
DELIMITER //

CREATE PROCEDURE RevokeUserRefreshTokens(IN userID VARCHAR(36))
BEGIN
    UPDATE refresh_tokens SET is_revoked = TRUE, updated_at = NOW() WHERE user_id = userID AND is_revoked = FALSE;
END //

DELIMITER ;

-- 创建检查Refresh Token是否有效的存储过程
DELIMITER //

CREATE PROCEDURE ValidateRefreshToken(IN tokenHash VARCHAR(64), IN userID VARCHAR(36))
BEGIN
    SELECT id, expires_at, is_revoked
    FROM refresh_tokens
    WHERE token_hash = tokenHash
      AND user_id = userID
      AND expires_at > NOW()
      AND is_revoked = FALSE;
END //

DELIMITER ;

-- 创建事件调度器，每小时清理一次过期数据
CREATE EVENT IF NOT EXISTS cleanup_expired_refresh_tokens
ON SCHEDULE EVERY 1 HOUR
DO
    CALL CleanupExpiredRefreshTokens();

-- 添加Refresh Token相关的认证日志类型
ALTER TABLE auth_logs MODIFY COLUMN auth_type VARCHAR(50);

-- 插入一些测试用的Refresh Token数据（生产环境应该移除）
-- 注意：这些是示例数据，实际使用时应该通过API生成
INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address) VALUES
(
    'default-user-id',
    'example-refresh-token-hash-replace-in-production',
    DATE_ADD(NOW(), INTERVAL 7 DAY),
    'Example User Agent',
    '127.0.0.1'
);

-- 清理脚本说明：
-- 手动清理过期数据：CALL CleanupExpiredRefreshTokens();
-- 撤销用户所有Refresh Token：CALL RevokeUserRefreshTokens('user-id-here');
-- 验证Refresh Token：CALL ValidateRefreshToken('token-hash-here', 'user-id-here');
