package handlers

import (
	"fmt"
	"net/http"
	"time"
	"unit-auth/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

// SessionCheckRequest session检查请求
type SessionCheckRequest struct {
	SessionID string `json:"session_id" binding:"required"`
	AppID     string `json:"app_id" binding:"required"`
}

// CheckSessionAndGetToken 验证session并返回新token
// 这是SSO自动恢复登录的关键接口
func CheckSessionAndGetToken(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req SessionCheckRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": "Invalid request parameters",
				"error":   err.Error(),
			})
			return
		}

		// 查找SSO会话
		var ssoSession models.SSOSession
		if err := db.Where("id = ? AND status = ? AND expires_at > ?", req.SessionID, "active", time.Now()).First(&ssoSession).Error; err != nil {
			c.JSON(http.StatusOK, gin.H{
				"code":             200,
				"message":          "Session not found or expired",
				"is_authenticated": false,
			})
			return
		}

		// 获取用户信息
		var user models.User
		if err := db.Where("id = ?", ssoSession.UserID).First(&user).Error; err != nil {
			c.JSON(http.StatusOK, gin.H{
				"code":             200,
				"message":          "User not found",
				"is_authenticated": false,
			})
			return
		}

		// 验证应用ID（如果提供）
		// if req.AppID != "" && ssoSession.CurrentAppID != req.AppID {
		// 	c.JSON(http.StatusOK, gin.H{
		// 		"code":             200,
		// 		"message":          "Session not valid for this application",
		// 		"is_authenticated": false,
		// 	})
		// 	return
		// }

		// 更新最后活动时间
		now := time.Now()
		ssoSession.LastActivity = now
		if err := db.Save(&ssoSession).Error; err != nil {
			fmt.Printf("Failed to update session activity: %v\n", err)
		}

		// 复用 sso.go 中的 generateTokensFromClaims 统一返回结构
		claims := jwt.MapClaims{
			"sub": user.ID,                     // 用户ID
			"jti": ssoSession.ID,               // 使用当前session作为ID
			"exp": ssoSession.ExpiresAt.Unix(), // 会话过期时间（秒）
			"iat": time.Now().Unix(),           // 签发时间
		}

		generateTokensFromClaims(c, db, claims, "centralized", "", "session_recovery", OAuthTokenRequest{AppID: req.AppID})
		return
	}
}
