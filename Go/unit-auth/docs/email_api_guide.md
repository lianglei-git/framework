# 邮箱相关API完整指南

## 📧 概述

本文档详细介绍了邮箱相关的所有API接口，包括注册、登录、验证码、密码重置等功能。

## 🔗 基础信息

- **基础URL**: `http://localhost:8080`
- **API版本**: `v1`
- **认证方式**: JWT Bearer Token
- **内容类型**: `application/json`

## 📋 API接口列表

### 1. 健康检查

**GET** `/health`

检查服务状态

**响应示例**:
```json
{
  "status": "ok",
  "message": "Unit Auth service is running",
  "version": "1.0.0"
}
```

### 2. 发送邮箱验证码

**POST** `/api/v1/auth/send-email-code`

发送邮箱验证码

**请求参数**:
```json
{
  "email": "user@example.com",
  "type": "register"  // register, reset_password
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "Verification code sent successfully"
}
```

### 3. 验证邮箱验证码

**POST** `/api/v1/auth/verify-email`

验证邮箱验证码

**请求参数**:
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "Email verified successfully"
}
```

### 4. 用户注册

**POST** `/api/v1/auth/register`

注册新用户

**请求参数**:
```json
{
  "email": "user@example.com",
  "username": "username",
  "nickname": "用户昵称",
  "password": "password123",
  "code": "123456"
}
```

**响应示例**:
```json
{
  "code": 201,
  "message": "User registered successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "nickname": "用户昵称",
    "email_verified": true,
    "created_at": "2025-08-01T10:00:00Z"
  }
}
```

### 5. 用户登录

**POST** `/api/v1/auth/login`

用户登录

**请求参数**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username"
    },
    "token": "jwt_token_here"
  }
}
```

### 6. 获取用户信息

**GET** `/api/v1/user/profile`

获取当前用户信息

**请求头**:
```
Authorization: Bearer <jwt_token>
```

**响应示例**:
```json
{
  "code": 200,
  "message": "Profile retrieved successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "nickname": "用户昵称",
    "email_verified": true,
    "created_at": "2025-08-01T10:00:00Z"
  }
}
```

### 7. 更新用户信息

**PUT** `/api/v1/user/profile`

更新用户信息

**请求头**:
```
Authorization: Bearer <jwt_token>
```

**请求参数**:
```json
{
  "nickname": "新昵称",
  "avatar": "avatar_url"
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "Profile updated successfully",
  "data": {
    "id": "uuid",
    "nickname": "新昵称",
    "avatar": "avatar_url"
  }
}
```

### 8. 修改密码

**POST** `/api/v1/user/change-password`

修改用户密码

**请求头**:
```
Authorization: Bearer <jwt_token>
```

**请求参数**:
```json
{
  "old_password": "oldpassword",
  "new_password": "newpassword123"
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "Password changed successfully"
}
```

### 9. 忘记密码

**POST** `/api/v1/auth/forgot-password`

发送密码重置验证码

**请求参数**:
```json
{
  "email": "user@example.com"
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "Password reset code sent successfully"
}
```

### 10. 重置密码

**POST** `/api/v1/auth/reset-password`

重置密码

**请求参数**:
```json
{
  "email": "user@example.com",
  "code": "123456",
  "password": "newpassword123"
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "Password reset successfully"
}
```

### 11. 发送短信验证码

**POST** `/api/v1/auth/send-sms-code`

发送短信验证码

**请求参数**:
```json
{
  "phone": "18639130611",
  "type": "login"  // login, register
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "SMS verification code sent successfully",
  "data": {
    "code": "123456"  // 开发环境返回验证码
  }
}
```

### 12. 手机号登录

**POST** `/api/v1/auth/phone-login`

使用手机号登录

**请求参数**:
```json
{
  "phone": "18639130611",
  "code": "123456"
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "phone": "18639130611"
    },
    "token": "jwt_token_here"
  }
}
```

### 13. 获取认证提供者

**GET** `/api/v1/auth/providers`

获取可用的认证提供者

**响应示例**:
```json
{
  "code": 200,
  "message": "Providers retrieved successfully",
  "data": [
    {
      "name": "email",
      "enabled": true,
      "display_name": "邮箱登录"
    },
    {
      "name": "phone",
      "enabled": true,
      "display_name": "手机号登录"
    },
    {
      "name": "google",
      "enabled": true,
      "display_name": "Google登录"
    },
    {
      "name": "wechat",
      "enabled": true,
      "display_name": "微信登录"
    }
  ]
}
```

### 14. 获取验证码统计（管理员）

**GET** `/api/v1/admin/verification-stats`

获取验证码统计信息

**请求头**:
```
Authorization: Bearer <admin_jwt_token>
```

**响应示例**:
```json
{
  "code": 200,
  "message": "Verification stats retrieved successfully",
  "data": {
    "email_verifications": {
      "total": 15,
      "expired": 8,
      "used": 5,
      "active": 2
    },
    "sms_verifications": {
      "total": 10,
      "expired": 6,
      "used": 3,
      "active": 1
    }
  }
}
```

### 15. 手动清理验证码（管理员）

**POST** `/api/v1/admin/cleanup-verifications`

手动清理过期验证码

**请求头**:
```
Authorization: Bearer <admin_jwt_token>
```

**响应示例**:
```json
{
  "code": 200,
  "message": "Verification cleanup completed"
}
```

## 🔐 认证和授权

### JWT Token格式

```
Authorization: Bearer <jwt_token>
```

### 权限级别

1. **公开接口**: 无需认证
   - 健康检查
   - 发送验证码
   - 用户注册
   - 用户登录

2. **用户接口**: 需要用户认证
   - 获取用户信息
   - 更新用户信息
   - 修改密码

3. **管理员接口**: 需要管理员权限
   - 验证码统计
   - 手动清理验证码
   - 用户管理

## 📊 错误码说明

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

## 🧪 测试脚本

使用提供的测试脚本进行完整功能测试：

```bash
chmod +x test_email.sh
./test_email.sh
```

## 📝 注意事项

1. **验证码过期时间**:
   - 邮箱验证码: 10分钟
   - 短信验证码: 5分钟

2. **频率限制**:
   - 验证码发送间隔: 1分钟
   - 登录失败限制: 5次/小时

3. **密码要求**:
   - 最小长度: 6位
   - 建议包含字母和数字

4. **邮箱格式**:
   - 必须符合标准邮箱格式
   - 支持常见邮箱服务商

## 🔧 开发环境配置

### 环境变量

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=unit_auth

# SMTP配置
SMTP_HOST=smtp.yeah.net
SMTP_PORT=465
SMTP_USER=your_email@yeah.net
SMTP_PASSWORD=your_password
SMTP_FROM=your_email@yeah.net

# JWT配置
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=24

# 服务器配置
PORT=8080
HOST=0.0.0.0
GIN_MODE=debug
```

### 启动服务

```bash
# 编译
go build -o unit-auth .

# 启动
./unit-auth
```

## 📞 技术支持

如有问题，请查看：
1. 应用日志
2. 数据库连接状态
3. SMTP配置
4. 网络连接 