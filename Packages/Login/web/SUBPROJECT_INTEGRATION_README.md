# 🚀 子项目SSO集成指南

## 📋 概述

本指南介绍如何使用Sparrow SSO系统为第三方应用（子项目）提供单点登录功能。通过本集成，子项目可以轻松地利用中心的SSO系统进行用户认证，而无需重复开发登录功能。

## 🎯 核心特性

- ✅ **URL驱动配置**: 支持通过URL参数动态配置SSO参数
- ✅ **OAuth 2.1 & OpenID Connect**: 完全兼容OAuth 2.1和OpenID Connect协议
- ✅ **多提供商支持**: 支持本地登录、GitHub、Google、微信等
- ✅ **自动令牌刷新**: 透明的令牌刷新机制，无需用户干预
- ✅ **会话管理**: 完整的会话生命周期管理
- ✅ **React Hooks**: 提供开箱即用的React Hooks
- ✅ **类型安全**: 完整的TypeScript类型定义
- ✅ **错误处理**: 完善的错误处理和用户反馈

## 🏗️ 架构设计

### **整体架构**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   子项目应用     │    │   SSO登录中心    │    │   认证服务器     │
│                 │    │   (Login-v1)    │    │   (unit-auth)   │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ 1. 发起登录请求  │───▶│ 2. 认证处理      │───▶│ 3. 令牌颁发     │
│ 4. 处理回调结果  │◀───│ 5. 重定向返回    │◀───│ 6. 验证身份     │
│ 7. 访问受保护资源│    │ 8. 用户认证界面  │    │ 9. 令牌管理     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **认证流程**
```
子项目应用 → SSO登录中心 → 认证服务器
    ↓           ↓           ↓
1. 用户访问    2. 构建认证URL   3. 重定向到认证
   受保护资源       包含子项目信息   服务器进行认证

认证服务器 → SSO登录中心 → 子项目应用
    ↓           ↓           ↓
4. 认证完成    5. 处理认证结果   6. 建立用户会话
   返回认证码     交换访问令牌     保存认证状态

子项目应用 → SSO登录中心 → 认证服务器
    ↓           ↓           ↓
7. 使用令牌    8. 验证令牌有效性  9. 访问用户资源
   访问API       向认证服务器验证    返回用户数据
```

## 📦 安装和配置

### **1. 安装SSO SDK**

#### 使用npm:
```bash
npm install @sparrow-sso/sdk
```

#### 使用yarn:
```bash
yarn add @sparrow-sso/sdk
```

#### 使用pnpm:
```bash
pnpm add @sparrow-sso/sdk
```

### **2. 配置环境变量**

在你的项目根目录创建`.env`文件：

```bash
# SSO服务器配置
VITE_SSO_SERVER_URL=http://localhost:8080
VITE_SSO_CLIENT_ID=your-subproject-client-id
VITE_SSO_CLIENT_SECRET=your-subproject-client-secret
VITE_SSO_REDIRECT_URI=https://your-app.com/auth/callback

# 认证范围
VITE_SSO_SCOPE=openid profile email

# 存储配置
VITE_SSO_STORAGE_TYPE=localStorage
VITE_SSO_STORAGE_PREFIX=sso_

# 功能开关
VITE_SSO_AUTO_REFRESH=true
VITE_SSO_REMEMBER_ME=true
VITE_SSO_SESSION_TIMEOUT=3600
```

### **3. 配置子项目信息**

在你的项目中创建子项目配置文件：

```typescript
// src/config/subproject.ts
export const SUBPROJECT_CONFIG = {
    id: 'your-subproject-id',
    name: '你的子项目名称',
    description: '子项目描述',
    homepageUrl: 'https://your-app.com',
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    redirectUris: [
        'https://your-app.com/auth/callback',
        'http://localhost:3000/auth/callback'
    ],
    allowedScopes: ['openid', 'profile', 'email'],
    branding: {
        primaryColor: '#1890ff',
        backgroundColor: '#f0f2f5',
        logo: 'https://your-app.com/logo.png'
    }
}
```

## 🔧 快速开始

### **1. 基本用法**

```tsx
import React from 'react'
import { useSubProjectSSO } from '@sparrow-sso/sdk'

function App() {
    const {
        isAuthenticated,
        user,
        login,
        logout,
        isLoading,
        error
    } = useSubProjectSSO({
        subProjectId: 'your-subproject-id',
        onSuccess: (user, token, session) => {
            console.log('登录成功:', user)
        },
        onError: (error) => {
            console.error('登录失败:', error)
        }
    })

    if (isLoading) {
        return <div>加载中...</div>
    }

    if (error) {
        return <div>错误: {error.message}</div>
    }

    return (
        <div>
            {isAuthenticated ? (
                <div>
                    <h1>欢迎, {user?.name}!</h1>
                    <button onClick={logout}>登出</button>
                </div>
            ) : (
                <button onClick={() => login({ redirect: true })}>
                    登录
                </button>
            )}
        </div>
    )
}
```

### **2. 高级用法**

```tsx
import React, { useEffect } from 'react'
import { useSubProjectSSO } from '@sparrow-sso/sdk'

function ProtectedApp() {
    const {
        isAuthenticated,
        user,
        token,
        session,
        login,
        logout,
        refreshToken,
        getLoginUrl,
        isInCallback
    } = useSubProjectSSO({
        subProjectId: 'your-subproject-id',
        autoInit: true,
        onSuccess: (user, token, session) => {
            // 保存用户认证状态到全局状态管理
            setCurrentUser(user)
            setAuthToken(token)
        },
        onError: (error) => {
            // 处理认证错误
            if (error.message.includes('401')) {
                // 令牌过期，尝试刷新
                refreshToken()
            }
        }
    })

    // 检查是否在SSO回调中
    useEffect(() => {
        if (isInCallback()) {
            // 处理SSO回调
            handleCallback()
        }
    }, [isInCallback])

    // 自动刷新令牌
    useEffect(() => {
        if (isAuthenticated && token) {
            const refreshTimer = setInterval(() => {
                // 检查令牌是否即将过期
                const expiresAt = token.expires_at || 0
                const now = Math.floor(Date.now() / 1000)
                const timeUntilExpiry = expiresAt - now

                // 如果令牌将在5分钟内过期，自动刷新
                if (timeUntilExpiry < 300) {
                    refreshToken()
                }
            }, 60000) // 每分钟检查一次

            return () => clearInterval(refreshTimer)
        }
    }, [isAuthenticated, token, refreshToken])

    const handleLogin = (provider?: string) => {
        // 重定向到SSO登录页面
        const loginUrl = getLoginUrl(provider)
        window.location.href = loginUrl
    }

    const handleLogout = async () => {
        await logout()
        // 清除本地状态
        setCurrentUser(null)
        setAuthToken(null)
    }

    if (!isAuthenticated) {
        return (
            <div>
                <h1>请先登录</h1>
                <button onClick={() => handleLogin()}>本地登录</button>
                <button onClick={() => handleLogin('github')}>GitHub登录</button>
                <button onClick={() => handleLogin('google')}>Google登录</button>
            </div>
        )
    }

    return (
        <div>
            <h1>欢迎, {user?.name}!</h1>
            <p>邮箱: {user?.email}</p>
            <p>用户ID: {user?.sub}</p>

            <div>
                <h2>令牌信息:</h2>
                <p>令牌类型: {token?.token_type}</p>
                <p>过期时间: {new Date((token?.expires_at || 0) * 1000).toLocaleString()}</p>
            </div>

            <div>
                <h2>会话信息:</h2>
                <p>会话ID: {session?.session_id}</p>
                <p>最后活动: {new Date((session?.last_activity || 0) * 1000).toLocaleString()}</p>
            </div>

            <button onClick={handleLogout}>登出</button>
        </div>
    )
}
```

## 📚 API参考

### **useSubProjectSSO Hook**

#### **参数 (UseSubProjectSSOOptions)**

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `subProjectId` | `string` | - | 子项目ID |
| `customConfig` | `Partial<SubProjectConfig>` | - | 自定义配置 |
| `onSuccess` | `(user, token, session) => void` | - | 登录成功回调 |
| `onError` | `(error) => void` | - | 登录失败回调 |
| `onLogout` | `() => void` | - | 登出回调 |
| `autoInit` | `boolean` | `true` | 是否自动初始化 |

#### **返回值 (UseSubProjectSSOResult)**

| 属性 | 类型 | 描述 |
|------|------|------|
| `isInitialized` | `boolean` | SSO服务是否已初始化 |
| `isLoading` | `boolean` | 是否正在加载 |
| `isAuthenticated` | `boolean` | 用户是否已认证 |
| `error` | `Error \| null` | 错误信息 |
| `user` | `SSOUser \| null` | 用户信息 |
| `token` | `SSOToken \| null` | 访问令牌 |
| `session` | `SSOSession \| null` | 会话信息 |
| `config` | `SubProjectConfig \| null` | 子项目配置 |

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `initialize` | - | `Promise<void>` | 初始化SSO服务 |
| `login` | `options?` | `Promise<void>` | 执行登录 |
| `logout` | - | `Promise<void>` | 执行登出 |
| `refreshToken` | - | `Promise<void>` | 刷新访问令牌 |
| `getLoginUrl` | `provider?` | `string` | 获取登录URL |
| `handleCallback` | - | `Promise<void>` | 处理SSO回调 |
| `isInCallback` | - | `boolean` | 检查是否在回调模式 |
| `getSubProjectInfo` | - | `SubProjectConfig \| null` | 获取子项目信息 |
| `updateConfig` | `config` | `void` | 更新配置 |

### **SubProjectConfig 接口**

```typescript
interface SubProjectConfig {
    // 基本信息
    id: string
    name: string
    description: string
    homepageUrl: string
    logoUrl?: string

    // OAuth2配置
    clientId: string
    clientSecret: string
    redirectUris: string[]
    allowedScopes: string[]

    // 权限配置
    permissions: {
        read: string[]
        write: string[]
        admin: string[]
    }

    // UI配置
    branding: {
        primaryColor: string
        backgroundColor: string
        logo: string
        favicon: string
    }

    // 功能开关
    features: {
        autoRefresh: boolean
        rememberMe: boolean
        socialLogin: boolean
        passwordReset: boolean
        multiFactorAuth: boolean
    }

    // 安全配置
    security: {
        requireHttps: boolean
        allowedDomains: string[]
        blockedDomains: string[]
        sessionTimeout: number
    }
}
```

## 🔐 安全配置

### **HTTPS要求**
```typescript
// 强制HTTPS
const config = {
    security: {
        requireHttps: true
    }
}
```

### **域名限制**
```typescript
// 只允许特定域名访问
const config = {
    security: {
        allowedDomains: ['yourdomain.com', 'localhost'],
        blockedDomains: ['malicious.com']
    }
}
```

### **会话安全**
```typescript
// 会话配置
const config = {
    security: {
        sessionTimeout: 3600 // 1小时
    },
    features: {
        autoRefresh: true, // 自动刷新会话
        rememberMe: false   // 不记住登录状态
    }
}
```

## 🌐 支持的认证提供商

### **本地认证**
```typescript
const config = {
    providers: {
        local: {
            authorizationUrl: 'https://sso.example.com/oauth/authorize',
            tokenUrl: 'https://sso.example.com/oauth/token',
            userInfoUrl: 'https://sso.example.com/oauth/userinfo'
        }
    }
}
```

### **第三方认证**
```typescript
const config = {
    providers: {
        github: {
            clientId: 'your-github-client-id',
            clientSecret: 'your-github-client-secret',
            scope: ['user:email', 'read:user']
        },
        google: {
            clientId: 'your-google-client-id',
            clientSecret: 'your-google-client-secret',
            scope: ['openid', 'profile', 'email']
        }
    }
}
```

## 📱 移动端支持

### **React Native集成**
```typescript
// react-native.config.js
module.exports = {
    dependencies: {
        '@sparrow-sso/sdk': {
            platforms: {
                ios: null,
                android: null
            }
        }
    }
}
```

### **移动端配置**
```typescript
import { useSubProjectSSO } from '@sparrow-sso/sdk/dist/mobile'

const {
    login,
    logout,
    isAuthenticated
} = useSubProjectSSO({
    subProjectId: 'mobile-app',
    storageType: 'secureStorage' // 使用安全存储
})
```

## 🔧 故障排除

### **常见问题**

#### **1. 登录重定向失败**
**问题**: 用户登录后没有正确重定向回子项目
**解决**:
```typescript
// 确保重定向URI配置正确
const config = {
    redirectUris: [
        'https://your-app.com/auth/callback',
        'http://localhost:3000/auth/callback'
    ]
}
```

#### **2. CORS错误**
**问题**: 浏览器阻止跨域请求
**解决**:
```typescript
// 在认证服务器配置CORS
const corsOptions = {
    origin: ['https://your-app.com', 'http://localhost:3000'],
    credentials: true
}
```

#### **3. 令牌刷新失败**
**问题**: 令牌自动刷新不工作
**解决**:
```typescript
const { refreshToken } = useSubProjectSSO({
    autoInit: true,
    features: {
        autoRefresh: true
    }
})
```

#### **4. 会话超时**
**问题**: 用户会话经常超时
**解决**:
```typescript
const config = {
    security: {
        sessionTimeout: 7200 // 增加到2小时
    },
    features: {
        rememberMe: true, // 启用记住登录
        autoRefresh: true // 启用自动刷新
    }
}
```

## 📊 监控和日志

### **启用日志**
```typescript
const config = {
    development: {
        debugMode: true
    },
    logging: {
        enabled: true,
        level: 'debug'
    }
}
```

### **监控指标**
```typescript
// 监听认证事件
useEffect(() => {
    const handleAuthEvent = (event) => {
        console.log('认证事件:', event)
        // 上报到监控系统
        reportAuthEvent(event)
    }

    window.addEventListener('sso:auth:success', handleAuthEvent)
    window.addEventListener('sso:auth:error', handleAuthEvent)

    return () => {
        window.removeEventListener('sso:auth:success', handleAuthEvent)
        window.removeEventListener('sso:auth:error', handleAuthEvent)
    }
}, [])
```

## 🧪 测试

### **单元测试**
```typescript
import { renderHook } from '@testing-library/react'
import { useSubProjectSSO } from '@sparrow-sso/sdk'

describe('useSubProjectSSO', () => {
    test('应该正确初始化SSO服务', async () => {
        const { result } = renderHook(() =>
            useSubProjectSSO({
                subProjectId: 'test-project',
                autoInit: false
            })
        )

        expect(result.current.isInitialized).toBe(false)

        await result.current.initialize()

        expect(result.current.isInitialized).toBe(true)
    })
})
```

### **集成测试**
```typescript
describe('SSO集成测试', () => {
    test('应该能完成完整的认证流程', async () => {
        // 1. 初始化SSO
        const { result } = renderHook(() =>
            useSubProjectSSO({ subProjectId: 'test' })
        )

        // 2. 执行登录
        await result.current.login({ redirect: false })

        // 3. 验证认证状态
        expect(result.current.isAuthenticated).toBe(true)
        expect(result.current.user).toBeDefined()
        expect(result.current.token).toBeDefined()
    })
})
```

## 📈 性能优化

### **1. 代码分割**
```typescript
// 动态导入SSO组件
const SubProjectApp = lazy(() =>
    import('./SubProjectApp')
)
```

### **2. 缓存优化**
```typescript
// 使用React.memo优化渲染
const AuthenticatedApp = memo(({ user, token }) => {
    // 组件逻辑
})
```

### **3. 网络优化**
```typescript
// 使用HTTP/2和资源预加载
<link rel="preconnect" href="https://sso.example.com">
<link rel="dns-prefetch" href="https://sso.example.com">
```

## 🤝 贡献指南

### **开发环境设置**
```bash
# 克隆仓库
git clone https://github.com/your-org/sso-sdk.git
cd sso-sdk

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test

# 构建生产版本
npm run build
```

### **代码规范**
```typescript
// 使用TypeScript严格模式
// 添加完整的JSDoc注释
// 遵循统一的命名约定
// 编写单元测试
```

## 📚 相关资源

- [OAuth 2.1 规范](https://tools.ietf.org/html/rfc6749)
- [OpenID Connect 规范](https://openid.net/specs/openid-connect-core-1_0.html)
- [SSO最佳实践](https://auth0.com/docs/best-practices)
- [React Hooks指南](https://reactjs.org/docs/hooks-intro.html)

## 📞 技术支持

如遇到问题，请提供以下信息：

1. **环境信息**: 浏览器版本、操作系统、Node.js版本
2. **配置信息**: 子项目配置、环境变量设置
3. **错误日志**: 完整的错误信息和堆栈跟踪
4. **复现步骤**: 详细的问题复现步骤

**问题反馈渠道**:
- GitHub Issues: [https://github.com/your-org/sso-sdk/issues](https://github.com/your-org/sso-sdk/issues)
- 技术支持邮箱: support@example.com
- 开发者社区: [https://community.example.com](https://community.example.com)

---

**🎉 恭喜！您已经成功集成了Sparrow SSO系统！**

现在您的子项目可以享受统一的用户认证体验了。用户只需在一个地方登录，就可以无缝访问所有集成的子项目。
