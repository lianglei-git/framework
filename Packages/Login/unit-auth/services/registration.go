package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
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

	// 项目映射（可选）
	ProjectKey           string       // 若非空，则在注册内强制创建/校验映射
	GinContext           *gin.Context // 若提供，将在成功后 Set("local_user_id", ...) 供后续使用
	StrictProjectMapping bool         // 若为 true，映射失败将导致注册失败（回滚）
}

// RegisterUser 统一的用户注册函数（填充默认字段、头像、欢迎邮件、并可选强制项目映射）
func RegisterUser(db *gorm.DB, mailer *utils.Mailer, opts RegistrationOptions) (*models.User, error) {
	returnUser := (*models.User)(nil)
	err := db.Transaction(func(tx *gorm.DB) error {
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
		tx.Model(&models.User{}).Where("username = ?", username).Count(&cnt)
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
				return err
			}
		}

		if err := tx.Create(user).Error; err != nil {
			return err
		}

		// 强制项目映射（可选）
		if strings.TrimSpace(opts.ProjectKey) != "" {
			var ctx context.Context = context.Background()
			if opts.GinContext != nil {
				ctx = opts.GinContext.Request.Context()
			}
			email := ""
			if opts.Email != nil {
				email = *opts.Email
			}
			localID, mapErr := EnsureProjectMapping(ctx, tx, opts.ProjectKey, user, email)
			if mapErr != nil && opts.StrictProjectMapping {
				return mapErr
			}
			if mapErr == nil && opts.GinContext != nil {
				opts.GinContext.Set("local_user_id", localID)
			}
		}

		returnUser = user
		return nil
	})
	if err != nil {
		return nil, err
	}

	// 发送欢迎邮件（可选、非事务）
	if opts.SendWelcome && opts.Email != nil && *opts.Email != "" {
		go mailer.SendWelcomeEmail(*opts.Email, returnUser.Username)
	}

	return returnUser, nil
}
