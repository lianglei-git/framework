# 验证码过期机制说明

## 📧 验证码类型和过期时间

### 1. 邮箱验证码
- **过期时间**: 10分钟
- **用途**: 注册、密码重置
- **存储表**: `email_verifications`

### 2. 短信验证码
- **过期时间**: 5分钟
- **用途**: 登录、注册
- **存储表**: `sms_verifications`

### 3. 密码重置令牌
- **过期时间**: 10分钟
- **用途**: 密码重置
- **存储表**: `password_resets`

### 4. 微信二维码会话
- **过期时间**: 5分钟
- **用途**: 微信扫码登录
- **存储表**: `wechat_qr_sessions`

## 🧹 自动清理机制

### 清理策略
- **清理频率**: 每5分钟执行一次
- **清理内容**: 
  - 过期的验证码（`expires_at < now()`）
  - 已使用的验证码（`used = true`）
  - 30天前的登录日志

### 清理范围
1. **邮箱验证码**: 过期或已使用
2. **短信验证码**: 过期或已使用
3. **密码重置令牌**: 过期或已使用
4. **微信二维码会话**: 过期或已使用
5. **登录日志**: 30天前

## 🔧 管理接口

### 查看验证码统计
```bash
GET /api/v1/admin/verification-stats
Authorization: Bearer YOUR_ADMIN_TOKEN
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

### 手动清理验证码
```bash
POST /api/v1/admin/cleanup-verifications
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**响应示例**:
```json
{
  "code": 200,
  "message": "Verification cleanup completed"
}
```

## 🚀 启动清理服务

清理服务在应用启动时自动启动：

```go
// 在 main.go 中
cleanupService := services.NewCleanupService(db)
cleanupService.StartCleanupScheduler()
```

## 📊 数据库表结构

### EmailVerification
```sql
CREATE TABLE email_verifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    type VARCHAR(20) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### SMSVerification
```sql
CREATE TABLE sms_verifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(10) NOT NULL,
    type VARCHAR(20) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔍 验证逻辑

### 验证码验证流程
1. 查找验证码记录
2. 检查是否过期（`expires_at > now()`）
3. 检查是否已使用（`used = false`）
4. 验证码匹配
5. 标记为已使用（`used = true`）

### 代码示例
```go
// 查找验证码
var verification models.EmailVerification
if err := db.Where("email = ? AND code = ? AND used = ? AND expires_at > ?",
    req.Email, req.Code, false, time.Now()).First(&verification).Error; err != nil {
    // 验证码无效或过期
    return
}

// 标记为已使用
db.Model(&verification).Update("used", true)
```

## ⚠️ 注意事项

1. **安全性**: 验证码过期后立即失效，无法重复使用
2. **性能**: 定期清理避免数据库表过大
3. **监控**: 可通过管理接口查看验证码使用情况
4. **日志**: 清理过程会记录详细日志
5. **手动清理**: 管理员可随时手动触发清理

## 🧪 测试

使用提供的测试脚本验证过期功能：

```bash
chmod +x test_verification_expiry.sh
./test_verification_expiry.sh
```

## 📈 监控指标

清理服务会输出以下日志：
- 清理开始和完成
- 各类验证码清理数量
- 错误信息（如果有）

示例日志：
```
🧹 启动验证码清理调度器...
🧹 开始清理过期验证码...
✅ 清理了 5 条过期邮箱验证码
✅ 清理了 3 条过期短信验证码
✅ 清理了 2 条过期密码重置令牌
✅ 清理了 1 条过期微信二维码会话
✅ 清理了 10 条过期登录日志
🧹 验证码清理完成
``` 