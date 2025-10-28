-- 为 refresh_token_hash 添加索引以提升查询性能
-- 用于支持多设备登录场景下的快速session查询

-- 兼容低版本 MySQL（如 5.7）：
-- 1) 不使用 CREATE INDEX IF NOT EXISTS（低版本不支持）
-- 2) 不使用部分索引 WHERE 子句（MySQL 不支持）
-- 3) 使用 INFORMATION_SCHEMA + 预处理语句避免重复创建

-- 检查并创建 idx_refresh_token_hash（单字段索引）
SET @idx_exists := (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sso_sessions'
    AND INDEX_NAME = 'idx_refresh_token_hash'
);
SET @sql := IF(@idx_exists = 0,
  'CREATE INDEX idx_refresh_token_hash ON sso_sessions (refresh_token_hash)',
  'DO 0'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 检查并创建 idx_session_lookup（复合索引，去掉条件，仅按列顺序建索引）
SET @idx2_exists := (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sso_sessions'
    AND INDEX_NAME = 'idx_session_lookup'
);
SET @sql2 := IF(@idx2_exists = 0,
  'CREATE INDEX idx_session_lookup ON sso_sessions (refresh_token_hash, status, expires_at)',
  'DO 0'
);
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

-- 说明：
-- 1. idx_refresh_token_hash: 单字段索引，用于快速定位 refresh_token
-- 2. idx_session_lookup: 复合索引（移除部分索引条件），兼容 MySQL 低版本
-- 3. 通过 INFORMATION_SCHEMA.STATISTICS 判断是否已存在，避免重复创建报错
-- 4. 使用 index 而不是 unique index，因为 refresh_token 轮换后 hash 会变，旧 hash 可能短暂存在

