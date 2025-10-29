package handlers

import (
	"fmt"
	"net/http"
	"os"
	"time"
	"unit-auth/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
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
		if req.AppID != "" && ssoSession.CurrentAppID != req.AppID {
			c.JSON(http.StatusOK, gin.H{
				"code":             200,
				"message":          "Session not valid for this application",
				"is_authenticated": false,
			})
			return
		}

		// 更新最后活动时间
		now := time.Now()
		ssoSession.LastActivity = now
		if err := db.Save(&ssoSession).Error; err != nil {
			fmt.Printf("Failed to update session activity: %v\n", err)
		}

		// 生成真正的token
		localID := ""
		var pm models.ProjectMapping
		if err := db.Where("project_name = ? AND user_id = ?", req.AppID, user.ID).First(&pm).Error; err == nil {
			localID = pm.LocalUserID
		}

		allJWTDatas := &RS256TokenClaims{
			ClientID:    "centralized",
			UserID:      user.ID,
			Email:       *user.Email,
			Role:        user.Role,
			AppID:       req.AppID,
			LocalUserID: localID,
			Lid:         localID,
			User:        &user,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(now.Add(AccessTokenExpiration)), // 1小时
				IssuedAt:  jwt.NewNumericDate(now),
				NotBefore: jwt.NewNumericDate(now),
				Issuer:    os.Getenv("JWT_ISS"),
				ID:        uuid.New().String(),
			},
		}

		accessToken, err := GenerateAccessTokenWithRS256(allJWTDatas)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":             500,
				"message":          "Failed to generate access token",
				"is_authenticated": false,
			})
			return
		}

		refreshToken, err := GenerateRefreshTokenWithRS256(user.ID, "centralized")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":             500,
				"message":          "Failed to generate refresh token",
				"is_authenticated": false,
			})
			return
		}

		// 更新session中的token hash
		calculateAccessTokenHash := CalculateTokenHash(accessToken)
		calculateRefreshTokenHash := CalculateTokenHash(refreshToken)
		if err := db.Model(&models.SSOSession{}).Where("id = ?", ssoSession.ID).
			Update("current_access_token_hash", calculateAccessTokenHash).
			Update("refresh_token_hash", calculateRefreshTokenHash).Error; err != nil {
			fmt.Printf("Failed to update session token hash: %v\n", err)
		}

		c.JSON(http.StatusOK, gin.H{
			"code":             200,
			"message":          "Session is valid",
			"is_authenticated": true,
			"user": gin.H{
				"sub":                user.ID,
				"name":               user.Username,
				"preferred_username": user.Username,
				"email":              *user.Email,
				"email_verified":     user.EmailVerified,
				"phone":              user.Phone,
				"phone_verified":     user.PhoneVerified,
				"picture":            user.GetAvatar(),
				"role":               user.Role,
				"last_login":         user.LastLoginAt,
				"ip_address":         user.LastLoginIP,
			},
			"session": gin.H{
				"session_id":       ssoSession.ID,
				"user_id":          ssoSession.UserID,
				"client_id":        ssoSession.ClientID,
				"authenticated_at": ssoSession.CreatedAt,
				"expires_at":       ssoSession.ExpiresAt,
				"last_activity":    ssoSession.LastActivity,
				"is_active":        ssoSession.Status == "active",
				"current_app_id":   ssoSession.CurrentAppID,
			},
			"token": gin.H{
				"access_token":  accessToken,
				"refresh_token": refreshToken,
				"token_type":    "Bearer",
				"expires_in":    3600,
			},
		})
	}
}
