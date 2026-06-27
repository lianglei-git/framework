# Token续签功能文档

## 概述

本文档描述了学习类网站的Token续签功能实现，包括长时间会话支持、双Token滑动续期、自动续签中间件等特性。

## �� 功能特性

### 1. 学习类网站优化
- **延长默认token有效期**: 从24小时改为7天（168小时）
- **记住我功能**: 支持30天的长时间会话
- **自动续签**: 在用户活跃时自动续签token
- **双Token机制**: 支持access token和refresh token

### 2. 双Token滑动续期
- **Access Token**: 短期有效（7天），用于API访问
- **Refresh Token**: 长期有效（24小时），用于续签
- **滑动续期**: 每次续签都会生成新的token对
- **安全机制**: refresh token可以随时撤销

### 3. 自动续签中间件
- **智能检测**: 自动检测token是否即将过期
- **无缝续签**: 在响应头中返回新token
- **用户体验**: 用户无感知的续签过程

## �� API接口

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

#### 双Token登录
```http
POST /api/v1/auth/login-with-token-pair
Content-Type: application/json

{
  "account": "user@example.com",
  "password": "password123"
}
```

### 2. Token续签接口

#### 简单续签
```http
POST /api/v1/auth/refresh-token
Authorization: Bearer <access_token>
```

#### 双Token续签
```http
POST /api/v1/auth/refresh-with-refresh-token
Content-Type: application/json

{
  "refresh_token": "<refresh_token>"
}
```

#### Token状态检查
```http
GET /api/v1/auth/token-status
Authorization: Bearer <access_token>
```

## �� 配置说明

### 环境变量配置

```bash
# JWT配置 - 学习类网站优化
JWT_EXPIRATION=168                    # 访问token有效期（小时）- 7天
JWT_REFRESH_EXPIRATION=24             # 刷新token有效期（小时）- 24小时
JWT_REMEMBER_ME_EXPIRATION=720        # 记住我token有效期（小时）- 30天
JWT_SECRET=your-super-secret-jwt-key  # JWT密钥
```

### 配置文件修改

```go
// config/config.go
type Config struct {
    // ... 其他配置 ...
    
    // JWT配置 - 支持双Token扩展
    JWTSecret     string
    JWTExpiration int // 访问token有效期（小时）
    JWTRefreshExpiration int // 刷新token有效期（小时）
    JWTRememberMeExpiration int // 记住我token有效期（小时）
}
```

## ��️ 技术实现

### 1. 增强的JWT工具

```go
// utils/jwt_enhanced.go

// EnhancedClaims 增强的JWT声明
type EnhancedClaims struct {
    UserID    string `json:"user_id"`
    Email     string `json:"email"`
    Role      string `json:"role"`
    TokenType string `json:"token_type"` // "access", "refresh", "remember_me"
    jwt.RegisteredClaims
}

// TokenResponse token响应结构
type TokenResponse struct {
    AccessToken  string `json:"access_token"`
    RefreshToken string `json:"refresh_token,omitempty"`
    TokenType    string `json:"token_type"`
    ExpiresIn    int64  `json:"expires_in"`
    RefreshExpiresIn int64 `json:"refresh_expires_in,omitempty"`
    UserID       string `json:"user_id"`
    Email        string `json:"email"`
    Role         string `json:"role"`
}
```

### 2. 自动续签中间件

```go
// middleware/auto_refresh.go

// AutoRefreshMiddleware 自动续签中间件
func AutoRefreshMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 检查token是否即将过期
        isExpiringSoon, err := utils.IsTokenExpiringSoon(token)
        if err != nil || !isExpiringSoon {
            c.Next()
            return
        }

        // 自动续签token
        tokenResponse, err := utils.ExtendToken(token)
        if err != nil {
            c.Next()
            return
        }

        // 在响应头中返回新的token
        c.Header("X-New-Token", tokenResponse.AccessToken)
        c.Header("X-Token-Expires-In", fmt.Sprintf("%d", tokenResponse.ExpiresIn))

        c.Next()
    }
}
```

### 3. Token续签处理器

```go
// handlers/token_refresh.go

// RefreshToken 续签token
func RefreshToken() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 从请求头获取当前token
        authHeader := c.GetHeader("Authorization")
        token := extractToken(authHeader)

        // 续签token
        tokenResponse, err := utils.ExtendToken(token)
        if err != nil {
            c.JSON(http.StatusUnauthorized, models.Response{
                Code:    401,
                Message: "Failed to refresh token: " + err.Error(),
            })
            return
        }

        c.JSON(http.StatusOK, models.Response{
            Code:    200,
            Message: "Token refreshed successfully",
            Data:    tokenResponse,
        })
    }
}
```

## 🧪 测试

### 运行测试脚本

```bash
# 运行Token续签功能测试
./test_token_refresh.sh

# 测试特定功能
./test_token_refresh.sh --test basic_login
./test_token_refresh.sh --test remember_me
./test_token_refresh.sh --test token_pair
```

### 测试覆盖范围

1. **基础登录测试**: 验证7天token生成
2. **记住我登录测试**: 验证30天token生成
3. **双Token登录测试**: 验证access token和refresh token生成
4. **Token状态检查**: 验证token有效期检查
5. **简单续签测试**: 验证token续签功能
6. **双Token续签测试**: 验证refresh token续签
7. **自动续签中间件**: 验证自动续签功能
8. **Token过期处理**: 验证过期token处理
9. **长时间会话**: 验证30天token有效性
10. **双Token滑动续期**: 验证多次续签功能

## �� 安全考虑

### 1. Token安全
- **短期Access Token**: 减少token泄露风险
- **长期Refresh Token**: 支持长时间会话
- **自动续签**: 减少用户中断
- **Token撤销**: 支持refresh token撤销

### 2. 学习类网站优化
- **长时间会话**: 适合学习场景的长时间使用
- **自动续签**: 减少学习中断
- **记住我功能**: 支持30天免登录
- **滑动续期**: 保持会话连续性

## �� 性能优化

### 1. 缓存策略
- **Token缓存**: 减少数据库查询
- **用户信息缓存**: 提高响应速度
- **续签缓存**: 避免重复续签

### 2. 并发处理
- **无锁设计**: 避免并发冲突
- **原子操作**: 确保数据一致性
- **错误恢复**: 支持续签失败重试

## �� 部署指南

### 1. 环境准备
```bash
# 安装依赖
go mod tidy

# 配置环境变量
cp env.example .env
# 编辑.env文件，配置JWT相关参数
```

### 2. 启动服务
```bash
# 开发模式
go run main.go

# 生产模式
go build -o unit-auth
./unit-auth
```

### 3. 验证部署
```bash
# 健康检查
curl http://localhost:8080/health

# 测试Token续签功能
./test_token_refresh.sh
```

## 🔮 扩展计划

### 1. 双Token滑动续期扩展
- [ ] 支持refresh token轮换
- [ ] 实现token黑名单机制
- [ ] 添加token使用统计
- [ ] 支持多设备登录管理

### 2. 学习类网站优化
- [ ] 支持学习进度同步
- [ ] 实现离线学习模式
- [ ] 添加学习提醒功能
- [ ] 支持学习数据分析

### 3. 安全增强
- [ ] 实现token加密存储
- [ ] 添加设备指纹验证
- [ ] 支持地理位置限制
- [ ] 实现异常登录检测

## 📝 总结

Token续签功能为学习类网站提供了：

1. **长时间会话支持**: 7天默认token + 30天记住我
2. **双Token机制**: access token + refresh token
3. **自动续签**: 用户无感知的续签体验
4. **滑动续期**: 保持会话连续性
5. **安全机制**: 多层安全保护

这个实现特别适合学习类网站，因为：
- 用户通常需要长时间的学习会话
- 自动续签减少了用户的中断
- 记住我功能让用户不用频繁登录
- 7天的默认有效期平衡了安全性和便利性

通过预留的扩展接口，可以轻松实现双Token滑动续期等高级功能。