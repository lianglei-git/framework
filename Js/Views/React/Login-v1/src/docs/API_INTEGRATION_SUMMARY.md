# API对接总结 - 完全对接后端unit-auth

## 🎯 对接目标

将前端Login.tsx的逻辑完全对接后端unit-auth的API接口，实现：

1. **统一登录接口** - 支持邮箱/用户名/手机号登录
2. **手机验证码登录** - 完整的验证码流程
3. **微信扫码登录** - 完整的微信OAuth流程
4. **用户注册** - 邮箱验证码注册
5. **密码重置** - 邮箱和手机号重置
6. **用户管理** - 获取和更新用户信息

## 📋 后端API接口清单

### 1. 认证相关接口

#### 统一登录接口
```typescript
POST /api/v1/auth/login
{
  "account": "user@example.com",  // 邮箱/用户名/手机号
  "password": "password123"
}

Response:
{
  "code": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "nickname": "昵称",
      "role": "user",
      "status": "active",
      "email_verified": true,
      "phone_verified": false,
      "login_count": 1,
      "last_login_at": "2024-01-01T00:00:00Z",
      "created_at": "2024-01-01T00:00:00Z"
    },
    "token": "jwt_token"
  }
}
```

#### 手机验证码登录
```typescript
POST /api/v1/auth/phone-login
{
  "phone": "13800138000",
  "code": "123456"
}

Response: 同统一登录接口
```

#### 用户注册
```typescript
POST /api/v1/auth/register
{
  "email": "user@example.com",
  "username": "username",
  "nickname": "昵称",
  "password": "password123",
  "code": "123456"
}

Response:
{
  "code": 200,
  "message": "Registration successful",
  "data": {
    "user": { ... }
  }
}
```

#### 发送邮箱验证码
```typescript
POST /api/v1/auth/send-email-code
{
  "email": "user@example.com",
  "type": "register"  // register, reset_password
}

Response:
{
  "code": 200,
  "message": "Verification code sent"
}
```

#### 发送手机验证码
```typescript
POST /api/v1/auth/send-sms-code
{
  "phone": "13800138000",
  "type": "login"  // login, register
}

Response:
{
  "code": 200,
  "message": "Verification code sent"
}
```

#### 忘记密码
```typescript
POST /api/v1/auth/forgot-password
{
  "email": "user@example.com"
}

Response:
{
  "code": 200,
  "message": "Reset email sent"
}
```

#### 重置密码
```typescript
POST /api/v1/auth/reset-password
{
  "email": "user@example.com",
  "code": "123456",
  "password": "newpassword123"
}

Response:
{
  "code": 200,
  "message": "Password reset successful"
}
```

#### 手机重置密码
```typescript
POST /api/v1/auth/phone-reset-password
{
  "phone": "13800138000",
  "code": "123456",
  "password": "newpassword123"
}

Response:
{
  "code": 200,
  "message": "Password reset successful"
}
```

### 2. 微信登录相关接口

#### 获取微信二维码
```typescript
GET /api/v1/auth/wechat/qr-code

Response:
{
  "code": 200,
  "message": "QR code generated successfully",
  "data": {
    "qr_url": "https://open.weixin.qq.com/...",
    "state": "random_state_string",
    "expires_at": "2024-01-01T00:05:00Z"
  }
}
```

#### 检查微信登录状态
```typescript
GET /api/v1/auth/wechat/status/{state}

Response:
{
  "code": 200,
  "message": "QR code scanned, waiting for confirmation",
  "data": {
    "status": "pending",  // pending, scanned, confirmed, expired
    "scanned": false,
    "used": false,
    "user": { ... },      // 登录成功时返回
    "token": "jwt_token"  // 登录成功时返回
  }
}
```

### 3. 用户管理接口

#### 获取用户信息
```typescript
GET /api/v1/user/profile
Headers: Authorization: Bearer {token}

Response:
{
  "code": 200,
  "message": "Success",
  "data": {
    "user": { ... }
  }
}
```

#### 更新用户信息
```typescript
PUT /api/v1/user/profile
Headers: Authorization: Bearer {token}
{
  "nickname": "新昵称",
  "meta": {
    "avatar": "avatar_url",
    "gender": "男",
    "birthday": "1990-01-01",
    "bio": "个人简介"
  }
}

Response:
{
  "code": 200,
  "message": "Profile updated successfully",
  "data": {
    "user": { ... }
  }
}
```

#### 修改密码
```typescript
POST /api/v1/user/change-password
Headers: Authorization: Bearer {token}
{
  "old_password": "oldpassword",
  "new_password": "newpassword123"
}

Response:
{
  "code": 200,
  "message": "Password changed successfully"
}
```

## 🔄 前端API服务更新

### 1. AuthApiService 更新

```typescript
export class AuthApiService extends ApiService {
  // 统一登录接口 - 支持邮箱/用户名/手机号登录
  async unifiedLogin(data: { account: string, password: string }): Promise<any> {
    const response = await axios.post(`${this.baseURL}/api/v1/auth/login`, data, {
      headers: getCommonHeaders()
    })
    
    if (response.data.code === 200) {
      return {
        user: response.data.data.user,
        token: response.data.data.token,
        refresh_token: '',
        expires_in: 3600
      }
    } else {
      throw new Error(response.data.message || '登录失败')
    }
  }
  
  // 手机验证码登录
  async phoneLogin(data: PhoneLoginRequest): Promise<LoginResponse> {
    const response = await axios.post(`${this.baseURL}/api/v1/auth/phone-login`, data, {
      headers: getCommonHeaders()
    })
    
    if (response.data.code === 200) {
      return {
        user: response.data.data.user,
        token: response.data.data.token,
        refresh_token: '',
        expires_in: 3600
      }
    } else {
      throw new Error(response.data.message || '登录失败')
    }
  }
  
  // 用户注册
  async register(data: RegisterRequest): Promise<User> {
    const response = await axios.post(`${this.baseURL}/api/v1/auth/register`, {
      email: data.email,
      username: data.username,
      nickname: data.nickname,
      password: data.password,
      code: data.verification_code
    }, {
      headers: getCommonHeaders()
    })
    
    if (response.data.code === 200) {
      return response.data.data
    } else {
      throw new Error(response.data.message || '注册失败')
    }
  }
  
  // 发送邮箱验证码
  async sendEmailCode(data: SendEmailCodeRequest): Promise<void> {
    const response = await axios.post(`${this.baseURL}/api/v1/auth/send-email-code`, {
      email: data.email,
      type: data.type
    }, {
      headers: getCommonHeaders()
    })
    
    if (response.data.code !== 200) {
      throw new Error(response.data.message || '发送验证码失败')
    }
  }
  
  // 微信登录相关
  async getWechatQRCode(): Promise<any> {
    const response = await axios.get(`${this.baseURL}/api/v1/auth/wechat/qr-code`, {
      headers: getCommonHeaders()
    })
    
    if (response.data.code === 200) {
      return {
        qrCodeUrl: response.data.data.qr_url,
        qrCodeId: response.data.data.state,
        expiresAt: response.data.data.expires_at
      }
    } else {
      throw new Error(response.data.message || '获取二维码失败')
    }
  }
  
  async checkWechatLoginStatus(state: string): Promise<any> {
    const response = await axios.get(`${this.baseURL}/api/v1/auth/wechat/status/${state}`, {
      headers: getCommonHeaders()
    })
    
    if (response.data.code === 200) {
      return {
        status: response.data.data.status,
        scanned: response.data.data.scanned,
        used: response.data.data.used,
        user: response.data.data.user,
        token: response.data.data.token
      }
    } else {
      throw new Error(response.data.message || '检查登录状态失败')
    }
  }
}
```

### 2. UserApiService 更新

```typescript
export class UserApiService extends ApiService {
  async getProfile(): Promise<User> {
    const response = await axios.get(`${this.baseURL}/api/v1/user/profile`, {
      headers: getCommonHeaders(localStorage.getItem('auth_token') || undefined)
    })
    
    if (response.data.code === 200) {
      return response.data.data
    } else {
      throw new Error(response.data.message || '获取用户信息失败')
    }
  }
  
  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await axios.put(`${this.baseURL}/api/v1/user/profile`, data, {
      headers: getCommonHeaders(localStorage.getItem('auth_token') || undefined)
    })
    
    if (response.data.code === 200) {
      return response.data.data
    } else {
      throw new Error(response.data.message || '更新用户信息失败')
    }
  }
  
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    const response = await axios.post(`${this.baseURL}/api/v1/user/change-password`, {
      old_password: oldPassword,
      new_password: newPassword
    }, {
      headers: getCommonHeaders(localStorage.getItem('auth_token') || undefined)
    })
    
    if (response.data.code !== 200) {
      throw new Error(response.data.message || '修改密码失败')
    }
  }
}
```

## 🎯 Login.tsx 更新要点

### 1. 登录逻辑更新

```typescript
// 账号密码登录 - 对接后端API
const handleAccountLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!accountForm.validate()) return;
  
  try {
    const accountType = identifyAccountType(accountForm.values.account);
    await auth.login({
      account: accountForm.values.account,
      password: accountForm.values.password,
      remember_me: accountForm.values.remember_me,
      login_type: accountType === AccountType.UNKNOWN ? 'username' : accountType
    });
    setTimeout(() => window.close(), 300);
  } catch (error: any) {
    accountForm.setError('password', error.message || '密码错误');
  }
};
```

### 2. 微信登录逻辑更新

```typescript
// 获取微信二维码 - 对接后端API
const handleGetQr = async () => {
  setQrLoading(true);
  setQrError('');
  try {
    const res = await getWechatQRCodeAPI();
    if (res.code === 200) {
      setQrCodeUrl(res.data.qrCodeUrl);
      setQrCodeId(res.data.qrCodeId);
      // 开始轮询
      if (polling) clearInterval(polling);
      const timer = setInterval(async () => {
        const statusRes = await checkWechatLoginStatusAPI(res.data.qrCodeId);
        if (statusRes.code === 200 && statusRes.data.status === 'confirmed') {
          clearInterval(timer);
          setPolling(null);
          // 微信登录成功，更新用户信息
          globalUserStore.setUserInfo(statusRes.data.user, statusRes.data.token);
          setTimeout(() => window.close(), 300);
        }
      }, 2000);
      setPolling(timer);
    } else {
      setQrError('二维码获取失败');
    }
  } catch {
    setQrError('网络错误');
  } finally {
    setQrLoading(false);
  }
};
```

### 3. 注册逻辑更新

```typescript
// 注册提交 - 对接后端API
const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!registerForm.validate()) return;
  
  try {
    await auth.register({
      username: registerForm.values.email.split('@')[0],
      email: registerForm.values.email,
      password: registerForm.values.password,
      confirm_password: registerForm.values.confirmPassword,
      agree_terms: true,
      verification_code: registerForm.values.code
    });
    alert('注册成功，请登录');
    setMode('login');
    setLoginStep('account');
    accountForm.reset();
  } catch (error: any) {
    registerForm.setError('email', error.message || '注册失败');
  }
};
```

## 🔧 配置更新

### 1. 基础URL配置

```typescript
// 基础配置 - 对接后端unit-auth服务
const basicUrl = import.meta.env.DEV ? "http://localhost:8080" : "https://sparrowui.cn/translate"
```

### 2. 环境变量配置

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:8080

# .env.production
VITE_API_BASE_URL=https://sparrowui.cn/translate
```

## 📊 对接优势

### 1. 功能完整性
- ✅ 支持多种登录方式（邮箱/用户名/手机号）
- ✅ 完整的验证码流程
- ✅ 微信OAuth登录
- ✅ 用户注册和密码重置
- ✅ 用户信息管理

### 2. 安全性
- ✅ JWT Token认证
- ✅ 密码加密存储
- ✅ 验证码有效期控制
- ✅ 登录状态管理

### 3. 用户体验
- ✅ 统一的错误处理
- ✅ 加载状态反馈
- ✅ 表单验证
- ✅ 响应式设计

### 4. 开发体验
- ✅ 完整的TypeScript类型支持
- ✅ 统一的API响应格式
- ✅ 详细的错误信息
- ✅ 易于调试和维护

## 🎯 总结

通过完全对接后端unit-auth的API接口，我们实现了：

1. **功能完整性** - 支持所有认证相关功能
2. **安全性** - 采用标准的JWT认证和密码加密
3. **用户体验** - 统一的界面和交互体验
4. **开发效率** - 完整的类型支持和错误处理

这种对接方式确保了前后端的一致性，为后续的功能扩展和维护奠定了坚实的基础。 