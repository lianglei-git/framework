# 🚀 SSOA - Login-v1 SSO集成指南

## 📋 概述

SSOA项目已经成功集成了Login-v1的SSO功能！现在SSOA项目可以作为子项目使用Login-v1作为SSO认证中心，实现统一的用户认证体验。

## 🎯 集成功能

### **完整的SSO认证流程**
```
SSOA应用 → Login-v1 SSO中心 → unit-auth后端
    ↓           ↓           ↓
1. 用户访问    2. 重定向到认证  3. 后端验证身份
   SSOA应用      页面进行登录     返回认证结果

Login-v1 → unit-auth后端 → SSOA应用
    ↓           ↓           ↓
4. 认证完成    5. 颁发令牌     6. 返回认证状态
   构建认证URL    验证用户身份    显示用户信息
```

### **支持的认证方式**
- 🔐 **SSO本地认证**: 使用Login-v1的统一登录界面
- 🐙 **GitHub登录**: 通过GitHub OAuth认证
- 🌐 **Google登录**: 通过Google OAuth认证
- 💬 **微信登录**: 通过微信OAuth认证

## 🏗️ 系统架构

### **服务端口分配**
```
🔧 unit-auth后端服务: http://localhost:8080
🌐 Login-v1前端应用: http://localhost:5173
📱 SSOA子项目应用: http://localhost:5174
🔗 SSO API服务: http://localhost:5174/api
```

### **认证流程详解**

#### **1. 启动流程**
1. **unit-auth后端**: 提供OAuth 2.1认证服务
2. **Login-v1 API服务器**: 为子项目提供SSO API接口
3. **Login-v1前端**: 提供用户认证界面
4. **SSOA应用**: 子项目，集成SSO登录功能

#### **2. 登录流程**
1. **用户访问SSOA**: http://localhost:5174
2. **点击登录按钮**: 触发SSO认证流程
3. **重定向到Login-v1**: http://localhost:5173/auth?...
4. **用户认证**: 在Login-v1界面完成登录
5. **回调处理**: 认证成功后返回SSOA应用
6. **显示用户信息**: SSOA应用显示登录状态

## 🚀 快速开始

### **方法一: 使用启动脚本（推荐）**

```bash
cd /path/to/ssoa
./start-sso-system.sh
```

这个脚本会自动：
- ✅ 检查系统要求（Node.js、pnpm、端口可用性）
- ✅ 启动unit-auth后端服务
- ✅ 启动Login-v1 API服务器
- ✅ 启动Login-v1前端应用
- ✅ 启动SSOA子项目应用
- ✅ 显示服务状态和使用说明

### **方法二: 手动启动**

#### **1. 启动unit-auth后端**
```bash
cd /path/to/unit-auth
go run main.go
# 服务运行在: http://localhost:8080
```

#### **2. 启动Login-v1 API服务器**
```bash
cd /path/to/Login-v1
node api-server.js
# API服务运行在: http://localhost:5174/api
```

#### **3. 启动Login-v1前端**
```bash
cd /path/to/Login-v1
pnpm run dev
# 前端应用运行在: http://localhost:5173
```

#### **4. 启动SSOA应用**
```bash
cd /path/to/ssoa
pnpm run dev
# SSOA应用运行在: http://localhost:5174
```

## 🧪 测试SSO功能

### **1. 访问SSOA应用**
打开浏览器访问: **http://localhost:5174**

### **2. 测试登录流程**
1. **点击任意登录按钮**（SSO、GitHub、Google、微信）
2. **观察重定向**: 浏览器会跳转到Login-v1的SSO登录页面
3. **完成认证**: 在Login-v1登录界面输入凭据
4. **回调验证**: 认证成功后自动返回SSOA应用
5. **查看结果**: SSOA应用显示用户认证状态和信息

### **3. 测试功能**
- ✅ **用户信息显示**: 认证后显示用户头像、姓名、邮箱等
- ✅ **令牌管理**: 自动处理访问令牌和刷新令牌
- ✅ **会话管理**: 自动维护用户会话状态
- ✅ **错误处理**: 完善的错误处理和用户反馈
- ✅ **响应式设计**: 支持桌面端和移动端

## 📚 API使用方法

### **在代码中使用SSO**

#### **1. 使用SSO Hook**

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
      console.log('SSO登录成功:', user)
    },
    onError: (error) => {
      console.error('SSO登录失败:', error)
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
          使用SSO登录
        </button>
      )}
    </div>
  )
}
```

#### **2. 使用登录按钮组件**

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

## 🔧 配置文件

### **SSOA项目配置**

#### **环境变量 (.env)**
```bash
# SSO服务器配置 - 指向Login-v1 API服务器
VITE_SSO_SERVER_URL=http://localhost:5174

# 客户端配置
VITE_SSO_CLIENT_ID=ssoa-client
VITE_SSO_CLIENT_SECRET=ssoa-secret
VITE_SSO_REDIRECT_URI=http://localhost:5173/auth/callback

# 认证范围
VITE_SSO_SCOPE=openid profile email

# 功能开关
VITE_SSO_AUTO_REFRESH=true
VITE_SSO_REMEMBER_ME=true
VITE_SSO_SESSION_TIMEOUT=3600
```

#### **TypeScript配置 (src/config/sso.ts)**
```typescript
export const defaultSSOConfig: SSOConfig = {
    // 指向Login-v1项目作为SSO登录中心
    ssoServerUrl: 'http://localhost:5174',
    clientId: 'ssoa-client',
    clientSecret: 'ssoa-secret',
    redirectUri: 'http://localhost:5173/auth/callback',
    // ... 其他配置
}
```

## 📋 API端点

### **SSO API端点 (Login-v1提供)**

#### **令牌端点**
```
POST /api/auth/token
```
- **功能**: 交换授权码获取访问令牌
- **参数**: grant_type, code, client_id, client_secret, redirect_uri
- **返回**: access_token, refresh_token, expires_in, token_type

#### **用户信息端点**
```
GET /api/auth/userinfo
```
- **功能**: 获取当前用户的详细信息
- **认证**: Bearer token
- **返回**: 用户信息对象

#### **刷新令牌端点**
```
POST /api/auth/refresh
```
- **功能**: 使用刷新令牌获取新的访问令牌
- **参数**: grant_type=refresh_token, refresh_token, client_id, client_secret
- **返回**: access_token, refresh_token, expires_in, token_type

#### **登出端点**
```
POST /api/auth/logout
```
- **功能**: 用户登出并清理会话
- **参数**: client_id, logout_uri
- **返回**: 登出结果

#### **授权URL构建端点**
```
GET /api/auth/authorize
```
- **功能**: 构建SSO登录URL
- **参数**: client_id, redirect_uri, provider
- **返回**: authorization_url

## 🧪 运行测试

### **集成测试**

```bash
cd /path/to/ssoa
node test-sso-integration.js
```

这个测试会验证：
- ✅ 配置文件是否正确
- ✅ SSOA应用文件是否完整
- ✅ API端点是否可用
- ✅ 认证流程是否正常

### **手动测试**

1. **启动所有服务** (使用启动脚本或手动启动)
2. **访问SSOA应用**: http://localhost:5174
3. **点击登录按钮**: 任意认证方式
4. **观察重定向**: 应该跳转到Login-v1
5. **完成认证**: 在Login-v1中登录
6. **验证回调**: 成功返回SSOA并显示用户信息

## 🔐 安全配置

### **客户端认证**
```typescript
// SSOA配置中包含客户端凭据
const config = {
    clientId: 'ssoa-client',
    clientSecret: 'ssoa-secret'
}
```

### **CORS配置**
Login-v1的API服务器已配置CORS：
```javascript
// 允许的源
'Access-Control-Allow-Origin': '*'
'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
'Access-Control-Allow-Headers': 'Content-Type, Authorization'
```

### **HTTPS支持**
生产环境建议使用HTTPS：
```bash
# 生产环境配置
VITE_SSO_SERVER_URL=https://your-sso-server.com
VITE_SSO_REDIRECT_URI=https://your-app.com/auth/callback
```

## 📱 移动端支持

SSOA应用完全支持移动端：

### **响应式设计**
- ✅ 自动适配不同屏幕尺寸
- ✅ 触摸友好的交互体验
- ✅ 移动端的SSO认证流程

### **移动端配置**
```typescript
// 移动端推荐使用sessionStorage
const config = createSSOConfig({
    storageType: 'sessionStorage'
})
```

## 🔧 故障排除

### **常见问题**

#### **1. 登录重定向失败**
**问题**: 用户登录后没有正确重定向回SSOA应用
**解决**:
- 检查SSOA的 `.env` 文件中的重定向URI配置
- 确保Login-v1的SSO服务器允许该重定向URI
- 检查浏览器是否阻止了重定向

#### **2. API连接失败**
**问题**: SSOA无法连接到Login-v1 API服务器
**解决**:
- 确保Login-v1 API服务器在端口5174运行
- 检查防火墙设置
- 查看API服务器日志

#### **3. 认证失败**
**问题**: 认证过程中出现错误
**解决**:
- 检查客户端ID和密钥配置
- 验证后端服务的连接性
- 查看浏览器控制台的错误信息

### **调试步骤**

1. **检查服务状态**:
   ```bash
   curl http://localhost:8080/api/v1/health  # 后端服务
   curl http://localhost:5174/api/auth/authorize?client_id=test  # API服务
   ```

2. **查看日志**:
   ```bash
   # 查看各个服务的日志文件
   tail -f sso-backend.log
   tail -f sso-api.log
   tail -f sso-frontend.log
   tail -f sso-ssoa.log
   ```

3. **检查浏览器控制台**:
   - 打开开发者工具
   - 查看Console和Network标签
   - 检查请求状态和错误信息

## 📊 监控和日志

### **日志文件**
- `sso-backend.log`: unit-auth后端日志
- `sso-api.log`: Login-v1 API服务器日志
- `sso-frontend.log`: Login-v1前端日志
- `sso-ssoa.log`: SSOA应用日志

### **监控指标**
- 认证成功率
- API响应时间
- 令牌刷新频率
- 错误率统计

## 🤝 开发指南

### **添加新的认证方式**
1. 在SSOA的LoginButton组件中添加新的provider
2. 在SSOService中实现相应的认证逻辑
3. 更新配置文件支持新的提供商

### **自定义UI组件**
1. 基于LoginButton组件创建自定义登录按钮
2. 修改App.css中的样式变量
3. 添加新的CSS类和动画效果

### **扩展API功能**
1. 在Login-v1的api/auth.ts中添加新的端点
2. 在SSOService中实现相应的API调用
3. 更新TypeScript类型定义

## 📚 相关文档

- [Login-v1完整文档](../Views/React/Login-v1/README.md)
- [SSO集成指南](../Views/React/Login-v1/SUBPROJECT_INTEGRATION_README.md)
- [unit-auth后端文档](../../Go/unit-auth/README.md)

## 📞 技术支持

如遇到问题，请提供以下信息：

1. **环境信息**: 操作系统、Node.js版本、浏览器版本
2. **错误信息**: 完整的错误日志和堆栈跟踪
3. **配置信息**: 环境变量设置和配置文件内容
4. **复现步骤**: 详细的问题复现步骤

**联系方式**:
- 技术支持邮箱: support@sparrow.com
- GitHub Issues: [项目Issues页面](https://github.com/your-org/ssoa/issues)
- 开发者社区: [开发者社区](https://community.sparrow.com)

---

**🎉 恭喜！SSOA项目已成功集成Login-v1的SSO功能！**

现在您可以享受完整的单点登录体验了：

1. **统一认证**: 所有子项目使用统一的Login-v1认证界面
2. **多提供商支持**: 支持多种认证方式（本地、GitHub、Google、微信）
3. **自动令牌管理**: 透明的令牌刷新和会话管理
4. **安全可靠**: 基于OAuth 2.1标准的认证流程
5. **易于集成**: 简单的API接口和React Hooks

**🚀 立即体验SSO功能:**
1. 运行 `./start-sso-system.sh` 启动完整系统
2. 访问 `http://localhost:5174` 查看SSOA应用
3. 点击登录按钮体验完整的SSO认证流程！
