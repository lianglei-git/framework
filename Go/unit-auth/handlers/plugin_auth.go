package handlers

import (
	"net/http"
	"unit-auth/models"
	"unit-auth/plugins"
	"unit-auth/services"
	"unit-auth/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// PluginAuthHandler 插件认证处理器
type PluginAuthHandler struct {
	db            *gorm.DB
	pluginManager *plugins.PluginManager
	statsService  *services.StatsService
}

// NewPluginAuthHandler 创建插件认证处理器
func NewPluginAuthHandler(db *gorm.DB, pluginManager *plugins.PluginManager, statsService *services.StatsService) *PluginAuthHandler {
	return &PluginAuthHandler{
		db:            db,
		pluginManager: pluginManager,
		statsService:  statsService,
	}
}

// Login 通用登录接口
func (h *PluginAuthHandler) Login() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request data: " + err.Error(),
			})
			return
		}

		// 获取客户端IP和User-Agent
		ip := c.ClientIP()
		userAgent := c.GetHeader("User-Agent")

		// 使用邮箱认证提供者
		provider, exists := h.pluginManager.GetProvider("email")
		if !exists {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Email authentication provider not available",
			})
			return
		}

		// 执行认证
		credentials := map[string]interface{}{
			"email":    req.Email,
			"password": req.Password,
		}

		user, err := provider.Authenticate(c.Request.Context(), credentials)
		if err != nil {
			// 记录失败的登录日志
			h.statsService.RecordLoginLog("", "email", ip, userAgent, "", false, err.Error())

			c.JSON(http.StatusUnauthorized, models.Response{
				Code:    401,
				Message: err.Error(),
			})
			return
		}

		// 生成JWT Token
		var email string
		if user.Email != nil {
			email = *user.Email
		}
		token, err := utils.GenerateToken(user.ID, email, user.Role)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to generate token",
			})
			return
		}

		// 更新用户登录信息
		h.statsService.UpdateUserLoginInfo(user.ID, ip, userAgent)

		// 记录成功的登录日志
		h.statsService.RecordLoginLog(user.ID, "email", ip, userAgent, "", true, "")

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Login successful",
			Data: models.LoginResponse{
				User:  user.ToResponse(),
				Token: token,
			},
		})
	}
}

// PhoneLogin 手机号登录
func (h *PluginAuthHandler) PhoneLogin() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.PhoneLoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request data: " + err.Error(),
			})
			return
		}

		ip := c.ClientIP()
		userAgent := c.GetHeader("User-Agent")

		// 使用手机号认证提供者
		provider, exists := h.pluginManager.GetProvider("phone")
		if !exists {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Phone authentication provider not available",
			})
			return
		}

		credentials := map[string]interface{}{
			"phone": req.Phone,
			"code":  req.Code,
		}

		user, err := provider.Authenticate(c.Request.Context(), credentials)
		if err != nil {
			h.statsService.RecordLoginLog("", "phone", ip, userAgent, "", false, err.Error())

			c.JSON(http.StatusUnauthorized, models.Response{
				Code:    401,
				Message: err.Error(),
			})
			return
		}

		// 生成JWT Token
		var identifier string
		if user.Phone != nil {
			identifier = *user.Phone
		} else {
			identifier = user.ID
		}

		token, err := utils.GenerateToken(user.ID, identifier, user.Role)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to generate token",
			})
			return
		}

		h.statsService.UpdateUserLoginInfo(user.ID, ip, userAgent)
		h.statsService.RecordLoginLog(user.ID, "phone", ip, userAgent, "", true, "")

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Login successful",
			Data: models.LoginResponse{
				User:  user.ToResponse(),
				Token: token,
			},
		})
	}
}

// OAuthLogin OAuth登录
func (h *PluginAuthHandler) OAuthLogin() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.OAuthLoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request data: " + err.Error(),
			})
			return
		}

		ip := c.ClientIP()
		userAgent := c.GetHeader("User-Agent")

		// 获取OAuth提供者
		provider, exists := h.pluginManager.GetProvider(req.Provider)
		if !exists {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "OAuth provider not available",
			})
			return
		}

		// 处理OAuth回调
		user, err := provider.HandleCallback(c.Request.Context(), req.Code, req.State)
		if err != nil {
			h.statsService.RecordLoginLog("", req.Provider, ip, userAgent, "", false, err.Error())

			c.JSON(http.StatusUnauthorized, models.Response{
				Code:    401,
				Message: err.Error(),
			})
			return
		}

		// 生成JWT Token
		var identifier string
		if user.Email != nil && *user.Email != "" {
			identifier = *user.Email
		} else if user.Phone != nil && *user.Phone != "" {
			identifier = *user.Phone
		} else {
			identifier = user.ID
		}

		token, err := utils.GenerateToken(user.ID, identifier, user.Role)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to generate token",
			})
			return
		}

		h.statsService.UpdateUserLoginInfo(user.ID, ip, userAgent)
		h.statsService.RecordLoginLog(user.ID, req.Provider, ip, userAgent, "", true, "")

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "OAuth login successful",
			Data: models.LoginResponse{
				User:  user.ToResponse(),
				Token: token,
			},
		})
	}
}

// GetOAuthURL 获取OAuth认证URL
func (h *PluginAuthHandler) GetOAuthURL() gin.HandlerFunc {
	return func(c *gin.Context) {
		providerName := c.Param("provider")
		state := c.Query("state")

		provider, exists := h.pluginManager.GetProvider(providerName)
		if !exists {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "OAuth provider not available",
			})
			return
		}

		authURL, err := provider.GetAuthURL(c.Request.Context(), state)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to generate OAuth URL",
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "OAuth URL generated",
			Data: gin.H{
				"auth_url": authURL,
			},
		})
	}
}

// GetAvailableProviders 获取可用的认证提供者
func (h *PluginAuthHandler) GetAvailableProviders() gin.HandlerFunc {
	return func(c *gin.Context) {
		providers := h.pluginManager.GetEnabledProviders()

		var providerList []gin.H
		for _, provider := range providers {
			providerList = append(providerList, gin.H{
				"name": provider.GetName(),
				"type": provider.GetType(),
			})
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Available providers retrieved",
			Data:    providerList,
		})
	}
}
