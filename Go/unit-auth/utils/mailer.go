package utils

import (
	"crypto/tls"
	"fmt"
	"math/rand"
	"time"
	"unit-auth/config"

	"gopkg.in/mail.v2"
)

type Mailer struct {
	dialer *mail.Dialer
	from   string
}

// EmailTemplate 邮件模板
type EmailTemplate struct {
	Subject string
	Body    string
}

// NewMailer 创建邮件发送器
func NewMailer() *Mailer {
	dialer := mail.NewDialer(
		config.AppConfig.SMTPHost,
		config.AppConfig.SMTPPort,
		config.AppConfig.SMTPUser,
		config.AppConfig.SMTPPassword,
	)

	fmt.Printf("🔧 初始化邮件发送器: %s:%d\n", config.AppConfig.SMTPHost, config.AppConfig.SMTPPort)

	// 配置TLS - 根据SMTP服务器和端口选择不同的配置
	if config.AppConfig.SMTPHost == "smtp.163.com" {
		// 163邮箱特殊配置
		if config.AppConfig.SMTPPort == 465 {
			// SSL连接
			dialer.SSL = true
			dialer.TLSConfig = &tls.Config{
				InsecureSkipVerify: false,
				ServerName:         config.AppConfig.SMTPHost,
			}
		} else if config.AppConfig.SMTPPort == 587 {
			// STARTTLS连接
			dialer.TLSConfig = &tls.Config{
				InsecureSkipVerify: false,
				ServerName:         config.AppConfig.SMTPHost,
			}
			dialer.StartTLSPolicy = mail.MandatoryStartTLS
		}
	} else if config.AppConfig.SMTPHost == "smtp.gmail.com" {
		// Gmail配置
		if config.AppConfig.SMTPPort == 465 {
			dialer.SSL = true
			dialer.TLSConfig = &tls.Config{
				InsecureSkipVerify: false,
				ServerName:         config.AppConfig.SMTPHost,
			}
		} else if config.AppConfig.SMTPPort == 587 {
			dialer.TLSConfig = &tls.Config{
				InsecureSkipVerify: false,
				ServerName:         config.AppConfig.SMTPHost,
			}
			dialer.StartTLSPolicy = mail.MandatoryStartTLS
		}
	} else {
		// 其他SMTP服务器通用配置
		if config.AppConfig.SMTPPort == 465 {
			dialer.SSL = true
			dialer.TLSConfig = &tls.Config{
				InsecureSkipVerify: true,
				ServerName:         config.AppConfig.SMTPHost,
			}
		} else if config.AppConfig.SMTPPort == 587 {
			dialer.TLSConfig = &tls.Config{
				InsecureSkipVerify: true,
				ServerName:         config.AppConfig.SMTPHost,
			}
			dialer.StartTLSPolicy = mail.MandatoryStartTLS
		}
	}

	// 设置连接超时
	dialer.Timeout = 15 * time.Second

	return &Mailer{
		dialer: dialer,
		from:   config.AppConfig.SMTPFrom,
	}
}

// GenerateVerificationCode 生成6位数字验证码
func GenerateVerificationCode() string {
	rand.Seed(time.Now().UnixNano())
	code := rand.Intn(900000) + 100000 // 生成100000-999999之间的数字
	return fmt.Sprintf("%06d", code)
}

// SendVerificationCode 发送验证码邮件
func (m *Mailer) SendVerificationCode(to, code, codeType string) error {
	fmt.Printf("📧 发送验证码邮件到: %s, 验证码: %s, 类型: %s\n", to, code, codeType)

	template := m.getVerificationTemplate(code, codeType)

	// 检查SMTP配置是否完整
	if config.AppConfig.SMTPUser == "" || config.AppConfig.SMTPPassword == "" {
		// 开发环境：模拟发送
		fmt.Printf("🔑 验证码: %s (开发环境模拟发送)\n", code)
		fmt.Printf("📧 邮件内容预览:\n")
		fmt.Printf("主题: %s\n", template.Subject)
		fmt.Printf("收件人: %s\n", to)
		fmt.Printf("发件人: %s\n", m.from)
		fmt.Println("✅ 开发环境邮件发送模拟成功")
		return nil
	}

	// 生产环境：真实发送
	fmt.Println("🔧 尝试发送真实邮件...")
	fmt.Printf("🔧 SMTP服务器: %s:%d\n", config.AppConfig.SMTPHost, config.AppConfig.SMTPPort)

	err := m.sendEmail(to, template.Subject, template.Body)
	if err != nil {
		fmt.Printf("❌ 真实邮件发送失败: %v\n", err)

		// 提供邮箱特定的错误提示
		if config.AppConfig.SMTPHost == "smtp.163.com" {
			fmt.Println("💡 163邮箱故障排除:")
			fmt.Println("   1. 确认已开启SMTP服务")
			fmt.Println("   2. 确认使用的是授权码，不是邮箱密码")
			fmt.Println("   3. 确认发件人邮箱与SMTP用户一致")
			fmt.Println("   4. 尝试使用465端口")
		} else if config.AppConfig.SMTPHost == "smtp.yeah.net" {
			fmt.Println("💡 Yeah.net邮箱故障排除:")
			fmt.Println("   1. 确认已开启SMTP服务")
			fmt.Println("   2. 确认使用的是授权码，不是邮箱密码")
			fmt.Println("   3. 确认发件人邮箱与SMTP用户一致")
			fmt.Println("   4. 尝试使用465端口")
		}

		return err
	}

	fmt.Println("✅ 邮件发送成功")
	return nil
}

// SendWelcomeEmail 发送欢迎邮件
func (m *Mailer) SendWelcomeEmail(to, username string) error {
	template := m.getWelcomeTemplate(username)
	return m.sendEmail(to, template.Subject, template.Body)
}

// SendPasswordChangedEmail 发送密码修改通知邮件
func (m *Mailer) SendPasswordChangedEmail(to, username string) error {
	template := m.getPasswordChangedTemplate(username)
	return m.sendEmail(to, template.Subject, template.Body)
}

// SendAccountLockedEmail 发送账户锁定通知邮件
func (m *Mailer) SendAccountLockedEmail(to, username, reason string) error {
	template := m.getAccountLockedTemplate(username, reason)
	return m.sendEmail(to, template.Subject, template.Body)
}

// SendLoginNotificationEmail 发送登录通知邮件
func (m *Mailer) SendLoginNotificationEmail(to, username, ip, location, device string) error {
	template := m.getLoginNotificationTemplate(username, ip, location, device)
	return m.sendEmail(to, template.Subject, template.Body)
}

// sendEmail 发送邮件的通用方法
func (m *Mailer) sendEmail(to, subject, body string) error {
	fmt.Printf("🔧 尝试发送邮件到: %s\n", to)
	fmt.Printf("🔧 使用SMTP服务器: %s:%d\n", config.AppConfig.SMTPHost, config.AppConfig.SMTPPort)
	fmt.Printf("🔧 发件人: %s\n", m.from)

	// 为了处理发送失败问题，先发送给自己！
	myvar := []string{
		m.from,
		to,
	}

	msg := mail.NewMessage()
	msg.SetHeader("From", m.from)
	msg.SetHeader("To", myvar...)
	msg.SetHeader("Subject", subject)
	msg.SetBody("text/html", body)

	// 添加邮件头
	msg.SetHeader("X-Mailer", "Verita Auth Service")
	msg.SetHeader("X-Priority", "3")

	fmt.Println("🔧 开始连接SMTP服务器...")
	err := m.dialer.DialAndSend(msg)
	if err != nil {
		fmt.Printf("❌ SMTP错误详情: %v\n", err)
		return err
	}

	fmt.Println("✅ 邮件发送成功")
	return nil
}

// getVerificationTemplate 获取验证码邮件模板
func (m *Mailer) getVerificationTemplate(code, codeType string) EmailTemplate {
	var subject, body string

	switch codeType {
	case "register":
		subject = "注册验证码 - Verita"
		body = fmt.Sprintf(`
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="UTF-8">
				<style>
					body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
					.container { max-width: 600px; margin: 0 auto; padding: 20px; }
					.header { background: #2563eb; color: white; padding: 20px; text-align: center; }
					.content { padding: 20px; background: #f9fafb; }
					.code { font-size: 32px; font-weight: bold; color: #2563eb; text-align: center; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; }
					.footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="content">
						<p>感谢您注册我们的服务！请使用以下验证码完成注册：</p>
						<div class="code">%s</div>
						<p><strong>验证码有效期为10分钟，请尽快使用。</strong></p>
						<p>如果这不是您的操作，请忽略此邮件。</p>
					</div>
					<div class="footer">
						<p>此邮件由系统自动发送，请勿回复</p>
					</div>
				</div>
			</body>
			</html>
		`, code)
	case "reset_password":
		subject = "密码重置验证码 - Verita"
		body = fmt.Sprintf(`
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="UTF-8">
				<style>
					body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
					.container { max-width: 600px; margin: 0 auto; padding: 20px; }
					.header { background: #dc2626; color: white; padding: 20px; text-align: center; }
					.content { padding: 20px; background: #f9fafb; }
					.code { font-size: 32px; font-weight: bold; color: #dc2626; text-align: center; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; }
					.footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<h1>密码重置</h1>
					</div>
					<div class="content">
						<h2>您的密码重置验证码</h2>
						<p>您正在重置密码，请使用以下验证码：</p>
						<div class="code">%s</div>
						<p><strong>验证码有效期为10分钟，请尽快使用。</strong></p>
						<p>如果这不是您的操作，请立即联系客服。</p>
					</div>
					<div class="footer">
						<p>此邮件由系统自动发送，请勿回复</p>
					</div>
				</div>
			</body>
			</html>
		`, code)
	default:
		subject = "验证码 - Verita"
		body = fmt.Sprintf(`
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="UTF-8">
				<style>
					body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
					.container { max-width: 600px; margin: 0 auto; padding: 20px; }
					.header { background: #059669; color: white; padding: 20px; text-align: center; }
					.content { padding: 20px; background: #f9fafb; }
					.code { font-size: 32px; font-weight: bold; color: #059669; text-align: center; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; }
					.footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<h1>验证码</h1>
					</div>
					<div class="content">
						<h2>您的验证码</h2>
						<p>请使用以下验证码：</p>
						<div class="code">%s</div>
						<p><strong>验证码有效期为10分钟，请尽快使用。</strong></p>
					</div>
					<div class="footer">
						<p>此邮件由系统自动发送，请勿回复</p>
					</div>
				</div>
			</body>
			</html>
		`, code)
	}

	return EmailTemplate{Subject: subject, Body: body}
}

// getWelcomeTemplate 获取欢迎邮件模板
func (m *Mailer) getWelcomeTemplate(username string) EmailTemplate {
	subject := "欢迎加入 Verita"
	body := fmt.Sprintf(`
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<style>
				body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
				.container { max-width: 600px; margin: 0 auto; padding: 20px; }
				.header { background: #2563eb; color: white; padding: 20px; text-align: center; }
				.content { padding: 20px; background: #f9fafb; }
				.button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
				.footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<h1>欢迎加入 Verita</h1>
				</div>
				<div class="content">
					<h2>您好，%s！</h2>
					<p>感谢您注册我们的服务，您的账户已经创建成功。</p>
					<p>现在您可以开始使用我们的所有功能了：</p>
					<ul>
						<li>安全的身份认证</li>
						<li>多种登录方式</li>
						<li>用户信息管理</li>
						<li>实时统计功能</li>
					</ul>
					<a href="http://localhost:8080/login" class="button">立即登录</a>
					<p>如有任何问题，请随时联系我们的客服团队。</p>
				</div>
				<div class="footer">
					<p>此邮件由系统自动发送，请勿回复</p>
				</div>
			</div>
		</body>
		</html>
	`, username)

	return EmailTemplate{Subject: subject, Body: body}
}

// getPasswordChangedTemplate 获取密码修改通知模板
func (m *Mailer) getPasswordChangedTemplate(username string) EmailTemplate {
	subject := "密码修改通知 - Verita"
	body := fmt.Sprintf(`
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<style>
				body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
				.container { max-width: 600px; margin: 0 auto; padding: 20px; }
				.header { background: #dc2626; color: white; padding: 20px; text-align: center; }
				.content { padding: 20px; background: #f9fafb; }
				.alert { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 20px 0; }
				.footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<h1>密码修改通知</h1>
				</div>
				<div class="content">
					<h2>您好，%s</h2>
					<div class="alert">
						<p><strong>您的账户密码已经成功修改。</strong></p>
					</div>
					<p>如果这不是您的操作，请立即：</p>
					<ol>
						<li>登录您的账户</li>
						<li>重新设置密码</li>
						<li>联系客服团队</li>
					</ol>
					<p>为了您的账户安全，我们建议您定期更换密码。</p>
				</div>
				<div class="footer">
					<p>此邮件由系统自动发送，请勿回复</p>
				</div>
			</div>
		</body>
		</html>
	`, username)

	return EmailTemplate{Subject: subject, Body: body}
}

// getAccountLockedTemplate 获取账户锁定通知模板
func (m *Mailer) getAccountLockedTemplate(username, reason string) EmailTemplate {
	subject := "账户锁定通知 - Verita"
	body := fmt.Sprintf(`
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<style>
				body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
				.container { max-width: 600px; margin: 0 auto; padding: 20px; }
				.header { background: #dc2626; color: white; padding: 20px; text-align: center; }
				.content { padding: 20px; background: #f9fafb; }
				.alert { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 20px 0; }
				.footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<h1>账户锁定通知</h1>
				</div>
				<div class="content">
					<h2>您好，%s</h2>
					<div class="alert">
						<p><strong>您的账户已被临时锁定。</strong></p>
						<p>锁定原因：%s</p>
					</div>
					<p>为了您的账户安全，我们建议您：</p>
					<ol>
						<li>检查账户安全设置</li>
						<li>修改密码</li>
						<li>联系客服解锁</li>
					</ol>
				</div>
				<div class="footer">
					<p>此邮件由系统自动发送，请勿回复</p>
				</div>
			</div>
		</body>
		</html>
	`, username, reason)

	return EmailTemplate{Subject: subject, Body: body}
}

// getLoginNotificationTemplate 获取登录通知模板
func (m *Mailer) getLoginNotificationTemplate(username, ip, location, device string) EmailTemplate {
	subject := "新设备登录通知 - Verita"
	body := fmt.Sprintf(`
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<style>
				body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
				.container { max-width: 600px; margin: 0 auto; padding: 20px; }
				.header { background: #059669; color: white; padding: 20px; text-align: center; }
				.content { padding: 20px; background: #f9fafb; }
				.info { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 6px; margin: 20px 0; }
				.footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<h1>新设备登录通知</h1>
				</div>
				<div class="content">
					<h2>您好，%s</h2>
					<p>我们检测到您的账户在新设备上登录：</p>
					<div class="info">
						<p><strong>登录时间：</strong>%s</p>
						<p><strong>IP地址：</strong>%s</p>
						<p><strong>地理位置：</strong>%s</p>
						<p><strong>设备信息：</strong>%s</p>
					</div>
					<p>如果这是您的操作，请忽略此邮件。</p>
					<p>如果这不是您的操作，请立即：</p>
					<ol>
						<li>修改密码</li>
						<li>启用两步验证</li>
						<li>联系客服</li>
					</ol>
				</div>
				<div class="footer">
					<p>此邮件由系统自动发送，请勿回复</p>
				</div>
			</div>
		</body>
		</html>
	`, username, time.Now().Format("2006-01-02 15:04:05"), ip, location, device)

	return EmailTemplate{Subject: subject, Body: body}
}
