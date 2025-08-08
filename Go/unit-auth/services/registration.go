package services

import (
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"

	"unit-auth/models"
	"unit-auth/utils"
)

// RegistrationOptions 控制注册默认行为
type RegistrationOptions struct {
	Email         *string
	Phone         *string
	Username      string // 可留空，函数会基于 Email/Phone 衍生
	Nickname      string // 可留空，默认与 Username 一致
	Password      string // 可留空，不设置密码
	EmailVerified bool
	PhoneVerified bool
	Role          string // 默认 user
	Status        string // 默认 active
	SendWelcome   bool   // 是否发送欢迎邮件
}

// RegisterUser 统一的用户注册函数（填充默认字段、头像、欢迎邮件等）
func RegisterUser(db *gorm.DB, mailer *utils.Mailer, opts RegistrationOptions) (*models.User, error) {
	// 基础缺省
	role := opts.Role
	if role == "" {
		role = "user"
	}
	status := opts.Status
	if status == "" {
		status = "active"
	}

	// 生成用户名（若为空）
	username := strings.TrimSpace(opts.Username)
	if username == "" {
		if opts.Email != nil && *opts.Email != "" {
			username = strings.Split(*opts.Email, "@")[0]
		} else if opts.Phone != nil && *opts.Phone != "" {
			username = *opts.Phone
		} else {
			username = fmt.Sprintf("user_%d", time.Now().Unix())
		}
	}

	// 确保用户名唯一
	var cnt int64
	db.Model(&models.User{}).Where("username = ?", username).Count(&cnt)
	if cnt > 0 {
		username = fmt.Sprintf("%s_%d", username, time.Now().Unix())
	}

	nickname := strings.TrimSpace(opts.Nickname)
	if nickname == "" {
		nickname = username
	}

	now := time.Now()
	user := &models.User{
		Email:         opts.Email,
		Phone:         opts.Phone,
		Username:      username,
		Nickname:      nickname,
		Password:      opts.Password,
		EmailVerified: opts.EmailVerified,
		PhoneVerified: opts.PhoneVerified,
		Role:          role,
		Status:        status,
		LoginCount:    1,
		LastLoginAt:   &now,
	}

	// 设置默认头像（基于 username 稳定生成）
	_ = user.SetAvatar(utils.GetDefaultAvatar(username))

	// 处理密码（可选）
	if strings.TrimSpace(opts.Password) != "" {
		if err := user.HashPassword(); err != nil {
			return nil, err
		}
	}

	if err := db.Create(user).Error; err != nil {
		return nil, err
	}

	// 发送欢迎邮件（可选）
	if opts.SendWelcome && opts.Email != nil && *opts.Email != "" {
		go mailer.SendWelcomeEmail(*opts.Email, username)
	}

	return user, nil
}
