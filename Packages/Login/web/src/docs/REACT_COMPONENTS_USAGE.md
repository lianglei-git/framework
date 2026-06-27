# React组件使用说明

## 📁 组件文件结构

```
Login-v1/src/components/
├── TestTokenRefresh.tsx    # Token自动续签测试组件
├── TokenStatus.tsx         # Token状态显示组件
├── App.tsx                 # 主应用组件示例
└── useTokenRefresh.ts      # Token续签Hook (可选)
```

## 🚀 组件功能说明

### 1. TestTokenRefresh.tsx - 完整测试组件

这是一个功能完整的Token自动续签测试组件，包含：

#### 主要功能
- ✅ **登录测试**: 支持普通登录和记住我登录
- ✅ **Token状态检查**: 实时查看token详细信息
- ✅ **手动续签**: 支持手动续签token
- ✅ **自动监控**: 启动/停止token自动监控
- ✅ **API测试**: 测试API调用和自动续签
- ✅ **事件监听**: 实时显示token相关事件
- ✅ **操作日志**: 记录所有操作和状态变化

#### 使用方法

```tsx
import TestTokenRefresh from './src/components/TestTokenRefresh'

function MyApp() {
    return (
        <div>
            <TestTokenRefresh />
        </div>
    )
}
```

#### 组件特性
- **响应式设计**: 适配不同屏幕尺寸
- **实时状态**: 显示token状态、监控状态、登录状态
- **错误处理**: 完善的错误显示和处理
- **日志系统**: 详细的操作日志和事件日志
- **用户友好**: 清晰的界面和操作提示

### 2. TokenStatus.tsx - Token状态组件

这是一个轻量级的Token状态显示组件，适合集成到现有应用中：

#### 主要功能
- ✅ **Token状态显示**: 显示token的有效性、过期时间、剩余时间
- ✅ **进度条**: 可视化显示token有效期进度
- ✅ **手动续签**: 支持手动续签token
- ✅ **监控控制**: 启动/停止token监控
- ✅ **状态检查**: 实时检查token状态

#### 使用方法

```tsx
import TokenStatus from './src/components/TokenStatus'

function UserProfile() {
    return (
        <div>
            <h2>用户信息</h2>
            <TokenStatus />
            {/* 其他用户信息 */}
        </div>
    )
}
```

#### 组件特性
- **轻量级**: 专注于token状态显示
- **可集成**: 易于集成到现有组件中
- **实时更新**: 自动更新token状态
- **用户友好**: 清晰的状态显示和操作按钮

### 3. App.tsx - 主应用组件示例

这是一个完整的使用示例，展示如何组织Token相关功能：

#### 主要功能
- ✅ **登录管理**: 用户登录和退出
- ✅ **导航系统**: 在不同功能页面间切换
- ✅ **状态管理**: 基于登录状态显示不同内容
- ✅ **组件集成**: 集成TokenStatus和TestTokenRefresh组件

#### 使用方法

```tsx
import App from './src/components/App'

function Root() {
    return <App />
}
```

#### 组件特性
- **完整示例**: 展示完整的应用结构
- **状态管理**: 基于MobX的用户状态管理
- **路由功能**: 简单的页面切换功能
- **响应式设计**: 适配不同设备

### 4. useTokenRefresh.ts - React Hook (可选)

这是一个自定义Hook，提供Token续签功能的封装：

#### 主要功能
- ✅ **状态管理**: 管理token状态、监控状态、加载状态
- ✅ **方法封装**: 封装token检查、续签、登录等方法
- ✅ **事件监听**: 提供token事件监听功能
- ✅ **自动管理**: 自动处理登录状态变化

#### 使用方法

```tsx
import { useTokenRefresh } from './src/hooks/useTokenRefresh'

function MyComponent() {
    const {
        isMonitoring,
        tokenStatus,
        isLoading,
        error,
        startMonitoring,
        stopMonitoring,
        checkTokenStatus,
        refreshToken,
        onTokenRefreshed,
        onAuthExpired
    } = useTokenRefresh()

    useEffect(() => {
        // 监听token续签事件
        const cleanup = onTokenRefreshed((newToken) => {
            console.log('Token已更新:', newToken)
        })

        return cleanup
    }, [onTokenRefreshed])

    return (
        <div>
            {tokenStatus && (
                <div>
                    <p>Token剩余时间: {tokenStatus.remaining_hours}小时</p>
                    <button onClick={refreshToken}>续签Token</button>
                </div>
            )}
        </div>
    )
}
```

## 🔧 集成指南

### 1. 基础集成

```tsx
// 在现有应用中集成TokenStatus组件
import TokenStatus from './src/components/TokenStatus'

function Dashboard() {
    return (
        <div>
            <h1>仪表板</h1>
            <TokenStatus />
            {/* 其他仪表板内容 */}
        </div>
    )
}
```

### 2. 高级集成

```tsx
// 使用Hook进行更精细的控制
import { useTokenRefresh } from './src/hooks/useTokenRefresh'

function AdvancedTokenManager() {
    const {
        isMonitoring,
        tokenStatus,
        startMonitoring,
        stopMonitoring,
        refreshToken
    } = useTokenRefresh()

    return (
        <div>
            <h2>Token管理</h2>
            <button onClick={isMonitoring ? stopMonitoring : startMonitoring}>
                {isMonitoring ? '停止监控' : '启动监控'}
            </button>
            <button onClick={refreshToken}>手动续签</button>
            {tokenStatus && (
                <div>
                    <p>状态: {tokenStatus.is_valid ? '有效' : '无效'}</p>
                    <p>剩余时间: {tokenStatus.remaining_hours}小时</p>
                </div>
            )}
        </div>
    )
}
```

### 3. 事件监听集成

```tsx
// 监听token相关事件
import { useEffect } from 'react'

function TokenEventListener() {
    useEffect(() => {
        const handleTokenRefreshed = (event: CustomEvent) => {
            console.log('Token已续签:', event.detail.newToken)
            // 更新UI或执行其他操作
        }

        const handleAuthExpired = () => {
            console.log('用户认证已过期')
            // 跳转到登录页或显示提示
        }

        window.addEventListener('token:refreshed', handleTokenRefreshed as EventListener)
        window.addEventListener('token:auto-refreshed', handleTokenRefreshed as EventListener)
        window.addEventListener('auth:expired', handleAuthExpired)

        return () => {
            window.removeEventListener('token:refreshed', handleTokenRefreshed as EventListener)
            window.removeEventListener('token:auto-refreshed', handleTokenRefreshed as EventListener)
            window.removeEventListener('auth:expired', handleAuthExpired)
        }
    }, [])

    return <div>Token事件监听器已启动</div>
}
```

## 📊 组件对比

| 组件 | 用途 | 复杂度 | 集成难度 | 功能完整性 |
|------|------|--------|----------|------------|
| TestTokenRefresh | 完整测试 | 高 | 低 | 完整 |
| TokenStatus | 状态显示 | 中 | 低 | 基础 |
| App | 应用示例 | 中 | 中 | 完整 |
| useTokenRefresh | Hook封装 | 高 | 中 | 完整 |

## 🎯 使用建议

### 1. 开发阶段
- 使用 `TestTokenRefresh` 进行完整的功能测试
- 使用 `App` 组件作为应用架构参考

### 2. 生产环境
- 使用 `TokenStatus` 组件集成到用户界面
- 使用 `useTokenRefresh` Hook进行精细控制

### 3. 自定义开发
- 参考现有组件进行自定义开发
- 使用事件系统进行组件间通信
- 利用Hook进行状态管理

## 🔒 注意事项

1. **依赖管理**: 确保安装了必要的依赖包
2. **类型安全**: 使用TypeScript确保类型安全
3. **错误处理**: 妥善处理各种错误情况
4. **性能优化**: 避免不必要的重渲染
5. **用户体验**: 提供清晰的加载状态和错误提示

## 📝 总结

这些React组件提供了完整的Token自动续签功能，可以根据不同需求选择合适的组件进行集成：

- **TestTokenRefresh**: 适合开发和测试阶段
- **TokenStatus**: 适合生产环境集成
- **App**: 适合作为应用架构参考
- **useTokenRefresh**: 适合需要精细控制的场景

所有组件都经过精心设计，具有良好的可维护性和扩展性。🚀 