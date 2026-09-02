-- 账号状态收敛：active / frozen / cancelled
-- 角色扩展：user | admin | moderator | beta | ops
-- 内测资格 1:1 表 user_beta_profiles（status TINYINT 与 users.status 字符串互不混用）

UPDATE users SET status = 'frozen' WHERE status IN ('suspended', 'inactive');
UPDATE users SET status = 'active' WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS user_beta_profiles (
  user_id     VARCHAR(36) NOT NULL,
  beta_group  VARCHAR(32) NOT NULL DEFAULT 'A',
  status      TINYINT NOT NULL DEFAULT 1 COMMENT '0失效 1有效 2暂停',
  expires_at  TIMESTAMP NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_beta_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
