// handlers/centralized_token_service.go
package handlers

import (
	"log"
	"net/http"
	"time"
	"unit-auth/models"
	"unit-auth/services"

	"github.com/gin-gonic/gin"
)

// ===============================================
// 中心化Token刷新服务API
// ===============================================

// TokenRefreshRequest 后端间Token刷新请求
type TokenRefreshRequest struct {
	ExpiredToken string            `json:"expired_token" binding:"required"`
	UserAgent    string            `json:"user_agent"`
	IPAddress    string            `json:"ip_address"`
	AppID        string            `json:"app_id" binding:"required"`
	Metadata     map[string]string `json:"metadata,omitempty"`
}

// TokenRefreshResponse Token刷新响应
type TokenRefreshResponse struct {
	Success     bool   `json:"success"`
	AccessToken string `json:"access_token,omitempty"`
	ExpiresIn   int    `json:"expires_in,omitempty"`
	TokenType   string `json:"token_type,omitempty"`
	Error       string `json:"error,omitempty"`
	ErrorDesc   string `json:"error_description,omitempty"`
}

// SessionValidationRequest 会话验证请求
type SessionValidationRequest struct {
	SessionID string `json:"session_id" binding:"required"`
	AppID     string `json:"app_id" binding:"required"`
	UserAgent string `json:"user_agent"`
	IPAddress string `json:"ip_address"`
}

// SessionValidationResponse 会话验证响应
type SessionValidationResponse struct {
	Valid     bool               `json:"valid"`
	Session   *models.SSOSession `json:"session,omitempty"`
	UserInfo  *models.User       `json:"user_info,omitempty"`
	Error     string             `json:"error,omitempty"`
	ErrorDesc string             `json:"error_description,omitempty"`
}

// LogoutRequest 登出请求
type LogoutRequest struct {
	SessionID  string `json:"session_id" binding:"required"`
	LogoutType string `json:"logout_type" binding:"required,oneof=single global"`
	AppID      string `json:"app_id" binding:"required"`
	UserAgent  string `json:"user_agent"`
	IPAddress  string `json:"ip_address"`
}

// LogoutResponse 登出响应
type LogoutResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
	Error   string `json:"error,omitempty"`
}

// ===============================================
// 1. 后端间Token刷新接口（核心接口）
// POST /api/v1/token/refresh
// ===============================================
func CentralizedTokenRefresh() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req TokenRefreshRequest

		// 1. 绑定和验证请求
		if err := c.ShouldBindJSON(&req); err != nil {
			log.Printf("Invalid refresh request: %v", err)
			c.JSON(http.StatusBadRequest, TokenRefreshResponse{
				Success:   false,
				Error:     "invalid_request",
				ErrorDesc: "Invalid request format: " + err.Error(),
			})
			return
		}

		// 2. 验证应用ID和密钥
		appID := c.GetHeader("X-App-ID")
		appSecret := c.GetHeader("X-App-Secret")

		if appID == "" || appSecret == "" {
			log.Printf("Missing app credentials for token refresh")
			c.JSON(http.StatusUnauthorized, TokenRefreshResponse{
				Success:   false,
				Error:     "invalid_app_credentials",
				ErrorDesc: "X-App-ID and X-App-Secret headers are required",
			})
			return
		}

		// 3. 验证应用权限
		if !validateAppCredentials(appID, appSecret) {
			log.Printf("Invalid app credentials for app: %s", appID)
			c.JSON(http.StatusUnauthorized, TokenRefreshResponse{
				Success:   false,
				Error:     "invalid_app_credentials",
				ErrorDesc: "Invalid application credentials",
			})
			return
		}

		// 4. 提取请求元数据用于安全检查
		metadata := RequestMetadata{
			UserAgent:   req.UserAgent,
			IPAddress:   req.IPAddress,
			AppID:       appID,
			CurrentTime: time.Now(),
			RequestID:   c.GetHeader("X-Request-ID"),
		}

		// 5. 执行中心化Token刷新
		response, err := performCentralizedTokenRefresh(req.ExpiredToken, appID, metadata)
		if err != nil {
			log.Printf("Token refresh failed: %v", err)
			c.JSON(http.StatusInternalServerError, TokenRefreshResponse{
				Success:   false,
				Error:     "server_error",
				ErrorDesc: "Token refresh failed: " + err.Error(),
			})
			return
		}

		// 6. 记录审计日志
		logTokenRefreshEvent(req.ExpiredToken, response.AccessToken, appID, metadata)

		c.JSON(http.StatusOK, response)
	}
}

// validateAppCredentials 验证应用凭据
func validateAppCredentials(appID, appSecret string) bool {
	// 简化实现：验证应用ID和密钥
	// TODO: 这里应该从数据库或配置中验证应用ID和密钥
	return appID != "" && appSecret != ""
}

// logTokenRefreshEvent 记录Token刷新事件
func logTokenRefreshEvent(oldToken, newToken, appID string, metadata RequestMetadata) {
	log.Printf("Token refreshed - App: %s, OldToken: %s..., NewToken: %s..., IP: %s",
		appID,
		oldToken[:min(20, len(oldToken))],
		newToken[:min(20, len(newToken))],
		metadata.IPAddress)
}

// min 返回两个整数中的较小值
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// performCentralizedTokenRefresh 执行中心化Token刷新
func performCentralizedTokenRefresh(expiredToken, appID string, metadata RequestMetadata) (*TokenRefreshResponse, error) {
	// 创建中心化Token服务实例
	cts := NewCentralizedTokenService()

	// 构建请求对象
	req := &services.TokenRefreshRequest{
		ExpiredToken: expiredToken,
		UserAgent:    metadata.UserAgent,
		IPAddress:    metadata.IPAddress,
		AppID:        appID,
	}

	// 调用中心化Token刷新服务
	result, err := cts.RefreshAccessToken(req)
	if err != nil {
		return &TokenRefreshResponse{
			Success:   false,
			Error:     "refresh_failed",
			ErrorDesc: err.Error(),
		}, err
	}

	return &TokenRefreshResponse{
		Success:     result.Success,
		AccessToken: result.AccessToken,
		ExpiresIn:   result.ExpiresIn,
		TokenType:   result.TokenType,
		Error:       result.Error,
		ErrorDesc:   result.ErrorDesc,
	}, nil
}

// ===============================================
// 2. 会话验证接口
// POST /api/v1/session/validate
// ===============================================
func ValidateSession() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req SessionValidationRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, SessionValidationResponse{
				Valid:     false,
				Error:     "invalid_request",
				ErrorDesc: "Invalid request format",
			})
			return
		}

		// 验证应用权限
		if !validateAppCredentials(req.AppID, c.GetHeader("X-App-Secret")) {
			c.JSON(http.StatusUnauthorized, SessionValidationResponse{
				Valid:     false,
				Error:     "invalid_app_credentials",
				ErrorDesc: "Invalid application credentials",
			})
			return
		}

		// 使用中心化服务验证会话
		session, err := validateSessionWithService(req.SessionID, req.AppID)
		if err != nil {
			c.JSON(http.StatusOK, SessionValidationResponse{
				Valid:     false,
				Error:     "session_not_found",
				ErrorDesc: "Session not found or expired",
			})
			return
		}

		c.JSON(http.StatusOK, SessionValidationResponse{
			Valid:    true,
			Session:  session,
			UserInfo: &session.User,
		})
	}
}

// ===============================================
// 3. 全局登出接口
// POST /api/v1/session/logout
// ===============================================
func CentralizedLogout() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req LogoutRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, LogoutResponse{
				Success: false,
				Error:   "invalid_request",
			})
			return
		}

		// 验证应用权限
		if !validateAppCredentials(req.AppID, c.GetHeader("X-App-Secret")) {
			c.JSON(http.StatusUnauthorized, LogoutResponse{
				Success: false,
				Error:   "invalid_app_credentials",
			})
			return
		}

		// 使用中心化服务执行登出
		err := performLogoutWithService(req.SessionID, req.LogoutType, req.AppID)
		if err != nil {
			log.Printf("Logout failed for session %s: %v", req.SessionID, err)
			c.JSON(http.StatusInternalServerError, LogoutResponse{
				Success: false,
				Error:   "logout_failed",
			})
			return
		}

		log.Printf("Logout successful - Session: %s, Type: %s, App: %s",
			req.SessionID, req.LogoutType, req.AppID)

		c.JSON(http.StatusOK, LogoutResponse{
			Success: true,
			Message: "Logout successful",
		})
	}
}

// ===============================================
// 辅助函数和类型定义
// ===============================================

// RequestMetadata 请求元数据
type RequestMetadata struct {
	UserAgent   string
	IPAddress   string
	AppID       string
	CurrentTime time.Time
	RequestID   string
}

// SecurityResult 安全检查结果
type SecurityResult struct {
	Passed    bool
	Reason    string
	RiskScore float64
}

// ===============================================
// 会话验证和登出辅助函数
// ===============================================

// validateSessionWithService 使用中心化服务验证会话
func validateSessionWithService(sessionID, appID string) (*models.SSOSession, error) {
	cts := NewCentralizedTokenService()
	return cts.ValidateSession(sessionID, appID)
}

// performLogoutWithService 使用中心化服务执行登出
func performLogoutWithService(sessionID, logoutType, appID string) error {
	cts := services.NewCentralizedTokenService()
	return cts.Logout(sessionID, logoutType, appID)
}

// NewCentralizedTokenService 创建中心化Token服务实例
func NewCentralizedTokenService() *services.CentralizedTokenService {
	return services.NewCentralizedTokenService()
}
