# 163邮箱SMTP配置指南

## 📧 163邮箱SMTP设置

### 1. 163邮箱SMTP服务器信息
- **SMTP服务器**: `smtp.163.com`
- **端口**: `465` (SSL) 或 `587` (STARTTLS)
- **安全连接**: SSL/TLS

### 2. 获取163邮箱授权码

#### 步骤1：登录163邮箱
1. 访问 https://mail.163.com
2. 登录你的163邮箱账户

#### 步骤2：开启SMTP服务
1. 点击"设置" → "POP3/SMTP/IMAP"
2. 开启"SMTP服务"
3. 点击"授权密码管理"

#### 步骤3：生成授权码
1. 点击"新增授权密码"
2. 输入你的邮箱登录密码
3. 获取16位授权码（注意保存）

### 3. 修改.env配置文件

将以下配置添加到你的`.env`文件中：

```bash
# 163邮箱SMTP配置
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_USER=your_email@163.com
SMTP_PASSWORD=your_authorization_code
SMTP_FROM=your_email@163.com
```

### 4. 配置示例

```bash
# 示例配置（请替换为你的实际信息）
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_USER=example@163.com
SMTP_PASSWORD=ABCD1234EFGH5678
SMTP_FROM=example@163.com
```

### 5. 测试配置

运行以下命令测试邮件发送：

```bash
# 测试邮件发送
curl -X POST http://localhost:8080/api/v1/auth/send-email-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","type":"register"}'
```

### 6. 常见问题

#### 问题1：授权码错误
- 确保使用的是授权码，不是邮箱密码
- 授权码是16位字符，无空格

#### 问题2：连接超时
- 检查网络连接
- 确认防火墙设置
- 尝试使用587端口

#### 问题3：认证失败
- 确认SMTP服务已开启
- 检查授权码是否正确
- 确认发件人邮箱与SMTP用户一致

### 7. 端口选择建议

- **465端口**: SSL连接，更稳定，推荐使用
- **587端口**: STARTTLS连接，如果465有问题可以尝试

### 8. 安全注意事项

- 不要在代码中硬编码授权码
- 使用环境变量或配置文件
- 定期更换授权码
- 不要将授权码提交到版本控制系统

## 🚀 快速开始

1. 按照上述步骤获取163邮箱授权码
2. 修改`.env`文件中的SMTP配置
3. 重启应用
4. 测试邮件发送功能 