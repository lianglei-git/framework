# SSO登录系统集成指南

## 概述

本指南详细说明了如何将其他项目与独立的SSO登录系统进行集成，实现单点登录功能。Login-v1项目作为独立的认证中心，其他业务系统通过HTTP请求与之交互。

## 架构概述

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   业务系统A     │    │   SSO登录系统    │    │   业务系统B     │
│                 │    │   (Login-v1)     │    │                 │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ 1. 重定向到SSO │◄──►│ 2. 用户登录验证  │◄──►│ 3. 使用令牌    │
│ 4. 接收回调    │    │ 5. 返回授权码    │    │ 访问资源      │
│ 6. 换取令牌    │    │ 6. 验证并返回令牌│    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 认证流程

### 1. OAuth 2.0 授权码流程

#### 步骤1: 用户访问业务系统
```
用户 → 业务系统 → 检查登录状态
```

#### 步骤2: 重定向到SSO登录
```javascript
// 业务系统前端
const loginUrl = `https://sso.yourcompany.com/login?` +
  `client_id=your_client_id&` +
  `redirect_uri=https://yourapp.com/auth/callback&` +
  `response_type=code&` +
  `scope=openid profile email&` +
  `state=csrf_token`

window.location.href = loginUrl
```

#### 步骤3: 用户在SSO系统登录
```
SSO系统处理登录 → 验证用户凭据 → 生成授权码
```

#### 步骤4: SSO系统回调业务系统
```javascript
// SSO系统重定向回业务系统
https://yourapp.com/auth/callback?code=auth_code&state=csrf_token
```

#### 步骤5: 业务系统换取令牌
```javascript
// 业务系统后端API
const tokenResponse = await fetch('https://sso.yourcompany.com/oauth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: 'your_client_id',
    client_secret: 'your_client_secret',
    code: 'auth_code',
    redirect_uri: 'https://yourapp.com/auth/callback'
  })
})

const { access_token, refresh_token, expires_in } = await tokenResponse.json()
```

#### 步骤6: 业务系统使用令牌访问资源
```javascript
// 后续API请求携带令牌
const response = await fetch('https://api.yourapp.com/user/profile', {
  headers: {
    'Authorization': `Bearer ${access_token}`
  }
})
```

## API接口说明

### 1. 授权端点

**URL**: `GET /oauth/authorize`

**参数**:
- `client_id` (必填): 客户端ID
- `redirect_uri` (必填): 回调地址
- `response_type` (必填): 响应类型，固定为`code`
- `scope` (可选): 请求的权限范围，如`openid profile email`
- `state` (推荐): CSRF令牌

**示例**:
```bash
curl "https://sso.yourcompany.com/oauth/authorize?\
client_id=your_client_id&\
redirect_uri=https://yourapp.com/callback&\
response_type=code&\
scope=openid%20profile%20email&\
state=csrf_token_123"
```

### 2. 令牌端点

**URL**: `POST /oauth/token`

**请求体**:
```javascript
{
  grant_type: 'authorization_code', // 或 'refresh_token'
  client_id: 'your_client_id',
  client_secret: 'your_client_secret',
  code: 'authorization_code', // 授权码
  redirect_uri: 'https://yourapp.com/callback'
}
```

**响应**:
```javascript
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def50200-0e7c-4e9f-8b8e-3b7e6f5e4d3c2...",
  "scope": "openid profile email"
}
```

### 3. 用户信息端点

**URL**: `GET /oauth/userinfo`

**请求头**:
```
Authorization: Bearer {access_token}
```

**响应**:
```javascript
{
  "sub": "user123",
  "name": "张三",
  "email": "zhangsan@example.com",
  "email_verified": true,
  "picture": "https://example.com/avatar.jpg"
}
```

### 4. 登出端点

**URL**: `POST /oauth/logout`

**请求体**:
```javascript
{
  "client_id": "your_client_id",
  "client_secret": "your_client_secret",
  "token": "access_token"
}
```

### 5. 令牌验证端点

**URL**: `POST /oauth/introspect`

**请求体**:
```javascript
{
  "token": "access_token",
  "client_id": "your_client_id",
  "client_secret": "your_client_secret"
}
```

## 业务系统集成示例

### 1. Node.js/Express集成

```javascript
// auth.js - 认证中间件
const express = require('express')
const jwt = require('jsonwebtoken')
const router = express.Router()

// SSO配置
const SSO_CONFIG = {
  serverUrl: 'https://sso.yourcompany.com',
  clientId: process.env.SSO_CLIENT_ID,
  clientSecret: process.env.SSO_CLIENT_SECRET,
  redirectUri: `${process.env.APP_URL}/auth/callback`
}

// 生成登录URL
router.get('/login', (req, res) => {
  const state = generateCSRFToken()
  req.session.csrfToken = state

  const loginUrl = `${SSO_CONFIG.serverUrl}/oauth/authorize?` +
    `client_id=${SSO_CONFIG.clientId}&` +
    `redirect_uri=${encodeURIComponent(SSO_CONFIG.redirectUri)}&` +
    `response_type=code&` +
    `scope=openid%20profile%20email&` +
    `state=${state}`

  res.redirect(loginUrl)
})

// 回调处理
router.get('/callback', async (req, res) => {
  const { code, state } = req.query

  // 验证CSRF令牌
  if (state !== req.session.csrfToken) {
    return res.status(400).json({ error: 'Invalid state' })
  }

  try {
    // 换取令牌
    const tokenResponse = await fetch(`${SSO_CONFIG.serverUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: SSO_CONFIG.clientId,
        client_secret: SSO_CONFIG.clientSecret,
        code: code,
        redirect_uri: SSO_CONFIG.redirectUri
      })
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      throw new Error(tokenData.error_description)
    }

    // 获取用户信息
    const userResponse = await fetch(`${SSO_CONFIG.serverUrl}/oauth/userinfo`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })

    const userInfo = await userResponse.json()

    // 保存用户信息到会话
    req.session.user = userInfo
    req.session.accessToken = tokenData.access_token
    req.session.refreshToken = tokenData.refresh_token

    res.redirect('/dashboard')
  } catch (error) {
    console.error('SSO登录失败:', error)
    res.redirect('/login?error=' + encodeURIComponent(error.message))
  }
})

// 登出
router.post('/logout', async (req, res) => {
  try {
    // 通知SSO系统登出
    await fetch(`${SSO_CONFIG.serverUrl}/oauth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: SSO_CONFIG.clientId,
        client_secret: SSO_CONFIG.clientSecret,
        token: req.session.accessToken
      })
    })
  } catch (error) {
    console.error('SSO登出失败:', error)
  }

  // 清除本地会话
  req.session.destroy()
  res.redirect('/login')
})

// 令牌刷新中间件
async function refreshTokenIfNeeded(req, res, next) {
  if (req.session.accessToken) {
    try {
      // 验证令牌是否有效
      const introspectResponse = await fetch(`${SSO_CONFIG.serverUrl}/oauth/introspect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          token: req.session.accessToken,
          client_id: SSO_CONFIG.clientId,
          client_secret: SSO_CONFIG.clientSecret
        })
      })

      const introspectData = await introspectResponse.json()

      if (!introspectData.active && req.session.refreshToken) {
        // 刷新令牌
        const refreshResponse = await fetch(`${SSO_CONFIG.serverUrl}/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: SSO_CONFIG.clientId,
            client_secret: SSO_CONFIG.clientSecret,
            refresh_token: req.session.refreshToken
          })
        })

        const refreshData = await refreshResponse.json()

        if (refreshData.access_token) {
          req.session.accessToken = refreshData.access_token
          req.session.refreshToken = refreshData.refresh_token
        }
      }
    } catch (error) {
      console.error('令牌刷新失败:', error)
    }
  }

  next()
}

module.exports = {
  router,
  refreshTokenIfNeeded,
  generateCSRFToken: () => Math.random().toString(36).substring(2)
}
```

### 2. 前端集成示例

```javascript
// utils/auth.js - 前端认证工具
class AuthManager {
  constructor(config) {
    this.config = config
    this.baseURL = config.ssoServerUrl
  }

  // 重定向到SSO登录
  redirectToLogin(returnUrl = window.location.href) {
    const state = this.generateState()
    sessionStorage.setItem('sso_state', state)
    sessionStorage.setItem('sso_return_url', returnUrl)

    const loginUrl = `${this.baseURL}/oauth/authorize?` +
      `client_id=${this.config.clientId}&` +
      `redirect_uri=${encodeURIComponent(this.config.redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(this.config.scope.join(' '))}&` +
      `state=${state}`

    window.location.href = loginUrl
  }

  // 处理登录回调
  async handleCallback(code, state) {
    const storedState = sessionStorage.getItem('sso_state')
    const returnUrl = sessionStorage.getItem('sso_return_url') || '/'

    if (state !== storedState) {
      throw new Error('Invalid state parameter')
    }

    try {
      // 换取令牌
      const tokenData = await this.exchangeCodeForToken(code)

      // 获取用户信息
      const userInfo = await this.getUserInfo(tokenData.access_token)

      // 保存到本地存储
      localStorage.setItem('access_token', tokenData.access_token)
      localStorage.setItem('refresh_token', tokenData.refresh_token)
      localStorage.setItem('user_info', JSON.stringify(userInfo))

      // 触发登录成功事件
      window.dispatchEvent(new CustomEvent('sso:login:success', {
        detail: { user: userInfo, token: tokenData }
      }))

      return { user: userInfo, token: tokenData }
    } catch (error) {
      console.error('SSO登录失败:', error)
      window.dispatchEvent(new CustomEvent('sso:login:error', {
        detail: { error }
      }))
      throw error
    }
  }

  // 换取令牌
  async exchangeCodeForToken(code) {
    const response = await fetch(`${this.baseURL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: code,
        redirect_uri: this.config.redirectUri
      })
    })

    return await response.json()
  }

  // 获取用户信息
  async getUserInfo(accessToken) {
    const response = await fetch(`${this.baseURL}/oauth/userinfo`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    return await response.json()
  }

  // 登出
  async logout() {
    const accessToken = localStorage.getItem('access_token')

    try {
      // 通知SSO系统登出
      await fetch(`${this.baseURL}/oauth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          token: accessToken
        })
      })
    } catch (error) {
      console.error('SSO登出失败:', error)
    }

    // 清除本地数据
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_info')
    sessionStorage.removeItem('sso_state')
    sessionStorage.removeItem('sso_return_url')

    // 触发登出事件
    window.dispatchEvent(new Event('sso:logout'))
  }

  // 检查登录状态
  async checkAuthStatus() {
    const accessToken = localStorage.getItem('access_token')
    const userInfo = localStorage.getItem('user_info')

    if (!accessToken || !userInfo) {
      return { isAuthenticated: false }
    }

    try {
      // 验证令牌
      const response = await fetch(`${this.baseURL}/oauth/introspect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          token: accessToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret
        })
      })

      const data = await response.json()

      if (data.active) {
        return {
          isAuthenticated: true,
          user: JSON.parse(userInfo)
        }
      } else {
        // 尝试刷新令牌
        return await this.refreshToken()
      }
    } catch (error) {
      console.error('检查登录状态失败:', error)
      return { isAuthenticated: false }
    }
  }

  // 刷新令牌
  async refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token')

    if (!refreshToken) {
      return { isAuthenticated: false }
    }

    try {
      const response = await fetch(`${this.baseURL}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: refreshToken
        })
      })

      const tokenData = await response.json()

      if (tokenData.access_token) {
        localStorage.setItem('access_token', tokenData.access_token)
        localStorage.setItem('refresh_token', tokenData.refresh_token)

        const userInfo = await this.getUserInfo(tokenData.access_token)
        localStorage.setItem('user_info', JSON.stringify(userInfo))

        return {
          isAuthenticated: true,
          user: userInfo
        }
      }

      return { isAuthenticated: false }
    } catch (error) {
      console.error('刷新令牌失败:', error)
      return { isAuthenticated: false }
    }
  }

  // 生成状态参数
  generateState() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }

  // 获取当前用户
  getCurrentUser() {
    const userInfo = localStorage.getItem('user_info')
    return userInfo ? JSON.parse(userInfo) : null
  }

  // 获取访问令牌
  getAccessToken() {
    return localStorage.getItem('access_token')
  }
}

// 导出单例实例
const authManager = new AuthManager({
  ssoServerUrl: 'https://sso.yourcompany.com',
  clientId: 'your_client_id',
  clientSecret: 'your_client_secret',
  redirectUri: window.location.origin + '/auth/callback',
  scope: ['openid', 'profile', 'email']
})

export default authManager
```

### 3. React组件集成示例

```jsx
// components/AuthButton.jsx
import React, { useState, useEffect } from 'react'
import authManager from '../utils/auth'

const AuthButton = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    checkAuthStatus()

    // 监听认证状态变化
    const handleLoginSuccess = (event) => {
      setUser(event.detail.user)
      setIsAuthenticated(true)
    }

    const handleLogout = () => {
      setUser(null)
      setIsAuthenticated(false)
    }

    window.addEventListener('sso:login:success', handleLoginSuccess)
    window.addEventListener('sso:logout', handleLogout)

    return () => {
      window.removeEventListener('sso:login:success', handleLoginSuccess)
      window.removeEventListener('sso:logout', handleLogout)
    }
  }, [])

  const checkAuthStatus = async () => {
    const authStatus = await authManager.checkAuthStatus()
    setIsAuthenticated(authStatus.isAuthenticated)
    setUser(authStatus.user)
  }

  const handleLogin = () => {
    authManager.redirectToLogin(window.location.href)
  }

  const handleLogout = async () => {
    await authManager.logout()
    setIsAuthenticated(false)
    setUser(null)
  }

  if (isAuthenticated && user) {
    return (
      <div className="auth-section">
        <span>欢迎, {user.name}</span>
        <button onClick={handleLogout}>登出</button>
      </div>
    )
  }

  return (
    <button onClick={handleLogin} className="login-button">
      登录
    </button>
  )
}

export default AuthButton
```

## 配置说明

### 1. 环境变量配置

```bash
# SSO服务器配置
SSO_SERVER_URL=https://sso.yourcompany.com
SSO_CLIENT_ID=your_client_id
SSO_CLIENT_SECRET=your_client_secret

# 应用配置
APP_URL=https://yourapp.com
APP_NAME=Your Application

# 安全配置
SSO_REDIRECT_URI=https://yourapp.com/auth/callback
SSO_SCOPE=openid profile email
```

### 2. 客户端注册

在SSO系统中注册你的应用：

1. 访问 `https://sso.yourcompany.com/admin/clients`
2. 创建新客户端
3. 填写以下信息：
   - 客户端名称: Your Application
   - 客户端ID: your_client_id
   - 客户端密钥: your_client_secret
   - 重定向URI: https://yourapp.com/auth/callback
   - 授权类型: authorization_code
   - 响应类型: code
   - 范围: openid, profile, email

## 错误处理

### 1. 常见错误码

| 错误码 | 描述 | 解决方案 |
|--------|------|----------|
| `invalid_client` | 客户端ID或密钥错误 | 检查客户端配置 |
| `invalid_grant` | 授权码无效或已过期 | 重新发起授权流程 |
| `invalid_scope` | 请求的权限范围无效 | 检查scope参数 |
| `unauthorized_client` | 客户端无权限 | 确认客户端配置 |
| `access_denied` | 用户拒绝授权 | 引导用户重新授权 |
| `server_error` | 服务器内部错误 | 稍后重试 |

### 2. 错误处理示例

```javascript
try {
  const tokenData = await authManager.exchangeCodeForToken(code)

  if (tokenData.error) {
    switch (tokenData.error) {
      case 'invalid_client':
        console.error('客户端配置错误')
        break
      case 'invalid_grant':
        console.error('授权码无效，重新登录')
        window.location.href = '/login'
        break
      default:
        console.error('SSO登录失败:', tokenData.error_description)
    }
    return
  }

  // 登录成功
  console.log('登录成功:', tokenData)
} catch (error) {
  console.error('网络错误:', error)
}
```

## 安全注意事项

### 1. CSRF保护
- 始终使用state参数验证请求来源
- 验证state参数的一致性

### 2. HTTPS要求
- 所有SSO通信必须使用HTTPS
- 确保回调URL使用HTTPS

### 3. 令牌安全
- 不要在URL中传递令牌
- 令牌过期后及时清理
- 定期刷新令牌

### 4. 错误信息
- 不要向用户暴露敏感错误信息
- 记录详细错误信息用于调试

## 测试指南

### 1. 单元测试

```javascript
// 测试认证流程
describe('SSO Authentication', () => {
  test('should redirect to SSO login', () => {
    const loginUrl = authManager.getLoginUrl()
    expect(loginUrl).toContain('sso.yourcompany.com')
    expect(loginUrl).toContain('client_id=your_client_id')
  })

  test('should handle callback correctly', async () => {
    const mockCode = 'test_auth_code'
    const result = await authManager.handleCallback(mockCode, 'test_state')
    expect(result).toHaveProperty('user')
    expect(result).toHaveProperty('token')
  })
})
```

### 2. 集成测试

```javascript
// 测试完整登录流程
describe('SSO Integration', () => {
  test('should complete full login flow', async () => {
    // 1. 重定向到SSO
    authManager.redirectToLogin('/dashboard')

    // 2. 模拟回调
    const callbackUrl = 'https://yourapp.com/auth/callback?code=123&state=456'
    // 模拟处理回调...

    // 3. 验证登录状态
    const authStatus = await authManager.checkAuthStatus()
    expect(authStatus.isAuthenticated).toBe(true)
  })
})
```

## 故障排除

### 1. 常见问题

**问题**: 登录重定向失败
**解决**: 检查客户端ID和重定向URI配置

**问题**: 回调URL不匹配
**解决**: 确保回调URL与注册时完全一致

**问题**: 令牌验证失败
**解决**: 检查令牌是否过期，尝试刷新令牌

### 2. 调试技巧

1. 启用详细日志：
```javascript
localStorage.setItem('sso_debug', 'true')
```

2. 检查网络请求：
```javascript
// 在浏览器开发者工具中查看Network标签
```

3. 验证配置：
```javascript
console.log('SSO配置:', authManager.config)
```

## 支持

如需技术支持，请联系：
- 邮箱: support@yourcompany.com
- 文档: https://docs.yourcompany.com/sso
- GitHub: https://github.com/yourcompany/sso-docs

---

**注意**: 请将上述配置中的占位符替换为实际值，并确保在生产环境中使用HTTPS。
