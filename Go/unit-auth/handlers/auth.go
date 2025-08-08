package handlers

import (
	"errors"
	"net/http"
	"strings"
	"time"
	"unit-auth/middleware"
	"unit-auth/models"
	"unit-auth/services"
	"unit-auth/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// 用户注册
func Register(db *gorm.DB, mailer *utils.Mailer) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.RegisterRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request data: " + err.Error(),
			})
			return
		}

		// 检查邮箱是否已存在
		var existingUser models.User
		if err := db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
			c.JSON(http.StatusConflict, models.Response{
				Code:    409,
				Message: "Email already exists",
			})
			return
		}

		// 检查用户名是否已存在
		if err := db.Where("username = ?", req.Username).First(&existingUser).Error; err == nil {
			c.JSON(http.StatusConflict, models.Response{
				Code:    409,
				Message: "Username already exists",
			})
			return
		}

		// 验证邮箱验证码
		var verification models.EmailVerification
		if err := db.Where("email = ? AND code = ? AND type = ? AND used = ? AND expires_at > ?",
			req.Email, req.Code, "register", false, time.Now()).First(&verification).Error; err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid or expired verification code",
			})
			return
		}

		// 读取项目Key（若有）
		projectKey := ""
		if keyVal, ok := c.Get(middleware.CtxProjectKey); ok {
			projectKey = keyVal.(string)
		}

		// 创建用户（服务内强制映射；失败回滚注册）
		newUser, err := services.RegisterUser(db, mailer, services.RegistrationOptions{
			Email:                &req.Email,
			Username:             req.Username,
			Nickname:             req.Nickname,
			Password:             req.Password,
			EmailVerified:        true,
			Role:                 "user",
			Status:               "active",
			SendWelcome:          true,
			ProjectKey:           projectKey,
			GinContext:           c,
			StrictProjectMapping: projectKey != "",
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{Code: 500, Message: "Failed to create user: " + err.Error()})
			return
		}

		// 标记验证码为已使用
		if err := db.Model(&verification).Update("used", true).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{Code: 500, Message: "Failed to update verification code"})
			return
		}

		// 生成Token（含项目Claims）
		identifier := req.Email
		localID := ""
		if v, ok := c.Get("local_user_id"); ok {
			if s, ok2 := v.(string); ok2 {
				localID = s
			}
		}
		var token string
		if projectKey != "" && localID != "" {
			token, err = utils.GenerateTokenWithProject(newUser.ID, identifier, newUser.Role, projectKey, localID)
		} else {
			token, err = utils.GenerateToken(newUser.ID, identifier, newUser.Role)
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{Code: 500, Message: "Failed to generate token"})
			return
		}

		c.JSON(http.StatusCreated, models.Response{
			Code:    201,
			Message: "Register successfully",
			Data:    models.LoginResponse{User: newUser.ToResponse(), Token: token},
		})
	}
}

// 用户登录
func Login(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{Code: 400, Message: "Invalid request data: " + err.Error()})
			return
		}

		// 查找用户
		var user models.User
		if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
			c.JSON(http.StatusUnauthorized, models.Response{Code: 401, Message: "Invalid email or password"})
			return
		}

		// 检查用户状态
		if user.Status != "active" {
			c.JSON(http.StatusForbidden, models.Response{Code: 403, Message: "Account is disabled"})
			return
		}

		// 验证密码
		if !user.CheckPassword(req.Password) {
			c.JSON(http.StatusUnauthorized, models.Response{Code: 401, Message: "Invalid email or password"})
			return
		}

		// 生成紧凑JWT（含项目映射）
		projectKey := ""
		if keyVal, ok := c.Get(middleware.CtxProjectKey); ok {
			projectKey = keyVal.(string)
		}
		localID := ""
		if projectKey != "" {
			var pm models.ProjectMapping
			if err := db.Where("project_name = ? AND user_id = ?", projectKey, user.ID).First(&pm).Debug().Error; err == nil {
				localID = pm.LocalUserID
			}
		}
		identifier := ""
		if user.Email != nil {
			identifier = *user.Email
		}
		token, err := utils.GenerateCompactAccessToken(user.ID, identifier, user.Role, projectKey, localID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{Code: 500, Message: "Failed to generate token"})
			return
		}

		// 更新最后登录时间
		now := time.Now()
		db.Model(&user).Update("last_login_at", &now)

		c.JSON(http.StatusOK, models.Response{Code: 200, Message: "Login successful", Data: models.LoginResponse{User: user.ToResponse(), Token: token}})
	}
}

// UnifiedLogin 统一登录接口
func UnifiedLogin(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.UnifiedLoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{Code: 400, Message: "Invalid request data: " + err.Error()})
			return
		}

		// 识别账号类型
		accountType := utils.IdentifyAccountType(req.Account)
		if accountType == utils.AccountTypeUnknown {
			c.JSON(http.StatusBadRequest, models.Response{Code: 400, Message: "Invalid account format. Please use email, phone number, or username"})
			return
		}

		// 根据账号类型查找用户
		var user models.User
		var queryErr error
		switch accountType {
		case utils.AccountTypeEmail:
			queryErr = db.Where("email = ?", req.Account).First(&user).Error
		case utils.AccountTypePhone:
			queryErr = db.Where("phone = ?", req.Account).First(&user).Error
		case utils.AccountTypeUsername:
			queryErr = db.Where("username = ?", req.Account).First(&user).Error
		}
		if queryErr != nil {
			c.JSON(http.StatusUnauthorized, models.Response{Code: 401, Message: "Invalid account or password"})
			return
		}

		// 检查用户状态
		if user.Status != "active" {
			c.JSON(http.StatusForbidden, models.Response{Code: 403, Message: "Account is disabled"})
			return
		}

		// 验证密码
		if !user.CheckPassword(req.Password) {
			c.JSON(http.StatusUnauthorized, models.Response{Code: 401, Message: "Invalid account or password"})
			return
		}

		// 读取项目Key并查找映射以注入 pid/luid
		projectKey := ""
		if keyVal, ok := c.Get(middleware.CtxProjectKey); ok {
			projectKey = keyVal.(string)
		}
		localID := ""
		if projectKey != "" {
			var pm models.ProjectMapping
			if err := db.Where("project_name = ? AND user_id = ?", projectKey, user.ID).First(&pm).Error; err == nil {
				localID = pm.LocalUserID
			}
		}

		// 选择标识符（邮箱优先，其次手机号，最后用户ID）
		identifier := user.ID
		if user.Email != nil && *user.Email != "" {
			identifier = *user.Email
		} else if user.Phone != nil && *user.Phone != "" {
			identifier = *user.Phone
		}

		// 生成统一紧凑JWT（写入 pid/luid 当可用）
		token, err := utils.GenerateUnifiedToken(user.ID, identifier, user.Role, projectKey, localID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{Code: 500, Message: "Failed to generate token"})
			return
		}

		// 更新最后登录时间
		now := time.Now()
		db.Model(&user).Update("last_login_at", &now)

		c.JSON(http.StatusOK, models.Response{Code: 200, Message: "Login successful", Data: models.LoginResponse{User: user.ToResponse(), Token: token}})
	}
}

// 发送邮箱验证码
func SendEmailCode(db *gorm.DB, mailer *utils.Mailer) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.SendEmailCodeRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request data: " + err.Error(),
			})
			return
		}

		// 检查是否在1分钟内已经发送过验证码
		var recentVerification models.EmailVerification
		if err := db.Where("email = ? AND type = ? AND created_at > ?",
			req.Email, req.Type, time.Now().Add(-time.Minute)).First(&recentVerification).Error; err == nil {
			c.JSON(http.StatusTooManyRequests, models.Response{
				Code:    429,
				Message: "Please wait 1 minute before requesting another code",
			})
			return
		}

		// 生成验证码
		code := utils.GenerateVerificationCode()
		expiresAt := time.Now().Add(10 * time.Minute)

		// 保存验证码到数据库
		verification := models.EmailVerification{
			Email:     req.Email,
			Code:      code,
			Type:      req.Type,
			ExpiresAt: expiresAt,
			Used:      false,
		}

		if err := db.Create(&verification).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to save verification code",
			})
			return
		}

		// 发送邮件
		if err := mailer.SendVerificationCode(req.Email, code, req.Type); err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to send verification code",
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Verification code sent successfully",
		})
	}
}

// 发送短信验证码
func SendSMSCode(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.SendSMSCodeRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request data: " + err.Error(),
			})
			return
		}

		// 检查是否在1分钟内已经发送过验证码
		var recentVerification models.SMSVerification
		if err := db.Where("phone = ? AND type = ? AND created_at > ?",
			req.Phone, req.Type, time.Now().Add(-time.Minute)).First(&recentVerification).Error; err == nil {
			c.JSON(http.StatusTooManyRequests, models.Response{
				Code:    429,
				Message: "Please wait 1 minute before requesting another code",
			})
			return
		}

		// 生成验证码
		code := utils.GenerateVerificationCode()
		expiresAt := time.Now().Add(5 * time.Minute) // 短信验证码5分钟过期

		// 保存验证码到数据库
		verification := models.SMSVerification{
			Phone:     req.Phone,
			Code:      code,
			Type:      req.Type,
			ExpiresAt: expiresAt,
			Used:      false,
		}

		if err := db.Create(&verification).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to save verification code",
			})
			return
		}

		// TODO: 集成短信服务商API
		// 这里应该调用短信服务商的API发送验证码
		// 目前只是模拟发送成功

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "SMS verification code sent successfully",
			Data: gin.H{
				"code": code, // 开发环境返回验证码，生产环境应该移除
			},
		})
	}
}

// 验证邮箱
func VerifyEmail(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.VerifyEmailRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request data: " + err.Error(),
			})
			return
		}

		// 查找验证码
		var verification models.EmailVerification
		if err := db.Where("email = ? AND code = ? AND used = ? AND expires_at > ?",
			req.Email, req.Code, false, time.Now()).First(&verification).Error; err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid or expired verification code",
			})
			return
		}

		// 标记验证码为已使用
		db.Model(&verification).Update("used", true)

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Email verified successfully",
		})
	}
}

// 忘记密码
func ForgotPassword(db *gorm.DB, mailer *utils.Mailer) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.ForgotPasswordRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request data: " + err.Error(),
			})
			return
		}

		// 检查用户是否存在
		var user models.User
		if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
			c.JSON(http.StatusNotFound, models.Response{
				Code:    404,
				Message: "User not found",
			})
			return
		}

		// 发送重置密码验证码
		code := utils.GenerateVerificationCode()
		expiresAt := time.Now().Add(10 * time.Minute)

		verification := models.EmailVerification{
			Email:     req.Email,
			Code:      code,
			Type:      "reset_password",
			ExpiresAt: expiresAt,
			Used:      false,
		}

		if err := db.Create(&verification).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to save verification code",
			})
			return
		}

		if err := mailer.SendVerificationCode(req.Email, code, "reset_password"); err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to send verification code",
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Password reset code sent successfully",
		})
	}
}

// 重置密码
func ResetPassword(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.ResetPasswordRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request data: " + err.Error(),
			})
			return
		}

		// 验证重置密码验证码
		var verification models.EmailVerification
		if err := db.Where("email = ? AND code = ? AND type = ? AND used = ? AND expires_at > ?",
			req.Email, req.Code, "reset_password", false, time.Now()).First(&verification).Error; err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid or expired verification code",
			})
			return
		}

		// 更新用户密码
		var user models.User
		if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
			c.JSON(http.StatusNotFound, models.Response{
				Code:    404,
				Message: "User not found",
			})
			return
		}

		user.Password = req.Password
		if err := user.HashPassword(); err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to hash password",
			})
			return
		}

		if err := db.Save(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to update password",
			})
			return
		}

		// 标记验证码为已使用
		db.Model(&verification).Update("used", true)

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Password reset successfully",
		})
	}
}

// PhoneLogin 手机号登录（使用与 PhoneDirectLogin 相同的完善逻辑）
func PhoneLogin(db *gorm.DB) gin.HandlerFunc {
	return PhoneDirectLogin(db)
}

// SendPhoneCode 发送手机验证码
func SendPhoneCode(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.SendPhoneCodeRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request data: " + err.Error(),
			})
			return
		}

		// 创建短信服务
		smsService := services.NewMockSMSService(db)
		smsHandler := services.NewSMSHandler(db, smsService)

		// 发送验证码
		verification, err := smsHandler.SendVerificationCode(req.Phone, req.Type)
		if err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Verification code sent successfully",
			Data: gin.H{
				"phone":      req.Phone,
				"type":       req.Type,
				"expires_at": verification.ExpiresAt,
			},
		})
	}
}

// PhoneResetPassword 手机号重置密码
func PhoneResetPassword(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.PhoneResetPasswordRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request data: " + err.Error(),
			})
			return
		}

		// 验证手机号格式
		if utils.IdentifyAccountType(req.Phone) != utils.AccountTypePhone {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid phone number format",
			})
			return
		}

		// 验证重置密码验证码
		var verification models.SMSVerification
		if err := db.Where("phone = ? AND code = ? AND type = ? AND used = ? AND expires_at > ?",
			req.Phone, req.Code, "reset_password", false, time.Now()).First(&verification).Error; err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid or expired verification code",
			})
			return
		}

		// 查找用户
		var user models.User
		if err := db.Where("phone = ?", req.Phone).First(&user).Error; err != nil {
			c.JSON(http.StatusNotFound, models.Response{
				Code:    404,
				Message: "User not found",
			})
			return
		}

		// 更新用户密码
		user.Password = req.Password
		if err := user.HashPassword(); err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to hash password",
			})
			return
		}

		if err := db.Save(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to update password",
			})
			return
		}

		// 标记验证码为已使用
		db.Model(&verification).Update("used", true)

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Password reset successfully",
		})
	}
}

// PhoneDirectLogin 手机号验证码直接登录（自动注册）
func PhoneDirectLogin(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.PhoneLoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request data: " + err.Error(),
			})
			return
		}

		// 验证手机号格式
		if utils.IdentifyAccountType(req.Phone) != utils.AccountTypePhone {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid phone number format",
			})
			return
		}

		// 创建短信服务
		smsService := services.NewMockSMSService(db)
		smsHandler := services.NewSMSHandler(db, smsService)

		// 验证验证码
		verification, err := smsHandler.VerifyCode(req.Phone, req.Code, "login")
		if err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: err.Error(),
			})
			return
		}

		// 使用事务确保数据一致性
		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		// 查找或创建用户
		var user models.User
		var isNewUser bool

		if err := tx.Where("phone = ?", req.Phone).First(&user).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				// 使用统一注册服务创建新用户
				isNewUser = true
				projectKey := ""
				if keyVal, ok := c.Get(middleware.CtxProjectKey); ok {
					projectKey = keyVal.(string)
				}
				created, err := services.RegisterUser(tx, nil, services.RegistrationOptions{
					Phone:                &req.Phone,
					Username:             req.Phone,
					Nickname:             "手机用户",
					PhoneVerified:        true,
					Role:                 "user",
					Status:               "active",
					SendWelcome:          false,
					ProjectKey:           projectKey,
					GinContext:           c,
					StrictProjectMapping: projectKey != "",
				})
				if err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, models.Response{
						Code:    500,
						Message: "Failed to create user",
					})
					return
				}
				user = *created
			} else {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, models.Response{
					Code:    500,
					Message: "Database error",
				})
				return
			}
		} else {
			// 更新现有用户的登录信息
			user.LoginCount++
			now := time.Now()
			user.LastLoginAt = &now

			if err := tx.Save(&user).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, models.Response{
					Code:    500,
					Message: "Failed to update user login info",
				})
				return
			}
		}

		// 检查用户状态
		if user.Status != "active" {
			tx.Rollback()
			c.JSON(http.StatusForbidden, models.Response{
				Code:    403,
				Message: "Account is disabled",
			})
			return
		}

		// 生成JWT Token（含项目映射）
		var identifier string
		if user.Phone != nil {
			identifier = *user.Phone
		} else {
			identifier = user.ID
		}
		projectKey := ""
		localID := ""
		if keyVal, ok := c.Get(middleware.CtxProjectKey); ok {
			projectKey = keyVal.(string)
			var p models.Project
			if err := db.Where("`key` = ? AND enabled = ?", projectKey, true).First(&p).Error; err == nil {
				var pm models.ProjectMapping
				if err := db.Where("project_name = ? AND user_id = ?", projectKey, user.ID).First(&pm).Error; err == nil {
					localID = pm.LocalUserID
				}
			}
		}

		token := ""
		if projectKey != "" && localID != "" {
			var err2 error
			token, err2 = utils.GenerateTokenWithProject(user.ID, identifier, user.Role, projectKey, localID)
			if err2 != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, models.Response{Code: 500, Message: "Failed to generate token"})
				return
			}
		} else {
			var err2 error
			token, err2 = utils.GenerateToken(user.ID, identifier, user.Role)
			if err2 != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, models.Response{Code: 500, Message: "Failed to generate token"})
				return
			}
		}

		// 标记验证码为已使用
		if err := smsHandler.MarkCodeAsUsed(verification); err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to mark verification code as used",
			})
			return
		}

		// 提交事务
		if err := tx.Commit().Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to commit transaction",
			})
			return
		}

		// 记录登录日志
		loginLog := models.LoginLog{
			UserID:    user.ID,
			Provider:  "phone",
			IP:        c.ClientIP(),
			UserAgent: c.GetHeader("User-Agent"),
			Success:   true,
		}
		db.Create(&loginLog)

		// 返回响应（统一使用 models.LoginResponse）
		msg := "Login successful"
		if isNewUser {
			msg = "Registration and login successful"
		}
		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: msg,
			Data: models.LoginResponse{
				User:  user.ToResponse(),
				Token: token,
			},
		})
	}
}

// EmailCodeLogin 邮箱验证码登录
func EmailCodeLogin(db *gorm.DB, mailer *utils.Mailer) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.EmailLoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request data: " + err.Error(),
			})
			return
		}

		// 验证邮箱格式
		if utils.IdentifyAccountType(req.Email) != utils.AccountTypeEmail {
			c.JSON(http.StatusBadRequest, models.Response{Code: 400, Message: "Invalid email format"})
			return
		}

		// 如果用户没有注册则自动注册并登录（强一致，带项目映射）
		var user models.User
		if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				base := strings.Split(req.Email, "@")[0]
				projectKey := ""
				if keyVal, ok := c.Get(middleware.CtxProjectKey); ok {
					projectKey = keyVal.(string)
				}
				created, err := services.RegisterUser(db, mailer, services.RegistrationOptions{
					Email:                &req.Email,
					Username:             base,
					Nickname:             base,
					EmailVerified:        true,
					Role:                 "user",
					Status:               "active",
					SendWelcome:          true,
					ProjectKey:           projectKey,
					GinContext:           c,
					StrictProjectMapping: projectKey != "",
				})
				if err != nil {
					c.JSON(http.StatusInternalServerError, models.Response{Code: 500, Message: "Failed to create user"})
					return
				}
				user = *created
			} else {
				c.JSON(http.StatusInternalServerError, models.Response{Code: 500, Message: "Database error"})
				return
			}
		}

		// 校验验证码
		var verification models.EmailVerification
		if err := db.Where("email = ? AND code = ? AND type = ? AND used = ? AND expires_at > ?",
			req.Email, req.Code, "login", false, time.Now()).First(&verification).Error; err != nil {
			c.JSON(http.StatusBadRequest, models.Response{Code: 400, Message: "Invalid or expired verification code"})
			return
		}

		// 用户状态检查
		if user.Status != "active" {
			c.JSON(http.StatusForbidden, models.Response{Code: 403, Message: "Account is disabled"})
			return
		}

		// 生成Token（含项目Claims）
		projectKey := ""
		if keyVal, ok := c.Get(middleware.CtxProjectKey); ok {
			projectKey = keyVal.(string)
		}
		localID := ""
		if v, ok := c.Get("local_user_id"); ok {
			if s, ok2 := v.(string); ok2 {
				localID = s
			}
		}
		identifier := user.ID
		if user.Email != nil {
			identifier = *user.Email
		}
		var token string
		var err error
		if projectKey != "" && localID != "" {
			token, err = utils.GenerateTokenWithProject(user.ID, identifier, user.Role, projectKey, localID)
		} else {
			token, err = utils.GenerateToken(user.ID, identifier, user.Role)
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{Code: 500, Message: "Failed to generate token"})
			return
		}

		// 标记验证码为已使用
		db.Model(&verification).Update("used", true)

		// 更新最后登录时间
		now := time.Now()
		db.Model(&user).Update("last_login_at", &now)

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Email login successful",
			Data:    models.LoginResponse{User: user.ToResponse(), Token: token},
		})
	}
}
