// middleware/auto_refresh.go
package middleware

import (
	"fmt"
	"net/http"
	"strings"
	"unit-auth/utils"

	"github.com/gin-gonic/gin"
)

// AutoRefreshMiddleware 自动续签中间件
// 用于学习类网站，在用户活跃时自动续签即将过期的token
func AutoRefreshMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			c.Next()
			return
		}

		token := tokenParts[1]

		// 检查token是否即将过期（提前1小时）
		isExpiringSoon, err := utils.IsTokenExpiringSoon(token)
		if err != nil || !isExpiringSoon {
			c.Next()
			return
		}

		// 自动续签token
		tokenResponse, err := utils.ExtendToken(token)
		if err != nil {
			// 续签失败，继续处理请求（可能token已过期）
			c.Next()
			return
		}

		// 在响应头中返回新token
		c.Header("X-New-Token", tokenResponse.AccessToken)
		c.Header("X-Token-Expires-In", string(rune(tokenResponse.ExpiresIn)))
		c.Header("X-Token-Type", tokenResponse.TokenType)

		// 记录自动续签日志
		c.Header("X-Token-Auto-Refreshed", "true")

		c.Next()
	}
}

// TokenStatusMiddleware Token状态检查中间件
// 用于检查token状态并在响应中返回相关信息
func TokenStatusMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			c.Next()
			return
		}

		token := tokenParts[1]

		// 获取token过期时间
		expirationTime, err := utils.GetTokenExpirationTime(token)
		if err != nil {
			c.Next()
			return
		}

		// 在响应头中返回token状态信息
		c.Header("X-Token-Expires-At", expirationTime.Format("2006-01-02T15:04:05Z"))

		// 检查是否即将过期
		isExpiringSoon, _ := utils.IsTokenExpiringSoon(token)
		if isExpiringSoon {
			c.Header("X-Token-Expiring-Soon", "true")
		}

		c.Next()
	}
}

// RememberMeMiddleware 记住我中间件
// 用于处理长时间会话的token
func RememberMeMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			c.Next()
			return
		}

		token := tokenParts[1]

		// 验证token并检查类型
		claims, err := utils.ValidateEnhancedToken(token)
		if err != nil {
			c.Next()
			return
		}

		// 如果是记住我token，设置特殊标记
		if claims.TokenType == "remember_me" {
			c.Header("X-Token-Remember-Me", "true")
			c.Header("X-Token-Long-Session", "true")
		}

		c.Next()
	}
}

// EnhancedAuthMiddleware 增强的认证中间件 - 支持双Token
func EnhancedAuthMiddleware() gin.HandlerFunc {
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
		claims, err := utils.ValidateEnhancedToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    401,
				"message": "Invalid or expired token",
			})
			c.Abort()
			return
		}

		// 将用户信息存储到上下文中
		c.Set("user_id", claims.UserID)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)
		c.Set("token_type", claims.TokenType)

		c.Next()
	}
}

// RefreshTokenMiddleware 刷新token中间件 - 支持双Token滑动续期
func RefreshTokenMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			c.Next()
			return
		}

		token := tokenParts[1]

		// 验证token类型
		claims, err := utils.ValidateEnhancedToken(token)
		if err != nil {
			c.Next()
			return
		}

		// 只对access token进行自动续签
		if claims.TokenType != "access" {
			c.Next()
			return
		}

		// 检查token是否即将过期
		isExpiringSoon, err := utils.IsTokenExpiringSoon(token)
		if err != nil || !isExpiringSoon {
			c.Next()
			return
		}

		// 自动续签token
		tokenResponse, err := utils.ExtendToken(token)
		if err != nil {
			c.Next()
			return
		}

		// 在响应头中返回新的token
		c.Header("X-New-Token", tokenResponse.AccessToken)
		c.Header("X-Token-Expires-In", fmt.Sprintf("%d", tokenResponse.ExpiresIn))
		c.Header("X-Token-Refreshed", "true")

		c.Next()
	}
}
