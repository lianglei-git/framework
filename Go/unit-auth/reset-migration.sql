-- 重置数据库迁移状态
-- 这个脚本用于清理可能导致迁移失败的数据库约束

-- 检查并删除可能存在的 uni_users_email 约束
SET @constraint_exists = (
    SELECT COUNT(*)
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND CONSTRAINT_NAME = 'uni_users_email'
);

SET @index_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND INDEX_NAME = 'uni_users_email'
);

-- 如果约束存在，尝试删除
IF @constraint_exists > 0 THEN
    SELECT 'Found constraint uni_users_email, attempting to drop...' AS status;
    ALTER TABLE users DROP FOREIGN KEY uni_users_email;
    SELECT 'Successfully dropped foreign key constraint' AS result;
ELSE
    SELECT 'No foreign key constraint uni_users_email found' AS status;
END IF;

-- 如果索引存在，尝试删除
IF @index_exists > 0 THEN
    SELECT 'Found index uni_users_email, attempting to drop...' AS status;
    ALTER TABLE users DROP INDEX uni_users_email;
    SELECT 'Successfully dropped index' AS result;
ELSE
    SELECT 'No index uni_users_email found' AS status;
END IF;

-- 检查是否已经存在第三方认证字段
SET @google_id_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'google_id'
);

SET @github_id_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'github_id'
);

SET @wechat_id_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'wechat_id'
);

-- 如果字段不存在，添加它们
IF @google_id_exists = 0 THEN
    SELECT 'Adding google_id column...' AS status;
    ALTER TABLE users ADD COLUMN google_id VARCHAR(100) UNIQUE;
ELSE
    SELECT 'google_id column already exists' AS status;
END IF;

IF @github_id_exists = 0 THEN
    SELECT 'Adding github_id column...' AS status;
    ALTER TABLE users ADD COLUMN github_id VARCHAR(100) UNIQUE;
ELSE
    SELECT 'github_id column already exists' AS status;
END IF;

IF @wechat_id_exists = 0 THEN
    SELECT 'Adding wechat_id column...' AS status;
    ALTER TABLE users ADD COLUMN wechat_id VARCHAR(100) UNIQUE;
ELSE
    SELECT 'wechat_id column already exists' AS status;
END IF;

SELECT 'Migration reset completed successfully' AS result;
