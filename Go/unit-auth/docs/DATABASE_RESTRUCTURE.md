# 数据库重构文档：用户中心化架构

## 📊 重构概述

本次重构将 unit-auth 从单纯的认证服务升级为用户中心化管理系统，支持跨项目的用户数据统一管理和统计。

## 🔄 主要变更

### 1. 用户表结构重构

#### 重构前
```sql
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    username VARCHAR(50) UNIQUE,
    nickname VARCHAR(100),
    password VARCHAR(255) NOT NULL,
    avatar VARCHAR(500),           -- 将被移到 meta 字段
    role VARCHAR(20) DEFAULT 'user',
    status VARCHAR(20) DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    google_id VARCHAR(100) UNIQUE,
    github_id VARCHAR(100) UNIQUE,
    wechat_id VARCHAR(100) UNIQUE,
    login_count BIGINT DEFAULT 0,
    last_login_at DATETIME,
    last_login_ip VARCHAR(45),
    last_login_user_agent VARCHAR(500),
    created_at DATETIME,
    updated_at DATETIME,
    deleted_at DATETIME
);
```

#### 重构后
```sql
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    username VARCHAR(50) UNIQUE,
    nickname VARCHAR(100),
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    status VARCHAR(20) DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    google_id VARCHAR(100) UNIQUE,
    github_id VARCHAR(100) UNIQUE,
    wechat_id VARCHAR(100) UNIQUE,
    meta JSON,                     -- 新增：用户元数据字段
    login_count BIGINT DEFAULT 0,
    last_login_at DATETIME,
    last_login_ip VARCHAR(45),
    last_login_user_agent VARCHAR(500),
    created_at DATETIME,
    updated_at DATETIME,
    deleted_at DATETIME
);
```

### 2. 用户元数据结构

```json
{
    "avatar": "https://example.com/avatar.jpg",
    "gender": "male",
    "birthday": "1990-01-01",
    "real_name": "张三",
    "bio": "个人简介",
    "location": "北京",
    "website": "https://example.com",
    "company": "公司名称",
    "job_title": "职位",
    "education": "教育背景",
    "interests": "兴趣爱好",
    "language": "zh-CN",
    "timezone": "Asia/Shanghai",
    "custom": {
        "field1": "value1",
        "field2": "value2"
    }
}
```

### 3. 新增中心化表结构

#### 项目映射表 (project_mappings)
```sql
CREATE TABLE project_mappings (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(36) NOT NULL COMMENT '全局用户ID',
    project_name VARCHAR(50) NOT NULL COMMENT '项目名称',
    local_user_id VARCHAR(50) NOT NULL COMMENT '项目本地用户ID',
    mapping_type VARCHAR(20) DEFAULT 'direct' COMMENT '映射类型：direct, alias, federated',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_project_local (project_name, local_user_id),
    UNIQUE KEY uk_user_project (user_id, project_name)
);
```

#### 全局用户统计表 (global_user_stats)
```sql
CREATE TABLE global_user_stats (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    project_name VARCHAR(50) NOT NULL COMMENT '项目名称',
    login_count INT DEFAULT 0 COMMENT '登录次数',
    last_login_at DATETIME NULL COMMENT '最后登录时间',
    total_usage_time INT DEFAULT 0 COMMENT '总使用时间（秒）',
    last_activity_at DATETIME NULL COMMENT '最后活动时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_project (user_id, project_name)
);
```

#### 认证日志表 (auth_logs)
```sql
CREATE TABLE auth_logs (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    project_name VARCHAR(50) NOT NULL COMMENT '项目名称',
    auth_type VARCHAR(20) NOT NULL COMMENT '认证类型：login, logout, register, password_reset',
    ip_address VARCHAR(45) NULL COMMENT 'IP地址',
    user_agent VARCHAR(500) NULL COMMENT '用户代理',
    success BOOLEAN DEFAULT TRUE COMMENT '是否成功',
    error_msg VARCHAR(500) NULL COMMENT '错误信息',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. 跨项目统计视图

```sql
CREATE VIEW cross_project_stats AS
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
```

## 🚀 迁移步骤

### 步骤1：备份数据
```bash
# 备份现有数据库
mysqldump -u root -p unit_auth > backup_before_restructure_$(date +%Y%m%d_%H%M%S).sql
```

### 步骤2：执行迁移脚本
```bash
# 执行重构迁移脚本
mysql -u root -p unit_auth < migrations/001_restructure_user_table.sql
```

### 步骤3：验证迁移结果
```sql
-- 检查表结构
DESCRIBE users;
DESCRIBE project_mappings;
DESCRIBE global_user_stats;
DESCRIBE auth_logs;

-- 检查数据迁移
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM project_mappings;
SELECT COUNT(*) FROM global_user_stats;
SELECT COUNT(*) FROM auth_logs;

-- 检查元数据
SELECT 
    id,
    username,
    email,
    JSON_EXTRACT(meta, '$.avatar') as avatar,
    JSON_EXTRACT(meta, '$.gender') as gender
FROM users 
LIMIT 5;
```

## 🔧 API 变更

### 1. 用户注册 API
```json
// 请求体变更
{
    "email": "user@example.com",
    "username": "username",
    "nickname": "昵称",
    "password": "password123",
    "code": "123456",
    "meta": {
        "avatar": "https://example.com/avatar.jpg",
        "gender": "male",
        "birthday": "1990-01-01"
    }
}
```

### 2. 更新用户信息 API
```json
// 请求体变更
{
    "nickname": "新昵称",
    "meta": {
        "avatar": "https://example.com/new-avatar.jpg",
        "bio": "新的个人简介"
    }
}
```

### 3. 新增中心化 API

#### 创建项目映射
```http
POST /api/v1/centralized/project-mappings
{
    "user_id": "uuid",
    "project_name": "server",
    "local_user_id": "123",
    "mapping_type": "direct"
}
```

#### 获取跨项目统计
```http
GET /api/v1/centralized/users/{userId}/cross-project-stats
```

#### 获取项目统计
```http
GET /api/v1/centralized/projects/{project}/stats?page=1&pageSize=10
```

#### 记录用户活动
```http
POST /api/v1/centralized/activity
{
    "user_id": "uuid",
    "project_name": "server",
    "auth_type": "login",
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "success": true
}
```

## 📈 功能特性

### 1. 用户元数据管理
- ✅ 灵活的用户信息存储
- ✅ 支持自定义字段
- ✅ JSON 格式便于扩展

### 2. 跨项目用户管理
- ✅ 统一的用户ID管理
- ✅ 项目映射关系
- ✅ 支持多种映射类型

### 3. 全局用户统计
- ✅ 跨项目登录统计
- ✅ 使用时间统计
- ✅ 活动日志记录

### 4. 搜索和查询
- ✅ 基于元数据的用户搜索
- ✅ 跨项目统计查询
- ✅ 分页支持

## 🔍 使用示例

### 1. 创建用户并设置元数据
```go
user := &models.User{
    ID:       "uuid",
    Email:    "user@example.com",
    Username: "username",
    Nickname: "昵称",
    Password: "hashed_password",
}

// 设置元数据
meta := &models.UserMeta{
    Avatar:   "https://example.com/avatar.jpg",
    Gender:   "male",
    Birthday: "1990-01-01",
    Bio:      "个人简介",
    Location: "北京",
}

user.SetMeta(meta)
db.Create(user)
```

### 2. 创建项目映射
```go
mapping := &models.ProjectMapping{
    UserID:      "global_user_id",
    ProjectName: "server",
    LocalUserID: "local_user_id",
    MappingType: "direct",
}

db.Create(mapping)
```

### 3. 记录用户活动
```go
user.RecordProjectActivity(db, "server", "login", "192.168.1.1", "Mozilla/5.0...", true, "")
```

### 4. 获取跨项目统计
```go
stats, err := centralizedService.GetCrossProjectStats("user_id")
if err != nil {
    // 处理错误
}
fmt.Printf("用户活跃项目数: %d\n", stats.ActiveProjects)
fmt.Printf("总登录次数: %d\n", stats.TotalLogins)
```

## 🎯 架构优势

### 1. **数据统一性**
- 所有项目共享同一套用户数据
- 避免用户数据重复和不一致
- 统一的用户认证和授权

### 2. **扩展性**
- JSON 元数据支持灵活扩展
- 支持自定义用户属性
- 易于添加新的项目集成

### 3. **可观测性**
- 完整的用户活动日志
- 跨项目使用统计
- 支持用户行为分析

### 4. **维护性**
- 集中化的用户管理
- 统一的API接口
- 简化的数据维护

## 🔮 未来扩展

### 1. 用户画像系统
- 基于跨项目数据构建用户画像
- 个性化推荐和定制化服务
- 用户行为分析和预测

### 2. 权限管理系统
- 跨项目的统一权限控制
- 基于角色的访问控制
- 细粒度的权限管理

### 3. 数据同步机制
- 实时数据同步
- 数据一致性保证
- 故障恢复机制

### 4. 监控和告警
- 用户活动监控
- 异常行为检测
- 系统性能监控

## 📋 注意事项

### 1. 数据迁移
- 迁移前务必备份数据
- 在测试环境验证迁移脚本
- 准备回滚方案

### 2. 性能考虑
- JSON 字段查询性能
- 大量数据的分页处理
- 索引优化

### 3. 安全性
- 敏感信息的加密存储
- 访问权限控制
- 数据隐私保护

### 4. 兼容性
- 保持向后兼容
- 渐进式迁移
- API 版本管理

## 🎉 总结

通过这次重构，unit-auth 从一个简单的认证服务升级为功能强大的用户中心化管理系统，为多项目架构提供了统一的用户管理解决方案。新的架构不仅解决了当前的需求，还为未来的扩展奠定了坚实的基础。 