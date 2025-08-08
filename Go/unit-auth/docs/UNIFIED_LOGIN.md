# 统一登录功能文档

## 概述

统一登录功能支持用户使用邮箱、用户名或手机号进行登录，系统会自动识别账号类型并提供相应的认证方式。同时支持手机号登录和密码重置功能。

## 功能特性

### ✅ 已实现功能
- **统一登录接口** - 支持邮箱、用户名、手机号三种登录方式
- **自动账号识别** - 智能识别账号类型（邮箱/用户名/手机号）
- **手机号登录** - 支持手机验证码登录
- **手机号重置密码** - 支持手机验证码重置密码
- **邮箱重置密码** - 支持邮箱验证码重置密码
- **安全验证** - 完善的错误处理和频率限制

### 🔒 安全措施
- 验证码10分钟过期
- 验证码使用后立即失效
- 1分钟内限制重复发送验证码
- 密码使用 bcrypt 加密
- 支持邮箱和手机号可选（NULL值）

## API 接口

### 1. 统一登录

**接口**: `POST /api/v1/auth/login`

**请求体**:
```json
{
  "account": "user@example.com",  // 邮箱、用户名或手机号
  "password": "password123"       // 密码
}
```

**响应**:
```json
{
  "code": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "phone": "13800138000",
      "username": "username",
      "nickname": "用户昵称",
      "role": "user",
      "status": "active",
      "email_verified": true,
      "phone_verified": true,
      "login_count": 5,
      "last_login_at": "2025-08-04T13:57:48.137205+08:00",
      "created_at": "2025-08-04T13:02:48.307+08:00"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. 手机号登录

**接口**: `POST /api/v1/auth/phone-login`

**请求体**:
```json
{
  "phone": "13800138000",
  "code": "123456"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "Phone login successful",
  "data": {
    "user": {
      "id": "user-id",
      "email": "",
      "phone": "13800138000",
      "username": "13800138000",
      "nickname": "手机用户",
      "role": "user",
      "status": "active",
      "email_verified": false,
      "phone_verified": true,
      "login_count": 0,
      "last_login_at": "2025-08-04T13:56:58.233405+08:00",
      "created_at": "2025-08-04T13:56:58.229+08:00"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3. 发送手机验证码

**接口**: `POST /api/v1/auth/send-sms-code`

**请求体**:
```json
{
  "phone": "13800138000",
  "type": "login"  // login 或 reset_password
}
```

**响应**:
```json
{
  "code": 200,
  "message": "Verification code sent successfully"
}
```

### 4. 手机号重置密码

**接口**: `POST /api/v1/auth/phone-reset-password`

**请求体**:
```json
{
  "phone": "13800138000",
  "code": "123456",
  "password": "newpassword123"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "Password reset successfully"
}
```

## 账号类型识别

### 邮箱格式
- 标准邮箱格式：`user@example.com`
- 支持特殊字符：`user+tag@example.com`

### 用户名格式
- 长度：3-20位
- 字符：字母、数字、下划线
- 示例：`user123`, `test_user`

### 手机号格式
- 中国大陆手机号：`1[3-9]xxxxxxxxx`
- 示例：`13800138000`, `15912345678`

## 使用流程

### 1. 邮箱/用户名登录
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "account": "user@example.com",
    "password": "password123"
  }'
```

### 2. 手机号登录
```bash
# 发送验证码
curl -X POST http://localhost:8080/api/v1/auth/send-sms-code \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13800138000",
    "type": "login"
  }'

# 使用验证码登录
curl -X POST http://localhost:8080/api/v1/auth/phone-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13800138000",
    "code": "123456"
  }'
```

### 3. 手机号重置密码
```bash
# 发送重置验证码
curl -X POST http://localhost:8080/api/v1/auth/send-sms-code \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13800138000",
    "type": "reset_password"
  }'

# 重置密码
curl -X POST http://localhost:8080/api/v1/auth/phone-reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13800138000",
    "code": "123456",
    "password": "newpassword123"
  }'
```

## 数据库表结构

### User 表（更新后）
```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE,  -- 允许NULL
  phone VARCHAR(20) UNIQUE,    -- 允许NULL
  username VARCHAR(50) UNIQUE NOT NULL,
  nickname VARCHAR(100),
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  status VARCHAR(20) DEFAULT 'active',
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  google_id VARCHAR(100) UNIQUE,  -- 允许NULL
  github_id VARCHAR(100) UNIQUE,  -- 允许NULL
  wechat_id VARCHAR(100) UNIQUE,  -- 允许NULL
  meta JSON,
  login_count BIGINT DEFAULT 0,
  last_login_at DATETIME,
  last_login_ip VARCHAR(45),
  last_login_user_agent VARCHAR(500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_users_email (email),
  INDEX idx_users_phone (phone),
  INDEX idx_users_username (username)
);
```

### SMSVerification 表
```sql
CREATE TABLE sms_verifications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  type VARCHAR(20) NOT NULL,  -- login, reset_password
  expires_at DATETIME NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 错误处理

### 常见错误及解决方案

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `Invalid account format` | 账号格式不正确 | 检查邮箱、用户名或手机号格式 |
| `Invalid account or password` | 账号不存在或密码错误 | 检查账号和密码是否正确 |
| `Invalid or expired verification code` | 验证码错误或过期 | 重新发送验证码 |
| `Please wait 1 minute before requesting another code` | 验证码发送频率限制 | 等待1分钟后重新发送 |
| `Invalid phone number format` | 手机号格式错误 | 使用正确的中国大陆手机号格式 |
| `Account is disabled` | 用户账号被禁用 | 联系管理员激活账号 |

## 安全考虑

### 1. 验证码安全
- 验证码为6位数字
- 10分钟过期时间
- 一次性使用，不可重复
- 1分钟内限制重复发送

### 2. 密码安全
- 新密码使用 bcrypt 加密
- 密码长度至少6位
- 旧密码立即失效

### 3. 账号安全
- 支持邮箱和手机号可选
- 防止账号枚举攻击
- 完善的错误提示

## 配置说明

### 验证码配置
验证码相关配置在代码中：
- 验证码长度：6位
- 过期时间：10分钟
- 发送频率限制：1分钟

### 手机号格式配置
在 `utils/account_utils.go` 中配置：
```go
// 支持中国大陆手机号格式
phoneRegex := regexp.MustCompile(`^1[3-9]\d{9}$`)
```

## 扩展功能

### 可选的增强功能
1. **短信服务集成** - 集成真实的短信服务商
2. **多语言支持** - 支持多语言错误提示
3. **登录日志** - 记录详细的登录日志
4. **设备管理** - 支持多设备登录管理
5. **登录统计** - 统计登录成功率和趋势

## 监控和日志

### 日志记录
- 登录尝试记录
- 验证码发送记录
- 密码重置记录
- 错误日志记录

### 监控指标
- 登录成功率
- 验证码发送成功率
- 平均登录时间
- 错误率统计

## 最佳实践

### 1. 用户体验
- 提供清晰的错误提示
- 显示验证码过期时间
- 支持重新发送验证码
- 密码强度提示

### 2. 安全最佳实践
- 限制验证码发送频率
- 记录登录尝试次数
- 监控异常登录行为
- 定期清理过期验证码

### 3. 开发建议
- 使用HTTPS传输
- 实现速率限制
- 添加日志记录
- 定期安全审计

## 故障排除

### 常见问题

**Q: 手机号登录失败怎么办？**
A: 检查手机号格式是否正确，确认验证码是否过期，检查是否在1分钟内重复发送。

**Q: 邮箱登录提示账号不存在？**
A: 确认邮箱地址正确，检查用户是否已注册，确认账号状态是否正常。

**Q: 验证码收不到怎么办？**
A: 检查手机号格式，确认短信服务配置，查看垃圾短信文件夹。

**Q: 统一登录识别错误怎么办？**
A: 检查账号格式是否符合规范，确认邮箱、用户名、手机号格式正确。

## 更新日志

### v1.0.0 (2025-08-04)
- ✅ 实现统一登录功能
- ✅ 支持邮箱、用户名、手机号登录
- ✅ 自动账号类型识别
- ✅ 手机号验证码登录
- ✅ 手机号密码重置
- ✅ 完善错误处理机制
- ✅ 支持邮箱和手机号可选字段
- ✅ 创建测试工具和脚本 