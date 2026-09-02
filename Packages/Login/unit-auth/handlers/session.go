package handlers

import (
	"fmt"
	"net/http"
	"time"
	"unit-auth/models"
	appUtils "unit-auth/utils"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

// SessionCheckRequest session检查请求
type SessionCheckRequest struct {
	SessionID string `json:"session_id" binding:"required"`
	AppID     string `json:"app_id" binding:"required"`
}

// revokeOtherUserSessions 全局单会话：新登录后撤销该用户其余 active session
func revokeOtherUserSessions(db *gorm.DB, userID, keepSessionID string) {
	if userID == "" || keepSessionID == "" {
		return
	}
	now := time.Now()
	result := db.Model(&models.SSOSession{}).
		Where("user_id = ? AND id != ? AND status = ?", userID, keepSessionID, "active").
		Updates(map[string]interface{}{"status": "revoked", "last_activity": now})
	if result.Error != nil {
		fmt.Printf("⚠️ revoke other sessions failed for user %s: %v\n", userID, result.Error)
		return
	}
	if result.RowsAffected > 0 {
		fmt.Printf("🔒 revoked %d other session(s) for user %s (keep=%s)\n", result.RowsAffected, userID, keepSessionID)
	}
}

// revokeAllUserSessions 冻结/注销后吊销该用户全部 SSO session 与 refresh token
func revokeAllUserSessions(db *gorm.DB, userID string) {
	if userID == "" {
		return
	}
	now := time.Now()
	if result := db.Model(&models.SSOSession{}).
		Where("user_id = ? AND status = ?", userID, "active").
		Updates(map[string]interface{}{"status": "revoked", "last_activity": now}); result.Error != nil {
		fmt.Printf("⚠️ revoke all sessions failed for user %s: %v\n", userID, result.Error)
	}
	if result := db.Model(&models.RefreshToken{}).
		Where("user_id = ? AND is_revoked = ?", userID, false).
		Updates(map[string]interface{}{"is_revoked": true}); result.Error != nil {
		fmt.Printf("⚠️ revoke refresh tokens failed for user %s: %v\n", userID, result.Error)
	}
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
		if err := db.Where("id = ?", req.SessionID).First(&ssoSession).Error; err != nil {
			c.JSON(http.StatusOK, gin.H{
				"code":             200,
				"message":          "Session not found or expired",
				"is_authenticated": false,
			})
			return
		}
		if ssoSession.Status == "revoked" {
			appUtils.ReturnSessionRevoked(c)
			return
		}
		if ssoSession.Status != "active" || ssoSession.ExpiresAt.Before(time.Now()) {
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

		// 解析子项目 client_id（session 恢复时为当前 app 签发 token）
		clientID := "centralized"
		if req.AppID != "" {
			var client models.SSOClient
			if err := db.Where("id = ? OR name = ?", req.AppID, req.AppID).First(&client).Error; err == nil && client.ID != "" {
				clientID = client.ID
			}
		}

		// 复用 sso.go 中的 generateTokensFromClaims 统一返回结构
		claims := jwt.MapClaims{
			"sub": user.ID,                     // 用户ID
			"jti": ssoSession.ID,               // 使用当前session作为ID
			"exp": ssoSession.ExpiresAt.Unix(), // 会话过期时间（秒）
			"iat": time.Now().Unix(),           // 签发时间
		}

		generateTokensFromClaims(c, db, claims, clientID, "", "session_recovery", OAuthTokenRequest{AppID: req.AppID})
		return
	}
}
