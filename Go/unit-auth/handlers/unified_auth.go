package handlers

import (
	"fmt"
	"net/http"
	"time"
	"unit-auth/models"
	"unit-auth/plugins"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// UnifiedAuthHandler 统一的认证处理器
// 整合了所有认证方式到统一的oauth/token端点
type UnifiedAuthHandler struct {
	db            *gorm.DB
	pluginManager *plugins.PluginManager
}

// UnifiedOAuthLoginRequest 统一的OAuth登录请求结构
type UnifiedOAuthLoginRequest struct {
	Provider           string `json:"provider" binding:"required"`
	Code               string `json:"code,omitempty"`
	CodeVerifier       string `json:"code_verifier,omitempty"`
	State              string `json:"state,omitempty"`
	AppID              string `json:"app_id,omitempty"`
	InternalAuth       string `json:"internal_auth,omitempty"`
	DoubleVerification string `json:"double_verification,omitempty"`
	ClientID           string `json:"client_id,omitempty"`

	// 本地登录参数
	Username string `json:"username,omitempty"`
	Password string `json:"password,omitempty"`

	// 邮箱登录参数
	Email string `json:"email,omitempty"`

	// 手机号登录参数
	Phone string `json:"phone,omitempty"`
}

// Validate 根据provider验证必需参数
func (r *UnifiedOAuthLoginRequest) Validate() error {
	switch r.Provider {
	case "local":
		if r.Username == "" || r.Password == "" {
			return fmt.Errorf("missing required parameters: username and password")
		}
	case "github", "google", "wechat":
		if r.Code == "" {
			return fmt.Errorf("missing required parameter: code")
		}
		if r.InternalAuth == "true" && r.DoubleVerification == "true" {
			if r.CodeVerifier == "" {
				return fmt.Errorf("PKCE code_verifier required for double verification")
			}
			if r.State == "" {
				return fmt.Errorf("state parameter required for CSRF protection")
			}
		}
	case "email":
		if r.Email == "" || r.Code == "" {
			return fmt.Errorf("missing required parameters: email and code")
		}
	case "phone":
		if r.Phone == "" || r.Code == "" {
			return fmt.Errorf("missing required parameters: phone and code")
		}
	default:
		if r.Code == "" {
			return fmt.Errorf("missing required parameter: code")
		}
	}
	return nil
}

// NewUnifiedAuthHandler 创建统一的认证处理器
func NewUnifiedAuthHandler(db *gorm.DB, pluginManager *plugins.PluginManager) *UnifiedAuthHandler {
	return &UnifiedAuthHandler{
		db:            db,
		pluginManager: pluginManager,
	}
}

// UnifiedOAuthLogin 统一的OAuth登录（支持多种内部认证模式）
func (h *UnifiedAuthHandler) UnifiedOAuthLogin() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 解析JSON请求体
		var req UnifiedOAuthLoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":             "invalid_request",
				"error_description": "Invalid JSON format or missing required fields",
			})
			return
		}

		// 验证必需参数
		if err := req.Validate(); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":             "invalid_request",
				"error_description": err.Error(),
			})
			return
		}

		// 记录请求信息
		ip := c.ClientIP()
		userAgent := c.GetHeader("User-Agent")

		// 根据provider进行不同处理
		switch req.Provider {
		case "local":
			h.handleLocalLogin(c, req, ip, userAgent)
			return
		case "github", "google", "wechat":
			h.handleOAuthLogin(c, req, ip, userAgent)
			return
		case "email":
			h.handleEmailLogin(c, req, ip, userAgent)
			return
		case "phone":
			h.handlePhoneLogin(c, req, ip, userAgent)
			return
		default:
			// 尝试作为OAuth登录处理
			h.handleOAuthLogin(c, req, ip, userAgent)
			return
		}
	}
}

// handleLocalLogin 处理本地账号密码登录
func (h *UnifiedAuthHandler) handleLocalLogin(c *gin.Context, req UnifiedOAuthLoginRequest, ip, userAgent string) {

	// 查找用户
	var user models.User
	query := h.db.Where("(username = ? OR email = ? OR phone = ?)", req.Username, req.Username, req.Username)
	if err := query.First(&user).Error; err != nil {
		// 记录失败日志
		loginLog := models.LoginLog{
			Provider:  "local",
			IP:        ip,
			UserAgent: userAgent,
			Success:   false,
			CreatedAt: time.Now(),
		}
		h.db.Create(&loginLog)

		c.JSON(http.StatusUnauthorized, gin.H{
			"error":             "invalid_grant",
			"error_description": "Invalid username or password",
		})
		return
	}

	// 验证密码
	if !user.CheckPassword(req.Password) {
		// 记录失败日志
		loginLog := models.LoginLog{
			UserID:    user.ID,
			Provider:  "local",
			IP:        ip,
			UserAgent: userAgent,
			Success:   false,
			CreatedAt: time.Now(),
		}
		h.db.Create(&loginLog)

		c.JSON(http.StatusUnauthorized, gin.H{
			"error":             "invalid_grant",
			"error_description": "Invalid username or password",
		})
		return
	}

	// 成功登录，更新用户信息
	user.UpdateLoginInfo(ip, userAgent)
	h.db.Save(&user)

	// 记录成功日志
	loginLog := models.LoginLog{
		UserID:    user.ID,
		Provider:  "local",
		IP:        ip,
		UserAgent: userAgent,
		Success:   true,
		CreatedAt: time.Now(),
	}
	h.db.Create(&loginLog)

	// 生成token
	h.generateAndReturnTokens(c, &user, "local")
}

// handleOAuthLogin 处理OAuth第三方登录
func (h *UnifiedAuthHandler) handleOAuthLogin(c *gin.Context, req UnifiedOAuthLoginRequest, ip, userAgent string) {
	// 验证双重验证参数（如果提供）
	if req.InternalAuth == "true" && req.DoubleVerification == "true" {
		if req.AppID == "" {
			req.AppID = "default"
		}
		fmt.Printf("🔐 双重验证模式: provider=%s, code_verifier长度=%d\n", req.Provider, len(req.CodeVerifier))
	}

	// 查找对应的Provider
	pluginProvider, exists := h.pluginManager.GetProvider(req.Provider)
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":             "invalid_provider",
			"error_description": "OAuth provider not available",
		})
		return
	}

	// 处理OAuth回调 - 传递codeVerifier参数
	user, err := pluginProvider.HandleCallbackWithCodeVerifier(c.Request.Context(), req.Code, req.State, req.CodeVerifier)
	if err != nil {
		// 记录失败日志
		loginLog := models.LoginLog{
			Provider:  req.Provider,
			IP:        ip,
			UserAgent: userAgent,
			Success:   false,
			CreatedAt: time.Now(),
		}
		h.db.Create(&loginLog)

		c.JSON(http.StatusUnauthorized, gin.H{
			"error":             "invalid_grant",
			"error_description": err.Error(),
		})
		return
	}

	// 成功登录，更新用户信息
	user.UpdateLoginInfo(ip, userAgent)
	h.db.Save(&user)

	// 记录成功日志
	loginLog := models.LoginLog{
		UserID:    user.ID,
		Provider:  req.Provider,
		IP:        ip,
		UserAgent: userAgent,
		Success:   true,
		CreatedAt: time.Now(),
	}
	h.db.Create(&loginLog)

	// 生成token
	h.generateAndReturnTokens(c, user, req.Provider)
}

// handleEmailLogin 处理邮箱验证码登录
func (h *UnifiedAuthHandler) handleEmailLogin(c *gin.Context, req UnifiedOAuthLoginRequest, ip, userAgent string) {
	// 验证邮箱验证码（简化实现）
	if req.Code != "123456" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":             "invalid_grant",
			"error_description": "Invalid email or verification code",
		})
		return
	}

	// 查找用户
	var user *models.User
	if err := h.db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":             "invalid_grant",
			"error_description": "Invalid email or verification code",
		})
		return
	}

	// 成功登录，更新用户信息
	user.UpdateLoginInfo(ip, userAgent)
	h.db.Save(&user)

	// 记录成功日志
	loginLog := models.LoginLog{
		UserID:    user.ID,
		Provider:  "email",
		IP:        ip,
		UserAgent: userAgent,
		Success:   true,
		CreatedAt: time.Now(),
	}
	h.db.Create(&loginLog)

	// 生成token
	h.generateAndReturnTokens(c, user, "email")
}

// handlePhoneLogin 处理手机号验证码登录
func (h *UnifiedAuthHandler) handlePhoneLogin(c *gin.Context, req UnifiedOAuthLoginRequest, ip, userAgent string) {
	// 验证手机号验证码（简化实现）
	if req.Code != "123456" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":             "invalid_grant",
			"error_description": "Invalid phone or verification code",
		})
		return
	}

	// 查找用户
	var user *models.User
	if err := h.db.Where("phone = ?", req.Phone).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":             "invalid_grant",
			"error_description": "Invalid phone or verification code",
		})
		return
	}

	// 成功登录，更新用户信息
	user.UpdateLoginInfo(ip, userAgent)
	h.db.Save(&user)

	// 记录成功日志
	loginLog := models.LoginLog{
		UserID:    user.ID,
		Provider:  "phone",
		IP:        ip,
		UserAgent: userAgent,
		Success:   true,
		CreatedAt: time.Now(),
	}
	h.db.Create(&loginLog)

	// 生成token
	h.generateAndReturnTokens(c, user, "phone")
}

// generateAndReturnTokens 统一的token生成和响应
func (h *UnifiedAuthHandler) generateAndReturnTokens(c *gin.Context, user *models.User, provider string) {
	// 解析JSON请求体获取客户端ID
	var req UnifiedOAuthLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// 如果解析失败，使用默认值
		req = UnifiedOAuthLoginRequest{}
	}

	// 获取客户端ID
	clientID := req.ClientID
	if clientID == "" {
		clientID = "default-client"
	}

	// 生成访问令牌
	accessToken, err := generateAccessTokenWithRS256(user.ID, clientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":             "server_error",
			"error_description": "Failed to generate access token",
		})
		return
	}

	// 生成刷新令牌
	refreshToken, err := generateRefreshTokenWithRS256(user.ID, clientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":             "server_error",
			"error_description": "Failed to generate refresh token",
		})
		return
	}

	// 构建响应
	response := gin.H{
		"access_token":  accessToken,
		"refresh_token": refreshToken,
		"token_type":    "Bearer",
		"expires_in":    3600,
		"scope":         "openid profile email phone",
		"user":          user.ToResponse(),
		"provider":      provider,
	}

	c.JSON(http.StatusOK, response)
}

// UnifiedGetOAuthURL 统一的OAuth URL获取（替代原有的GetOAuthURL）
func (h *UnifiedAuthHandler) UnifiedGetOAuthURL() gin.HandlerFunc {
	return func(c *gin.Context) {
		providerName := c.Param("provider")
		state := c.Query("state")

		if providerName == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":             "invalid_request",
				"error_description": "Missing provider parameter",
			})
			return
		}

		provider, exists := h.pluginManager.GetProvider(providerName)
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":             "invalid_provider",
				"error_description": "OAuth provider not available",
			})
			return
		}

		authURL, err := provider.GetAuthURL(c.Request.Context(), state)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":             "server_error",
				"error_description": "Failed to generate OAuth URL",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"code":    200,
			"message": "OAuth URL generated",
			"data": gin.H{
				"auth_url": authURL,
			},
		})
	}
}

// UnifiedEmailLogin 统一的邮箱验证码登录
func (h *UnifiedAuthHandler) UnifiedEmailLogin() gin.HandlerFunc {
	return func(c *gin.Context) {
		email := c.PostForm("email")
		code := c.PostForm("code")

		if email == "" || code == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":             "invalid_request",
				"error_description": "Missing required parameters: email and code",
			})
			return
		}

		// 查找用户
		var user models.User
		if err := h.db.Where("email = ?", email).First(&user).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":             "invalid_grant",
				"error_description": "Invalid email or verification code",
			})
			return
		}

		// 验证邮箱验证码（这里应该调用实际的验证逻辑）
		// 简化实现：检查验证码是否为"123456"
		if code != "123456" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":             "invalid_grant",
				"error_description": "Invalid email or verification code",
			})
			return
		}

		// 成功登录，更新用户信息
		ip := c.ClientIP()
		userAgent := c.GetHeader("User-Agent")
		user.UpdateLoginInfo(ip, userAgent)

		if err := h.db.Save(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":             "server_error",
				"error_description": "Failed to update user info",
			})
			return
		}

		// 记录登录日志
		loginLog := models.LoginLog{
			UserID:    user.ID,
			Provider:  "email",
			IP:        ip,
			UserAgent: userAgent,
			Success:   true,
			CreatedAt: time.Now(),
		}
		if err := h.db.Create(&loginLog).Error; err != nil {
			fmt.Printf("Failed to record login log: %v\n", err)
		}

		// 解析JSON请求体获取客户端ID
		var req UnifiedOAuthLoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			// 如果解析失败，使用默认值
			req = UnifiedOAuthLoginRequest{}
		}

		// 获取客户端ID
		clientID := req.ClientID
		if clientID == "" {
			clientID = "default-client"
		}

		// 生成访问令牌
		accessToken, err := generateAccessTokenWithRS256(user.ID, clientID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":             "server_error",
				"error_description": "Failed to generate access token",
			})
			return
		}

		// 生成刷新令牌
		refreshToken, err := generateRefreshTokenWithRS256(user.ID, clientID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":             "server_error",
				"error_description": "Failed to generate refresh token",
			})
			return
		}

		response := gin.H{
			"access_token":  accessToken,
			"refresh_token": refreshToken,
			"token_type":    "Bearer",
			"expires_in":    3600,
			"scope":         "openid profile email",
			"user":          user.ToResponse(),
		}

		c.JSON(http.StatusOK, response)
	}
}

// UnifiedPhoneLogin 统一的手机号验证码登录
func (h *UnifiedAuthHandler) UnifiedPhoneLogin() gin.HandlerFunc {
	return func(c *gin.Context) {
		phone := c.PostForm("phone")
		code := c.PostForm("code")

		if phone == "" || code == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":             "invalid_request",
				"error_description": "Missing required parameters: phone and code",
			})
			return
		}

		// 查找用户
		var user models.User
		if err := h.db.Where("phone = ?", phone).First(&user).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":             "invalid_grant",
				"error_description": "Invalid phone or verification code",
			})
			return
		}

		// 验证手机号验证码（这里应该调用实际的验证逻辑）
		// 简化实现：检查验证码是否为"123456"
		if code != "123456" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":             "invalid_grant",
				"error_description": "Invalid phone or verification code",
			})
			return
		}

		// 成功登录，更新用户信息
		ip := c.ClientIP()
		userAgent := c.GetHeader("User-Agent")
		user.UpdateLoginInfo(ip, userAgent)

		if err := h.db.Save(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":             "server_error",
				"error_description": "Failed to update user info",
			})
			return
		}

		// 记录登录日志
		loginLog := models.LoginLog{
			UserID:    user.ID,
			Provider:  "phone",
			IP:        ip,
			UserAgent: userAgent,
			Success:   true,
			CreatedAt: time.Now(),
		}
		if err := h.db.Create(&loginLog).Error; err != nil {
			fmt.Printf("Failed to record login log: %v\n", err)
		}

		// 解析JSON请求体获取客户端ID
		var req UnifiedOAuthLoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			// 如果解析失败，使用默认值
			req = UnifiedOAuthLoginRequest{}
		}

		// 获取客户端ID
		clientID := req.ClientID
		if clientID == "" {
			clientID = "default-client"
		}

		// 生成访问令牌
		accessToken, err := generateAccessTokenWithRS256(user.ID, clientID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":             "server_error",
				"error_description": "Failed to generate access token",
			})
			return
		}

		// 生成刷新令牌
		refreshToken, err := generateRefreshTokenWithRS256(user.ID, clientID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":             "server_error",
				"error_description": "Failed to generate refresh token",
			})
			return
		}

		response := gin.H{
			"access_token":  accessToken,
			"refresh_token": refreshToken,
			"token_type":    "Bearer",
			"expires_in":    3600,
			"scope":         "openid profile email phone",
			"user":          user.ToResponse(),
		}

		c.JSON(http.StatusOK, response)
	}
}

// UnifiedDoubleVerification 统一的双重验证登录
func (h *UnifiedAuthHandler) UnifiedDoubleVerification() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取双重验证参数
		code := c.PostForm("code")
		codeVerifier := c.PostForm("code_verifier")
		state := c.PostForm("state")
		appID := c.PostForm("app_id")
		internalAuth := c.PostForm("internal_auth")
		doubleVerification := c.PostForm("double_verification")
		provider := c.PostForm("provider")

		// 验证必需参数
		if code == "" || codeVerifier == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":             "invalid_request",
				"error_description": "Missing required parameters: code and code_verifier",
			})
			return
		}

		// 验证双重验证标识
		if internalAuth != "true" || doubleVerification != "true" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":             "invalid_request",
				"error_description": "Double verification flags required",
			})
			return
		}

		// 验证应用ID
		if appID == "" {
			appID = "default"
		}

		// 如果有provider，处理第三方登录
		if provider != "" {
			pluginProvider, exists := h.pluginManager.GetProvider(provider)
			if !exists {
				c.JSON(http.StatusBadRequest, gin.H{
					"error":             "invalid_provider",
					"error_description": "OAuth provider not available",
				})
				return
			}

			// 处理OAuth回调
			ip := c.ClientIP()
			userAgent := c.GetHeader("User-Agent")

			user, err := pluginProvider.HandleCallback(c.Request.Context(), code, state)
			if err != nil {
				// 记录失败日志
				loginLog := models.LoginLog{
					Provider:  provider,
					IP:        ip,
					UserAgent: userAgent,
					Success:   false,
					CreatedAt: time.Now(),
				}
				if err := h.db.Create(&loginLog).Error; err != nil {
					fmt.Printf("Failed to record login log: %v\n", err)
				}

				c.JSON(http.StatusUnauthorized, gin.H{
					"error":             "invalid_grant",
					"error_description": err.Error(),
				})
				return
			}

			// 成功登录，更新用户信息
			user.UpdateLoginInfo(ip, userAgent)
			if err := h.db.Save(&user).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error":             "server_error",
					"error_description": "Failed to update user info",
				})
				return
			}

			// 记录成功日志
			loginLog := models.LoginLog{
				UserID:    user.ID,
				Provider:  provider,
				IP:        ip,
				UserAgent: userAgent,
				Success:   true,
				CreatedAt: time.Now(),
			}
			if err := h.db.Create(&loginLog).Error; err != nil {
				fmt.Printf("Failed to record login log: %v\n", err)
			}

			// 获取客户端ID
			clientID := c.PostForm("client_id")
			if clientID == "" {
				clientID = "default-client"
			}

			// 生成访问令牌
			accessToken, err := generateAccessTokenWithRS256(user.ID, clientID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error":             "server_error",
					"error_description": "Failed to generate access token",
				})
				return
			}

			// 生成刷新令牌
			refreshToken, err := generateRefreshTokenWithRS256(user.ID, clientID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error":             "server_error",
					"error_description": "Failed to generate refresh token",
				})
				return
			}

			response := gin.H{
				"access_token":        accessToken,
				"refresh_token":       refreshToken,
				"token_type":          "Bearer",
				"expires_in":          3600,
				"scope":               "openid profile email",
				"user":                user.ToResponse(),
				"double_verification": true,
			}

			c.JSON(http.StatusOK, response)
		} else {
			// 处理本地认证的双重验证
			// 这里可以添加本地认证的双重验证逻辑
			c.JSON(http.StatusBadRequest, gin.H{
				"error":             "invalid_request",
				"error_description": "Provider is required for double verification",
			})
		}
	}
}
