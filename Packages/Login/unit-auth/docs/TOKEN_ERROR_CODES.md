# Token 错误码参考文档

本文档定义了所有 OAuth 2.0 Token 相关的错误码、错误类型及其处理方式。

## 📋 目录

- [响应格式](#响应格式)
- [错误分类](#错误分类)
- [前端处理流程](#前端处理流程)
- [错误码详细列表](#错误码详细列表)
- [示例代码](#示例代码)

---

## 响应格式

### 成功响应（200 OK）

```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "id_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid profile email phone",
  "user": {
    "id": "user123",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user"
  },
  "provider": "centralized",
  "session_id": "session_abc123",
  "session_info": {
    "session_id": "session_abc123",
    "start_time": "2025-10-29T10:00:00Z",
    "last_activity": "2025-10-29T10:00:00Z",
    "expires_at": "2026-10-29T10:00:00Z",
    "current_app_id": "app1",
    "events": ["login"]
  }
}
```

### 错误响应（4xx / 5xx）

```json
{
  "error": "invalid_grant",
  "error_description": "Refresh token is invalid or expired",
  "error_code": "REFRESH_TOKEN_INVALID",
  "suggest_action": "check_session",
  "error_uri": "https://docs.example.com/errors/REFRESH_TOKEN_INVALID"
}
```

---

## 错误分类

### OAuth 2.0 标准错误类型

| error | 描述 | HTTP状态 |
|-------|------|---------|
| `invalid_request` | 请求缺少必需参数或参数格式错误 | 400 |
| `invalid_client` | 客户端认证失败 | 401 |
| `invalid_grant` | 授权无效、过期或已被撤销 | 400/401 |
| `unauthorized_client` | 客户端无权使用此授权方式 | 401 |
| `unsupported_grant_type` | 不支持的授权类型 | 400 |
| `invalid_scope` | 请求的作用域无效 | 400 |
| `access_denied` | 用户或授权服务器拒绝请求 | 403 |
| `server_error` | 服务器内部错误 | 500 |
| `temporarily_unavailable` | 服务暂时不可用 | 503 |

### 建议操作类型

| suggest_action | 描述 | 前端处理 |
|---------------|------|---------|
| `check_session` | 尝试用 session_id 恢复 | 调用 `/session-check` 接口 |
| `relogin` | 立即跳转登录 | 清除本地数据，跳转登录页 |
| `retry_auth` | 重新发起OAuth授权 | 重新发起授权流程 |
| `contact_admin` | 联系管理员 | 显示错误提示，提供联系方式 |
| `retry` | 重试请求 | 延迟后重试原请求 |
| `retry_later` | 稍后重试 | 提示用户稍后再试 |

---

## 前端处理流程

```typescript
async function handleTokenError(error: TokenErrorResponse) {
    const { error_code, suggest_action } = error
    
    switch (suggest_action) {
        case 'check_session':
            // 1. 尝试用 session_id 恢复
            const sessionId = getSessionIdFromCookie()
            if (sessionId) {
                try {
                    await ssoClient.recoverFromSession(sessionId)
                    return // 恢复成功
                } catch (err) {
                    // 恢复失败，继续登出
                }
            }
            // 2. 失败则跳转登录
            redirectToLogin()
            break
            
        case 'relogin':
            // 立即跳转登录
            clearAllAuthData()
            redirectToLogin()
            break
            
        case 'retry_auth':
            // 重新发起 OAuth 授权
            startOAuthFlow()
            break
            
        case 'contact_admin':
            // 显示错误信息
            showError('配置错误，请联系管理员')
            break
            
        case 'retry':
            // 重试请求
            await retryOriginalRequest()
            break
            
        case 'retry_later':
            // 提示稍后重试
            showError('服务暂不可用，请稍后再试')
            break
    }
}
```

---

## 错误码详细列表

### 1. Refresh Token 相关错误

#### REFRESH_TOKEN_INVALID
- **HTTP状态**: 400 Bad Request
- **error**: `invalid_grant`
- **error_description**: "Refresh token is invalid or expired"
- **suggest_action**: `check_session`
- **触发场景**: 
  - Refresh token JWT 签名验证失败
  - Token 格式错误
- **前端处理**:
  1. 尝试用 session_id 恢复
  2. 失败则跳转登录

---

#### REFRESH_TOKEN_EXPIRED
- **HTTP状态**: 400 Bad Request
- **error**: `invalid_grant`
- **error_description**: "Refresh token has expired"
- **suggest_action**: `check_session`
- **触发场景**: 
  - Refresh token 超过 30 天有效期
- **前端处理**:
  1. 尝试用 session_id 恢复
  2. 失败则跳转登录

---

#### TOKEN_HASH_MISMATCH
- **HTTP状态**: 400 Bad Request
- **error**: `invalid_grant`
- **error_description**: "Refresh token not found or session expired"
- **suggest_action**: `check_session`
- **触发场景**: 
  - 数据库中找不到对应的 refresh_token_hash
  - Session 已过期
- **前端处理**:
  1. 尝试用 session_id 恢复
  2. 失败则跳转登录

---

#### TOKEN_USER_MISMATCH
- **HTTP状态**: 400 Bad Request
- **error**: `invalid_grant`
- **error_description**: "Token user mismatch"
- **suggest_action**: `relogin`
- **触发场景**: 
  - Token 中的 user_id 与 session 中的 user_id 不匹配
  - 数据不一致（安全问题）
- **前端处理**:
  - 立即清除本地数据
  - 跳转登录页面

---

### 2. Session 相关错误

#### SESSION_INACTIVE
- **HTTP状态**: 401 Unauthorized
- **error**: `invalid_grant`
- **error_description**: "Session is not active"
- **suggest_action**: `relogin`
- **触发场景**: 
  - Session 状态不是 `active`
- **前端处理**:
  - 清除本地数据
  - 跳转登录页面

---

#### SESSION_EXPIRED
- **HTTP状态**: 401 Unauthorized
- **error**: `invalid_grant`
- **error_description**: "Session has expired"
- **suggest_action**: `relogin`
- **触发场景**: 
  - Session 的 `expires_at` 已过期
- **前端处理**:
  - 清除本地数据
  - 跳转登录页面

---

#### SESSION_NOT_FOUND
- **HTTP状态**: 401 Unauthorized
- **error**: `invalid_grant`
- **error_description**: "Session not found"
- **suggest_action**: `check_session`
- **触发场景**: 
  - 数据库中找不到对应的 session 记录
- **前端处理**:
  1. 尝试用 session_id 恢复
  2. 失败则跳转登录

---

#### SESSION_REVOKED
- **HTTP状态**: 401 Unauthorized
- **error**: `invalid_grant`
- **error_description**: "Session has been revoked (forced logout)"
- **suggest_action**: `relogin`
- **触发场景**: 
  - 管理员强制登出
  - 用户在其他设备登出
- **前端处理**:
  - 清除本地数据
  - 显示提示："您已在其他地方登出"
  - 跳转登录页面

---

### 3. Authorization Code 相关错误

#### AUTH_CODE_INVALID
- **HTTP状态**: 400 Bad Request
- **error**: `invalid_grant`
- **error_description**: "Authorization code is invalid"
- **suggest_action**: `retry_auth`
- **触发场景**: 
  - 授权码不存在或格式错误
- **前端处理**:
  - 重新发起 OAuth 授权流程

---

#### AUTH_CODE_EXPIRED
- **HTTP状态**: 400 Bad Request
- **error**: `invalid_grant`
- **error_description**: "Authorization code has expired"
- **suggest_action**: `retry_auth`
- **触发场景**: 
  - 授权码超过 10 分钟有效期
- **前端处理**:
  - 重新发起 OAuth 授权流程

---

#### AUTH_CODE_USED
- **HTTP状态**: 400 Bad Request
- **error**: `invalid_grant`
- **error_description**: "Authorization code already used"
- **suggest_action**: `retry_auth`
- **触发场景**: 
  - 授权码已被使用过（防重放）
- **前端处理**:
  - 重新发起 OAuth 授权流程

---

#### REDIRECT_URI_MISMATCH
- **HTTP状态**: 400 Bad Request
- **error**: `invalid_grant`
- **error_description**: "Redirect URI mismatch"
- **suggest_action**: `contact_admin`
- **触发场景**: 
  - 回调 URI 与注册的不匹配
- **前端处理**:
  - 显示配置错误提示
  - 提供管理员联系方式

---

### 4. Client 认证错误

#### CLIENT_NOT_FOUND
- **HTTP状态**: 401 Unauthorized
- **error**: `invalid_client`
- **error_description**: "Client not found"
- **suggest_action**: `contact_admin`
- **触发场景**: 
  - client_id 不存在
- **前端处理**:
  - 显示配置错误提示

---

#### CLIENT_SECRET_INVALID
- **HTTP状态**: 401 Unauthorized
- **error**: `invalid_client`
- **error_description**: "Invalid client credentials"
- **suggest_action**: `contact_admin`
- **触发场景**: 
  - client_secret 错误
- **前端处理**:
  - 显示配置错误提示

---

#### CLIENT_INACTIVE
- **HTTP状态**: 401 Unauthorized
- **error**: `invalid_client`
- **error_description**: "Client is not active"
- **suggest_action**: `contact_admin`
- **触发场景**: 
  - 应用已被停用
- **前端处理**:
  - 显示"应用已停用"提示

---

### 5. User 相关错误

#### USER_NOT_FOUND
- **HTTP状态**: 400 Bad Request
- **error**: `invalid_grant`
- **error_description**: "User not found or inactive"
- **suggest_action**: `relogin`
- **触发场景**: 
  - 用户不存在或未激活
- **前端处理**:
  - 跳转登录页面

---

#### USER_SUSPENDED
- **HTTP状态**: 403 Forbidden
- **error**: `access_denied`
- **error_description**: "User account is suspended"
- **suggest_action**: `contact_admin`
- **触发场景**: 
  - 用户账号被暂停
- **前端处理**:
  - 显示"账号已被停用"
  - 提供申诉渠道

---

#### USER_DELETED
- **HTTP状态**: 403 Forbidden
- **error**: `access_denied`
- **error_description**: "User account is deleted"
- **suggest_action**: `contact_admin`
- **触发场景**: 
  - 用户账号被删除
- **前端处理**:
  - 显示"账号已被删除"

---

### 6. 服务器错误

#### TOKEN_GENERATION_FAILED
- **HTTP状态**: 500 Internal Server Error
- **error**: `server_error`
- **error_description**: "Failed to generate token"
- **suggest_action**: `retry`
- **触发场景**: 
  - JWT 签名失败
  - RSA 密钥错误
- **前端处理**:
  - 延迟后自动重试
  - 失败提示用户

---

#### DATABASE_ERROR
- **HTTP状态**: 500 Internal Server Error
- **error**: `server_error`
- **error_description**: "Database operation failed"
- **suggest_action**: `retry`
- **触发场景**: 
  - 数据库连接失败
  - SQL 执行错误
- **前端处理**:
  - 延迟后自动重试
  - 失败提示用户

---

#### SERVICE_UNAVAILABLE
- **HTTP状态**: 503 Service Unavailable
- **error**: `temporarily_unavailable`
- **error_description**: "Service temporarily unavailable"
- **suggest_action**: `retry_later`
- **触发场景**: 
  - 服务维护中
  - 负载过高
- **前端处理**:
  - 显示"服务暂不可用"
  - 提示稍后再试

---

## 示例代码

### 后端返回错误

```go
// Go - 使用统一的错误返回函数
utils.ReturnRefreshTokenInvalid(c)

// 等价于
c.JSON(http.StatusBadRequest, models.TokenErrorResponse{
    Error:            "invalid_grant",
    ErrorDescription: "Refresh token is invalid or expired",
    ErrorCode:        "REFRESH_TOKEN_INVALID",
    SuggestAction:    "check_session",
})
```

### 前端处理错误

```typescript
// TypeScript - 使用统一的错误处理器
import { handleTokenError } from '@/utils/tokenErrorHandler'

try {
    const response = await fetch('/api/v1/auth/oauth/token', {
        method: 'POST',
        body: JSON.stringify(tokenRequest)
    })
    
    if (!response.ok) {
        const error: TokenErrorResponse = await response.json()
        
        // 统一错误处理
        const handled = await handleTokenError(error, {
            onCheckSession: async () => {
                await ssoClient.recoverFromSession(sessionId)
            },
            onRelogin: () => {
                navigate('/login')
            },
            onShowError: (message, severity) => {
                toast[severity](message)
            }
        })
        
        if (!handled) {
            console.error('未处理的错误:', error)
        }
    }
} catch (err) {
    console.error('网络错误:', err)
}
```

---

## 监控建议

### 关键指标

1. **错误率统计**
   ```
   - refresh_token_error_rate: Refresh token 错误率
   - session_revoked_count: 强制登出次数
   - auth_code_invalid_rate: 授权码错误率
   ```

2. **错误分布**
   ```sql
   SELECT error_code, COUNT(*) as count 
   FROM token_error_logs 
   WHERE created_at > NOW() - INTERVAL 1 DAY
   GROUP BY error_code
   ORDER BY count DESC
   ```

3. **告警阈值**
   - 错误率 > 5%: 警告
   - 错误率 > 10%: 严重
   - 数据库错误 > 100次/小时: 严重

---

## 更新日志

- **2025-10-29**: 初始版本发布
- 定义了所有错误码和处理流程
- 提供了完整的前后端示例代码

---

## 相关文档

- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [Token 响应规范](./TOKEN_RESPONSE_SPEC.md)
- [Session 管理指南](./SESSION_MANAGEMENT.md)
- [前端集成指南](./FRONTEND_INTEGRATION.md)

