-- 为 last_activity 添加索引，加速不活跃session清理查询

-- 检查并创建 idx_status_last_activity（复合索引）
SET @idx_exists := (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sso_sessions'
    AND INDEX_NAME = 'idx_status_last_activity'
);
SET @sql := IF(@idx_exists = 0,
  'CREATE INDEX idx_status_last_activity ON sso_sessions (status, last_activity)',
  'DO 0'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 说明：
-- 此索引用于快速查询"某状态下长期不活跃的session"
-- 对应查询：WHERE status = 'active' AND last_activity < ?
-- 通过复合索引 (status, last_activity) 优化清理逻辑性能

