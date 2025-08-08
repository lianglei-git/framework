SMTP邮件服务配置是指设置邮件服务器参数，让您的应用能够发送邮件。让我详细解释一下：
�� 什么是SMTP邮件服务？
SMTP (Simple Mail Transfer Protocol) 是发送邮件的标准协议。就像您需要配置邮箱客户端一样，您的应用也需要配置SMTP服务器来发送邮件。
�� 如何配置SMTP邮件服务
1. 选择邮件服务商
🆓 免费服务商
Gmail - Google邮箱，最常用
QQ邮箱 - 腾讯邮箱，国内用户多
163邮箱 - 网易邮箱
Outlook - 微软邮箱
�� 付费服务商
SendGrid - 专业邮件服务
Mailgun - 开发者友好
阿里云邮件推送 - 国内服务
腾讯云邮件推送 - 国内服务
2. 获取SMTP配置信息
Gmail配置示例
Apply to go.work
Run
com
QQ邮箱配置示例
Apply to go.work
Run
com
3. 配置步骤详解
步骤1: 开启SMTP服务
Gmail:
登录Gmail
进入"设置" → "账户和导入"
开启"两步验证"
生成"应用专用密码"
使用应用专用密码作为SMTP_PASSWORD
QQ邮箱:
登录QQ邮箱
进入"设置" → "账户"
开启"SMTP服务"
获取"授权码"
使用授权码作为SMTP_PASSWORD
步骤2: 配置环境变量
创建 .env 文件：
Apply to go.work
Run
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-db-password
DB_NAME=unit_auth
步骤3: 测试邮件发送
运行测试脚本：
Apply to go.work
Run
sh
4. 常见配置示例
Gmail配置
Apply to go.work
Run
com
QQ邮箱配置
Apply to go.work
Run
com
163邮箱配置
Apply to go.work
Run
com
企业邮箱配置
Apply to go.work
Run
com
5. 安全注意事项
✅ 正确的做法
使用应用专用密码或授权码
开启TLS加密
定期更换密码
使用环境变量存储敏感信息
❌ 错误的做法
使用邮箱登录密码
明文存储密码
使用不安全的端口
忽略SSL/TLS加密
6. 故障排除
常见错误及解决方案
错误1: 认证失败
Apply to go.work
failed
解决: 检查用户名和密码是否正确，确保使用应用专用密码
错误2: 连接超时
Apply to go.work
out
解决: 检查网络连接，确认SMTP服务器地址和端口
错误3: 端口被阻止
Apply to go.work
refused
解决: 尝试使用587端口，或联系网络管理员
错误4: 发送失败
Apply to go.work
allowed
解决: 检查发件人地址是否与认证邮箱一致
7. 测试配置
快速测试命令
Apply to go.work
Run
'
8. 生产环境建议
推荐配置
使用专业邮件服务商 (SendGrid, Mailgun)
配置SPF、DKIM、DMARC记录
设置邮件发送限制
监控邮件发送状态
使用邮件队列处理大量发送
监控指标
邮件发送成功率
送达率
退信率
垃圾邮件投诉率
�� 总结
SMTP邮件服务配置就是告诉您的应用：
在哪里发送邮件 (SMTP服务器地址)
如何认证 (用户名和密码)
使用什么协议 (端口和加密方式)
配置完成后，您的应用就能自动发送验证码、欢迎邮件、安全通知等邮件了！
需要我帮您配置特定的邮件服务商吗？