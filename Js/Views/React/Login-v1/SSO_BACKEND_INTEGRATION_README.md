# Login-v1 前端与 Unit Auth 后端 SSO 集成指南

## 🎯 集成概述

本指南详细说明了如何将Login-v1前端项目与Unit Auth后端SSO系统进行集成，实现完整的单点登录功能。

## 📋 集成要求

### 前置条件
- ✅ Unit Auth后端服务已启动并运行
- ✅ 前端项目已配置正确的环境变量
- ✅ 数据库中已存在SSO客户端配置

### 兼容性
- ✅ **前端**: Login-v1项目（React + TypeScript + MobX）
- ✅ **后端**: Unit Auth SSO系统（Go + Gin + GORM）
- ✅ **协议**: OAuth 2.0 + OpenID Connect

## 🔧 配置步骤

### 1. 环境变量配置

在前端项目根目录创建 `.env.local` 文件：

```bash
# SSO服务器配置 - 连接到unit-auth后端
VITE_SSO_SERVER_URL=http://localhost:8080
VITE_SSO_CLIENT_ID=default-client
VITE_SSO_CLIENT_SECRET=default-client-secret
VITE_SSO_REDIRECT_URI=http://localhost:3000/auth/callback
VITE_SSO_SCOPE=openid profile email phone
VITE_SSO_RESPONSE_TYPE=code
VITE_SSO_GRANT_TYPE=authorization_code

# 会话配置
VITE_SSO_SESSION_TIMEOUT=3600
VITE_SSO_AUTO_REFRESH=true
VITE_SSO_REFRESH_THRESHOLD=300
VITE_SSO_REMEMBER_ME=false

# 存储配置
VITE_SSO_STORAGE_TYPE=localStorage
VITE_SSO_STORAGE_PREFIX=sso_

# 端点配置
VITE_SSO_ENDPOINT_AUTHORIZATION=/oauth/authorize
VITE_SSO_ENDPOINT_TOKEN=/oauth/token
VITE_SSO_ENDPOINT_USERINFO=/oauth/userinfo
VITE_SSO_ENDPOINT_LOGOUT=/oauth/logout
VITE_SSO_ENDPOINT_CHECK_SESSION=/oauth/check_session
VITE_SSO_ENDPOINT_REFRESH_TOKEN=/oauth/token
VITE_SSO_ENDPOINT_REVOKE_TOKEN=/oauth/revoke
VITE_SSO_ENDPOINT_INTROSPECT_TOKEN=/oauth/introspect
```

### 2. 启动后端服务

确保Unit Auth后端服务正在运行：

```bash
cd /path/to/unit-auth
./unit-auth
```

验证服务状态：
```bash
curl http://localhost:8080/health
```

### 3. 验证SSO配置

检查OpenID Connect发现端点：
```bash
curl http://localhost:8080/.well-known/openid_configuration
```

检查JWK端点：
```bash
curl http://localhost:8080/.well-known/jwks.json
```

### 4. 启动前端项目

```bash
cd /path/to/login-v1
npm run dev
# 或
yarn dev
```

## 🔄 认证流程

### 1. 用户登录流程

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   前端应用  │    │  Unit Auth   │    │   用户数据  │
│  (Login-v1) │◄──►│   后端SSO   │◄──►│   数据库   │
└─────────────┘    └──────────────┘    └─────────────┘
       │                   │                   │
       │ 1. 用户点击登录   │                   │
       │------------------->│                   │
       │                   │ 2. 重定向到授权端点│
       │                   │------------------->│
       │ 3. 显示登录页面   │                   │
       │<-------------------│                   │
       │ 4. 用户输入凭据   │                   │
       │------------------->│                   │
       │                   │ 5. 验证用户凭据   │
       │                   │------------------->│
       │                   │ 6. 创建会话并生成│
       │                   │    授权码         │
       │<-------------------│                   │
       │ 7. 重定向回前端   │                   │
       │<-------------------│                   │
       │ 8. 使用授权码换取│                   │
       │    访问令牌       │                   │
       │------------------->│                   │
       │                   │ 9. 返回访问令牌   │
       │<-------------------│                   │
       │ 10. 获取用户信息  │                   │
       │------------------->│                   │
       │                   │ 11. 返回用户信息  │
       │<-------------------│                   │
       │ 12. 登录成功      │                   │
       └───────────────────┘                   │
```

### 2. OAuth 2.0 授权码流程

#### 步骤1: 用户访问前端应用
用户访问Login-v1前端应用，点击登录按钮。

#### 步骤2: 重定向到SSO授权端点
前端调用SSO服务的`buildAuthorizationUrl`方法，构建授权URL并重定向：

```javascript
const authUrl = ssoService.buildAuthorizationUrl('local', {
    redirect_uri: 'http://localhost:3000/auth/callback',
    scope: 'openid profile email'
})
window.location.href = authUrl
```

#### 步骤3: 用户在SSO系统登录
Unit Auth后端显示登录页面，用户输入用户名和密码。

#### 步骤4: 后端验证并生成授权码
后端验证用户凭据，创建SSO会话，生成授权码。

#### 步骤5: 回调前端应用
后端重定向回前端，携带授权码：

```http
http://localhost:3000/auth/callback?code=abc123&state=xyz789
```

#### 步骤6: 前端换取访问令牌
前端使用授权码调用令牌端点：

```javascript
const tokenResponse = await fetch('http://localhost:8080/oauth/token', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: 'default-client',
        client_secret: 'default-client-secret',
        code: 'abc123',
        redirect_uri: 'http://localhost:3000/auth/callback'
    })
})
```

#### 步骤7: 获取用户信息
前端使用访问令牌获取用户信息：

```javascript
const userResponse = await fetch('http://localhost:8080/oauth/userinfo', {
    headers: {
        'Authorization': `Bearer ${accessToken}`
    }
})
```

## 🧪 测试集成

### 1. 运行集成测试

```bash
cd /path/to/login-v1
node test-sso-integration.js
```

### 2. 手动测试步骤

#### 测试1: 后端服务健康检查
```bash
curl http://localhost:8080/health
```

#### 测试2: OpenID Connect配置
```bash
curl http://localhost:8080/.well-known/openid_configuration | jq .
```

#### 测试3: JWK端点
```bash
curl http://localhost:8080/.well-known/jwks.json | jq .
```

#### 测试4: 令牌端点
```bash
curl -X POST http://localhost:8080/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=default-client&client_secret=default-client-secret"
```

## 🔧 故障排除

### 1. 配置问题

**问题**: `SSO配置验证失败`
**解决**:
- 检查 `.env.local` 文件中的配置项
- 确保 `VITE_SSO_SERVER_URL` 指向正确的后端地址
- 验证客户端ID和密钥是否正确

### 2. 网络连接问题

**问题**: `无法连接到后端服务`
**解决**:
- 检查后端服务是否在 `http://localhost:8080` 运行
- 确认防火墙设置
- 检查CORS配置

### 3. 授权流程问题

**问题**: `授权码验证失败`
**解决**:
- 检查重定向URI是否与配置一致
- 验证客户端配置是否正确
- 检查state参数是否匹配

### 4. 令牌问题

**问题**: `令牌验证失败`
**解决**:
- 检查访问令牌是否过期
- 验证令牌格式是否正确
- 确认JWK端点返回的公钥是否正确

## 📊 监控和日志

### 1. 前端日志
在浏览器开发者工具的Console中查看：
- SSO服务初始化日志
- 认证流程日志
- 错误信息

### 2. 后端日志
在Unit Auth服务日志中查看：
- OAuth认证请求日志
- 令牌生成日志
- 用户登录日志

### 3. 数据库日志
检查数据库中的认证日志表：
```sql
SELECT * FROM auth_logs ORDER BY created_at DESC LIMIT 10;
```

## 🔒 安全注意事项

### 1. HTTPS要求
在生产环境中**必须**使用HTTPS：
```bash
# .env.local
VITE_SSO_SERVER_URL=https://your-sso-server.com
VITE_SSO_REQUIRE_HTTPS=true
VITE_SSO_COOKIE_SECURE=true
```

### 2. 客户端密钥安全
- 不要在前端代码中硬编码客户端密钥
- 使用环境变量配置
- 定期轮换客户端密钥

### 3. 重定向URI验证
- 确保重定向URI与后端配置一致
- 使用HTTPS URL
- 避免使用通配符URI

## 🚀 生产部署

### 1. 环境配置
```bash
# .env.local
VITE_SSO_SERVER_URL=https://sso.yourcompany.com
VITE_SSO_CLIENT_ID=your-production-client-id
VITE_SSO_CLIENT_SECRET=your-production-client-secret
VITE_SSO_REDIRECT_URI=https://yourapp.com/auth/callback
VITE_SSO_REQUIRE_HTTPS=true
VITE_SSO_COOKIE_SECURE=true
VITE_SSO_COOKIE_SAMESITE=strict
```

### 2. SSL证书
确保后端服务使用有效的SSL证书：
- 配置HTTPS
- 设置HSTS头
- 启用安全Cookie

### 3. 监控和告警
- 设置SSO认证成功率监控
- 监控令牌刷新频率
- 设置安全事件告警

## 🔄 常见问题

### Q: 如何处理跨域问题？
**A**: 在Unit Auth后端配置CORS中间件，允许前端域名访问。

### Q: 如何支持第三方OAuth提供商？
**A**: 在SSO配置中添加GitHub、Google等提供商配置，并实现相应的回调处理。

### Q: 如何处理令牌刷新？
**A**: SSO服务会自动检测令牌过期并刷新，无需手动处理。

### Q: 如何注销用户？
**A**: 调用SSO服务的logout方法，会同时清除前端会话和通知后端。

## 📚 API参考

### 前端SSO服务方法

```javascript
// 初始化SSO服务
await ssoService.initialize()

// 构建授权URL
const authUrl = ssoService.buildAuthorizationUrl('local')

// 处理回调
const response = await ssoService.handleCallback({
    code: '授权码',
    state: '状态参数'
})

// 获取当前用户
const user = await ssoService.getCurrentUser()

// 登出
await ssoService.logout()
```

### 后端API端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/.well-known/openid_configuration` | GET | OIDC配置 |
| `/.well-known/jwks.json` | GET | JWK密钥集 |
| `/oauth/authorize` | GET | OAuth授权 |
| `/oauth/token` | POST | 令牌交换 |
| `/oauth/userinfo` | GET | 用户信息 |
| `/oauth/logout` | POST | 登出 |
| `/oauth/revoke` | POST | 令牌撤销 |

## 🤝 支持

如需技术支持，请联系：
- 📧 Email: support@yourcompany.com
- 📚 文档: https://docs.yourcompany.com/sso
- 💻 GitHub: https://github.com/yourcompany/login-v1

---

**🎉 恭喜！您的Login-v1前端项目已成功与Unit Auth后端SSO系统集成！**

现在您可以享受完整的单点登录体验，包括：
- ✅ 标准的OAuth 2.0认证流程
- ✅ 自动令牌管理和刷新
- ✅ 跨应用单点登录
- ✅ 企业级安全特性
- ✅ 完整的用户会话管理
