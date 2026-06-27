package middleware

import (
	"net/http"
	"unit-auth/services"

	"github.com/gin-gonic/gin"
)

// ActivityMiddleware 用户活跃度记录中间件
func ActivityMiddleware(monitoringService *services.MonitoringService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取用户ID（如果已认证）
		userID, exists := c.Get("user_id")
		if exists && monitoringService != nil {
			if id, ok := userID.(string); ok {
				monitoringService.RecordUserActivity(id)
			}
		}

		c.Next()
	}
}

// LoginActivityMiddleware 登录活动记录中间件
func LoginActivityMiddleware(monitoringService *services.MonitoringService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 记录登录尝试
		if monitoringService != nil {
			monitoringService.RecordLogin(false) // 默认记录为失败，成功时再记录
		}

		c.Next()

		// 根据响应状态记录登录结果
		if monitoringService != nil && c.Writer.Status() == http.StatusOK {
			monitoringService.RecordLogin(true)
		}
	}
}

// RegistrationActivityMiddleware 注册活动记录中间件
func RegistrationActivityMiddleware(monitoringService *services.MonitoringService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// 根据响应状态记录注册结果
		if monitoringService != nil && c.Writer.Status() == http.StatusOK {
			monitoringService.RecordRegistration()
		}
	}
}
