-- -- 测试迁移脚本修复
-- -- 这个脚本用于验证修复后的约束删除逻辑

-- -- 先检查是否需要删除现有的约束
-- SET @constraint_exists = (
--     SELECT COUNT(*)
--     FROM information_schema.KEY_COLUMN_USAGE
--     WHERE TABLE_SCHEMA = DATABASE()
--     AND TABLE_NAME = 'users'
--     AND CONSTRAINT_NAME = 'uni_users_email'
-- );

-- SELECT @constraint_exists as constraint_exists;

-- SET @sql = IF(@constraint_exists > 0,
--     'ALTER TABLE users DROP INDEX uni_users_email;',
--     'SELECT "Constraint uni_users_email does not exist, skipping drop";'
-- );

-- PREPARE stmt FROM @sql;
-- EXECUTE stmt;
-- DEALLOCATE PREPARE stmt;

-- -- 测试完成消息
-- SELECT 'Migration fix test completed successfully' as result;
