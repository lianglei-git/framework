# Token续签功能实现文档

## 概述

Token续签功能为登录系统提供安全、可靠的Token生命周期管理，支持两种续签机制：
- **简单续签**：基于当前Access Token的续签
- **双Token续签**：基于Refresh Token的安全续签（推荐）

## 架构设计

### 数据库结构

#### refresh_tokens表
```sql
CREATE TABLE refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA256哈希值
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    user_agent VARCHAR(500),
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_refresh_tokens_user_id (user_id),
    INDEX idx_refresh_tokens_expires_at (expires_at)
);
```

### Token类型

1. **Access Token**：短期Token，用于API访问（默认2小时）
2. **Refresh Token**：长期Token，用于续签Access Token（默认7天）
3. **Remember Me Token**：超长期Token，支持记住登录（默认30天）

## 后端API接口

### 1. 简单Token续签
```http
POST /api/v1/auth/refresh-token
Authorization: Bearer {access_token}
Content-Type: application/json

{}
```

**响应：**
```json
{
    "code": 200,
    "message": "Token refreshed successfully",
    "data": {
        "access_token": "eyJhbGciOiJIUzI1NiIs...",
        "token_type": "Bearer",
        "expires_in": 7200,
        "user_id": "user123",
        "email": "user@example.com",
        "role": "user"
    }
}
```

### 2. 双Token续签（推荐）
```http
POST /api/v1/auth/refresh-with-refresh-token
Content-Type: application/json

{
    "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**响应：**
```json
{
    "code": 200,
    "message": "Token refreshed successfully",
    "data": {
        "access_token": "eyJhbGciOiJIUzI1NiIs...",
        "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
        "token_type": "Bearer",
        "expires_in": 7200,
        "refresh_expires_in": 604800,
        "user_id": "user123",
        "email": "user@example.com",
        "role": "user"
    }
}
```

### 3. 双Token登录
```http
POST /api/v1/auth/login-with-token-pair
Content-Type: application/json

{
    "account": "user@example.com",
    "password": "password123"
}
```

**响应：**
```json
{
    "code": 200,
    "message": "Login successful",
    "data": {
        "user": { /* 用户信息 */ },
        "access_token": "eyJhbGciOiJIUzI1NiIs...",
        "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
        "expires_in": 7200,
        "refresh_expires_in": 604800
    }
}
```

### 4. Token状态检查
```http
GET /api/v1/auth/token-status
Authorization: Bearer {access_token}
```

**响应：**
```json
{
    "code": 200,
    "message": "Token status retrieved successfully",
    "data": {
        "user_id": "user123",
        "email": "user@example.com",
        "role": "user",
        "token_type": "access",
        "expires_at": "2025-01-24T15:30:00Z",
        "remaining_hours": 2,
        "remaining_minutes": 30,
        "is_expiring_soon": false,
        "is_valid": true
    }
}
```

## 前端集成

### TokenRefreshService

#### 基本用法
```typescript
import tokenRefreshService from './services/tokenRefreshService'

// 手动续签
const result = await tokenRefreshService.refreshToken()
if (result) {
    console.log('续签成功:', result.access_token)
}

// 双Token续签
const result = await tokenRefreshService.refreshTokenWithRefreshToken()
if (result) {
    console.log('双Token续签成功:', result.access_token, result.refresh_token)
}

// 双Token登录
const result = await tokenRefreshService.loginWithTokenPair('user@example.com', 'password')
if (result) {
    console.log('双Token登录成功')
}
```

#### 自动续签
```typescript
// 启动自动续签监控
tokenRefreshService.startTokenMonitoring()

// 停止自动续签监控
tokenRefreshService.stopTokenMonitoring()

// 监听续签事件
window.addEventListener('token:refreshed', (event) => {
    console.log('Token已续签:', event.detail.newToken)
})
```

### 存储管理

Refresh Token自动存储在localStorage中：
- **简单续签**：不使用Refresh Token
- **双Token续签**：自动存储和管理Refresh Token
- **失效处理**：Refresh Token失效时自动清除

## 安全特性

### 1. Refresh Token安全
- ✅ Refresh Token哈希存储：数据库中只存储Token哈希值
- ✅ 一次性使用：每次使用后生成新的Refresh Token
- ✅ 自动撤销：旧的Refresh Token使用后立即撤销
- ✅ IP和User-Agent绑定：增强安全性

### 2. Token验证
- ✅ 双重验证：JWT签名验证 + 数据库状态验证
- ✅ 过期检查：严格的过期时间验证
- ✅ 撤销机制：支持手动撤销Refresh Token

### 3. 自动清理
- ✅ 过期Token清理：自动清理过期的Refresh Token
- ✅ 定期维护：每小时执行一次清理任务

## 配置参数

在配置文件中可以调整以下参数：

```go
// JWT配置
JWTExpiration: 2              // Access Token过期时间（小时）
JWTRefreshExpiration: 168     // Refresh Token过期时间（小时，7天）
JWTRememberMeExpiration: 720  // Remember Me Token过期时间（小时，30天）
```

## 测试

### 运行测试
```bash
# 使用默认服务器地址（localhost:8080）
./test_token_refresh.sh

# 指定服务器地址
./test_token_refresh.sh http://your-server:port
```

### 测试覆盖
1. ✅ 简单Token续签测试
2. ✅ 双Token续签测试
3. ✅ Token状态检查测试
4. ✅ 记住我功能测试

## 部署说明

### 1. 数据库迁移
运行数据库迁移以创建refresh_tokens表：
```bash
# 执行迁移文件
mysql -u username -p database < migrations/004_add_refresh_tokens.sql
```

### 2. 环境配置
确保配置文件包含正确的JWT配置：
```go
config.AppConfig.JWTSecret = "your-secret-key"
config.AppConfig.JWTExpiration = 2
config.AppConfig.JWTRefreshExpiration = 168
```

### 3. 清理任务
系统会自动执行以下清理任务：
- 过期Refresh Token清理
- 定期数据库维护

## 故障排除

### 常见问题

1. **Refresh Token无效**
   - 检查Refresh Token是否过期
   - 验证Token哈希是否匹配
   - 确认用户ID是否正确

2. **续签失败**
   - 检查数据库连接
   - 验证JWT Secret配置
   - 确认Refresh Token未被撤销

3. **前端续签不工作**
   - 检查浏览器localStorage支持
   - 验证API端点地址
   - 确认Token格式正确

### 调试命令

```sql
-- 检查Refresh Token状态
SELECT * FROM refresh_tokens WHERE user_id = 'user123';

-- 手动清理过期Token
CALL CleanupExpiredRefreshTokens();

-- 撤销用户Token
CALL RevokeUserRefreshTokens('user123');
```

## 性能优化

1. **索引优化**：为常用查询字段建立索引
2. **连接池**：使用数据库连接池提升性能
3. **缓存策略**：考虑对Token验证结果进行缓存
4. **批量操作**：支持批量Token清理操作

## 扩展计划

1. **多设备支持**：支持同一用户多设备登录管理
2. **Token黑名单**：实现全局Token黑名单机制
3. **审计日志**：完善Token操作审计日志
4. **动态配置**：支持运行时Token配置调整

---

## 总结

Token续签功能已完整实现，包括：

✅ **数据库模型**：Refresh Token持久化存储
✅ **后端API**：完整的续签和验证接口
✅ **前端集成**：自动续签和状态监控
✅ **安全机制**：多重验证和撤销机制
✅ **测试覆盖**：完整的自动化测试
✅ **文档说明**：详细的使用和部署文档

该实现提供了安全、可靠、易用的Token生命周期管理方案，适用于现代Web应用的安全认证需求。
