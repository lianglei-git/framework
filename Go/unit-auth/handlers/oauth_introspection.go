package handlers

import (
	"crypto/sha256"
	"encoding/base64"
	"net/http"
	"time"
	"unit-auth/models"
	"unit-auth/utils"

	"github.com/gin-gonic/gin"
)

// GetJWKS 返回对称密钥的简化表示（HS256无法真实提供公钥，实际生产应使用RS256）
func GetJWKS() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 对称密钥场景无法直接暴露公钥，返回指纹供校验（示例）
		secret := []byte(utils.GetJWTSecret())
		hash := sha256.Sum256(secret)
		thumb := base64.RawURLEncoding.EncodeToString(hash[:])
		c.JSON(http.StatusOK, gin.H{
			"keys": []gin.H{{
				"kty":          "oct",
				"kid":          "hs256",
				"alg":          "HS256",
				"k_thumbprint": thumb,
			}},
		})
	}
}

// IntrospectToken 校验并返回Token信息
func IntrospectToken() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.PostForm("token")
		if token == "" {
			var req struct {
				Token string `json:"token"`
			}
			_ = c.ShouldBindJSON(&req)
			token = req.Token
		}
		if token == "" {
			c.JSON(http.StatusBadRequest, models.Response{Code: 400, Message: "token is required"})
			return
		}
		claims, err := utils.ValidateEnhancedToken(token)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"active": false})
			return
		}
		exp := claims.ExpiresAt.Time
		c.JSON(http.StatusOK, gin.H{
			"active":        true,
			"user_id":       claims.UserID,
			"email":         claims.Email,
			"role":          claims.Role,
			"project_key":   claims.ProjectKey,
			"local_user_id": claims.LocalUserID,
			"token_type":    claims.TokenType,
			"exp":           exp.Unix(),
			"expires_at":    exp.Format(time.RFC3339),
		})
	}
}

// TokenExchange 将中心Token换成本地受众的短Token（示例）
func TokenExchange() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			SubjectToken string `json:"subject_token" binding:"required"`
			Audience     string `json:"audience" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{Code: 400, Message: "invalid request: " + err.Error()})
			return
		}
		claims, err := utils.ValidateEnhancedToken(req.SubjectToken)
		if err != nil {
			c.JSON(http.StatusUnauthorized, models.Response{Code: 401, Message: "invalid subject token"})
			return
		}
		// 生成一个更短期、指定受众的访问令牌（仍使用相同密钥示例）
		token, err := utils.GenerateAccessTokenWithAudience(claims.UserID, claims.Email, claims.Role, req.Audience, claims.ProjectKey, claims.LocalUserID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{Code: 500, Message: "failed to issue token"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"access_token": token, "token_type": "Bearer", "expires_in": 3600})
	}
}
