package handlers

import (
	"net/http"

	"unit-auth/models"

	"github.com/gin-gonic/gin"
)

// GetIntegrationDocs 返回第三方对接示例（便于快速集成）
func GetIntegrationDocs() gin.HandlerFunc {
	return func(c *gin.Context) {
		doc := gin.H{
			"headers": gin.H{
				"X-Genres-Type": "nature_trans",
				"Authorization": "Bearer <token>",
			},
			"endpoints": []gin.H{
				{
					"name":   "获取OAuth授权链接",
					"method": "GET",
					"path":   "/api/v1/auth/oauth/:provider/url?state=<state>",
				},
				{
					"name":   "OAuth登录",
					"method": "POST",
					"path":   "/api/v1/auth/oauth-login",
					"body":   gin.H{"provider": "github", "code": "<code>", "state": "<state>"},
				},
				{
					"name":   "邮箱验证码登录",
					"method": "POST",
					"path":   "/api/v1/auth/email-login",
					"body":   gin.H{"email": "user@example.com", "code": "123456"},
				},
			},
			"mapping": gin.H{
				"description": "中心化用户与本地用户的映射在 project_mappings 中维护",
				"fields":      []string{"project_name", "user_id", "local_user_id"},
			},
		}
		c.JSON(http.StatusOK, models.Response{Code: 200, Message: "ok", Data: doc})
	}
}
