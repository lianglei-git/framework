# Token 响应规范前端集成指南

本指南说明如何在前端应用中集成新的 Token 响应规范和统一错误处理机制。

## 📋 目录

- [快速开始](#快速开始)
- [核心概念](#核心概念)
- [集成步骤](#集成步骤)
- [使用示例](#使用示例)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

---

## 快速开始

### 1. 导入必要的类型和工具

```typescript
import { TokenErrorResponse } from '../types/token'
import { handleTokenError } from '../utils/tokenErrorHandler'
import { useTokenErrorHandler } from '../hooks/useTokenErrorHandler'
```

### 2. 在 React 组件中使用

```typescript
function MyComponent() {
    const { handleError } = useTokenErrorHandler()
    
    const fetchData = async () => {
        try {
            const response = await api.get('/some-endpoint')
            return response.data
        } catch (error: any) {
            if (error.response?.data?.error_code) {
                await handleError(error.response.data)
            }
            throw error
        }
    }
    
    return <div>...</div>
}
```

---

## 核心概念

### Token 响应格式

#### 成功响应
```typescript
interface TokenResponse {
    access_token: string       // JWT 访问令牌
    refresh_token: string      // JWT 刷新令牌
    id_token: string           // OpenID Connect ID 令牌
    token_type: "Bearer"       // 固定值
    expires_in: number         // 有效期（秒）
    scope: string              // 授权范围
    user: UserInfo             // 用户信息
    provider: string           // 认证提供者
    session_id?: string        // Session ID（仅中心登录系统）
    session_info?: SessionInfo // Session 详细信息
}
```

#### 错误响应
```typescript
interface TokenErrorResponse {
    error: string              // OAuth 2.0 标准错误类型
    error_description: string  // 错误描述
    error_code: string         // 详细错误码（如 REFRESH_TOKEN_INVALID）
    suggest_action: string     // 建议操作（如 check_session）
}
```

### 建议操作类型

| suggest_action | 说明 | 前端处理 |
|---------------|------|---------|
| `check_session` | 尝试用 session_id 恢复 | 调用 `/session-check` 接口恢复登录 |
| `relogin` | 立即跳转登录 | 清除本地数据，跳转登录页 |
| `retry_auth` | 重新发起 OAuth 授权 | 重新发起授权流程 |
| `contact_admin` | 联系管理员 | 显示错误提示 |
| `retry` | 重试请求 | 延迟后重试 |
| `retry_later` | 稍后重试 | 提示用户稍后再试 |

---

## 集成步骤

### 步骤 1: 在 API 服务中集成

#### 方式 A: 在 Axios 拦截器中统一处理

```typescript
// src/services/api.ts
import axios from 'axios'
import { TokenErrorResponse } from '../types/token'
import { handleTokenError } from '../utils/tokenErrorHandler'

const api = axios.create({
    baseURL: process.env.VITE_API_URL
})

// 响应拦截器
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const errorResponse: TokenErrorResponse = error.response?.data
        
        // 检查是否为标准的 Token 错误响应
        if (errorResponse?.error_code && errorResponse?.suggest_action) {
            console.log('🔴 检测到 Token 错误:', errorResponse)
            
            // 使用统一错误处理器
            const handled = await handleTokenError(errorResponse, {
                onCheckSession: async () => {
                    // 尝试恢复 session
                    const sessionId = getSessionIdFromCookie()
                    if (!sessionId) {
                        throw new Error('No session_id')
                    }
                    
                    await ssoClient.recoverFromSession(sessionId)
                },
                
                onRelogin: () => {
                    // 跳转登录
                    window.location.href = '/login'
                },
                
                onShowError: (message, severity) => {
                    toast[severity](message)
                }
            })
            
            if (handled) {
                console.log('✅ 错误已处理')
            }
        }
        
        return Promise.reject(error)
    }
)

export default api
```

#### 方式 B: 在具体请求中处理

```typescript
// 在具体的 API 调用中处理
async function refreshToken() {
    try {
        const response = await api.post('/api/v1/auth/oauth/token', {
            grant_type: 'refresh_token',
            refresh_token: token,
            client_id: clientId,
            client_secret: clientSecret
        })
        
        return response.data
    } catch (error: any) {
        const errorResponse: TokenErrorResponse = error.response?.data
        
        if (errorResponse?.error_code) {
            await handleTokenError(errorResponse, {
                // ... 处理器配置
            })
        }
        
        throw error
    }
}
```

---

### 步骤 2: 使用 React Hook

创建一个可复用的 Hook：

```typescript
// src/hooks/useTokenErrorHandler.ts
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { TokenErrorResponse } from '../types/token'
import { handleTokenError } from '../utils/tokenErrorHandler'

export function useTokenErrorHandler() {
    const navigate = useNavigate()
    
    const handleError = useCallback(async (error: TokenErrorResponse) => {
        return await handleTokenError(error, {
            onCheckSession: async () => {
                // 恢复逻辑
            },
            onRelogin: () => {
                navigate('/login')
            },
            onShowError: (message, severity) => {
                console[severity](message)
            }
        })
    }, [navigate])
    
    return { handleError }
}
```

在组件中使用：

```typescript
function MyComponent() {
    const { handleError } = useTokenErrorHandler()
    
    const handleSubmit = async () => {
        try {
            await api.post('/some-endpoint', data)
        } catch (error: any) {
            if (error.response?.data?.error_code) {
                await handleError(error.response.data)
            }
        }
    }
    
    return <button onClick={handleSubmit}>Submit</button>
}
```

---

### 步骤 3: 处理特定错误场景

#### 场景 1: Token 刷新失败，自动恢复

```typescript
// SSO Client 中的 refreshToken 方法
async refreshToken() {
    try {
        const response = await api.post('/api/v1/auth/oauth/token', {
            grant_type: 'refresh_token',
            refresh_token: this.getRefreshToken()
        })
        
        return response.data
    } catch (error: any) {
        const errorResponse: TokenErrorResponse = error.response?.data
        
        if (errorResponse?.suggest_action === 'check_session') {
            // 自动尝试恢复
            const recovered = await this.recoverFromSession()
            if (recovered) {
                return recovered
            }
        }
        
        // 恢复失败，跳转登录
        if (errorResponse?.suggest_action === 'relogin') {
            this.handleCompleteLogout()
            throw new Error('Please login again')
        }
        
        throw error
    }
}
```

#### 场景 2: 强制登出检测

```typescript
// 在 API 拦截器中检测强制登出
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const errorResponse: TokenErrorResponse = error.response?.data
        
        // 检测强制登出
        if (errorResponse?.error_code === 'SESSION_REVOKED') {
            // 显示友好提示
            message.warning('您已在其他地方登出，请重新登录')
            
            // 清除本地数据
            clearAllAuthData()
            
            // 跳转登录
            window.location.href = '/login'
        }
        
        return Promise.reject(error)
    }
)
```

#### 场景 3: 配置错误处理

```typescript
if (errorResponse?.suggest_action === 'contact_admin') {
    Modal.error({
        title: '配置错误',
        content: `${errorResponse.error_description}\n\n请联系系统管理员。`,
        okText: '我知道了'
    })
}
```

---

## 使用示例

### 示例 1: 登录组件

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTokenErrorHandler } from '../hooks/useTokenErrorHandler'
import { ssoClient } from '../services/sso'

function LoginPage() {
    const navigate = useNavigate()
    const { handleError } = useTokenErrorHandler()
    const [loading, setLoading] = useState(false)
    
    const handleLogin = async (username: string, password: string) => {
        setLoading(true)
        
        try {
            const response = await ssoClient.login({
                username,
                password,
                grant_type: 'password'
            })
            
            // 登录成功
            console.log('✅ 登录成功')
            navigate('/dashboard')
        } catch (error: any) {
            console.error('❌ 登录失败:', error)
            
            // 使用统一错误处理
            const errorResponse = error.response?.data
            if (errorResponse?.error_code) {
                await handleError(errorResponse)
            } else {
                message.error('登录失败，请重试')
            }
        } finally {
            setLoading(false)
        }
    }
    
    return (
        <div>
            {/* 登录表单 */}
        </div>
    )
}
```

### 示例 2: 受保护的路由

```typescript
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTokenErrorHandler } from '../hooks/useTokenErrorHandler'
import { ssoClient } from '../services/sso'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { handleError } = useTokenErrorHandler()
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
    
    useEffect(() => {
        checkAuth()
    }, [])
    
    const checkAuth = async () => {
        try {
            // 检查并刷新 token
            const token = ssoClient.getAccessToken()
            
            if (!token) {
                setIsAuthenticated(false)
                return
            }
            
            // 如果 token 即将过期，自动刷新
            if (ssoClient.isTokenExpiringSoon()) {
                await ssoClient.refreshToken()
            }
            
            setIsAuthenticated(true)
        } catch (error: any) {
            const errorResponse = error.response?.data
            
            if (errorResponse?.error_code) {
                await handleError(errorResponse)
            }
            
            setIsAuthenticated(false)
        }
    }
    
    if (isAuthenticated === null) {
        return <div>Loading...</div>
    }
    
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }
    
    return <>{children}</>
}
```

### 示例 3: 自动 Token 刷新

```typescript
// 在 App 组件或根组件中设置
import { useEffect } from 'react'
import { useTokenErrorHandler } from '../hooks/useTokenErrorHandler'
import { ssoClient } from '../services/sso'

function App() {
    const { handleError } = useTokenErrorHandler()
    
    useEffect(() => {
        // 设置自动刷新
        const interval = setInterval(async () => {
            try {
                if (ssoClient.isTokenExpiringSoon()) {
                    console.log('🔄 自动刷新 token...')
                    await ssoClient.refreshToken()
                }
            } catch (error: any) {
                const errorResponse = error.response?.data
                if (errorResponse?.error_code) {
                    await handleError(errorResponse)
                }
            }
        }, 5 * 60 * 1000) // 每 5 分钟检查一次
        
        return () => clearInterval(interval)
    }, [handleError])
    
    return <div>{/* App content */}</div>
}
```

---

## 最佳实践

### 1. 统一错误处理

✅ **推荐**: 在 Axios 拦截器中统一处理
```typescript
// 所有请求自动处理
api.interceptors.response.use(null, async (error) => {
    await handleTokenError(error.response?.data, handlers)
    return Promise.reject(error)
})
```

❌ **不推荐**: 在每个请求中重复处理
```typescript
// 代码重复，难以维护
try {
    await api.get('/endpoint1')
} catch (error) {
    // 重复的错误处理代码
}

try {
    await api.get('/endpoint2')
} catch (error) {
    // 又是重复的错误处理代码
}
```

### 2. 优雅的用户提示

✅ **推荐**: 使用友好的错误消息
```typescript
onShowError: (message, severity) => {
    toast[severity](message) // "登录已过期，正在尝试恢复..."
}
```

❌ **不推荐**: 直接显示技术错误
```typescript
alert(error.error) // "invalid_grant"（用户看不懂）
```

### 3. Session 恢复优先

✅ **推荐**: 优先尝试 session 恢复
```typescript
if (suggest_action === 'check_session') {
    // 先尝试恢复，失败再跳转
    try {
        await recoverFromSession()
    } catch {
        redirectToLogin()
    }
}
```

❌ **不推荐**: 直接跳转登录
```typescript
// 用户体验差，每次都需要重新登录
redirectToLogin()
```

### 4. 错误日志

✅ **推荐**: 记录详细的错误信息
```typescript
console.log('Token错误:', {
    error_code: errorResponse.error_code,
    error_description: errorResponse.error_description,
    suggest_action: errorResponse.suggest_action,
    timestamp: new Date().toISOString()
})
```

### 5. 类型安全

✅ **推荐**: 使用 TypeScript 类型
```typescript
const errorResponse: TokenErrorResponse = error.response?.data

if (errorResponse?.error_code) {
    // TypeScript 会提供类型提示和检查
}
```

---

## 常见问题

### Q1: 如何判断是否为 Token 错误？

```typescript
function isTokenError(error: any): boolean {
    const errorResponse = error.response?.data
    return Boolean(
        errorResponse?.error_code &&
        errorResponse?.suggest_action
    )
}
```

### Q2: 如何处理网络错误？

```typescript
try {
    await api.get('/endpoint')
} catch (error: any) {
    if (isTokenError(error)) {
        // Token 错误
        await handleError(error.response.data)
    } else if (!error.response) {
        // 网络错误
        message.error('网络连接失败，请检查网络')
    } else {
        // 其他错误
        message.error('请求失败，请重试')
    }
}
```

### Q3: 如何测试错误处理？

```typescript
// 模拟错误响应
const mockError: TokenErrorResponse = {
    error: 'invalid_grant',
    error_code: 'REFRESH_TOKEN_EXPIRED',
    error_description: 'Refresh token has expired',
    suggest_action: 'check_session'
}

// 测试处理逻辑
await handleTokenError(mockError, handlers)
```

### Q4: 如何禁用自动 session 恢复？

```typescript
// 在特定场景下禁用自动恢复
await handleTokenError(errorResponse, {
    onCheckSession: undefined, // 禁用 session 恢复
    onRelogin: () => {
        navigate('/login')
    }
})
```

### Q5: 如何处理多个并发请求的错误？

```typescript
let isHandlingError = false

api.interceptors.response.use(null, async (error) => {
    if (isHandlingError) {
        // 避免重复处理
        return Promise.reject(error)
    }
    
    if (isTokenError(error)) {
        isHandlingError = true
        try {
            await handleTokenError(error.response.data, handlers)
        } finally {
            isHandlingError = false
        }
    }
    
    return Promise.reject(error)
})
```

---

## 调试技巧

### 1. 启用详细日志

```typescript
// 在开发环境中启用详细日志
if (process.env.NODE_ENV === 'development') {
    window.addEventListener('auth:token-refreshed', (e: any) => {
        console.log('🔄 Token已刷新:', e.detail)
    })
    
    window.addEventListener('auth:logout', () => {
        console.log('🚪 用户已登出')
    })
}
```

### 2. 使用 React DevTools

安装 React DevTools 浏览器扩展，检查组件状态和错误处理流程。

### 3. 网络请求监控

使用浏览器开发者工具的 Network 标签，查看 Token 请求和响应：
- 检查 HTTP 状态码
- 查看响应 body 中的 `error_code` 和 `suggest_action`
- 验证 Token 是否正确刷新

---

## 相关文档

- [错误码完整列表](../../Go/unit-auth/docs/TOKEN_ERROR_CODES.md)
- [Token 响应规范](../../Go/unit-auth/TOKEN_RESPONSE_IMPLEMENTATION_SUMMARY.md)
- [TypeScript 类型定义](./src/types/token.ts)
- [错误处理器源码](./src/utils/tokenErrorHandler.ts)

---

**最后更新**: 2025-10-29  
**版本**: v1.0.0

