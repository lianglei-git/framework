# 🚀 SSOA - Sparrow SSO 演示应用

## 📋 项目概述

SSOA (Sparrow SSO Application) 是一个基于 React + TypeScript + Vite 的演示应用，展示了如何集成 Sparrow SSO 系统进行单点登录。该项目展示了完整的 SSO 认证流程、多提供商支持、自动令牌刷新等功能。

## 🎯 核心特性

- ✅ **OAuth 2.1 & OpenID Connect**: 完全兼容 OAuth 2.1 和 OpenID Connect 协议
- ✅ **多提供商支持**: 支持本地登录、GitHub、Google、微信等认证方式
- ✅ **自动令牌刷新**: 透明的令牌刷新机制，无需用户干预
- ✅ **响应式设计**: 支持桌面端和移动端
- ✅ **深色主题**: 自动适配系统深色主题
- ✅ **错误处理**: 完善的错误处理和用户反馈
- ✅ **类型安全**: 完整的 TypeScript 类型定义
- ✅ **现代UI**: 基于现代设计语言的精美界面

## 🏗️ 技术架构

### **前端技术栈**
```
React 19.1.1       # 核心UI框架
TypeScript 5.8.3   # 类型安全
Vite 7.1.12        # 构建工具
CSS3               # 样式系统
```

### **认证流程**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SSOA应用      │    │   SSO登录中心    │    │   认证服务器     │
│   (React App)   │    │   (Login-v1)    │    │   (unit-auth)   │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ 1. 用户点击登录 │───▶│ 2. 构建认证URL   │───▶│ 3. 令牌颁发     │
│ 4. 处理回调结果 │◀───│ 5. 重定向返回    │◀───│ 6. 验证身份     │
│ 7. 展示用户信息 │    │ 8. 用户认证界面  │    │ 9. 令牌管理     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📦 项目结构

```
ssoa/
├── public/                 # 静态资源
├── src/                    # 源代码
│   ├── components/         # React组件
│   │   ├── LoginButton.tsx # SSO登录按钮组件
│   │   └── LoginButton.css # 登录按钮样式
│   ├── config/            # 配置文件
│   │   └── sso.ts         # SSO配置
│   ├── hooks/             # 自定义Hooks
│   │   └── useSSO.ts      # SSO认证Hook
│   ├── services/          # 服务层
│   │   └── ssoService.ts  # SSO服务类
│   ├── App.tsx            # 主应用组件
│   ├── App.css            # 应用样式
│   └── main.tsx           # 应用入口
├── .env                   # 环境变量
├── package.json           # 项目配置
├── vite.config.ts         # Vite配置
└── tsconfig.json          # TypeScript配置
```

## 🚀 快速开始

### **1. 环境准备**

确保你的系统已安装 Node.js (推荐 v18+) 和 pnpm:

```bash
# 检查Node.js版本
node --version

# 安装pnpm（如果没有）
npm install -g pnpm
```

### **2. 安装依赖**

```bash
cd /path/to/ssoa
pnpm install
```

### **3. 配置环境变量**

编辑项目根目录的 `.env` 文件：

```bash
# SSO服务器配置
VITE_SSO_SERVER_URL=http://localhost:8080
VITE_SSO_CLIENT_ID=ssoa-client
VITE_SSO_CLIENT_SECRET=ssoa-secret
VITE_SSO_REDIRECT_URI=http://localhost:5173/auth/callback

# 认证范围
VITE_SSO_SCOPE=openid profile email

# 存储配置
VITE_SSO_STORAGE_TYPE=localStorage
VITE_SSO_STORAGE_PREFIX=ssoa_

# 功能开关
VITE_SSO_AUTO_REFRESH=true
VITE_SSO_REMEMBER_ME=true
VITE_SSO_SESSION_TIMEOUT=3600
```

### **4. 启动开发服务器**

```bash
# 启动开发服务器
pnpm run dev

# 构建生产版本
pnpm run build

# 预览生产版本
pnpm run preview
```

访问 `http://localhost:5173` 查看应用。

## 🔧 使用方法

### **1. 基本用法**

SSOA 应用已经配置好了完整的 SSO 功能，你只需要：

1. **启动后端服务**: 确保 Sparrow SSO 服务器 (unit-auth) 在 `http://localhost:8080` 运行
2. **启动前端应用**: 运行 `pnpm run dev`
3. **打开浏览器**: 访问 `http://localhost:5173`

### **2. 登录流程**

1. **启动服务**: 确保 Login-v1 的 API 服务器在端口 5174 运行
2. **选择登录方式**: 点击任意登录按钮（SSO、GitHub、Google、微信）
3. **认证重定向**: 浏览器会重定向到 Login-v1 的 SSO 登录页面
4. **用户认证**: 在 Login-v1 登录页面完成认证
5. **回调处理**: 认证成功后自动返回 SSOA 应用并显示用户信息
6. **会话管理**: 系统自动处理令牌刷新和会话维护

### **3. 功能演示**

- **多提供商登录**: 体验不同认证方式
- **用户信息展示**: 查看详细的用户信息和令牌数据
- **自动刷新**: 令牌自动刷新，无需手动干预
- **错误处理**: 完善的错误处理和用户反馈
- **响应式设计**: 在不同设备上查看效果

## 📚 API 参考

### **useSSO Hook**

主要用于在 React 组件中集成 SSO 功能：

```typescript
import { useSSO } from './hooks/useSSO'

function MyComponent() {
  const {
    isAuthenticated,  // 是否已认证
    user,            // 用户信息
    token,           // 访问令牌
    session,         // 会话信息
    login,           // 登录方法
    logout,          // 登出方法
    isLoading,       // 加载状态
    error            // 错误信息
  } = useSSO({
    onSuccess: (user, token, session) => {
      console.log('登录成功:', user)
    },
    onError: (error) => {
      console.error('登录失败:', error)
    }
  })

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

### **LoginButton 组件**

提供开箱即用的登录按钮：

```typescript
import { LoginButton } from './components/LoginButton'

function MyComponent() {
  return (
    <div>
      <LoginButton
        provider="local"
        onSuccess={(user, token, session) => {
          console.log('登录成功:', user)
        }}
      >
        🔐 使用 SSO 登录
      </LoginButton>

      <LoginButton
        provider="github"
        onSuccess={(user, token, session) => {
          console.log('GitHub登录成功:', user)
        }}
      >
        🐙 使用 GitHub 登录
      </LoginButton>
    </div>
  )
}
```

### **SSOService 类**

核心 SSO 服务类，提供底层认证功能：

```typescript
import { SSOService } from './services/ssoService'
import { createSSOConfig } from './config/sso'

const config = createSSOConfig()
const ssoService = new SSOService(config)

// 构建登录URL
const loginUrl = ssoService.buildAuthorizationUrl('github')

// 处理回调
const result = await ssoService.handleCallback()

// 刷新令牌
const refreshResult = await ssoService.refreshToken(token.refresh_token)

// 登出
await ssoService.logout()
```

## 🔐 安全配置

### **环境变量配置**

```bash
# 生产环境配置示例
VITE_SSO_SERVER_URL=https://sso.yourcompany.com
VITE_SSO_CLIENT_ID=production-client-id
VITE_SSO_CLIENT_SECRET=production-client-secret
VITE_SSO_REDIRECT_URI=https://ssoa.yourcompany.com/auth/callback

# 安全配置
VITE_SSO_AUTO_REFRESH=true
VITE_SSO_REMEMBER_ME=false
VITE_SSO_SESSION_TIMEOUT=1800

# 生产环境禁用开发功能
VITE_SSO_DEV_MOCK_LOGIN=false
```

### **HTTPS 配置**

```typescript
// 强制HTTPS（生产环境）
const config = createSSOConfig({
  allowInsecure: false,  // 生产环境设为false
  cookieSecure: true     // 生产环境设为true
})
```

### **CORS 配置**

确保 SSO 服务器允许你的应用域名：

```typescript
// 在unit-auth服务器配置
const corsOptions = {
  origin: [
    'http://localhost:5173',      // 开发环境
    'https://ssoa.yourcompany.com' // 生产环境
  ],
  credentials: true
}
```

## 🎨 自定义样式

### **主题定制**

可以通过修改 CSS 变量来自定义主题：

```css
/* 在App.css中添加 */
:root {
  --sso-primary-color: #1890ff;
  --sso-success-color: #52c41a;
  --sso-error-color: #ff4d4f;
  --sso-border-radius: 6px;
}

/* 自定义登录按钮 */
.sso-login-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}
```

### **深色主题**

应用自动支持系统深色主题，也可以通过媒体查询自定义：

```css
@media (prefers-color-scheme: dark) {
  .sso-demo-container {
    background: #1a202c;
    color: #e2e8f0;
  }

  .sso-login-button {
    background: #177ddc;
  }
}
```

## 🧪 测试

### **开发环境测试**

1. **启动后端服务**:
   ```bash
   cd /path/to/unit-auth
   go run main.go
   ```

2. **启动Login-v1的API服务器**:
   ```bash
   cd /path/to/Login-v1
   node api-server.js
   ```

3. **启动Login-v1前端应用**:
   ```bash
   cd /path/to/Login-v1
   pnpm run dev
   # 访问 http://localhost:5173 查看Login-v1界面
   ```

4. **启动SSOA应用**:
   ```bash
   cd /path/to/ssoa
   pnpm run dev
   # 访问 http://localhost:5174 查看SSOA应用
   ```

5. **测试登录流程**:
   - 在SSOA应用中点击任意登录按钮
   - 浏览器会重定向到Login-v1的SSO登录页面
   - 在Login-v1中完成认证
   - 认证成功后自动返回SSOA应用
   - 验证用户信息显示

### **生产环境部署**

1. **构建应用**:
   ```bash
   pnpm run build
   ```

2. **部署静态文件**:
   将 `dist/` 目录部署到你的静态文件服务器

3. **配置环境变量**:
   确保生产环境的环境变量正确配置

## 📱 移动端支持

SSOA 应用完全支持移动端访问：

- **响应式设计**: 自动适配不同屏幕尺寸
- **触摸友好**: 优化的触摸交互体验
- **移动端认证**: 支持移动端的 SSO 认证流程

### **移动端配置**

```typescript
// 在移动端使用sessionStorage存储
const config = createSSOConfig({
  storageType: 'sessionStorage'  // 移动端推荐使用sessionStorage
})
```

## 🔧 故障排除

### **常见问题**

#### **1. 登录重定向失败**
**问题**: 用户登录后没有正确重定向回应用
**解决**:
- 检查 `.env` 文件中的 `VITE_SSO_REDIRECT_URI` 配置
- 确保 SSO 服务器允许该重定向URI
- 检查浏览器是否阻止了重定向

#### **2. CORS 错误**
**问题**: 浏览器阻止跨域请求
**解决**:
- 确保 SSO 服务器配置了正确的 CORS 策略
- 检查请求头是否包含 `credentials: true`

#### **3. 令牌刷新失败**
**问题**: 自动令牌刷新不工作
**解决**:
- 检查 `VITE_SSO_AUTO_REFRESH` 是否设为 `true`
- 确认 `refresh_token` 是否有效
- 检查网络连接和 SSO 服务器状态

#### **4. 样式问题**
**问题**: 界面显示异常
**解决**:
- 检查 CSS 文件是否正确加载
- 确认浏览器兼容性
- 尝试清除浏览器缓存

### **调试技巧**

1. **启用调试模式**:
   ```bash
   # 在.env中设置
   VITE_SSO_DEV_MOCK_LOGIN=true
   ```

2. **查看浏览器控制台**:
   - 打开浏览器开发者工具
   - 查看 Console 标签的错误信息
   - 检查 Network 标签的请求状态

3. **检查本地存储**:
   - 在开发者工具中查看 Application > Local Storage
   - 确认认证数据是否正确存储

## 📊 监控和日志

### **日志配置**

```typescript
// 在开发环境中启用详细日志
const config = createSSOConfig({
  enableLogging: true,
  debug: true
})
```

### **监控指标**

- **认证成功率**: 监控登录成功/失败的比例
- **平均响应时间**: 监控 SSO 服务的响应时间
- **令牌刷新频率**: 监控令牌刷新操作的频率
- **错误率**: 监控各种错误的发生频率

## 🤝 贡献指南

### **开发环境设置**

```bash
# 克隆项目
git clone https://github.com/your-org/ssoa.git
cd ssoa

# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev
```

### **代码规范**

- 使用 TypeScript 进行类型检查
- 遵循 React Hooks 最佳实践
- 使用 ESLint 进行代码质量检查
- 编写有意义的提交信息

### **测试要求**

- 为新功能编写单元测试
- 确保所有测试通过
- 提供测试覆盖率报告

## 📚 相关资源

- [Sparrow SSO 文档](https://docs.sparrow.com)
- [OAuth 2.1 规范](https://tools.ietf.org/html/rfc6749)
- [OpenID Connect 规范](https://openid.net/specs/openid-connect-core-1_0.html)
- [React 官方文档](https://reactjs.org/docs)
- [TypeScript 文档](https://www.typescriptlang.org/docs)
- [Vite 官方文档](https://vitejs.dev/guide)

## 📞 技术支持

如遇到问题，请提供以下信息：

1. **环境信息**: 浏览器版本、操作系统、Node.js版本
2. **配置信息**: 环境变量设置、SSO服务器配置
3. **错误日志**: 完整的错误信息和堆栈跟踪
4. **复现步骤**: 详细的问题复现步骤

**问题反馈渠道**:
- GitHub Issues: [https://github.com/your-org/ssoa/issues](https://github.com/your-org/ssoa/issues)
- 技术支持邮箱: support@yourcompany.com
- 开发者社区: [https://community.yourcompany.com](https://community.yourcompany.com)

---

**🎉 恭喜！您已经成功部署了 SSOA 应用！**

现在您可以体验完整的单点登录功能了。用户可以通过多种方式进行认证，系统会自动处理令牌管理和会话维护，为您提供安全、便捷的认证体验。
