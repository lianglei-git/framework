# 短信验证码和手机号登录功能

## 功能概述

本系统实现了完整的短信验证码功能，包括发送验证码、手机号登录和密码重置等功能。

## 已实现的功能

### ✅ 短信验证码发送
- **POST /api/v1/auth/send-sms-code** - 发送短信验证码
- 支持登录和重置密码两种类型
- 验证码有效期10分钟
- 1分钟内防重复发送

### ✅ 手机号登录
- **POST /api/v1/auth/phone-login** - 手机号登录
- 自动创建新用户（如果不存在）
- 验证码验证
- JWT Token生成

### ✅ 手机号重置密码
- **POST /api/v1/auth/phone-reset-password** - 手机号重置密码
- 验证码验证
- 密码更新

## API端点

### 发送短信验证码
```http
POST /api/v1/auth/send-sms-code
Content-Type: application/json

{
  "phone": "13800138000",
  "type": "login"
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "Verification code sent successfully",
  "data": {
    "phone": "13800138000",
    "type": "login",
    "expires_at": "2024-01-01T12:00:00Z"
  }
}
```

### 手机号登录
```http
POST /api/v1/auth/phone-login
Content-Type: application/json

{
  "phone": "13800138000",
  "code": "123456"
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "Phone login successful",
  "data": {
    "user": {
      "id": "user-id",
      "phone": "13800138000",
      "username": "13800138000",
      "nickname": "手机用户",
      "role": "user",
      "status": "active",
      "phone_verified": true
    },
    "token": "jwt-token"
  }
}
```

### 手机号重置密码
```http
POST /api/v1/auth/phone-reset-password
Content-Type: application/json

{
  "phone": "13800138000",
  "code": "123456",
  "password": "newpassword123"
}
```

## 核心组件

### 1. SMSService 接口
```go
type SMSService interface {
    SendVerificationCode(phone, code, template string) error
    SendNotification(phone, message string) error
}
```

### 2. MockSMSService 实现
- 模拟短信发送
- 控制台输出验证码
- 可扩展为真实短信服务

### 3. SMSHandler 处理器
- 验证码生成和验证
- 数据库操作
- 业务逻辑处理

## 数据模型

### SMSVerification
```go
type SMSVerification struct {
    ID        uint      `json:"id" gorm:"primaryKey"`
    Phone     string    `json:"phone" gorm:"not null"`
    Code      string    `json:"code" gorm:"not null"`
    Type      string    `json:"type" gorm:"not null"` // login, register, reset_password
    ExpiresAt time.Time `json:"expires_at" gorm:"not null"`
    Used      bool      `json:"used" gorm:"default:false"`
    CreatedAt time.Time `json:"created_at"`
}
```

### 请求结构体
```go
type SendPhoneCodeRequest struct {
    Phone string `json:"phone" binding:"required"`
    Type  string `json:"type" binding:"required,oneof=login reset_password"`
}

type PhoneLoginRequest struct {
    Phone string `json:"phone" binding:"required"`
    Code  string `json:"code" binding:"required,len=6"`
}
```

## 短信模板

### 登录验证码
```
您的登录验证码是：{code}，10分钟内有效。
```

### 注册验证码
```
您的注册验证码是：{code}，10分钟内有效。
```

### 重置密码验证码
```
您的密码重置验证码是：{code}，10分钟内有效。
```

## 安全特性

### 1. 验证码安全
- 6位数字验证码
- 10分钟有效期
- 一次性使用
- 防重复发送（1分钟间隔）

### 2. 手机号验证
- 格式验证
- 唯一性检查
- 状态检查

### 3. 用户安全
- 自动创建用户
- 状态检查
- 登录记录

## 扩展功能

### 真实短信服务集成
可以集成以下短信服务：

1. **阿里云短信服务**
```go
type AliyunSMSService struct {
    AccessKeyID     string
    AccessKeySecret string
    SignName        string
    TemplateCode    string
}
```

2. **腾讯云短信服务**
```go
type TencentSMSService struct {
    SecretID  string
    SecretKey string
    SdkAppID  string
    SignName  string
}
```

3. **华为云短信服务**
```go
type HuaweiSMSService struct {
    AppKey    string
    AppSecret string
    Sender    string
    Template  string
}
```

### 短信统计功能
```go
func (h *SMSHandler) GetSMSStats() (map[string]interface{}, error) {
    // 返回短信发送统计
    return map[string]interface{}{
        "total_codes":   totalCount,
        "today_codes":   todayCount,
        "expired_codes": expiredCount,
    }, nil
}
```

## 测试

### 测试脚本
```bash
chmod +x test_sms_auth.sh
./test_sms_auth.sh
```

### 测试内容
1. 手机号格式验证
2. 发送登录验证码
3. 发送重置密码验证码
4. 手机号登录（无效验证码）
5. 手机号登录（无效手机号格式）
6. 手机号重置密码

## 使用方法

### 1. 发送验证码
```bash
curl -X POST "http://localhost:8080/api/v1/auth/send-sms-code" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13800138000",
    "type": "login"
  }'
```

### 2. 手机号登录
```bash
curl -X POST "http://localhost:8080/api/v1/auth/phone-login" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13800138000",
    "code": "123456"
  }'
```

### 3. 重置密码
```bash
curl -X POST "http://localhost:8080/api/v1/auth/phone-reset-password" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13800138000",
    "code": "123456",
    "password": "newpassword123"
  }'
```

## 配置

### 环境变量
```bash
# 短信服务配置（可选）
SMS_PROVIDER=aliyun  # aliyun, tencent, huawei
SMS_ACCESS_KEY=your_access_key
SMS_SECRET_KEY=your_secret_key
SMS_SIGN_NAME=your_sign_name
SMS_TEMPLATE_CODE=your_template_code
```

### 数据库配置
确保数据库中存在 `sms_verifications` 表：
```sql
CREATE TABLE sms_verifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(10) NOT NULL,
    type VARCHAR(20) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 故障排除

### 常见问题
1. **验证码发送失败** - 检查手机号格式
2. **验证码验证失败** - 检查验证码是否正确和是否过期
3. **用户创建失败** - 检查数据库连接和权限
4. **Token生成失败** - 检查JWT配置

### 调试方法
1. 查看应用日志
2. 检查数据库数据
3. 验证API请求格式
4. 使用测试脚本验证功能

## 总结

短信验证码功能提供了完整的手机号认证解决方案：

1. **安全性** - 验证码有效期和防重复发送
2. **易用性** - 简单的API接口
3. **可扩展性** - 支持多种短信服务提供商
4. **完整性** - 包含发送、验证、登录、重置密码等完整流程

该功能为应用提供了可靠的手机号认证机制，支持用户通过手机号快速注册和登录。 