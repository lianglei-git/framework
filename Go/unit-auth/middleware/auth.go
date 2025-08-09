package middleware

import (
	"net/http"
	"strings"
	"time"
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
