# OAuth 2.0 授权码数据库存储实现

## 概述

本实现为 `GetOAuthAuthorize` 函数添加了完整的数据库存储功能，确保授权码的安全管理和验证。

## 功能特性

### ✅ 数据库存储
- **完整保存**: 授权码生成后立即保存到 `sso_sessions` 表
- **全字段记录**: 保存授权码、用户ID、客户端ID、重定向URI、范围、状态等所有信息
- **过期管理**: 自动设置10分钟过期时间，与JWT授权码保持一致
- **安全信息**: 记录IP地址、User-Agent等安全信息

### ✅ 数据库验证
- **存在性检查**: 从数据库验证授权码是否存在且未过期
- **完整性验证**: 验证客户端ID、重定向URI、用户ID等关键信息
- **状态管理**: 检查授权码状态（active/inactive）
- **防重放**: 使用后立即标记为已使用，防止重复使用

### ✅ 安全特性
- **双重验证**: 既验证JWT签名，又验证数据库记录
- **过期控制**: 数据库记录和JWT声明双重过期验证
- **状态追踪**: 记录授权码的生成、使用状态
- **审计日志**: 保存完整的操作历史

## 数据库结构

### SSOSession 表字段

```sql
CREATE TABLE sso_sessions (
    id VARCHAR(128) PRIMARY KEY,                    -- 会话ID
    user_id VARCHAR(64) NOT NULL,                   -- 用户ID
    client_id VARCHAR(64) NOT NULL,                 -- 客户端ID
    authorization_code VARCHAR(500),                 -- 授权码（JWT）
    code_challenge VARCHAR(100),                     -- PKCE代码挑战
    code_challenge_method VARCHAR(20),               -- PKCE方法
    redirect_uri VARCHAR(500),                       -- 重定向URI
    scope TEXT,                                     -- 权限范围
    state VARCHAR(100),                             -- 状态参数
    used BOOLEAN DEFAULT FALSE,                     -- 是否已使用
    status VARCHAR(20) DEFAULT 'active',            -- 会话状态
    expires_at TIMESTAMP NOT NULL,                  -- 过期时间
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 最后活动时间
    user_agent TEXT,                                -- 用户代理
    ip_address VARCHAR(45),                         -- IP地址
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 创建时间
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP   -- 更新时间
);
```

## 实现流程

### 1. 授权码生成 (`GetOAuthAuthorize`)

```go
// 用户已登录，生成授权码
authorizationCode := generateAuthorizationCode(clientID, userID, redirectURI, scope, codeChallenge, codeChallengeMethod)

// 保存授权码到数据库
ssoSession := &models.SSOSession{
    ID:                     sessionID,
    UserID:                 userID,
    ClientID:               clientID,
    AuthorizationCode:      authorizationCode,
    CodeChallenge:          codeChallenge,
    CodeChallengeMethod:    codeChallengeMethod,
    RedirectURI:            redirectURI,
    Scope:                  scope,
    State:                  state,
    Used:                   false,
    Status:                 "active",
    ExpiresAt:              expiresAt, // 10分钟后过期
    LastActivity:           time.Now(),
    UserAgent:              userAgent,
    IPAddress:              ip,
}

if err := models.CreateSSOSession(db, ssoSession); err != nil {
    return error
}
```

### 2. 授权码验证 (`validateAuthorizationCode`)

```go
// 从数据库查找授权码
var ssoSession models.SSOSession
if err := db.Where("authorization_code = ? AND client_id = ? AND used = ? AND expires_at > ?",
    code, clientID, false, time.Now()).First(&ssoSession).Error; err != nil {
    return error("authorization code not found or expired")
}

// 验证重定向URI
if ssoSession.RedirectURI != redirectURI {
    return error("redirect URI mismatch")
}

// 验证JWT签名
token, err := jwt.Parse(code, verifySignature)
if err != nil {
    return error("invalid signature")
}

// 标记为已使用
if err := models.MarkSSOSessionAsUsed(db, ssoSession.ID); err != nil {
    log error
}
```

## API 接口

### 授权端点
```
GET /oauth/authorize?client_id=xxx&redirect_uri=xxx&response_type=code&scope=openid&state=xxx
```

**响应**: 重定向到 `redirect_uri?code=xxx&state=xxx`

### 令牌端点
```
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=xxx&redirect_uri=xxx&client_id=xxx&client_secret=xxx
```

**响应**:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "eyJhbGciOiJSUzI1NiIs...",
  "scope": "openid profile email"
}
```

## 安全特性

### 1. 防重放攻击
- 授权码使用后立即标记为已使用
- 数据库查询确保只返回未使用的授权码
- JWT过期时间和数据库过期时间双重控制

### 2. 完整性保护
- RSA签名确保授权码内容未被篡改
- 数据库记录验证关键参数（客户端ID、用户ID等）
- 状态参数（state）CSRF保护

### 3. 过期管理
- 授权码10分钟自动过期
- 数据库定期清理过期记录
- 使用后立即失效

### 4. 审计追踪
- 记录完整的授权码生命周期
- 保存IP地址和User-Agent信息
- 便于安全事件调查

## 测试

运行测试脚本验证功能：

```bash
./test-authorization-code.sh
```

测试包括：
- 客户端创建
- 授权码生成
- 授权码验证
- 数据库记录检查
- 清理测试数据

## 性能考虑

### 索引优化
```sql
-- 主要查询索引
CREATE INDEX idx_sso_sessions_auth_code ON sso_sessions(authorization_code);
CREATE INDEX idx_sso_sessions_client_used ON sso_sessions(client_id, used);
CREATE INDEX idx_sso_sessions_expires ON sso_sessions(expires_at);
```

### 清理机制
- 定期删除过期记录
- 限制数据库连接数
- 使用连接池优化性能

## 错误处理

### 常见错误
- `authorization code not found or expired`: 授权码不存在或已过期
- `redirect URI mismatch`: 重定向URI不匹配
- `authorization code is not active`: 授权码状态不活跃
- `user ID mismatch`: 用户ID不匹配
- `invalid signature`: JWT签名无效

### 错误响应
```json
{
  "error": "invalid_grant",
  "error_description": "详细错误信息"
}
```

## 扩展性

### 支持的功能
- ✅ PKCE (Proof Key for Code Exchange)
- ✅ 多种授权类型 (authorization_code, refresh_token, password)
- ✅ 多客户端支持
- ✅ 范围(scope)控制
- ✅ 状态参数(state)支持

### 未来扩展
- 🔄 授权码轮换机制
- 🔄 分布式部署支持
- 🔄 更多OIDC规范特性
- 🔄 审计日志增强

## 总结

这个实现提供了完整的OAuth 2.0授权码数据库存储和验证功能，确保了：

1. **安全性**: 防重放、防篡改、过期控制
2. **完整性**: 数据库和JWT双重验证
3. **可追踪性**: 完整的审计日志
4. **标准化**: 符合OAuth 2.0和OIDC规范
5. **扩展性**: 支持多种授权模式和未来扩展

授权码现在完全通过数据库进行管理，提高了系统的安全性和可靠性。
