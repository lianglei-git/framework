# Token刷新功能集成指南

## 🎯 概述

前端已完全支持双Token机制，并提供了丰富的Hooks供其他项目集成使用。这些Hooks封装了完整的Token管理功能，包括自动续签、状态监控、错误处理等。

## 📦 导入方式

```typescript
// 从Login-v1项目导入
import {
    useTokenRefresh,           // 完整Token刷新功能
    useTokenRefreshEvents,     // Token事件监听
    useTokenStatus,            // Token状态检查
    useSSOTokenRefresh,        // 简化集成接口
    useTokenPairLogin,         // 双Token登录
    type TokenRefreshResult,   // 类型定义
    type TokenStatus
} from 'login-v1/src/hooks'
```

## 🔧 核心Hooks详解

### 1. `useSSOTokenRefresh` - 推荐用于外部项目

这是最简洁的集成接口，专为其他项目设计：

```typescript
import { useSSOTokenRefresh } from 'login-v1/src/hooks'

function MyComponent() {
    const tokenRefresh = useSSOTokenRefresh()

    // 核心功能
    const handleLogin = async () => {
        const result = await tokenRefresh.loginWithTokenPair('user@example.com', 'password')
        if (result) {
            console.log('登录成功:', result.user)
            console.log('Access Token:', result.access_token)
            console.log('Refresh Token:', result.refresh_token)
        }
    }

    const handleRefresh = async () => {
        const result = await tokenRefresh.refreshToken()
        if (result) {
            console.log('Token刷新成功:', result.access_token)
        }
    }

    // 状态管理
    const handleStartMonitoring = () => {
        tokenRefresh.startMonitoring() // 启动自动Token监控
    }

    const handleStopMonitoring = () => {
        tokenRefresh.stopMonitoring() // 停止Token监控
    }

    // 状态检查
    const checkTokenValidity = async () => {
        const isValid = await tokenRefresh.isTokenValid()
        console.log('Token是否有效:', isValid)
    }

    // 事件监听
    useEffect(() => {
        const unsubscribe = tokenRefresh.onTokenRefreshed((newToken: string) => {
            console.log('Token已刷新:', newToken)
            // 更新你的应用状态
        })

        return unsubscribe
    }, [])

    return (
        <div>
            <button onClick={handleLogin}>登录</button>
            <button onClick={handleRefresh}>刷新Token</button>
            <button onClick={handleStartMonitoring}>启动监控</button>
            <button onClick={handleStopMonitoring}>停止监控</button>
            <button onClick={checkTokenValidity}>检查Token</button>

            <p>监控状态: {tokenRefresh.isMonitoring ? '运行中' : '已停止'}</p>
            <p>刷新状态: {tokenRefresh.isRefreshing ? '刷新中' : '空闲'}</p>
        </div>
    )
}
```

### 2. `useTokenRefresh` - 完整功能Hook

提供完整的Token管理功能：

```typescript
import { useTokenRefresh, type TokenRefreshResult } from 'login-v1/src/hooks'

function AdvancedComponent() {
    const tokenRefresh = useTokenRefresh()

    // 双Token续签（推荐）
    const handleRefreshWithRefreshToken = async () => {
        const result: TokenRefreshResult | null = await tokenRefresh.refreshTokenWithRefreshToken()
        if (result) {
            console.log('双Token续签成功')
            console.log('新Access Token:', result.access_token)
            console.log('新Refresh Token:', result.refresh_token)
            console.log('用户信息:', result.user)
        }
    }

    // 传统Token续签（fallback）
    const handleSimpleRefresh = async () => {
        const success = await tokenRefresh.refreshToken()
        console.log('简单续签结果:', success)
    }

    // 双Token登录
    const handleTokenPairLogin = async () => {
        const result: TokenRefreshResult | null = await tokenRefresh.loginWithTokenPair('user@example.com', 'password')
        if (result) {
            console.log('双Token登录成功')
            console.log('用户信息:', result.user)
        }
    }

    // 状态管理
    const checkStatus = async () => {
        const status = await tokenRefresh.checkTokenStatus()
        console.log('Token状态:', status)
    }

    const scheduleRefresh = () => {
        // 1小时后刷新
        tokenRefresh.scheduleTokenRefresh(3600)
    }

    // 高级事件监听
    useEffect(() => {
        // Token刷新成功
        const unsubscribeRefresh = tokenRefresh.onTokenRefreshed((token: string) => {
            console.log('Token刷新成功:', token)
        })

        // Token过期
        const unsubscribeExpired = tokenRefresh.onTokenExpired(() => {
            console.log('Token已过期')
        })

        // 刷新错误
        const unsubscribeError = tokenRefresh.onRefreshError((error: Error) => {
            console.error('Token刷新失败:', error)
        })

        return () => {
            unsubscribeRefresh()
            unsubscribeExpired()
            unsubscribeError()
        }
    }, [])

    return (
        <div>
            <h3>高级Token管理</h3>
            <button onClick={handleRefreshWithRefreshToken}>双Token续签</button>
            <button onClick={handleSimpleRefresh}>简单续签</button>
            <button onClick={handleTokenPairLogin}>双Token登录</button>
            <button onClick={checkStatus}>检查状态</button>
            <button onClick={scheduleRefresh}>定时刷新</button>

            <p>监控中: {tokenRefresh.isMonitoring ? '是' : '否'}</p>
            <p>刷新中: {tokenRefresh.isRefreshing ? '是' : '否'}</p>
            <p>最后刷新: {tokenRefresh.lastRefreshTime ? new Date(tokenRefresh.lastRefreshTime).toLocaleString() : '从未'}</p>
            <p>下次刷新: {tokenRefresh.nextRefreshTime ? new Date(tokenRefresh.nextRefreshTime).toLocaleString() : '未设置'}</p>
        </div>
    )
}
```

### 3. `useTokenRefreshEvents` - 事件监听Hook

用于监听Token相关事件：

```typescript
import { useTokenRefreshEvents } from 'login-v1/src/hooks'

function EventListenerComponent() {
    const { lastRefresh, refreshError, clearError } = useTokenRefreshEvents()

    useEffect(() => {
        if (lastRefresh) {
            console.log('Token最后刷新时间:', new Date(lastRefresh).toLocaleString())
        }
    }, [lastRefresh])

    useEffect(() => {
        if (refreshError) {
            console.error('Token刷新错误:', refreshError)
            clearError() // 清除错误状态
        }
    }, [refreshError, clearError])

    return (
        <div>
            <h3>Token事件监听</h3>
            <p>最后刷新: {lastRefresh ? new Date(lastRefresh).toLocaleString() : '无'}</p>
            <p>错误信息: {refreshError ? refreshError.message : '无'}</p>
            {refreshError && <button onClick={clearError}>清除错误</button>}
        </div>
    )
}
```

### 4. `useTokenStatus` - 状态检查Hook

专门用于Token状态检查：

```typescript
import { useTokenStatus } from 'login-v1/src/hooks'

function StatusCheckComponent() {
    const { status, loading, checkStatus, isValid, isExpiringSoon, remainingHours } = useTokenStatus()

    const handleCheckStatus = async () => {
        await checkStatus()
    }

    return (
        <div>
            <h3>Token状态检查</h3>
            <button onClick={handleCheckStatus} disabled={loading}>
                {loading ? '检查中...' : '检查状态'}
            </button>

            {status && (
                <div>
                    <p>Token有效: {isValid ? '是' : '否'}</p>
                    <p>即将过期: {isExpiringSoon ? '是' : '否'}</p>
                    <p>剩余小时: {remainingHours}</p>
                    <p>过期时间: {status.expires_at}</p>
                    <p>Token类型: {status.token_type}</p>
                </div>
            )}
        </div>
    )
}
```

### 5. `useTokenPairLogin` - 双Token登录Hook

专门处理双Token登录：

```typescript
import { useTokenPairLogin } from 'login-v1/src/hooks'

function LoginComponent() {
    const [credentials, setCredentials] = useState({ account: '', password: '' })
    const { login, isLoading, error, clearError } = useTokenPairLogin()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            const result = await login(credentials.account, credentials.password)
            console.log('登录成功:', result)
            // 处理登录成功逻辑
        } catch (error) {
            console.error('登录失败:', error)
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <h3>双Token登录</h3>
            <input
                type="text"
                placeholder="账号"
                value={credentials.account}
                onChange={(e) => setCredentials(prev => ({ ...prev, account: e.target.value }))}
            />
            <input
                type="password"
                placeholder="密码"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
            />
            <button type="submit" disabled={isLoading}>
                {isLoading ? '登录中...' : '登录'}
            </button>

            {error && (
                <div>
                    <p>错误: {error}</p>
                    <button onClick={clearError}>清除错误</button>
                </div>
            )}
        </form>
    )
}
```

## 📋 类型定义

### TokenRefreshResult
```typescript
interface TokenRefreshResult {
    access_token: string      // 新Access Token
    refresh_token?: string    // 新Refresh Token
    token_type: string        // Token类型
    expires_in: number        // Access Token过期时间(秒)
    refresh_expires_in?: number // Refresh Token过期时间(秒)
    user_id: string          // 用户ID
    email: string            // 用户邮箱
    role: string             // 用户角色
    user?: any               // 用户信息对象
}
```

### TokenStatus
```typescript
interface TokenStatus {
    is_valid: boolean        // Token是否有效
    expires_at: string       // 过期时间
    remaining_hours: number  // 剩余小时数
    remaining_minutes: number // 剩余分钟数
    is_expiring_soon: boolean // 是否即将过期
    token_type: string       // Token类型
}
```

## 🎯 使用建议

### 1. **新项目集成**
```typescript
// 推荐使用最简洁的接口
import { useSSOTokenRefresh } from 'login-v1/src/hooks'

const tokenRefresh = useSSOTokenRefresh()
// 使用tokenRefresh的所有功能
```

### 2. **现有项目扩展**
```typescript
// 如果已有Token管理，可以只使用特定功能
import { useTokenStatus, useTokenRefreshEvents } from 'login-v1/src/hooks'

const { isValid, checkStatus } = useTokenStatus()
const { lastRefresh, refreshError } = useTokenRefreshEvents()
```

### 3. **事件驱动开发**
```typescript
// 监听Token事件来驱动应用状态更新
import { useTokenRefresh } from 'login-v1/src/hooks'

const tokenRefresh = useTokenRefresh()

useEffect(() => {
    const unsubscribe = tokenRefresh.onTokenRefreshed((newToken) => {
        // 自动更新应用中的Token状态
        updateAppToken(newToken)
    })

    return unsubscribe
}, [])
```

## 🔐 安全注意事项

1. **Token存储**: Refresh Token会自动存储在localStorage中
2. **自动清理**: 无效或过期的Refresh Token会自动清除
3. **错误处理**: 所有Token操作都有完善的错误处理
4. **事件安全**: 事件监听器会自动清理，防止内存泄漏

## 🎉 总结

前端已完全支持双Token机制，并提供了多种集成方式：

✅ **完整功能**: 支持双Token登录和续签
✅ **多种接口**: 从简洁到完整，满足不同需求
✅ **类型安全**: 完整的TypeScript类型定义
✅ **事件驱动**: 丰富的事件监听机制
✅ **状态管理**: 完整的状态跟踪和错误处理
✅ **易于集成**: 专为其他项目设计的简化接口

这些Hooks为其他项目提供了完整的Token管理解决方案，无需重复开发！🚀
