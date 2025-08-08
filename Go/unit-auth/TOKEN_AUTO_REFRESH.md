# Token自动续期功能文档

## 概述

本文档描述了学习类网站的Token自动续期功能实现，包括长时间会话支持、自动续签中间件、手动续签API等特性。该功能专为学习类网站设计，提供更长的会话保持时间和更好的用户体验。

## 🎯 功能特性

### 1. 学习类网站优化
- **延长默认token有效期**: 从24小时改为7天（168小时）
- **记住我功能**: 支持30天的长时间会话（720小时）
- **自动续签**: 在用户活跃时自动续签即将过期的token
- **向后兼容**: 保持与现有API的兼容性

### 2. 自动续签机制
- **智能检测**: 自动检测token是否即将过期（提前1小时）
- **无缝续签**: 在响应头中返回新token，用户无感知
- **错误处理**: 续签失败时不影响正常请求处理
- **状态标记**: 在响应头中标记自动续签状态

### 3. 手动续签支持
- **主动续签**: 客户端可以主动调用续签API
- **记住我续签**: 支持记住我token的续签
- **状态检查**: 提供token状态查询功能
- **错误处理**: 完善的错误处理和响应

## 🔧 技术实现

### 1. 配置文件增强

```go
// config/config.go
type Config struct {
    // JWT配置 - 支持学习类网站长时间会话
    JWTSecret               string
    JWTExpiration           int // 访问token有效期（小时）- 7天
    JWTRefreshExpiration    int // 刷新token有效期（小时）- 24小时
    JWTRememberMeExpiration int // 记住我token有效期（小时）- 30天
}
```

### 2. 增强的JWT工具

```go
// utils/jwt_enhanced.go
type EnhancedClaims struct {
    UserID    string `json:"user_id"`
    Email     string `json:"email"`
    Role      string `json:"role"`
    TokenType string `json:"token_type"` // "access", "refresh", "remember_me"
    jwt.RegisteredClaims
}

// 主要函数
func GenerateAccessToken(userID string, email, role string) (string, error)
func GenerateRememberMeToken(userID string, email, role string) (string, error)
func ExtendToken(tokenString string) (*TokenResponse, error)
func IsTokenExpiringSoon(tokenString string) (bool, error)
func GetTokenExpirationTime(tokenString string) (*time.Time, error)
```

### 3. 自动续签中间件

```go
// middleware/auto_refresh.go
func AutoRefreshMiddleware() gin.HandlerFunc
func TokenStatusMiddleware() gin.HandlerFunc
func RememberMeMiddleware() gin.HandlerFunc
```

### 4. Token续签处理器

```go
// handlers/token_refresh.go
func RefreshToken() gin.HandlerFunc                    // 简单续签
func RefreshTokenWithRefreshToken() gin.HandlerFunc    // 双Token续签
func CheckTokenStatus() gin.HandlerFunc                // 检查token状态
func LoginWithRememberMe(db *gorm.DB) gin.HandlerFunc // 记住我登录
func LoginWithTokenPair(db *gorm.DB) gin.HandlerFunc  // 双Token登录
```

## 📡 API接口

### 1. 基础登录接口

#### 统一登录
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "account": "user@example.com",
  "password": "password123"
}
```

#### 记住我登录
```http
POST /api/v1/auth/login-with-remember
Content-Type: application/json

{
  "account": "user@example.com",
  "password": "password123",
  "remember_me": true
}
```

### 2. Token续签接口

#### 简单续签
```http
POST /api/v1/auth/refresh-token
Authorization: Bearer <current_token>
```

**响应示例**:
```json
{
  "code": 200,
  "message": "Token refreshed successfully",
  "data": {
    "access_token": "new_token_here",
    "token_type": "Bearer",
    "expires_in": 604800,
    "user_id": "user_id",
    "email": "user@example.com",
    "role": "user"
  }
}
```

#### 双Token续签
```http
POST /api/v1/auth/refresh-with-refresh-token
Content-Type: application/json

{
  "refresh_token": "refresh_token_here"
}
```

### 3. Token状态检查

#### 检查token状态
```http
GET /api/v1/auth/token-status
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "code": 200,
  "message": "Token status retrieved successfully",
  "data": {
    "user_id": "user_id",
    "email": "user@example.com",
    "role": "user",
    "token_type": "access",
    "expires_at": "2025-08-12T13:30:00Z",
    "remaining_hours": 167,
    "remaining_minutes": 30,
    "is_expiring_soon": false,
    "is_valid": true
  }
}
```

## 🔄 自动续签机制

### 1. 工作原理

自动续签中间件会在每个请求中检查token状态：

1. **检查Authorization头**: 验证是否包含有效的Bearer token
2. **验证token有效性**: 确保token格式正确且未过期
3. **检查过期时间**: 判断是否在1小时内过期
4. **自动续签**: 如果即将过期，自动生成新token
5. **响应头标记**: 在响应头中返回新token和状态信息

### 2. 响应头信息

当自动续签发生时，响应头会包含以下信息：

```
X-New-Token: <new_token>
X-Token-Expires-In: <expires_in_seconds>
X-Token-Type: Bearer
X-Token-Auto-Refreshed: true
```

### 3. 状态检查响应头

每次请求都会在响应头中包含token状态信息：

```
X-Token-Expires-At: 2025-08-12T13:30:00Z
X-Token-Expiring-Soon: true/false
X-Token-Remember-Me: true (如果是记住我token)
X-Token-Long-Session: true (如果是长时间会话)
```

## 🚀 使用方法

### 1. 服务器配置

在`main.go`中启用自动续签中间件：

```go
// 启用自动续签中间件
r.Use(middleware.AutoRefreshMiddleware())

// 认证路由
auth := api.Group("/auth")
{
    auth.POST("/refresh-token", handlers.RefreshToken())
    auth.GET("/token-status", handlers.CheckTokenStatus())
    auth.POST("/login-with-remember", handlers.LoginWithRememberMe(db))
}
```

### 2. 客户端使用

#### 基础登录
```javascript
// 普通登录
const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        account: 'user@example.com',
        password: 'password123'
    })
});

const { token } = await response.json();
```

#### 记住我登录
```javascript
// 记住我登录
const response = await fetch('/api/v1/auth/login-with-remember', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        account: 'user@example.com',
        password: 'password123',
        remember_me: true
    })
});

const { token } = await response.json();
```

#### 处理自动续签
```javascript
// 发送API请求
const response = await fetch('/api/v1/user/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
});

// 检查是否有新token
const newToken = response.headers.get('X-New-Token');
if (newToken) {
    // 更新本地存储的token
    localStorage.setItem('token', newToken);
    console.log('Token已自动续签');
}
```

#### 手动续签
```javascript
// 手动续签token
const response = await fetch('/api/v1/auth/refresh-token', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
});

const { access_token } = await response.json();
localStorage.setItem('token', access_token);
```

#### 检查token状态
```javascript
// 检查token状态
const response = await fetch('/api/v1/auth/token-status', {
    headers: { 'Authorization': `Bearer ${token}` }
});

const status = await response.json();
console.log('剩余小时:', status.data.remaining_hours);
console.log('是否即将过期:', status.data.is_expiring_soon);
```

## ⚙️ 配置选项

### 1. 环境变量

```bash
# Token有效期配置
JWT_EXPIRATION=168                    # 访问token有效期（小时）- 7天
JWT_REFRESH_EXPIRATION=24             # 刷新token有效期（小时）- 24小时
JWT_REMEMBER_ME_EXPIRATION=720        # 记住我token有效期（小时）- 30天
JWT_SECRET=your_jwt_secret_here       # JWT密钥
```

### 2. 推荐配置

对于学习类网站，推荐以下配置：

```go
// 学习类网站推荐配置
JWTExpiration:           168,  // 7天 - 适合长时间学习
JWTRefreshExpiration:    24,   // 24小时 - 刷新token
JWTRememberMeExpiration: 720,  // 30天 - 记住我功能
```

## 🧪 测试

### 1. 简化测试

```bash
# 运行简化测试
./test_token_simple.sh
```

### 2. 完整测试

```bash
# 运行完整测试
./test_token_auto_refresh.sh
```

### 3. 测试内容

- ✅ 基础登录获取token
- ✅ 记住我登录功能
- ✅ Token状态检查
- ✅ 手动token续签
- ✅ 记住我token续签
- ✅ 自动续签中间件
- ✅ 错误处理机制
- ✅ 配置验证

## 🔒 安全考虑

### 1. Token安全
- **密钥管理**: 使用强密钥并定期轮换
- **HTTPS传输**: 确保所有token传输使用HTTPS
- **存储安全**: 客户端安全存储token
- **过期处理**: 及时处理过期token

### 2. 续签安全
- **频率限制**: 防止续签API被滥用
- **验证机制**: 确保只有有效token才能续签
- **日志记录**: 记录所有续签操作
- **监控告警**: 监控异常的续签行为

### 3. 自动续签安全
- **提前时间**: 只在即将过期时续签
- **失败处理**: 续签失败不影响正常请求
- **状态标记**: 明确标记自动续签状态
- **错误恢复**: 提供手动续签作为备选

## 📊 监控和日志

### 1. 监控指标

```go
// 建议监控的指标
type TokenMetrics struct {
    TotalRefreshAttempts    int64
    SuccessfulRefreshes     int64
    FailedRefreshes         int64
    AutoRefreshCount        int64
    RememberMeUsage         int64
    TokenExpirationEvents   int64
}
```

### 2. 日志记录

```go
// 记录续签操作
log.Info("Token refresh", 
    "user_id", claims.UserID,
    "token_type", claims.TokenType,
    "auto_refresh", isAutoRefresh,
    "expires_in", tokenResponse.ExpiresIn)
```

## 🚀 最佳实践

### 1. 客户端实现

```javascript
// 推荐的客户端token管理
class TokenManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.setupAutoRefresh();
    }
    
    setupAutoRefresh() {
        // 监听响应头中的新token
        this.interceptor = axios.interceptors.response.use(
            response => {
                const newToken = response.headers['x-new-token'];
                if (newToken) {
                    this.updateToken(newToken);
                }
                return response;
            }
        );
    }
    
    updateToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }
    
    async refreshToken() {
        try {
            const response = await axios.post('/api/v1/auth/refresh-token', {}, {
                headers: { Authorization: `Bearer ${this.token}` }
            });
            this.updateToken(response.data.access_token);
            return response.data.access_token;
        } catch (error) {
            // 处理续签失败
            this.logout();
            throw error;
        }
    }
}
```

### 2. 服务器配置

```go
// 推荐的中间件配置
func setupTokenMiddleware(r *gin.Engine) {
    // 自动续签中间件（全局）
    r.Use(middleware.AutoRefreshMiddleware())
    
    // Token状态中间件（可选）
    r.Use(middleware.TokenStatusMiddleware())
    
    // 记住我中间件（可选）
    r.Use(middleware.RememberMeMiddleware())
}
```

## 📝 总结

Token自动续期功能为学习类网站提供了：

1. **长时间会话支持**: 7天访问token + 30天记住我token
2. **自动续签机制**: 用户无感知的token续签
3. **手动续签API**: 客户端主动续签能力
4. **状态检查功能**: 实时token状态监控
5. **错误处理机制**: 完善的错误处理和恢复
6. **向后兼容性**: 保持与现有系统的兼容

该功能特别适合学习类网站，能够显著提升用户体验，减少因token过期导致的学习中断。 