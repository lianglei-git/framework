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

## 目录结构

```
src/
├── types/                    # 类型定义层
│   └── index.ts             # 完整的TypeScript类型定义
├── utils/                    # 工具层
│   ├── validation.ts        # 表单验证工具
│   └── storage.ts           # 存储管理工具
├── services/                 # 服务层
│   └── api.ts               # API服务封装
├── hooks/                    # 自定义Hooks层
│   ├── useAuth.ts           # 认证状态管理
│   └── useForm.ts           # 表单状态管理
├── components/               # 组件层
│   └── common/              # 通用组件
│       ├── Button.tsx       # 按钮组件
│       ├── Input.tsx        # 输入框组件
│       ├── Loading.tsx      # 加载组件
│       ├── Button.less      # 按钮样式
│       ├── Input.less       # 输入框样式
│       └── Loading.less     # 加载组件样式
└── styles/                   # 样式层
    ├── variables.less       # 样式变量
    └── index.less           # 主样式文件
```

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