让我先分析当前的返回值情况：

[8 tools called]

好的！我来帮你设计一个**统一的 Token 响应规范**。基于当前代码分析，我将创建一个完整的规范文档：

## 📋 SSO Token 响应规范文档

### 一、统一响应结构定义

#### 1.1 成功响应（2xx）

```typescript
interface TokenSuccessResponse {
    // OAuth 2.0 标准字段
    access_token: string           // JWT访问令牌，1小时有效
    refresh_token: string          // JWT刷新令牌，30天有效
    id_token: string               // OpenID Connect ID令牌（目前等同于access_token）
    token_type: "Bearer"           // 固定值
    expires_in: number             // access_token有效期（秒），固定3600
    scope: string                  // 授权范围，固定"openid profile email phone"
    
    // 扩展字段
    user: {                        // 用户信息
        id: string
        username: string
        email: string
        phone?: string
        avatar?: string
        role: string
        created_at: string
    }
    provider: string               // 认证提供者（centralized/github/google等）
    session_id?: string            // Session ID（仅中心登录系统返回，存入cookie）
    session_info?: {               // Session详细信息（仅登录时返回）
        session_id: string
        start_time: string         // ISO 8601格式
        last_activity: string      // ISO 8601格式
        expires_at: string         // ISO 8601格式，1年后
        current_app_id: string
        events: string[]
    }
}
```

#### 1.2 错误响应（4xx/5xx）

```typescript
interface TokenErrorResponse {
    // OAuth 2.0 标准错误字段
    error: string                  // 错误类型（见下表）
    error_description: string      // 人类可读的错误描述
    
    // 扩展字段（用于前端智能处理）
    error_code?: string           // 详细错误码（见下表）
    suggest_action?: string       // 建议前端执行的操作（见下表）
    error_uri?: string            // 错误详情文档链接
}
```

---

### 二、错误码分类体系

#### 2.1 Refresh Token 相关错误

| HTTP状态 | error | error_code | error_description | suggest_action | 前端处理 |
|---------|-------|------------|-------------------|----------------|---------|
| 400 | `invalid_grant` | `REFRESH_TOKEN_INVALID` | Refresh token is invalid or expired | `check_session` | 1. 尝试用session_id恢复<br>2. 失败则跳转登录 |
| 400 | `invalid_grant` | `REFRESH_TOKEN_EXPIRED` | Refresh token has expired | `check_session` | 同上 |
| 400 | `invalid_grant` | `TOKEN_HASH_MISMATCH` | Refresh token not found or session expired | `check_session` | 同上 |
| 400 | `invalid_grant` | `TOKEN_USER_MISMATCH` | Token user mismatch | `relogin` | 立即跳转登录 |
| 401 | `invalid_grant` | `SESSION_INACTIVE` | Session is not active | `relogin` | 立即跳转登录 |
| 401 | `invalid_grant` | `SESSION_EXPIRED` | Session has expired | `relogin` | 立即跳转登录 |
| 401 | `invalid_grant` | `SESSION_NOT_FOUND` | Session not found | `check_session` | 尝试恢复或跳转登录 |
| 401 | `invalid_grant` | `SESSION_REVOKED` | Session has been revoked (强制登出) | `relogin` | 立即跳转登录，显示"已在其他地方登出" |

#### 2.2 Authorization Code 相关错误

| HTTP状态 | error | error_code | error_description | suggest_action | 前端处理 |
|---------|-------|------------|-------------------|----------------|---------|
| 400 | `invalid_grant` | `AUTH_CODE_INVALID` | Authorization code is invalid | `retry_auth` | 重新发起OAuth授权 |
| 400 | `invalid_grant` | `AUTH_CODE_EXPIRED` | Authorization code has expired | `retry_auth` | 重新发起OAuth授权 |
| 400 | `invalid_grant` | `AUTH_CODE_USED` | Authorization code already used | `retry_auth` | 重新发起OAuth授权 |
| 400 | `invalid_request` | `REDIRECT_URI_MISMATCH` | Redirect URI mismatch | `contact_admin` | 显示配置错误，联系管理员 |

#### 2.3 Client 认证错误

| HTTP状态 | error | error_code | error_description | suggest_action | 前端处理 |
|---------|-------|------------|-------------------|----------------|---------|
| 401 | `invalid_client` | `CLIENT_NOT_FOUND` | Client not found | `contact_admin` | 显示配置错误 |
| 401 | `invalid_client` | `CLIENT_SECRET_INVALID` | Invalid client credentials | `contact_admin` | 显示配置错误 |
| 401 | `invalid_client` | `CLIENT_INACTIVE` | Client is not active | `contact_admin` | 显示"应用已停用" |

#### 2.4 用户相关错误

| HTTP状态 | error | error_code | error_description | suggest_action | 前端处理 |
|---------|-------|------------|-------------------|----------------|---------|
| 400 | `invalid_grant` | `USER_NOT_FOUND` | User not found or inactive | `relogin` | 跳转登录 |
| 403 | `access_denied` | `USER_SUSPENDED` | User account is suspended | `contact_admin` | 显示"账号已被停用" |
| 403 | `access_denied` | `USER_DELETED` | User account is deleted | `contact_admin` | 显示"账号已被删除" |

#### 2.5 服务器错误

| HTTP状态 | error | error_code | error_description | suggest_action | 前端处理 |
|---------|-------|------------|-------------------|----------------|---------|
| 500 | `server_error` | `TOKEN_GENERATION_FAILED` | Failed to generate token | `retry` | 提示用户重试 |
| 500 | `server_error` | `DATABASE_ERROR` | Database operation failed | `retry` | 提示用户重试 |
| 503 | `temporarily_unavailable` | `SERVICE_UNAVAILABLE` | Service temporarily unavailable | `retry_later` | 显示"服务暂不可用" |

---

### 三、前端处理流程图

```typescript
// 前端统一错误处理函数
async function handleTokenError(error: TokenErrorResponse): Promise<void> {
    const { error_code, suggest_action } = error
    
    switch (suggest_action) {
        case 'check_session':
            // 1. 尝试用 session_id 恢复登录
            const sessionId = getSessionIdFromCookie()
            if (sessionId) {
                try {
                    await ssoClient.recoverFromSession(sessionId)
                    console.log('✅ 通过session恢复登录成功')
                    return
                } catch (err) {
                    console.log('⚠️ Session恢复失败，跳转登录')
                }
            }
            // 2. 失败则跳转登录
            redirectToLogin()
            break
            
        case 'relogin':
            // 立即跳转登录，清除本地所有认证信息
            clearAllAuthData()
            redirectToLogin()
            break
            
        case 'retry_auth':
            // 重新发起 OAuth 授权流程
            startOAuthFlow()
            break
            
        case 'contact_admin':
            // 显示错误信息，提示联系管理员
            showErrorDialog('配置错误，请联系管理员')
            break
            
        case 'retry':
            // 提示用户重试
            showRetryDialog()
            break
            
        case 'retry_later':
            // 服务暂不可用
            showServiceUnavailableDialog()
            break
            
        default:
            // 未知错误，通用处理
            showGenericErrorDialog(error.error_description)
    }
}
```

---

### 四、关键场景处理

#### 4.1 Refresh Token 刷新流程

```typescript
// 场景1: 正常刷新（Token未过期）
Response: 200 OK
{
    "access_token": "new_access_token",
    "refresh_token": "same_or_new_refresh_token",  // 距离过期<100分钟时会轮换
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": {...}
}

前端处理:
1. 更新 localStorage 中的 token
2. 触发 'auth:token-refreshed' 事件
3. 继续原请求

// 场景2: Refresh Token 过期，但 Session 仍有效
Response: 400 Bad Request
{
    "error": "invalid_grant",
    "error_code": "REFRESH_TOKEN_EXPIRED",
    "error_description": "Refresh token has expired",
    "suggest_action": "check_session"
}

前端处理:
1. 读取 cookie 中的 session_id
2. 调用 /api/v1/auth/oauth/session-check
3. 成功：获取新 token，继续使用
4. 失败：跳转登录页面

// 场景3: Session 已失效（强制登出）
Response: 401 Unauthorized
{
    "error": "invalid_grant",
    "error_code": "SESSION_REVOKED",
    "error_description": "Session has been revoked",
    "suggest_action": "relogin"
}

前端处理:
1. 清除所有本地存储（localStorage、cookie）
2. 触发 'auth:logout' 事件
3. 跳转登录页，显示提示："您已在其他地方登出"
```

#### 4.2 强制登出检测

```typescript
// 问题：当前实现只在 refresh_token 轮换时（距离过期<100分钟）才查 session
// 影响：强制登出最多延迟 29 天 22 小时

// 推荐方案A：每次都验证（牺牲部分性能）
if err := db.Where("refresh_token_hash = ? AND status = ?",
    hash, "active").First(&session).Error; err != nil {
    return {
        "error": "invalid_grant",
        "error_code": "SESSION_REVOKED",
        "suggest_action": "relogin"
    }
}

// 推荐方案B：Redis黑名单（最优）
if redis.Exists("revoked:"+refreshTokenHash) {
    return {
        "error": "invalid_grant",
        "error_code": "SESSION_REVOKED",
        "suggest_action": "relogin"
    }
}
```

---

### 五、实施建议

#### 5.1 后端改造清单

```go
// 1. 定义统一的响应结构
type TokenResponse struct {
    AccessToken  string      `json:"access_token"`
    RefreshToken string      `json:"refresh_token"`
    IDToken      string      `json:"id_token"`
    TokenType    string      `json:"token_type"`
    ExpiresIn    int         `json:"expires_in"`
    Scope        string      `json:"scope"`
    User         *UserInfo   `json:"user"`
    Provider     string      `json:"provider"`
    SessionID    string      `json:"session_id,omitempty"`
    SessionInfo  *SessionInfo `json:"session_info,omitempty"`
}

type ErrorResponse struct {
    Error            string `json:"error"`
    ErrorDescription string `json:"error_description"`
    ErrorCode        string `json:"error_code,omitempty"`
    SuggestAction    string `json:"suggest_action,omitempty"`
    ErrorURI         string `json:"error_uri,omitempty"`
}

// 2. 统一的错误返回函数
func returnError(c *gin.Context, httpStatus int, err, errDesc, errCode, action string) {
    c.JSON(httpStatus, ErrorResponse{
        Error:            err,
        ErrorDescription: errDesc,
        ErrorCode:        errCode,
        SuggestAction:    action,
    })
}

// 3. 使用示例
returnError(c, http.StatusBadRequest, 
    "invalid_grant", 
    "Refresh token is invalid or expired",
    "REFRESH_TOKEN_INVALID",
    "check_session")
```

#### 5.2 前端改造清单

```typescript
// 1. 定义 TypeScript 类型
interface TokenResponse {
    access_token: string
    refresh_token: string
    id_token: string
    token_type: "Bearer"
    expires_in: number
    scope: string
    user: UserInfo
    provider: string
    session_id?: string
    session_info?: SessionInfo
}

interface TokenError {
    error: string
    error_description: string
    error_code?: string
    suggest_action?: 'check_session' | 'relogin' | 'retry_auth' | 'contact_admin' | 'retry' | 'retry_later'
    error_uri?: string
}

// 2. 统一的错误处理中间件
axios.interceptors.response.use(
    response => response,
    async error => {
        if (error.response?.data?.suggest_action) {
            await handleTokenError(error.response.data)
        }
        return Promise.reject(error)
    }
)
```

---

### 六、测试用例

```bash
# 测试1: 正常刷新
curl -X POST /api/v1/auth/oauth/token \
  -d '{"grant_type":"refresh_token","refresh_token":"valid_token",...}'
预期: 200 OK + 新 token

# 测试2: Refresh Token 过期
curl -X POST /api/v1/auth/oauth/token \
  -d '{"grant_type":"refresh_token","refresh_token":"expired_token",...}'
预期: 400 + error_code="REFRESH_TOKEN_EXPIRED" + suggest_action="check_session"

# 测试3: Session 被强制登出
curl -X POST /api/v1/auth/oauth/token \
  -d '{"grant_type":"refresh_token","refresh_token":"revoked_token",...}'
预期: 401 + error_code="SESSION_REVOKED" + suggest_action="relogin"

# 测试4: 无效的 Authorization Code
curl -X POST /api/v1/auth/oauth/token \
  -d '{"grant_type":"authorization_code","code":"invalid_code",...}'
预期: 400 + error_code="AUTH_CODE_INVALID" + suggest_action="retry_auth"
```

---

### 七、文档和监控

#### 7.1 错误码文档
建议在 `/api/v1/auth/docs/error-codes` 提供完整的错误码文档

#### 7.2 监控指标
```
- token_refresh_success_rate: refresh token 成功率
- token_refresh_error_by_code: 按 error_code 统计的错误数
- session_recovery_success_rate: session 恢复成功率
- forced_logout_count: 强制登出次数
```

---

**总结**: 这套规范提供了：
1. ✅ 统一的响应结构
2. ✅ 明确的错误分类
3. ✅ 前端智能处理指引（`suggest_action`）
4. ✅ 完整的错误处理流程
5. ✅ 可测试、可监控的体系

你需要我帮你实施这套规范到代码中吗？（切换到 agent 模式）