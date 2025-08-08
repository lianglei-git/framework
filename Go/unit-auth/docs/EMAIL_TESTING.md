# 邮箱功能测试指南

## 📧 概述

本文档介绍如何使用提供的测试脚本来测试邮箱相关的所有API功能。

## 🧪 测试脚本

### 1. 完整测试脚本 (`test_email.sh`)

这是最全面的测试脚本，包含所有邮箱相关功能的完整测试流程。

**特点**:
- 完整的用户注册到登录流程
- 密码重置功能测试
- 用户信息管理测试
- 验证码统计和管理功能
- 管理员功能测试
- 统计功能测试
- 邮件系统功能测试
- 彩色输出和详细日志
- 自动统计测试结果

**使用方法**:
```bash
chmod +x test_email.sh
./test_email.sh
```

**测试流程** (30个测试项目):
1. 检查服务状态
2. 发送注册验证码
3. 验证邮箱验证码
4. 用户注册
5. 用户登录
6. 获取用户信息
7. 更新用户信息
8. 修改密码
9. 发送密码重置验证码
10. 重置密码
11. 使用新密码登录
12. 获取认证提供者
13. 验证码统计（管理员）
14. 手动清理验证码（管理员）
15. 发送短信验证码
16. 手机号登录
17. 发送欢迎邮件
18. 发送密码修改通知邮件
19. 发送账户锁定通知邮件
20. 发送登录通知邮件
21. 获取用户列表（管理员）
22. 获取单个用户信息（管理员）
23. 更新用户信息（管理员）
24. 删除用户（管理员）
25. 获取登录日志（管理员）
26. 获取总体统计
27. 获取每日统计
28. 获取每周统计
29. 获取每月统计
30. 测试邮件模板
31. 测试SMTP配置

### 2. 快速测试脚本 (`quick_test.sh`)

用于快速测试单个API功能的脚本。

**特点**:
- 支持测试单个API
- 交互式输入验证码
- 简洁的输出格式
- 支持帮助信息

**使用方法**:
```bash
chmod +x quick_test.sh

# 查看帮助
./quick_test.sh help

# 测试健康检查
./quick_test.sh health

# 发送验证码
./quick_test.sh send-code

# 用户注册
./quick_test.sh register

# 用户登录
./quick_test.sh login

# 获取用户信息
./quick_test.sh profile

# 忘记密码
./quick_test.sh forgot-password

# 重置密码
./quick_test.sh reset-password

# 获取认证提供者
./quick_test.sh providers

# 发送短信验证码
./quick_test.sh sms-code

# 手机号登录
./quick_test.sh phone-login

# 运行所有非交互式测试
./quick_test.sh all
```

### 3. 邮件功能专项测试脚本 (`test_email_functions.sh`)

专门用于测试邮件发送功能的脚本。

**特点**:
- 专注于邮件发送功能
- 测试邮件模板系统
- 测试SMTP配置
- 测试频率限制
- 测试错误处理
- 测试邮件统计

**使用方法**:
```bash
chmod +x test_email_functions.sh
./test_email_functions.sh
```

**测试项目** (10个测试):
1. 验证码邮件发送
2. 密码重置邮件发送
3. 邮件模板测试
4. SMTP配置测试
5. 邮件发送频率限制
6. 邮件验证码过期测试
7. 邮件内容格式测试
8. 邮件发送错误处理
9. 邮件发送日志
10. 邮件发送统计

## 📋 API功能列表

### 基础功能
- ✅ 健康检查 (`GET /health`)
- ✅ 发送邮箱验证码 (`POST /api/v1/auth/send-email-code`)
- ✅ 验证邮箱验证码 (`POST /api/v1/auth/verify-email`)
- ✅ 用户注册 (`POST /api/v1/auth/register`)
- ✅ 用户登录 (`POST /api/v1/auth/login`)

### 用户管理
- ✅ 获取用户信息 (`GET /api/v1/user/profile`)
- ✅ 更新用户信息 (`PUT /api/v1/user/profile`)
- ✅ 修改密码 (`POST /api/v1/user/change-password`)

### 密码重置
- ✅ 忘记密码 (`POST /api/v1/auth/forgot-password`)
- ✅ 重置密码 (`POST /api/v1/auth/reset-password`)

### 短信功能
- ✅ 发送短信验证码 (`POST /api/v1/auth/send-sms-code`)
- ✅ 手机号登录 (`POST /api/v1/auth/phone-login`)

### 邮件通知功能
- ✅ 欢迎邮件 (用户注册时自动发送)
- ✅ 密码修改通知邮件 (修改密码时自动发送)
- ✅ 账户锁定通知邮件 (账户被锁定时自动发送)
- ✅ 登录通知邮件 (新设备登录时自动发送)

### 管理员功能
- ✅ 获取用户列表 (`GET /api/v1/admin/users`)
- ✅ 获取单个用户信息 (`GET /api/v1/admin/users/:id`)
- ✅ 更新用户信息 (`PUT /api/v1/admin/users/:id`)
- ✅ 删除用户 (`DELETE /api/v1/admin/users/:id`)
- ✅ 获取登录日志 (`GET /api/v1/admin/login-logs`)
- ✅ 验证码统计 (`GET /api/v1/admin/verification-stats`)
- ✅ 手动清理验证码 (`POST /api/v1/admin/cleanup-verifications`)

### 统计功能
- ✅ 获取总体统计 (`GET /api/v1/stats/overall`)
- ✅ 获取每日统计 (`GET /api/v1/stats/daily`)
- ✅ 获取每周统计 (`GET /api/v1/stats/weekly`)
- ✅ 获取每月统计 (`GET /api/v1/stats/monthly/:year/:month`)

### 系统功能
- ✅ 获取认证提供者 (`GET /api/v1/auth/providers`)
- ✅ 邮件模板系统 (内置5种模板)
- ✅ SMTP配置管理
- ✅ 邮件发送频率限制
- ✅ 验证码过期机制
- ✅ 自动清理服务

## 🔧 测试环境配置

### 1. 启动服务
```bash
# 编译应用
go build -o unit-auth .

# 启动服务
./unit-auth
```

### 2. 检查服务状态
```bash
curl http://localhost:8080/health
```

### 3. 配置邮箱
确保 `.env` 文件中的SMTP配置正确：
```bash
SMTP_HOST=smtp.yeah.net
SMTP_PORT=465
SMTP_USER=your_email@yeah.net
SMTP_PASSWORD=your_password
SMTP_FROM=your_email@yeah.net
```

## 📊 测试结果示例

### 成功测试结果
```
🧪 邮箱功能完整测试脚本
==================================
测试邮箱: lianglei_cool@163.com
测试用户: system
==================================

🔹 检查服务状态
==================================
✅ 服务运行正常

🔹 测试1: 发送注册验证码
==================================
✅ 注册验证码发送成功

🔹 测试2: 验证邮箱验证码
==================================
✅ 邮箱验证成功

🔹 测试3: 用户注册
==================================
✅ 用户注册成功

📝 测试结果统计
==================================
总测试数: 16
成功数: 16
失败数: 0
成功率: 100%

✅ 所有测试通过！
```

### 失败测试结果
```
❌ 验证码发送失败
错误详情: {"code":500,"message":"Failed to send verification code"}

💡 可能的原因:
1. SMTP配置错误
2. 网络连接问题
3. 邮箱服务商限制
```

## 🚨 常见问题

### 1. 验证码发送失败
**问题**: 返回500错误
**解决方案**:
- 检查SMTP配置
- 确认邮箱服务商设置
- 检查网络连接

### 2. 验证码验证失败
**问题**: 返回400错误
**解决方案**:
- 确认验证码正确
- 检查验证码是否过期
- 确认邮箱地址正确

### 3. 用户注册失败
**问题**: 返回409错误
**解决方案**:
- 邮箱或用户名已存在
- 使用新的邮箱地址

### 4. 登录失败
**问题**: 返回401错误
**解决方案**:
- 确认邮箱和密码正确
- 检查用户是否已注册

### 5. 权限不足
**问题**: 返回403错误
**解决方案**:
- 确认JWT Token有效
- 检查用户权限级别

## 📈 性能测试

### 验证码发送频率限制
- 同一邮箱1分钟内只能发送一次验证码
- 测试脚本会自动处理频率限制

### 验证码过期时间
- 邮箱验证码: 10分钟
- 短信验证码: 5分钟
- 密码重置令牌: 10分钟

### 自动清理机制
- 每5分钟自动清理过期验证码
- 可通过管理接口手动清理

## 🔍 调试技巧

### 1. 查看应用日志
```bash
# 启动应用时查看详细日志
./unit-auth 2>&1 | tee app.log
```

### 2. 检查数据库
```bash
# 查看验证码记录
mysql -u root -p unit_auth -e "SELECT * FROM email_verifications ORDER BY created_at DESC LIMIT 5;"

# 查看用户记录
mysql -u root -p unit_auth -e "SELECT * FROM users ORDER BY created_at DESC LIMIT 5;"
```

### 3. 使用调试脚本
```bash
# 运行调试脚本
chmod +x debug_verification.sh
./debug_verification.sh
```

## 📚 相关文档

- [API完整指南](docs/email_api_guide.md)
- [验证码过期机制](VERIFICATION_EXPIRY.md)
- [163邮箱配置指南](163_email_setup.md)

## 🆘 技术支持

如果遇到问题，请按以下步骤排查：

1. 检查服务是否正常运行
2. 查看应用日志
3. 确认数据库连接
4. 验证SMTP配置
5. 检查网络连接
6. 查看API文档

更多帮助请参考相关文档或联系技术支持。 