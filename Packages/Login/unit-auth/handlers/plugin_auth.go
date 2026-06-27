package handlers

import (
	"net/http"
	"unit-auth/middleware"
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
			c.JSON(http.StatusBadRequest, models.Response{Code: 400, Message: "Invalid request data: " + err.Error()})
			return
		}
		ip := c.ClientIP()
		userAgent := c.GetHeader("User-Agent")
		provider, exists := h.pluginManager.GetProvider("email")
		if !exists {
			c.JSON(http.StatusInternalServerError, models.Response{Code: 500, Message: "Email authentication provider not available"})
			return
		}
		credentials := map[string]interface{}{"email": req.Email, "password": req.Password}
		user, err := provider.Authenticate(c.Request.Context(), credentials)
		if err != nil {
			h.statsService.RecordLoginLog("", "email", ip, userAgent, "", false, err.Error())
			c.JSON(http.StatusUnauthorized, models.Response{Code: 401, Message: err.Error()})
			return
		}

		// 统一生成token（含项目claims）
		projectKey := ""
		if v, ok := c.Get(middleware.CtxProjectKey); ok {
			projectKey = v.(string)
		}
		localID := ""
		if projectKey != "" {
			var pm models.ProjectMapping
			if err := h.db.Where("project_name = ? AND user_id = ?", projectKey, user.ID).First(&pm).Error; err == nil {
				localID = pm.LocalUserID
			}
		}
		identifier := ""
		if user.Email != nil {
			identifier = *user.Email
		}
		token, err := utils.GenerateUnifiedToken(user.ID, identifier, user.Role, projectKey, localID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{Code: 500, Message: "Failed to generate token"})
			return
		}

		h.statsService.UpdateUserLoginInfo(user.ID, ip, userAgent)
		h.statsService.RecordLoginLog(user.ID, "email", ip, userAgent, "", true, "")
		c.JSON(http.StatusOK, models.Response{Code: 200, Message: "Login successful", Data: models.LoginResponse{User: user.ToResponse(), Token: token}})
	}
}

// PhoneLogin 手机号登录
func (h *PluginAuthHandler) PhoneLogin() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.PhoneLoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{Code: 400, Message: "Invalid request data: " + err.Error()})
			return
		}
		ip := c.ClientIP()
		userAgent := c.GetHeader("User-Agent")
		provider, exists := h.pluginManager.GetProvider("phone")
		if !exists {
			c.JSON(http.StatusInternalServerError, models.Response{Code: 500, Message: "Phone authentication provider not available"})
			return
		}
		credentials := map[string]interface{}{"phone": req.Phone, "code": req.Code}
		user, err := provider.Authenticate(c.Request.Context(), credentials)
		if err != nil {
			h.statsService.RecordLoginLog("", "phone", ip, userAgent, "", false, err.Error())
			c.JSON(http.StatusUnauthorized, models.Response{Code: 401, Message: err.Error()})
			return
		}
		identifier := user.ID
		if user.Phone != nil {
			identifier = *user.Phone
		}
		projectKey := ""
		if v, ok := c.Get(middleware.CtxProjectKey); ok {
			projectKey = v.(string)
		}
		localID := ""
		if projectKey != "" {
			var pm models.ProjectMapping
			if err := h.db.Where("project_name = ? AND user_id = ?", projectKey, user.ID).First(&pm).Error; err == nil {
				localID = pm.LocalUserID
			}
		}
		token, err := utils.GenerateUnifiedToken(user.ID, identifier, user.Role, projectKey, localID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{Code: 500, Message: "Failed to generate token"})
			return
		}
		h.statsService.UpdateUserLoginInfo(user.ID, ip, userAgent)
		h.statsService.RecordLoginLog(user.ID, "phone", ip, userAgent, "", true, "")
		c.JSON(http.StatusOK, models.Response{Code: 200, Message: "Login successful", Data: models.LoginResponse{User: user.ToResponse(), Token: token}})
	}
}

// OAuthLogin OAuth登录
func (h *PluginAuthHandler) OAuthLogin() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.OAuthLoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{Code: 400, Message: "Invalid request data: " + err.Error()})
			return
		}
		ip := c.ClientIP()
		userAgent := c.GetHeader("User-Agent")
		provider, exists := h.pluginManager.GetProvider(req.Provider)
		if !exists {
			c.JSON(http.StatusBadRequest, models.Response{Code: 400, Message: "OAuth provider not available"})
			return
		}
		user, err := provider.HandleCallback(c, req.Code, req.State)
		if err != nil {
			h.statsService.RecordLoginLog("", req.Provider, ip, userAgent, "", false, err.Error())
			c.JSON(http.StatusUnauthorized, models.Response{Code: 401, Message: err.Error()})
			return
		}
		identifier := user.ID
		if user.Email != nil && *user.Email != "" {
			identifier = *user.Email
		} else if user.Phone != nil && *user.Phone != "" {
			identifier = *user.Phone
		}
		projectKey := ""
		if v, ok := c.Get(middleware.CtxProjectKey); ok {
			projectKey = v.(string)
		}
		localID := ""
		if projectKey != "" {
			var pm models.ProjectMapping
			if err := h.db.Where("project_name = ? AND user_id = ?", projectKey, user.ID).First(&pm).Error; err == nil {
				localID = pm.LocalUserID
			}
		}
		// 一定要有 project_name
		token, err := utils.GenerateUnifiedToken(user.ID, identifier, user.Role, projectKey, localID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{Code: 500, Message: "Failed to generate token"})
			return
		}
		h.statsService.UpdateUserLoginInfo(user.ID, ip, userAgent)
		h.statsService.RecordLoginLog(user.ID, req.Provider, ip, userAgent, "", true, "")
		c.JSON(http.StatusOK, models.Response{Code: 200, Message: "OAuth login successful", Data: models.LoginResponse{User: user.ToResponse(), Token: token}})
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

		authURL, err := provider.GetAuthURL(c, state)
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
