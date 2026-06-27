-- 为设备指纹添加复合索引，加速设备去重查询
-- 创建时间: 2025-10-28
-- 目的: 优化 "用户+应用+设备" 的 session 查询性能

-- 检查并创建复合索引
SET @idx_exists := (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sso_sessions'
    AND INDEX_NAME = 'idx_user_client_device'
);

SET @sql := IF(@idx_exists = 0,
  'CREATE INDEX idx_user_client_device ON sso_sessions (user_id, client_id, device_fingerprint, status)',
  'DO 0'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 说明：
-- 1. idx_user_client_device: 复合索引，用于快速查询"某用户在某设备上某应用的活跃session"
-- 2. 对应查询: WHERE user_id=? AND client_id=? AND device_fingerprint=? AND status='active'
-- 3. 支持设备去重机制，避免同一设备多次登录产生垃圾数据
-- 4. 提升授权码流程和登录流程的查询性能

