# 前端Token自动续签功能实现

## 功能概述

前端Token自动续签功能已完全实现，与后端unit-auth服务完美对接。该功能提供：

1. **自动Token监控**: 定期检查token状态，提前24小时自动续签
2. **手动续签API**: 支持客户端主动续签token
3. **记住我登录**: 支持长时间会话的token管理
4. **Axios拦截器**: 自动处理响应头中的新token和401错误
5. **事件系统**: 完整的token状态变化事件监听

## 📁 文件结构

```
Login-v1/
├── src/
│   ├── services/
│   │   ├── tokenRefreshService.ts    # Token自动续签服务
│   │   ├── axiosInterceptor.ts       # Axios拦截器
│   │   └── api.ts                    # API服务（已更新）
│   └── stores/
│       └── UserStore.ts              # 用户存储（已增强）
├── test-token-refresh.html           # 测试页面
└── TOKEN_AUTO_REFRESH_FRONTEND.md   # 本文档
```

## 🚀 核心功能

### 1. Token自动续签服务 (`tokenRefreshService.ts`)

#### 主要方法

```typescript
// 检查token状态
async checkTokenStatus(): Promise<TokenStatus | null>

// 手动续签token
async refreshToken(): Promise<RefreshResult | null>

// 记住我登录
async loginWithRememberMe(account: string, password: string): Promise<LoginResult | null>

// 启动token监控
startTokenMonitoring(): void

// 停止token监控
stopTokenMonitoring(): void
```

#### 配置参数

```typescript
private readonly checkIntervalMs = 5 * 60 * 1000 // 5分钟检查一次
private readonly refreshThresholdHours = 24 // 提前24小时续签
```

### 2. Axios拦截器 (`axiosInterceptor.ts`)

#### 请求拦截器
- 自动添加Authorization头
- 使用当前token

#### 响应拦截器
- 检测响应头中的新token（后端自动续签）
- 处理401错误，自动尝试续签
- 重试原请求或清除用户信息

### 3. 用户存储增强 (`UserStore.ts`)

#### 新增方法

```typescript
// 更新token
updateToken(newToken: string): void

// 添加登录状态监听器
addLoginListener(listener: () => void): void

// 移除登录状态监听器
removeLoginListener(listener: () => void): void
```

## 🔧 使用方法

### 1. 基础使用

```typescript
import { globalUserStore } from './src/stores/UserStore'
import tokenRefreshService from './src/services/tokenRefreshService'
import apiClient from './src/services/axiosInterceptor'

// 启动token监控（登录后自动启动）
tokenRefreshService.startTokenMonitoring()

// 检查token状态
const status = await tokenRefreshService.checkTokenStatus()
console.log('Token剩余时间:', status?.remaining_hours, '小时')

// 手动续签token
const result = await tokenRefreshService.refreshToken()
if (result) {
    console.log('Token续签成功')
}
```

### 2. 记住我登录

```typescript
// 使用记住我功能登录
const result = await tokenRefreshService.loginWithRememberMe(
    'user@example.com',
    'password123'
)

if (result) {
    console.log('记住我登录成功，token有效期30天')
}
```

### 3. 事件监听

```typescript
// 监听token自动续签事件
window.addEventListener('token:auto-refreshed', (event) => {
    console.log('Token已自动续签:', event.detail.newToken)
})

// 监听token手动续签事件
window.addEventListener('token:refreshed', (event) => {
    console.log('Token已手动续签:', event.detail.newToken)
})

// 监听认证过期事件
window.addEventListener('auth:expired', () => {
    console.log('用户认证已过期，跳转到登录页')
    // 跳转到登录页
})
```

### 4. API调用

```typescript
// 使用配置好的axios实例，自动处理token
const response = await apiClient.get('/api/v1/user/profile')

// 如果token过期，拦截器会自动处理续签
// 如果续签失败，会自动清除用户信息并触发auth:expired事件
```

## 📊 后端API对接

### 1. Token状态检查

```typescript
// GET /api/v1/auth/token-status
const status = await tokenRefreshService.checkTokenStatus()
```

响应格式：
```json
{
  "code": 200,
  "message": "Token status retrieved successfully",
  "data": {
    "user_id": "user_id",
    "email": "user@example.com",
    "role": "user",
    "token_type": "access",
    "expires_at": "2025-08-12T13:30:00Z",
    "remaining_hours": 167,
    "remaining_minutes": 30,
    "is_expiring_soon": false,
    "is_valid": true
  }
}
```

### 2. Token续签

```typescript
// POST /api/v1/auth/refresh-token
const result = await tokenRefreshService.refreshToken()
```

响应格式：
```json
{
  "code": 200,
  "message": "Token refreshed successfully",
  "data": {
    "access_token": "new_token_here",
    "token_type": "Bearer",
    "expires_in": 604800,
    "user_id": "user_id",
    "email": "user@example.com",
    "role": "user"
  }
}
```

### 3. 记住我登录

```typescript
// POST /api/v1/auth/login-with-remember
const result = await tokenRefreshService.loginWithRememberMe(account, password)
```

## 🧪 测试验证

### 1. 运行测试页面

```bash
# 在浏览器中打开测试页面
open test-token-refresh.html
```

### 2. 测试步骤

1. **登录测试**
   - 输入用户名和密码
   - 点击"登录"或"记住我登录"
   - 验证登录成功

2. **Token状态检查**
   - 点击"检查Token状态"
   - 查看token剩余时间和状态

3. **手动续签**
   - 点击"手动续签Token"
   - 验证续签成功

4. **自动监控**
   - 点击"启动Token监控"
   - 观察控制台日志
   - 测试API调用

5. **事件监听**
   - 观察事件日志
   - 验证各种token事件

## 🔒 安全特性

### 1. Token安全
- **自动清理**: token过期时自动清除用户信息
- **安全存储**: token存储在localStorage中
- **HTTPS传输**: 建议所有API调用使用HTTPS

### 2. 续签安全
- **频率限制**: 通过服务端控制续签频率
- **验证机制**: 确保只有有效token才能续签
- **错误处理**: 完善的错误处理和恢复机制

### 3. 自动续签安全
- **提前时间**: 只在即将过期时续签（提前24小时）
- **失败处理**: 续签失败不影响正常请求
- **状态标记**: 明确标记自动续签状态

## 📈 性能优化

### 1. 内存优化
- 使用高效的token解析
- 避免不必要的API调用
- 合理的缓存策略

### 2. 网络优化
- 减少不必要的token检查
- 使用HTTP/2
- 合理的缓存头设置

### 3. 用户体验优化
- 无感知的token续签
- 平滑的错误处理
- 清晰的状态反馈

## 🔮 扩展功能

### 1. 双Token滑动续期
- 已预留扩展接口
- 支持access token和refresh token分离
- 可以实现更安全的token管理

### 2. 监控和日志
- 可以添加详细的监控指标
- 支持结构化日志记录
- 可以集成监控系统

### 3. 高级功能
- 支持token撤销
- 支持多设备登录管理
- 支持token黑名单

## 📝 配置说明

### 1. 环境变量

```typescript
// 开发环境
const basicUrl = (import.meta as any).env?.DEV ? "http://localhost:8080" : "https://sparrowui.cn/translate"
```

### 2. 服务配置

```typescript
// Token监控配置
private readonly checkIntervalMs = 5 * 60 * 1000 // 5分钟检查一次
private readonly refreshThresholdHours = 24 // 提前24小时续签

// Axios配置
const apiClient = axios.create({
    baseURL: basicUrl,
    timeout: 10000,
})
```

### 3. 事件配置

```typescript
// 支持的事件类型
'token:auto-refreshed'  // 自动续签成功
'token:refreshed'       // 手动续签成功
'auth:expired'          // 认证过期
'auth:login'            // 登录成功
```

## 🎉 总结

前端Token自动续签功能已完全实现，与后端unit-auth服务完美对接，提供：

1. **完整的自动续签机制**: 用户无感知的token续签
2. **灵活的手动续签**: 客户端主动续签能力
3. **智能的错误处理**: 完善的错误处理和恢复
4. **事件驱动架构**: 完整的token状态变化事件
5. **向后兼容性**: 保持与现有系统的兼容
6. **扩展性**: 为后续的双Token滑动续期预留接口

该功能特别适合学习类网站，能够显著提升用户体验，减少因token过期导致的学习中断。同时，通过合理的配置和测试，确保了功能的稳定性和安全性。🚀 