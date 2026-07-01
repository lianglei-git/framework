package handlers

import (
	"net/http"
	"time"
	"unit-auth/models"
	"unit-auth/services"
	appUtils "unit-auth/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetSSOSessionCheck GET /api/v1/sso/session/check — 读 cookie 校验 IdP session（供登录中心）
func GetSSOSessionCheck(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		sessionID := GetSessionIDFromCookie(c)
		if sessionID == "" {
			c.JSON(http.StatusOK, gin.H{
				"code":    200,
				"message": "No session cookie",
				"data": gin.H{
					"is_authenticated": false,
				},
			})
			return
		}

		var ssoSession models.SSOSession
		if err := db.Where("id = ?", sessionID).First(&ssoSession).Error; err != nil {
			c.JSON(http.StatusOK, gin.H{
				"code":    200,
				"message": "Session not found",
				"data": gin.H{
					"is_authenticated": false,
				},
			})
			return
		}

		if ssoSession.Status == "revoked" {
			appUtils.ReturnSessionRevoked(c)
			return
		}

		if ssoSession.Status != "active" || ssoSession.ExpiresAt.Before(time.Now()) {
			c.JSON(http.StatusOK, gin.H{
				"code":    200,
				"message": "Session not active or expired",
				"data": gin.H{
					"is_authenticated": false,
				},
			})
			return
		}

		var user models.User
		if err := db.Where("id = ?", ssoSession.UserID).First(&user).Error; err != nil {
			c.JSON(http.StatusOK, gin.H{
				"code":    200,
				"message": "User not found",
				"data": gin.H{
					"is_authenticated": false,
				},
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"code":    200,
			"message": "Session is valid",
			"data": gin.H{
				"is_authenticated": true,
				"user":             services.PresentUserResponse(&user, RequestAPIBase(c)),
				"session": gin.H{
					"session_id":       ssoSession.ID,
					"user_id":          ssoSession.UserID,
					"is_active":        true,
					"authenticated_at": ssoSession.LastActivity,
					"expires_at":       ssoSession.ExpiresAt,
					"last_activity":    ssoSession.LastActivity,
					"remember_me":      false,
				},
			},
		})
	}
}
