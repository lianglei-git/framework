package plugins

import (
	"context"
	"errors"
	"time"
	"unit-auth/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// PhoneProvider 手机号认证提供者
type PhoneProvider struct {
	db      *gorm.DB
	enabled bool
}

// NewPhoneProvider 创建手机号认证提供者
func NewPhoneProvider(db *gorm.DB) *PhoneProvider {
	return &PhoneProvider{
		db:      db,
		enabled: true,
	}
}

func (pp *PhoneProvider) GetName() string {
	return "phone"
}

func (pp *PhoneProvider) GetType() string {
	return "sms"
}

func (pp *PhoneProvider) IsEnabled() bool {
	return pp.enabled
}

func (pp *PhoneProvider) Authenticate(ctx context.Context, credentials map[string]interface{}) (*models.User, error) {
	phone, ok := credentials["phone"].(string)
	if !ok {
		return nil, errors.New("phone is required")
	}

	code, ok := credentials["code"].(string)
	if !ok {
		return nil, errors.New("verification code is required")
	}

	// 验证短信验证码
	var verification models.SMSVerification
	if err := pp.db.Where("phone = ? AND code = ? AND used = ? AND expires_at > ?",
		phone, code, false, time.Now()).First(&verification).Error; err != nil {
		return nil, errors.New("invalid or expired verification code")
	}

	// 查找或创建用户
	var user models.User
	if err := pp.db.Where("phone = ?", phone).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 创建新用户
			user = models.User{
				Phone:         &phone,
				Username:      phone,
				Nickname:      "手机用户",
				PhoneVerified: true,
				Role:          "user",
				Status:        "active",
			}

			if err := pp.db.Create(&user).Error; err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	}

	// 检查用户状态
	if user.Status != "active" {
		return nil, errors.New("account is disabled")
	}

	// 标记验证码为已使用
	pp.db.Model(&verification).Update("used", true)

	// 更新最后登录时间
	now := time.Now()
	pp.db.Model(&user).Update("last_login_at", &now)

	return &user, nil
}

func (pp *PhoneProvider) GetAuthURL(ctx *gin.Context, state string) (string, error) {
	return "", errors.New("phone provider does not support OAuth flow")
}

func (pp *PhoneProvider) HandleCallback(ctx context.Context, code string, state string) (*models.User, error) {
	return nil, errors.New("phone provider does not support OAuth flow")
}

// HandleCallbackWithCodeVerifier 支持双重验证的回调处理
func (pp *PhoneProvider) HandleCallbackWithCodeVerifier(ctx context.Context, code string, state string, codeVerifier string) (*models.User, error) {
	return nil, errors.New("phone provider does not support OAuth flow")
}
