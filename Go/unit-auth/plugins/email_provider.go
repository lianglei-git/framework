package plugins

import (
	"context"
	"errors"
	"time"
	"unit-auth/models"
	"unit-auth/utils"

	"gorm.io/gorm"
)

// EmailProvider 邮箱认证提供者
type EmailProvider struct {
	db      *gorm.DB
	mailer  *utils.Mailer
	enabled bool
}

// NewEmailProvider 创建邮箱认证提供者
func NewEmailProvider(db *gorm.DB, mailer *utils.Mailer) *EmailProvider {
	return &EmailProvider{
		db:      db,
		mailer:  mailer,
		enabled: true,
	}
}

func (ep *EmailProvider) GetName() string {
	return "email"
}

func (ep *EmailProvider) GetType() string {
	return "password"
}

func (ep *EmailProvider) IsEnabled() bool {
	return ep.enabled
}

func (ep *EmailProvider) Authenticate(ctx context.Context, credentials map[string]interface{}) (*models.User, error) {
	email, ok := credentials["email"].(string)
	if !ok {
		return nil, errors.New("email is required")
	}

	password, ok := credentials["password"].(string)
	if !ok {
		return nil, errors.New("password is required")
	}

	// 查找用户
	var user models.User
	if err := ep.db.Where("email = ?", email).First(&user).Error; err != nil {
		return nil, errors.New("invalid email or password")
	}

	// 检查用户状态
	if user.Status != "active" {
		return nil, errors.New("account is disabled")
	}

	// 验证密码
	if !user.CheckPassword(password) {
		return nil, errors.New("invalid email or password")
	}

	// 更新最后登录时间
	now := time.Now()
	ep.db.Model(&user).Update("last_login_at", &now)

	return &user, nil
}

func (ep *EmailProvider) GetAuthURL(ctx context.Context, state string) (string, error) {
	return "", errors.New("email provider does not support OAuth flow")
}

func (ep *EmailProvider) HandleCallback(ctx context.Context, code string, state string) (*models.User, error) {
	return nil, errors.New("email provider does not support OAuth flow")
}

// HandleCallbackWithCodeVerifier 支持双重验证的回调处理
func (ep *EmailProvider) HandleCallbackWithCodeVerifier(ctx context.Context, code string, state string, codeVerifier string) (*models.User, error) {
	return nil, errors.New("email provider does not support OAuth flow")
}
