# Login-v1 模块化认证系统

## 概述

这是一个基于React和TypeScript的模块化认证系统，采用现代化的架构设计，支持多种登录方式、表单验证、状态管理和主题系统。

## 架构特点

### 1. 模块化设计
- **类型定义层** (`types/`): 完整的TypeScript类型定义
- **工具层** (`utils/`): 验证工具和存储管理
- **服务层** (`services/`): API服务封装
- **Hooks层** (`hooks/`): 自定义React Hooks
- **组件层** (`components/`): 可复用的UI组件
- **样式层** (`styles/`): Less样式系统和主题支持

### 2. 功能特性
- ✅ 多种登录方式（邮箱、手机号、用户名）
- ✅ 手机验证码登录
- ✅ 用户注册
- ✅ 密码重置
- ✅ 表单验证
- ✅ 状态管理
- ✅ 主题支持（浅色/深色）
- ✅ 移动端适配
- ✅ 响应式设计
- ✅ 无障碍支持
- ✅ **双Token机制**（Access Token + Refresh Token）
- ✅ **自动Token续签**（智能监控和自动刷新）
- ✅ **Token状态管理**（实时状态检查和过期提醒）
- ✅ **其他项目集成Hooks**（开箱即用的Token管理）
- ✅ **SSO URL处理**（支持OAuth 2.1和OpenID Connect）
- ✅ **外部应用集成**（支持通过URL跳转的SSO场景）
- ✅ **PKCE支持**（Proof Key for Code Exchange）
- ✅ **多种授权流程**（授权码、隐式、混合流程）
- ✅ **子项目SSO集成**（支持第三方应用的完整SSO集成）
- ✅ **子项目配置管理**（灵活的子项目配置系统）
- ✅ **品牌化定制**（支持子项目的品牌化定制）
- ✅ **权限管理**（细粒度的权限控制系统）
- ✅ **多环境支持**（开发、测试、生产环境配置）

## 目录结构

```
src/
├── config/                   # 配置层
│   └── subproject-integration.ts # **子项目集成配置**
├── types/                    # 类型定义层
│   └── index.ts             # 完整的TypeScript类型定义
├── utils/                    # 工具层
│   ├── validation.ts        # 表单验证工具
│   └── storage.ts           # 存储管理工具
├── services/                 # 服务层
│   ├── api.ts               # API服务封装
│   ├── tokenRefreshService.ts # **Token自动刷新服务**
│   └── sso.ts               # SSO单点登录服务
├── hooks/                    # 自定义Hooks层
│   ├── useAuth.ts           # 认证状态管理
│   ├── useForm.ts           # 表单状态管理
│   ├── useTokenRefresh.ts   # **Token刷新管理（供外部项目集成）**
│   ├── useSSOUrlHandler.ts  # **SSO URL处理（支持OAuth/OpenID Connect）**
│   ├── useSubProjectSSO.ts  # **子项目SSO集成Hook**
│   └── index.ts             # Hooks导出入口
├── components/               # 组件层
│   ├── common/              # 通用组件
│   │   ├── Button.tsx       # 按钮组件
│   │   ├── Input.tsx        # 输入框组件
│   │   ├── Loading.tsx      # 加载组件
│   │   ├── Button.less      # 按钮样式
│   │   ├── Input.less       # 输入框样式
│   │   └── Loading.less     # 加载组件样式
│   ├── SubProjectIntegrationExample.tsx # 子项目集成示例
│   └── auth/                # 认证组件
│       └── SSOCallback.tsx   # SSO回调处理组件
├── examples/                 # 示例代码
│   └── SubProjectIntegrationDemo.tsx # 子项目集成演示
└── styles/                   # 样式层
    ├── variables.less       # 样式变量
    └── index.less           # 主样式文件
```

## 🚀 子项目SSO集成

### 概述

子项目SSO集成功能允许第三方应用轻松集成Sparrow SSO系统，实现统一的用户认证体验。子项目无需重复开发登录功能，只需简单配置即可获得完整的SSO能力。

### 核心特性

- ✅ **URL驱动配置**: 支持通过URL参数动态配置SSO参数
- ✅ **OAuth 2.1 & OpenID Connect**: 完全兼容OAuth 2.1和OpenID Connect协议
- ✅ **多提供商支持**: 支持本地登录、GitHub、Google、微信等
- ✅ **自动令牌刷新**: 透明的令牌刷新机制，无需用户干预
- ✅ **会话管理**: 完整的会话生命周期管理
- ✅ **React Hooks**: 提供开箱即用的React Hooks
- ✅ **类型安全**: 完整的TypeScript类型定义
- ✅ **品牌化定制**: 支持子项目的品牌化定制
- ✅ **权限管理**: 细粒度的权限控制系统

### 快速开始

#### 1. 安装和配置

```typescript
import { useSubProjectSSO } from 'your-sso-sdk'

function YourApp() {
    const {
        isAuthenticated,
        user,
        login,
        logout,
        isLoading
    } = useSubProjectSSO({
        subProjectId: 'your-project-id',
        onSuccess: (user, token, session) => {
            console.log('登录成功:', user)
        },
        onError: (error) => {
            console.error('登录失败:', error)
        }
    })

    return (
        <div>
            {isLoading ? (
                <div>加载中...</div>
            ) : isAuthenticated ? (
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

#### 2. 子项目配置

```typescript
// 配置子项目信息
const SUBPROJECT_CONFIG = {
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

### 集成文档

📚 详细的集成文档请参考 [`SUBPROJECT_INTEGRATION_README.md`](SUBPROJECT_INTEGRATION_README.md)

### 演示示例

🎯 完整的集成示例请参考 [`src/examples/SubProjectIntegrationDemo.tsx`](src/examples/SubProjectIntegrationDemo.tsx)

## 核心模块

### 类型系统 (`types/index.ts`)
- 基础类型：`User`, `BaseResponse`
- 认证类型：`LoginRequest`, `RegisterRequest`
- 表单类型：`LoginFormData`, `RegisterFormData`
- 组件类型：`ButtonProps`, `InputProps`, `LoadingProps`

### 验证工具 (`utils/validation.ts`)
```typescript
// 预定义验证函数
validateEmail(email: string): boolean
validatePhone(phone: string): boolean
validatePassword(password: string): PasswordValidationResult

// 表单验证
validateLoginForm(data: LoginFormData): ValidationError[]
validateRegisterForm(data: RegisterFormData): ValidationError[]

// 通用验证器
const validator = new Validator()
  .required(value, field)
  .email(value, field)
  .minLength(value, min, field)
```

### 存储管理 (`utils/storage.ts`)
```typescript
// 认证数据存储
storage.saveAuth(authData)
storage.getAuth()
storage.clearAuth()

// 主题和语言
storage.saveTheme(theme)
storage.getTheme()
```

## 🔄 Token刷新功能

### 概述
系统完全支持**双Token机制**（Access Token + Refresh Token），并提供完整的自动续签功能。特别设计了丰富的Hooks供其他项目集成使用。

### 核心服务 (`services/tokenRefreshService.ts`)
```typescript
import tokenRefreshService from '../services/tokenRefreshService'

// 双Token登录
const result = await tokenRefreshService.loginWithTokenPair(account, password)

// 双Token续签（推荐）
const result = await tokenRefreshService.refreshTokenWithRefreshToken()

// 简单Token续签（fallback）
const result = await tokenRefreshService.refreshToken()

// 记住我登录
const result = await tokenRefreshService.loginWithRememberMe(account, password)

// 检查Token状态
const status = await tokenRefreshService.checkTokenStatus()

// 启动自动监控
tokenRefreshService.startTokenMonitoring()

// 停止监控
tokenRefreshService.stopTokenMonitoring()
```

### 集成Hooks (`hooks/useTokenRefresh.ts`)

#### 1. `useSSOTokenRefresh` - 推荐用于外部项目
```typescript
import { useSSOTokenRefresh } from 'login-v1/src/hooks'

function MyComponent() {
    const tokenRefresh = useSSOTokenRefresh()

    // 核心功能
    const handleLogin = async () => {
        const result = await tokenRefresh.loginWithTokenPair('user@example.com', 'password')
        if (result) {
            console.log('登录成功:', result.user)
        }
    }

    // 状态管理
    const handleStartMonitoring = () => {
        tokenRefresh.startMonitoring() // 启动自动Token监控
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
            <button onClick={handleStartMonitoring}>启动监控</button>
            <p>监控状态: {tokenRefresh.isMonitoring ? '运行中' : '已停止'}</p>
        </div>
    )
}
```

#### 2. `useTokenRefresh` - 完整功能Hook
```typescript
import { useTokenRefresh } from 'login-v1/src/hooks'

function AdvancedComponent() {
    const tokenRefresh = useTokenRefresh()

    // 双Token续签
    const handleRefreshWithRefreshToken = async () => {
        const result = await tokenRefresh.refreshTokenWithRefreshToken()
        if (result) {
            console.log('双Token续签成功')
            console.log('用户信息:', result.user)
        }
    }

    // 高级事件监听
    useEffect(() => {
        const unsubscribe = tokenRefresh.onTokenRefreshed((token: string) => {
            console.log('Token刷新成功:', token)
        })
        return unsubscribe
    }, [])

    return (
        <div>
            <button onClick={handleRefreshWithRefreshToken}>双Token续签</button>
            <p>监控中: {tokenRefresh.isMonitoring ? '是' : '否'}</p>
        </div>
    )
}
```

### 安全特性
- ✅ **Token轮换**: 每次使用后自动更新Refresh Token
- ✅ **单点登录**: 登录时自动撤销其他设备的Token
- ✅ **哈希存储**: Refresh Token以SHA256哈希形式存储
- ✅ **自动过期**: 7天后自动失效
- ✅ **错误处理**: 完善的错误处理和重试机制

## 🌐 SSO URL处理功能

### 概述
系统支持**OAuth 2.1**和**OpenID Connect**协议，专门处理通过URL跳转进入的SSO场景。支持动态配置提取、PKCE、多种授权流程等。

### 核心服务 (`services/sso.ts`)
```typescript
import { SSOService } from '../services/sso'

// 创建SSO服务（自动从URL参数提取配置）
const ssoService = new SSOService(createDefaultSSOConfig())

// 检查是否是回调模式
if (ssoService.isInCallbackMode()) {
    // 自动处理OAuth回调
    const result = await ssoService.handleAutomaticSSO()
}

// 构建授权URL（支持PKCE）
const authUrl = ssoService.buildAuthorizationUrl('local', {
    response_type: 'code',
    scope: ['openid', 'profile', 'email']
})

// 构建隐式流程URL
const implicitUrl = ssoService.buildImplicitFlowUrl('local')

// 构建混合流程URL
const hybridUrl = ssoService.buildHybridFlowUrl('local')
```

### 集成Hooks (`hooks/useSSOUrlHandler.ts`)

#### 1. `useExternalSSOIntegration` - 外部应用SSO集成
```typescript
import { useExternalSSOIntegration } from 'login-v1/src/hooks'

function ExternalApp() {
    const sso = useExternalSSOIntegration()

    // 自动处理SSO流程
    useEffect(() => {
        // 检查是否有授权请求参数
        if (sso.hasAuthorizationRequest()) {
            sso.initiateAuthorization() // 自动重定向到授权端点
        }

        // 检查是否是回调模式
        if (sso.isCallbackMode) {
            // 自动处理回调
        }
    }, [])

    return (
        <div>
            <p>SSO状态: {sso.isInitialized ? '已初始化' : '初始化中'}</p>
            {sso.userInfo && (
                <p>用户: {sso.userInfo.name}</p>
            )}
        </div>
    )
}
```

#### 2. `useOpenIDConnect` - OpenID Connect集成
```typescript
import { useOpenIDConnect } from 'login-v1/src/hooks'

function OIDCApp() {
    const oidc = useOpenIDConnect()

    // 处理ID Token
    const handleIDToken = async (token: string) => {
        const user = await oidc.handleIDToken(token)
        console.log('ID Token解析成功:', user)
    }

    // 验证ID Token
    const validateToken = async (token: string) => {
        const result = await oidc.validateIDToken(token)
        console.log('Token验证结果:', result.is_valid)
    }

    return (
        <div>
            <button onClick={() => handleIDToken('your-id-token')}>
                处理ID Token
            </button>
            <button onClick={() => validateToken('your-id-token')}>
                验证Token
            </button>
        </div>
    )
}
```

### 支持的URL参数
系统支持以下URL参数来驱动SSO流程：

#### 基础参数
- `client_id` - 客户端ID
- `redirect_uri` - 回调URL
- `response_type` - 响应类型 (`code`, `token`, `id_token`)
- `scope` - 请求的作用域
- `state` - 状态参数

#### OAuth 2.1参数
- `code_challenge` - PKCE代码挑战
- `code_challenge_method` - PKCE方法 (`S256`, `plain`)
- `prompt` - 授权提示 (`none`, `login`, `consent`, `select_account`)
- `max_age` - 最大认证时间
- `login_hint` - 登录提示

#### OpenID Connect参数
- `nonce` - 随机数
- `display` - 显示模式 (`page`, `popup`, `touch`, `wap`)
- `ui_locales` - UI语言
- `acr_values` - 认证上下文类引用

### 安全特性
- ✅ **PKCE支持**: 自动生成和验证Proof Key for Code Exchange
- ✅ **状态验证**: 严格的state参数验证
- ✅ **动态配置**: 从URL参数自动提取SSO配置
- ✅ **多种流程**: 支持授权码、隐式、混合流程
- ✅ **ID Token处理**: 完整的OpenID Connect ID Token支持
```

### API服务 (`services/api.ts`)
```typescript
// 认证API
authApi.login(data)
authApi.phoneLogin(data)
authApi.register(data)
authApi.sendEmailCode(email, type)

// 用户API
userApi.getProfile()
userApi.updateProfile(data)
userApi.changePassword(oldPassword, newPassword)
```

### 认证Hook (`hooks/useAuth.ts`)
```typescript
const auth = useAuth()

// 状态
auth.user, auth.token, auth.isAuthenticated

// 方法
auth.login(data)
auth.register(data)
auth.logout()
auth.sendEmailCode(email, type)
```

### 表单Hook (`hooks/useForm.ts`)
```typescript
const form = useForm({
  initialValues: { email: '', password: '' },
  validate: (values) => ({ /* 验证逻辑 */ })
})

// 状态
form.values, form.errors, form.isValid

// 方法
form.handleChange('email')(event)
form.handleSubmit(onSubmit)
```

### 通用组件

#### 按钮组件 (`components/common/Button.tsx`)
```typescript
<Button variant="primary" size="medium" loading={isLoading}>
  登录
</Button>

<PrimaryButton fullWidth>登录</PrimaryButton>
<DangerButton>删除</DangerButton>
```

#### 输入框组件 (`components/common/Input.tsx`)
```typescript
<Input
  type="email"
  placeholder="请输入邮箱"
  value={email}
  onChange={setEmail}
  error={errors.email}
  icon={<EmailIcon />}
  showPasswordToggle
/>
```

#### 加载组件 (`components/common/Loading.tsx`)
```typescript
<Loading type="spinner" size="medium" text="加载中..." />
<FullScreenLoading type="dots" />
```

## 样式系统

### 变量系统 (`styles/variables.less`)
- 颜色变量：`@bg-blue-500`, `@text-gray-600`
- 间距变量：`@spacing-4`, `@spacing-8`
- 字体变量：`@text-lg`, `@font-weight-medium`
- 阴影变量：`@shadow-md`, `@shadow-lg`

### 主题支持
- 浅色主题（默认）
- 深色主题（自动检测）
- 响应式设计
- 移动端优化

### 工具类
```less
.text-center, .font-bold, .text-lg
.bg-white, .bg-blue-500
.border, .rounded, .shadow-md
.p-4, .px-6, .py-8
.m-0, .mx-auto, .mt-4
.flex, .items-center, .justify-center
.w-full, .h-full, .relative
```

## 使用示例

### 基本登录组件
```typescript
import React from 'react'
import { useAuth, useForm, Button, Input, validateLoginForm } from './src'

const LoginForm: React.FC = () => {
  const auth = useAuth()
  
  const form = useForm({
    initialValues: {
      account: '',
      password: '',
      remember_me: false
    },
    validate: (values) => {
      const errors = validateLoginForm(values)
      return errors.reduce((acc, error) => {
        acc[error.field] = error.message
        return acc
      }, {} as Record<string, string>)
    }
  })

  const handleSubmit = async (values: LoginFormData) => {
    try {
      await auth.login(values)
      // 登录成功，跳转到首页
    } catch (error) {
      // 处理错误
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      <Input
        type="text"
        placeholder="请输入账号"
        value={form.values.account}
        onChange={(value) => form.setValue('account', value)}
        error={form.errors.account}
        fullWidth
      />
      
      <Input
        type="password"
        placeholder="请输入密码"
        value={form.values.password}
        onChange={(value) => form.setValue('password', value)}
        error={form.errors.password}
        fullWidth
      />
      
      <Button
        type="submit"
        variant="primary"
        fullWidth
        loading={auth.isLoading}
      >
        登录
      </Button>
    </form>
  )
}
```

### 手机验证码登录
```typescript
import React, { useState } from 'react'
import { useAuth, Button, Input, validatePhone } from './src'

const PhoneLoginForm: React.FC = () => {
  const auth = useAuth()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [countdown, setCountdown] = useState(0)

  const handleSendCode = async () => {
    if (!validatePhone(phone)) {
      alert('请输入正确的手机号')
      return
    }
    
    try {
      await auth.sendPhoneCode(phone, 'login')
      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (error) {
      alert('发送验证码失败')
    }
  }

  const handleSubmit = async () => {
    try {
      await auth.phoneLogin({ phone, code, remember_me: false })
      // 登录成功
    } catch (error) {
      alert('登录失败')
    }
  }

  return (
    <div>
      <Input
        type="tel"
        placeholder="请输入手机号"
        value={phone}
        onChange={setPhone}
        fullWidth
      />
      
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="请输入验证码"
          value={code}
          onChange={setCode}
          fullWidth
        />
        <Button
          onClick={handleSendCode}
          disabled={countdown > 0}
          variant="secondary"
        >
          {countdown > 0 ? `${countdown}s` : '发送验证码'}
        </Button>
      </div>
      
      <Button
        onClick={handleSubmit}
        variant="primary"
        fullWidth
        loading={auth.isLoading}
      >
        登录
      </Button>
    </div>
  )
}
```

## 开发指南

### 安装依赖
```bash
npm install react react-dom typescript
npm install --save-dev less less-loader
```

### 类型检查
```bash
npx tsc --noEmit
```

### 样式编译
```bash
npx lessc src/styles/index.less dist/styles.css
```

## 最佳实践

1. **类型安全**: 始终使用TypeScript类型定义
2. **组件复用**: 使用通用组件库
3. **状态管理**: 使用自定义Hooks管理状态
4. **表单验证**: 使用验证工具确保数据完整性
5. **错误处理**: 统一的错误处理机制
6. **响应式设计**: 支持移动端和桌面端
7. **主题支持**: 自动适配浅色/深色主题
8. **无障碍**: 支持键盘导航和屏幕阅读器

## 🚀 外部项目集成

### Token刷新功能集成
系统提供了丰富的Hooks和类型定义，专为其他项目集成Token刷新功能而设计：

#### 1. 基础集成（推荐）
```typescript
// 最简洁的集成方式
import { useSSOTokenRefresh } from 'login-v1/src/hooks'

function MyApp() {
    const tokenRefresh = useSSOTokenRefresh()

    // 登录
    const handleLogin = async () => {
        const result = await tokenRefresh.loginWithTokenPair('user@example.com', 'password')
        console.log('登录成功:', result.user)
    }

    // 启动自动Token监控
    useEffect(() => {
        tokenRefresh.startMonitoring()
        return () => tokenRefresh.stopMonitoring()
    }, [])

    // 监听Token刷新事件
    useEffect(() => {
        const unsubscribe = tokenRefresh.onTokenRefreshed((newToken) => {
            console.log('Token已刷新:', newToken)
            // 更新你的应用状态
        })
        return unsubscribe
    }, [])

    return <button onClick={handleLogin}>登录</button>
}
```

#### 2. 高级集成
```typescript
// 完整功能集成
import { useTokenRefresh, useTokenStatus } from 'login-v1/src/hooks'

function AdvancedApp() {
    const tokenRefresh = useTokenRefresh()
    const { status, isValid, isExpiringSoon } = useTokenStatus()

    // 双Token续签
    const handleRefresh = async () => {
        const result = await tokenRefresh.refreshTokenWithRefreshToken()
        console.log('刷新结果:', result)
    }

    // Token状态监听
    useEffect(() => {
        if (isExpiringSoon) {
            console.log('Token即将过期，准备续签')
        }
    }, [isExpiringSoon])

    return (
        <div>
            <p>Token有效: {isValid ? '是' : '否'}</p>
            <button onClick={handleRefresh}>刷新Token</button>
        </div>
    )
}
```

#### 3. 事件驱动集成
```typescript
// 基于事件的集成方式
import { useTokenRefreshEvents } from 'login-v1/src/hooks'

function EventDrivenApp() {
    const { lastRefresh, refreshError } = useTokenRefreshEvents()

    // 响应Token刷新事件
    useEffect(() => {
        if (lastRefresh) {
            console.log('Token最后刷新时间:', new Date(lastRefresh).toLocaleString())
            // 触发你的业务逻辑
        }
    }, [lastRefresh])

    return <div>Token状态已自动管理</div>
}
```

### SSO URL处理集成
系统还支持**OAuth 2.1**和**OpenID Connect**协议，专门处理通过URL跳转进入的SSO场景：

#### 1. 外部应用SSO集成
```typescript
// 外部应用通过URL跳转进入的场景
import { useExternalSSOIntegration } from 'login-v1/src/hooks'

function ExternalApp() {
    const sso = useExternalSSOIntegration()

    // 自动处理SSO流程
    useEffect(() => {
        // 检查是否有授权请求参数
        if (sso.hasAuthorizationRequest()) {
            // 自动重定向到授权端点
            sso.initiateAuthorization()
        }

        // 检查是否是回调模式
        if (sso.isCallbackMode) {
            // 自动处理OAuth回调
            // 结果会自动存储到authResult和userInfo中
        }
    }, [sso.isInitialized])

    return (
        <div>
            <p>SSO状态: {sso.isInitialized ? '已初始化' : '初始化中'}</p>
            {sso.userInfo && (
                <div>
                    <p>欢迎: {sso.userInfo.name}</p>
                    <p>邮箱: {sso.userInfo.email}</p>
                </div>
            )}
        </div>
    )
}
```

#### 2. OpenID Connect集成
```typescript
// OpenID Connect专用集成
import { useOpenIDConnect } from 'login-v1/src/hooks'

function OIDCApp() {
    const oidc = useOpenIDConnect()

    // 处理ID Token
    const handleIDToken = async (idToken: string) => {
        try {
            const user = await oidc.handleIDToken(idToken)
            console.log('ID Token解析成功:', user)
        } catch (error) {
            console.error('ID Token处理失败:', error)
        }
    }

    // 验证ID Token
    const validateToken = async (token: string) => {
        try {
            const result = await oidc.validateIDToken(token)
            console.log('Token验证结果:', result.is_valid)
            return result
        } catch (error) {
            console.error('Token验证失败:', error)
            return { is_valid: false, error: error.message }
        }
    }

    return (
        <div>
            <button onClick={() => handleIDToken('your-id-token')}>
                处理ID Token
            </button>
            <button onClick={() => validateToken('your-id-token')}>
                验证Token
            </button>
        </div>
    )
}
```

#### 3. 直接使用SSO服务
```typescript
// 直接使用SSO服务进行集成
import { SSOService, createDefaultSSOConfig } from 'login-v1/src/services/sso'

function DirectSSOApp() {
    const [ssoService] = useState(() => new SSOService(createDefaultSSOConfig()))

    // 构建授权URL（支持PKCE）
    const buildAuthUrl = () => {
        return ssoService.buildAuthorizationUrl('local', {
            response_type: 'code',
            scope: ['openid', 'profile', 'email'],
            state: 'random-state-123'
        })
    }

    // 处理回调
    const handleCallback = async () => {
        if (ssoService.isInCallbackMode()) {
            const result = await ssoService.handleAutomaticSSO()
            console.log('SSO认证结果:', result)
            return result
        }
    }

    return (
        <div>
            <a href={buildAuthUrl()}>使用SSO登录</a>
            <button onClick={handleCallback}>处理回调</button>
        </div>
    )
}
```

### 支持的URL参数
系统支持以下URL参数来驱动SSO流程：

#### 基础OAuth参数
- `client_id` - 客户端ID
- `redirect_uri` - 回调URL
- `response_type` - 响应类型 (`code`, `token`, `id_token`)
- `scope` - 请求的作用域
- `state` - 状态参数

#### 高级OAuth 2.1参数
- `code_challenge` - PKCE代码挑战
- `code_challenge_method` - PKCE方法 (`S256`, `plain`)
- `prompt` - 授权提示 (`none`, `login`, `consent`, `select_account`)
- `max_age` - 最大认证时间
- `login_hint` - 登录提示

#### OpenID Connect参数
- `nonce` - 随机数
- `display` - 显示模式 (`page`, `popup`, `touch`, `wap`)
- `ui_locales` - UI语言
- `acr_values` - 认证上下文类引用

### 集成优势
- ✅ **开箱即用**: 无需重复开发Token管理逻辑
- ✅ **类型安全**: 完整的TypeScript类型定义
- ✅ **自动续签**: 智能的Token监控和自动刷新
- ✅ **错误处理**: 完善的错误处理和重试机制
- ✅ **状态同步**: 自动与全局状态保持同步
- ✅ **事件驱动**: 丰富的事件系统便于集成
- ✅ **SSO支持**: 完整的OAuth 2.1和OpenID Connect支持
- ✅ **PKCE支持**: 自动生成和验证Proof Key for Code Exchange
- ✅ **URL驱动**: 支持通过URL参数驱动的SSO场景

### 导入路径
```typescript
// 从Login-v1项目导入
import {
    useSSOTokenRefresh,        // Token刷新（推荐用于外部项目）
    useTokenRefresh,           // 完整Token功能
    useTokenRefreshEvents,     // Token事件监听
    useTokenStatus,            // Token状态检查
    useTokenPairLogin,         // 双Token登录
    useSSOUrlHandler,          // SSO URL处理
    useExternalSSOIntegration, // 外部应用SSO集成
    useOpenIDConnect,          // OpenID Connect集成
    type TokenRefreshResult,   // 类型定义
    type TokenStatus,
    type SSOLoginResponse,
    type SSOUser
} from 'login-v1/src/hooks'

// 或者直接导入SSO服务
import { SSOService, createDefaultSSOConfig } from 'login-v1/src/services/sso'
```

### 安全注意事项
1. **Token存储**: Refresh Token自动存储在localStorage中
2. **自动清理**: 无效Token会自动清除
3. **PKCE支持**: 自动生成和验证Proof Key for Code Exchange
4. **状态验证**: 严格的state参数验证
5. **错误处理**: 所有操作都有完善的错误处理
6. **内存安全**: 事件监听器会自动清理

## 扩展指南

### 添加新的登录方式
1. 在 `types/index.ts` 中添加新的类型定义
2. 在 `services/api.ts` 中添加API方法
3. 在 `hooks/useAuth.ts` 中添加认证逻辑
4. 在 `utils/validation.ts` 中添加验证规则

### 添加新的UI组件
1. 在 `components/common/` 中创建组件文件
2. 在 `types/index.ts` 中添加组件类型定义
3. 创建对应的Less样式文件
4. 在 `components/common/index.ts` 中导出

### 自定义主题
1. 修改 `styles/variables.less` 中的变量
2. 在组件中使用CSS变量
3. 支持动态主题切换

## 许可证

MIT License 