# SSO单点登录系统使用指南

## 概述

本项目已成功改造为支持SSO（Single Sign-On）模式的认证系统。SSO系统提供了统一的认证入口，支持多种登录方式，并实现了跨域单点登录功能。

## 🎯 主要特性

- ✅ **统一认证**：支持多种登录方式的统一认证
- ✅ **OAuth 2.0/OpenID Connect**：完整的OAuth 2.0和OpenID Connect协议支持
- ✅ **跨域SSO**：支持多个域名/应用的单点登录
- ✅ **令牌管理**：完整的JWT令牌验证和管理机制
- ✅ **安全机制**：内置多种安全验证和防护措施
- ✅ **配置管理**：灵活的SSO配置管理系统
- ✅ **数据迁移**：从现有认证系统平滑迁移的工具

## 📁 文件结构

```
src/
├── services/
│   ├── sso.ts              # SSO核心服务
│   ├── ssoConfig.ts        # SSO配置管理
│   ├── ssoSecurity.ts      # SSO安全管理
│   └── crossDomainSSO.ts   # 跨域SSO管理
├── components/
│   ├── auth/
│   │   ├── SSOCallback.tsx # SSO回调处理组件
│   │   └── AuthLogin.tsx   # 登录组件（已更新支持SSO）
├── hooks/
│   └── useAuth.ts          # 认证Hook（已增强SSO支持）
├── types/
│   └── index.ts            # 类型定义（已添加SSO类型）
└── utils/
    └── storage.ts          # 存储管理（已增强SSO支持）

migration/
└── sso-migration.js       # 数据迁移脚本

sso.config.js              # SSO配置文件
```

## 🚀 快速开始

### 1. 配置SSO服务

编辑项目根目录下的 `.env` 文件，添加SSO配置：

```env
# SSO服务器配置
VITE_SSO_SERVER_URL=https://sso.yourcompany.com
VITE_SSO_CLIENT_ID=your-client-id
VITE_SSO_CLIENT_SECRET=your-client-secret
VITE_SSO_REDIRECT_URI=https://yourapp.com/auth/callback

# SSO选项配置
VITE_SSO_SCOPE=openid profile email
VITE_SSO_RESPONSE_TYPE=code
VITE_SSO_GRANT_TYPE=authorization_code
VITE_SSO_SESSION_TIMEOUT=3600

# 提供商配置（可选）
VITE_SSO_PROVIDER_GITHUB_CLIENT_ID=github-client-id
VITE_SSO_PROVIDER_GITHUB_CLIENT_SECRET=github-client-secret
VITE_SSO_PROVIDER_GOOGLE_CLIENT_ID=google-client-id
VITE_SSO_PROVIDER_GOOGLE_CLIENT_SECRET=google-client-secret
```

### 2. 初始化SSO服务

在应用入口文件中初始化SSO服务：

```typescript
import { SSOService, createDefaultSSOConfig } from './services/sso'

async function initializeApp() {
  // 创建SSO配置
  const ssoConfig = createDefaultSSOConfig()

  // 创建并初始化SSO服务
  const ssoService = new SSOService(ssoConfig)
  await ssoService.initialize()

  // 存储SSO服务实例供全局使用
  window.ssoService = ssoService
}

// 初始化应用
initializeApp()
```

### 3. 使用SSO登录

在登录组件中使用SSO功能：

```typescript
import { useAuth } from './hooks/useAuth'

const LoginComponent = () => {
  const auth = useAuth()

  const handleSSOLogin = async (provider: string) => {
    try {
      const authUrl = auth.getSSOAuthorizationUrl?.(provider)
      if (authUrl) {
        window.location.href = authUrl
      }
    } catch (error) {
      console.error('SSO login failed:', error)
    }
  }

  return (
    <div>
      <h2>登录</h2>
      <button onClick={() => handleSSOLogin('local')}>
        本地登录
      </button>
      <button onClick={() => handleSSOLogin('github')}>
        GitHub登录
      </button>
      <button onClick={() => handleSSOLogin('google')}>
        Google登录
      </button>
    </div>
  )
}
```

### 4. 处理SSO回调

创建SSO回调页面处理授权码：

```typescript
import { SSOCallback } from './components/auth/SSOCallback'

const SSOCallbackPage = () => {
  const handleSuccess = () => {
    // 登录成功，跳转到首页
    window.location.href = '/'
  }

  const handleError = (error: string) => {
    // 登录失败，跳转到登录页
    window.location.href = '/login?error=' + encodeURIComponent(error)
  }

  return (
    <SSOCallback
      provider="github"
      onSuccess={handleSuccess}
      onError={handleError}
    />
  )
}
```

## 🔧 API使用方法

### 基本SSO登录

```typescript
const auth = useAuth()

// 本地SSO登录
await auth.ssoLogin?.({
  username: 'user@example.com',
  password: 'password',
  login_type: 'local'
})

// OAuth登录
await auth.ssoLogin?.({
  provider: 'github',
  code: 'authorization_code',
  state: 'state_parameter'
})
```

### 会话管理

```typescript
// 检查SSO会话
const isAuthenticated = await auth.checkSSOSession?.()

// 获取SSO用户信息
const ssoUser = auth.ssoUser

// 刷新SSO令牌
await auth.refreshSSOToken?.()

// SSO登出
await auth.ssoLogout?.()
```

### 令牌验证

```typescript
// 验证访问令牌
const validationResult = await auth.validateSSOToken?.(token)

// 获取SSO授权URL
const authUrl = auth.getSSOAuthorizationUrl?.('github', {
  scope: ['openid', 'profile', 'email'],
  state: 'random_state'
})
```

## 🔒 安全配置

### 令牌黑名单

```typescript
// 撤销令牌
await ssoSecurity.revokeToken(token)

// 检查令牌是否被撤销
const isRevoked = ssoSecurity.isTokenRevoked(token)
```

### CSRF保护

```typescript
// 生成CSRF令牌
const csrfToken = ssoSecurity.generateCSRFToken()

// 验证CSRF令牌
const isValid = ssoSecurity.validateCSRFToken(token, storedToken)
```

### PKCE码挑战

```typescript
// 生成PKCE码挑战
const { codeVerifier, codeChallenge } = ssoSecurity.generatePKCEChallenge()

// 验证PKCE码挑战
const isValid = ssoSecurity.verifyPKCEChallenge(codeVerifier, codeChallenge)
```

## 🌐 跨域SSO

### 初始化跨域SSO

```typescript
import { getCrossDomainSSO } from './services/crossDomainSSO'

// 获取跨域SSO管理器
const crossDomainSSO = getCrossDomainSSO(ssoConfig)

// 广播登录状态
crossDomainSSO.broadcastLogin(token)

// 监听会话同步
crossDomainSSO.registerMessageHandler('SSO_SESSION_SYNC', (data) => {
  console.log('Session synced from other window:', data)
})
```

### 同域标签页同步

```typescript
// 监听标签页间的消息
crossDomainSSO.registerMessageHandler('SSO_LOGIN_SUCCESS', (data) => {
  // 更新当前标签页的会话状态
  storage.saveSSOData(data)
})
```

## 🔄 数据迁移

### 运行迁移脚本

```bash
# 进入项目目录
cd /path/to/project

# 运行迁移脚本
node migration/sso-migration.js
```

### 迁移选项

```javascript
const migrationConfig = {
  // 启用测试模式（不实际修改数据）
  testMode: true,

  // 创建备份
  createBackup: true,

  // 批量大小
  batchSize: 10,

  // 并发数
  concurrency: 3
}
```

## 📊 监控和日志

### 配置日志

```javascript
// 启用日志
console.log('SSO Service initialized')

// 记录安全事件
ssoSecurity.logSecurityEvent('suspicious_activity', {
  ip: '192.168.1.1',
  userAgent: 'suspicious-agent'
})
```

### 监控指标

- 登录成功率
- 令牌刷新频率
- 跨域会话同步次数
- 安全事件统计

## 🐛 故障排除

### 常见问题

1. **SSO服务连接失败**
   - 检查SSO服务器URL配置
   - 验证网络连接
   - 检查防火墙设置

2. **令牌验证失败**
   - 确认JWT签名密钥正确
   - 检查令牌是否过期
   - 验证令牌格式

3. **跨域SSO不工作**
   - 确认域名在白名单中
   - 检查postMessage权限
   - 验证消息格式

4. **迁移脚本失败**
   - 检查SSO服务连接
   - 验证用户数据格式
   - 查看迁移日志

### 调试模式

启用调试模式查看详细日志：

```env
VITE_SSO_DEBUG=true
VITE_SSO_LOG_LEVEL=debug
```

## 🔗 相关链接

- [OAuth 2.0 规范](https://tools.ietf.org/html/rfc6749)
- [OpenID Connect 规范](https://openid.net/connect/)
- [JWT 规范](https://tools.ietf.org/html/rfc7519)
- [PKCE 规范](https://tools.ietf.org/html/rfc7636)

## 📝 更新日志

### v1.0.0
- ✅ 完成SSO系统基础架构
- ✅ 实现OAuth 2.0/OpenID Connect支持
- ✅ 添加跨域SSO功能
- ✅ 集成安全验证机制
- ✅ 创建数据迁移工具
- ✅ 更新组件支持SSO模式

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进SSO系统！

1. Fork本项目
2. 创建功能分支：`git checkout -b feature/sso-enhancement`
3. 提交更改：`git commit -am 'Add SSO enhancement'`
4. 推送分支：`git push origin feature/sso-enhancement`
5. 提交Pull Request

## 📄 许可证

MIT License
