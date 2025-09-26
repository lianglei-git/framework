package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
	"unit-auth/config"
	"unit-auth/models"
	"unit-auth/services"
	"unit-auth/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// JWT认证中间件
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		// 检查是否启用测试模式
		testMode := os.Getenv("UNIT_AUTH_TEST_MODE")
		if testMode == "true" {
			// 在测试模式下，检查测试白名单
			// if isTestClientAllowed(c) {
			log.Println("🔓 测试模式：允许测试客户端访问管理员接口")
			c.Next()
			return
			// }
		}
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    401,
				"message": "Authorization header is required",
			})
			c.Abort()
			return
		}

		// 检查Bearer前缀
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    401,
				"message": "Invalid authorization header format",
			})
			c.Abort()
			return
		}

		token := tokenParts[1]
		claims, err := utils.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    401,
				"message": "Invalid or expired token",
			})
			c.Abort()
			return
		}

		// log.Println("token :::::: ", token)
		// log.Println("claims :::::: ", claims.UserID, claims.LocalUserID, claims.Email, claims.Role)

		// 将用户信息存储到上下文中
		c.Set("user_id", claims.UserID)
		c.Set("local_user_id", claims.LocalUserID)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)

		c.Next()
	}
}

// CORS中间件
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, X-Genres-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// 日志中间件
func Logger() gin.HandlerFunc {
	return gin.Logger()
}

// 请求ID中间件
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}
		c.Header("X-Request-ID", requestID)
		c.Set("request_id", requestID)
		c.Next()
	}
}

// 限流中间件
func RateLimit() gin.HandlerFunc {
	// 简单的内存限流器
	requests := make(map[string][]time.Time)

	return func(c *gin.Context) {
		ip := c.ClientIP()
		now := time.Now()

		// 清理过期的请求记录（1分钟窗口）
		if times, exists := requests[ip]; exists {
			var validTimes []time.Time
			for _, t := range times {
				if now.Sub(t) < time.Minute {
					validTimes = append(validTimes, t)
				}
			}
			requests[ip] = validTimes
		}

		// 检查请求次数（每分钟最多100次）
		if len(requests[ip]) >= 100 {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"code":    429,
				"message": "Rate limit exceeded",
			})
			c.Abort()
			return
		}

		requests[ip] = append(requests[ip], now)
		c.Next()
	}
}

// Prometheus监控处理器
func PrometheusHandler(monitoringService *services.MonitoringService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 记录HTTP请求
		start := time.Now()
		c.Next()
		duration := time.Since(start)

		// 记录请求指标
		if monitoringService != nil {
			monitoringService.RecordHTTPRequest(
				c.Request.Method,
				c.Request.URL.Path,
				c.Writer.Status(),
				duration,
			)
		}
	}
}

// 管理员权限中间件
func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 检查是否启用测试模式
		testMode := os.Getenv("UNIT_AUTH_TEST_MODE")
		if testMode == "true" {
			// 在测试模式下，检查测试白名单
			// if isTestClientAllowed(c) {
			log.Println("🔓 测试模式：允许测试客户端访问管理员接口")
			c.Next()
			return
			// }
		}
		role, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    401,
				"message": "User role not found",
			})
			c.Abort()
			return
		}

		if role != "admin" {
			c.JSON(http.StatusForbidden, gin.H{
				"code":    403,
				"message": "Admin access required",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// isTestClientAllowed 检查测试客户端是否允许访问
func isTestClientAllowed(c *gin.Context) bool {
	// 获取客户端ID
	clientID := c.GetHeader("X-Client-ID")
	if clientID == "" {
		// 尝试从查询参数获取
		clientID = c.Query("client_id")
	}
	if clientID == "" {
		// 尝试从请求体获取（POST请求）
		clientID = getClientIDFromBody(c)
	}

	if clientID == "" {
		return false
	}

	// 测试白名单
	testClientWhitelist := []string{
		"test-client",
		"test-client-",
		"dev-client",
		"dev-client-",
		"local-client",
		"local-client-",
		"admin-test",
		"test-admin",
	}

	// 检查是否在白名单中
	for _, allowed := range testClientWhitelist {
		if strings.HasPrefix(clientID, allowed) {
			return true
		}
	}

	return false
}

// getClientIDFromBody 从请求体中提取客户端ID
func getClientIDFromBody(c *gin.Context) string {
	// 读取请求体
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		return ""
	}

	// 重新设置请求体供后续中间件使用
	c.Request.Body = io.NopCloser(bytes.NewBuffer(body))

	// 尝试解析JSON
	var data map[string]interface{}
	if err := json.Unmarshal(body, &data); err != nil {
		return ""
	}

	// 查找可能的客户端ID字段名
	possibleFields := []string{"client_id", "id", "name"}
	for _, field := range possibleFields {
		if id, ok := data[field].(string); ok {
			return id
		}
	}

	return ""
}

// 在 handlers/auth.go 中添加
// LoginWithRememberMe 支持记住我的登录
// 大概率被废弃
func LoginWithRememberMe(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.LoginWithRememberMeRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request data: " + err.Error(),
			})
			return
		}

		// 验证用户（省略验证逻辑...）
		var user models.User
		// ... 用户验证逻辑

		// 根据是否选择"记住我"生成不同的token
		var token string
		var err error

		if req.RememberMe {
			token, err = utils.GenerateRememberMeToken(user.ID, *user.Email, user.Role)
		} else {
			token, err = utils.GenerateUnifiedToken(user.ID, *user.Email, user.Role, "", "")
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to generate token",
			})
			return
		}

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

func somePlaceGeneratingToken(user *models.User) (string, error) {
	identifier := ""
	if user.Email != nil {
		identifier = *user.Email
	}
	return utils.GenerateUnifiedToken(user.ID, identifier, user.Role, "", "")
}

// ===============================================
// 中心化SSO统一认证中间件
// 支持Token自动刷新和后端间调用
// ===============================================

// SSOAuthMiddlewareRequest SSO认证中间件请求类型
type SSOAuthMiddlewareRequest struct {
	ExpiredToken string            `json:"expired_token"`
	UserAgent    string            `json:"user_agent"`
	IPAddress    string            `json:"ip_address"`
	AppID        string            `json:"app_id"`
	Metadata     map[string]string `json:"metadata,omitempty"`
}

// SSOAuthMiddlewareResponse SSO认证中间件响应类型
type SSOAuthMiddlewareResponse struct {
	Authenticated bool         `json:"authenticated"`
	UserInfo      *models.User `json:"user_info,omitempty"`
	NeedsRefresh  bool         `json:"needs_refresh,omitempty"`
	NewToken      string       `json:"new_token,omitempty"`
	Error         string       `json:"error,omitempty"`
	ErrorDesc     string       `json:"error_description,omitempty"`
}

// UnifiedSSOAuthMiddleware 统一的SSO认证中间件
func UnifiedSSOAuthMiddleware(appID, appSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 跳过公开端点
		if isPublicEndpoint(c.Request.URL.Path) {
			c.Next()
			return
		}

		// 提取token
		accessToken := extractAccessToken(c)
		if accessToken == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    401,
				"message": "Missing access token",
			})
			c.Abort()
			return
		}

		// 执行认证请求
		authResult := authenticateRequestWithSSO(accessToken, c.Request, appID, appSecret)

		if authResult.Authenticated {
			// 认证成功，设置用户信息到上下文
			setUserContext(c, authResult.UserInfo)

			// 如果需要刷新token，尝试刷新
			if authResult.NeedsRefresh && authResult.NewToken != "" {
				// 更新请求头中的token
				c.Header("Authorization", "Bearer "+authResult.NewToken)
				log.Printf("Token refreshed automatically for user: %s", authResult.UserInfo.ID)
			}

			c.Next()
		} else {
			// 认证失败
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    401,
				"message": authResult.ErrorDesc,
				"error":   authResult.Error,
			})
			c.Abort()
		}
	}
}

// authenticateRequestWithSSO 使用SSO进行认证请求
func authenticateRequestWithSSO(accessToken string, request *http.Request, appID, appSecret string) *SSOAuthMiddlewareResponse {
	// 1. 本地快速JWT验证
	validation := validateTokenLocally(accessToken)

	if validation.Valid {
		return &SSOAuthMiddlewareResponse{
			Authenticated: true,
			UserInfo:      validation.User,
			NeedsRefresh:  false,
		}
	} else if validation.Expired {
		// 2. Token过期，尝试刷新
		return handleTokenRefreshWithSSO(accessToken, request, appID, appSecret)
	} else {
		return &SSOAuthMiddlewareResponse{
			Authenticated: false,
			Error:         "token_invalid",
			ErrorDesc:     "Token validation failed",
		}
	}
}

// handleTokenRefreshWithSSO 使用SSO处理Token刷新
func handleTokenRefreshWithSSO(expiredToken string, request *http.Request, appID, appSecret string) *SSOAuthMiddlewareResponse {
	// 构建刷新请求
	refreshReq := SSOAuthMiddlewareRequest{
		ExpiredToken: expiredToken,
		UserAgent:    request.Header.Get("User-Agent"),
		IPAddress:    getClientIP(request),
		AppID:        appID,
		Metadata:     make(map[string]string),
	}

	// 调用中心化SSO的Token刷新接口
	result := callSSOTokenRefresh(refreshReq, appSecret)

	if result.Success {
		// 刷新成功，解析新token
		userInfo := decodeToken(result.AccessToken)

		return &SSOAuthMiddlewareResponse{
			Authenticated: true,
			UserInfo:      userInfo,
			NeedsRefresh:  true,
			NewToken:      result.AccessToken,
		}
	} else {
		return &SSOAuthMiddlewareResponse{
			Authenticated: false,
			Error:         "token_refresh_failed",
			ErrorDesc:     result.ErrorDesc,
		}
	}
}

// callSSOTokenRefresh 调用SSO Token刷新接口
func callSSOTokenRefresh(req SSOAuthMiddlewareRequest, appSecret string) *TokenRefreshResult {
	// 构建HTTP请求
	jsonData, err := json.Marshal(req)
	if err != nil {
		return &TokenRefreshResult{
			Success:   false,
			Error:     "marshal_error",
			ErrorDesc: "Failed to marshal request",
		}
	}

	// 调用SSO Token刷新接口
	url := config.AppConfig.SSOServerURL + "/api/v1/token/refresh"
	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return &TokenRefreshResult{
			Success:   false,
			Error:     "request_error",
			ErrorDesc: "Failed to create request",
		}
	}

	// 设置请求头
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-App-ID", req.AppID)
	httpReq.Header.Set("X-App-Secret", appSecret)
	httpReq.Header.Set("X-Request-ID", uuid.New().String())

	// 发送请求
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return &TokenRefreshResult{
			Success:   false,
			Error:     "network_error",
			ErrorDesc: "Failed to connect to SSO server",
		}
	}
	defer resp.Body.Close()

	// 解析响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return &TokenRefreshResult{
			Success:   false,
			Error:     "read_error",
			ErrorDesc: "Failed to read response",
		}
	}

	var result TokenRefreshResult
	if err := json.Unmarshal(body, &result); err != nil {
		return &TokenRefreshResult{
			Success:   false,
			Error:     "unmarshal_error",
			ErrorDesc: "Failed to unmarshal response",
		}
	}

	return &result
}

// TokenRefreshResult Token刷新结果
type TokenRefreshResult struct {
	Success     bool   `json:"success"`
	AccessToken string `json:"access_token,omitempty"`
	ExpiresIn   int    `json:"expires_in,omitempty"`
	TokenType   string `json:"token_type,omitempty"`
	Error       string `json:"error,omitempty"`
	ErrorDesc   string `json:"error_description,omitempty"`
}

// validateTokenLocally 本地快速Token验证
func validateTokenLocally(token string) *TokenValidationResult {
	claims, err := utils.ValidateEnhancedToken(token)
	if err != nil {
		// 检查是否是过期错误
		if strings.Contains(err.Error(), "expired") {
			return &TokenValidationResult{
				Valid:   false,
				Expired: true,
				Error:   err.Error(),
			}
		}
		return &TokenValidationResult{
			Valid:   false,
			Expired: false,
			Error:   err.Error(),
		}
	}

	// 转换为用户模型
	user := &models.User{
		ID:   claims.UserID,
		Role: claims.Role,
	}

	return &TokenValidationResult{
		Valid:   true,
		Expired: false,
		User:    user,
	}
}

// TokenValidationResult Token验证结果
type TokenValidationResult struct {
	Valid   bool
	Expired bool
	User    *models.User
	Error   string
}

// decodeToken 解码Token获取用户信息
func decodeToken(token string) *models.User {
	claims, err := utils.ValidateEnhancedToken(token)
	if err != nil {
		return nil
	}

	return &models.User{
		ID:   claims.UserID,
		Role: claims.Role,
	}
}

// extractAccessToken 从请求中提取Access Token
func extractAccessToken(c *gin.Context) string {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return ""
	}

	tokenParts := strings.Split(authHeader, " ")
	if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
		return ""
	}

	return tokenParts[1]
}

// isPublicEndpoint 检查是否是公开端点
func isPublicEndpoint(path string) bool {
	publicPaths := []string{
		"/api/v1/auth/login",
		"/api/v1/auth/register",
		"/api/v1/auth/phone-login",
		"/api/v1/auth/phone-direct-login",
		"/api/v1/auth/phone-reset-password",
		"/api/v1/auth/token/refresh",    // 后端间调用
		"/api/v1/auth/session/validate", // 会话验证
		"/api/v1/auth/session/logout",   // 登出
		"/api/v1/health",
		"/api/v1/metrics",
	}

	for _, publicPath := range publicPaths {
		if strings.HasPrefix(path, publicPath) {
			return true
		}
	}

	return false
}

// getClientIP 获取客户端IP
func getClientIP(request *http.Request) string {
	// 优先从X-Forwarded-For获取
	forwarded := request.Header.Get("X-Forwarded-For")
	if forwarded != "" {
		// X-Forwarded-For可能包含多个IP，取第一个
		ips := strings.Split(forwarded, ",")
		return strings.TrimSpace(ips[0])
	}

	// 然后从X-Real-IP获取
	realIP := request.Header.Get("X-Real-IP")
	if realIP != "" {
		return realIP
	}

	// 最后从RemoteAddr获取
	ip := request.RemoteAddr
	if idx := strings.LastIndex(ip, ":"); idx != -1 {
		ip = ip[:idx]
	}

	return ip
}

// setUserContext 设置用户上下文
func setUserContext(c *gin.Context, user *models.User) {
	c.Set("user_id", user.ID)
	c.Set("role", user.Role)
	c.Set("user", user)
}
