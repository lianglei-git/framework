# 密码重置功能文档

## 概述

密码重置功能允许用户通过邮箱验证码安全地重置密码。该功能包含完整的验证流程和安全措施。

## 功能特性

### ✅ 已实现功能
- **邮箱验证** - 通过邮箱发送重置验证码
- **验证码验证** - 验证重置码的有效性
- **密码更新** - 安全地更新用户密码
- **防重复使用** - 验证码使用后立即失效
- **过期机制** - 验证码10分钟后自动过期
- **错误处理** - 完善的错误提示和处理

### 🔒 安全措施
- 验证码一次性使用
- 验证码10分钟过期
- 密码使用 bcrypt 加密
- 验证用户邮箱存在性
- 防止暴力破解

## API 接口

### 1. 发送密码重置邮件

**接口**: `POST /api/v1/auth/forgot-password`

**请求体**:
```json
{
  "email": "user@example.com"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "Password reset code sent successfully"
}
```

**错误响应**:
```json
{
  "code": 404,
  "message": "User not found"
}
```

### 2. 重置密码

**接口**: `POST /api/v1/auth/reset-password`

**请求体**:
```json
{
  "email": "user@example.com",
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

**错误响应**:
```json
{
  "code": 400,
  "message": "Invalid or expired verification code"
}
```

## 使用流程

### 1. 用户请求密码重置
```bash
curl -X POST http://localhost:8080/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

### 2. 用户收到验证码邮件
系统会发送包含6位数字验证码的邮件到用户邮箱。

### 3. 用户输入验证码和新密码
```bash
curl -X POST http://localhost:8080/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@example.com",
    "code":"123456",
    "password":"newpassword123"
  }'
```

### 4. 验证新密码
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@example.com",
    "password":"newpassword123"
  }'
```

## 数据库表结构

### EmailVerification 表
```sql
CREATE TABLE email_verifications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'register' 或 'reset_password'
  expires_at DATETIME NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 测试工具

### 1. 验证码查看工具
```bash
# 查看指定邮箱的最新验证码
go run utils/verification_tool.go latest user@example.com

# 查看指定邮箱的所有验证码
go run utils/verification_tool.go email user@example.com

# 查看所有验证码
go run utils/verification_tool.go list
```

### 2. 完整测试脚本
```bash
# 运行完整的密码重置测试
./test_password_reset.sh
```

## 错误处理

### 常见错误及解决方案

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `User not found` | 邮箱不存在 | 检查邮箱地址是否正确 |
| `Invalid or expired verification code` | 验证码错误或过期 | 重新发送验证码 |
| `Failed to send verification code` | 邮件发送失败 | 检查邮件配置 |
| `Failed to save verification code` | 数据库错误 | 检查数据库连接 |

## 安全考虑

### 1. 验证码安全
- 验证码为6位数字
- 10分钟过期时间
- 一次性使用，不可重复
- 防止暴力破解

### 2. 密码安全
- 新密码使用 bcrypt 加密
- 密码长度至少6位
- 旧密码立即失效

### 3. 邮箱安全
- 验证邮箱存在性
- 防止邮箱枚举攻击
- 邮件发送失败处理

## 配置说明

### 邮件配置
在 `.env` 文件中配置邮件服务：
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
```

### 验证码配置
验证码相关配置在代码中：
- 验证码长度：6位
- 过期时间：10分钟
- 验证码类型：数字

## 扩展功能

### 可选的增强功能
1. **短信验证** - 支持手机号重置密码
2. **安全问题** - 添加安全问题验证
3. **多因素认证** - 支持2FA重置
4. **密码强度检查** - 验证新密码强度
5. **重置历史记录** - 记录密码重置历史

## 监控和日志

### 日志记录
- 密码重置请求
- 验证码发送记录
- 密码更新记录
- 错误日志记录

### 监控指标
- 密码重置成功率
- 验证码发送成功率
- 平均重置时间
- 错误率统计

## 最佳实践

### 1. 用户体验
- 提供清晰的错误提示
- 显示验证码过期时间
- 支持重新发送验证码
- 密码强度提示

### 2. 安全最佳实践
- 限制验证码发送频率
- 记录重置尝试次数
- 监控异常重置行为
- 定期清理过期验证码

### 3. 开发建议
- 使用HTTPS传输
- 实现速率限制
- 添加日志记录
- 定期安全审计

## 故障排除

### 常见问题

**Q: 验证码收不到怎么办？**
A: 检查邮件配置，确认邮箱地址正确，查看垃圾邮件文件夹。

**Q: 验证码过期了怎么办？**
A: 重新发送验证码，验证码有效期为10分钟。

**Q: 重置密码后无法登录？**
A: 确认新密码正确，检查是否有特殊字符问题。

**Q: 系统提示用户不存在？**
A: 确认邮箱地址正确，检查用户是否已被删除。

## 更新日志

### v1.0.0 (2025-08-04)
- ✅ 实现基础密码重置功能
- ✅ 添加邮箱验证码机制
- ✅ 实现验证码过期机制
- ✅ 添加防重复使用保护
- ✅ 完善错误处理机制
- ✅ 创建测试工具和脚本 