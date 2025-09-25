// handlers/token_refresh.go
package handlers

import (
	"errors"
	"log"
	"net/http"
	"time"
	"unit-auth/config"
	"unit-auth/models"
	"unit-auth/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RefreshToken 简单续签token
// POST /api/v1/auth/refresh-token
func RefreshToken() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 从请求头获取当前token
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Authorization header is required",
			})
			return
		}

		// 检查Bearer前缀
		tokenParts := utils.SplitToken(authHeader)
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid authorization header format",
			})
			return
		}

		token := tokenParts[1]

		// 验证当前token
		claims, err := utils.ValidateEnhancedToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, models.Response{
				Code:    401,
				Message: "Invalid or expired token",
			})
			return
		}

		// 检查token类型，只允许续签access和remember_me token
		if claims.TokenType != "access" && claims.TokenType != "remember_me" {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Can only refresh access or remember_me tokens",
			})
			return
		}

		// 续签token
		tokenResponse, err := utils.ExtendToken(token)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to refresh token: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Token refreshed successfully",
			Data: map[string]interface{}{
				"access_token": tokenResponse.AccessToken,
				"token_type":   tokenResponse.TokenType,
				"expires_in":   tokenResponse.ExpiresIn,
				"user_id":      tokenResponse.UserID,
				"email":        tokenResponse.Email,
				"role":         tokenResponse.Role,
			},
		})
	}
}

// RefreshTokenWithRefreshToken 使用刷新token续签访问token（数据库版本）
// POST /api/v1/auth/refresh-with-refresh-token
func RefreshTokenWithRefreshToken() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			RefreshToken string `json:"refresh_token" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request data: " + err.Error(),
			})
			return
		}

		// 验证刷新token并生成新的访问token
		tokenResponse, err := refreshAccessTokenWithDB(req.RefreshToken, c.ClientIP(), c.GetHeader("User-Agent"))
		if err != nil {
			c.JSON(http.StatusUnauthorized, models.Response{
				Code:    401,
				Message: "Invalid refresh token: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Token refreshed successfully",
			Data:    tokenResponse,
		})
	}
}

// CheckTokenStatus 检查token状态
// GET /api/v1/auth/token-status
func CheckTokenStatus() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Authorization header is required",
			})
			return
		}

		tokenParts := utils.SplitToken(authHeader)
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid authorization header format",
			})
			return
		}

		token := tokenParts[1]

		// 验证token
		claims, err := utils.ValidateEnhancedToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, models.Response{
				Code:    401,
				Message: "Invalid or expired token",
			})
			return
		}

		// 获取过期时间
		expirationTime, err := utils.GetTokenExpirationTime(token)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to get token expiration time",
			})
			return
		}

		// 检查是否即将过期
		isExpiringSoon, _ := utils.IsTokenExpiringSoon(token)

		// 计算剩余时间
		remainingTime := expirationTime.Sub(time.Now())
		remainingHours := int(remainingTime.Hours())
		remainingMinutes := int(remainingTime.Minutes()) % 60

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Token status retrieved successfully",
			Data: map[string]interface{}{
				"user_id":           claims.UserID,
				"email":             claims.Email,
				"role":              claims.Role,
				"token_type":        claims.TokenType,
				"expires_at":        expirationTime.Format("2006-01-02T15:04:05Z"),
				"remaining_hours":   remainingHours,
				"remaining_minutes": remainingMinutes,
				"is_expiring_soon":  isExpiringSoon,
				"is_valid":          true,
			},
		})
	}
}

// LoginWithRememberMe 支持记住我的登录
// POST /api/v1/auth/login-with-remember
func LoginWithRememberMe(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Account    string `json:"account" binding:"required"`
			Password   string `json:"password" binding:"required"`
			RememberMe bool   `json:"remember_me"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request data: " + err.Error(),
			})
			return
		}

		// 识别账号类型
		accountType := utils.IdentifyAccountType(req.Account)
		if accountType == utils.AccountTypeUnknown {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid account format. Please use email, phone number, or username",
			})
			return
		}

		// 根据账号类型查找用户
		var user models.User
		var queryErr error

		switch accountType {
		case utils.AccountTypeEmail:
			queryErr = db.Where("email = ?", req.Account).First(&user).Error
		case utils.AccountTypePhone:
			queryErr = db.Where("phone = ?", req.Account).First(&user).Error
		case utils.AccountTypeUsername:
			queryErr = db.Where("username = ?", req.Account).First(&user).Error
		}

		if queryErr != nil {
			c.JSON(http.StatusUnauthorized, models.Response{
				Code:    401,
				Message: "Invalid account or password",
			})
			return
		}

		// 检查用户状态
		if user.Status != "active" {
			c.JSON(http.StatusForbidden, models.Response{
				Code:    403,
				Message: "Account is disabled",
			})
			return
		}

		// 验证密码
		if !user.CheckPassword(req.Password) {
			c.JSON(http.StatusUnauthorized, models.Response{
				Code:    401,
				Message: "Invalid account or password",
			})
			return
		}

		// 生成token
		var identifier string
		if user.Email != nil && *user.Email != "" {
			identifier = *user.Email
		} else if user.Phone != nil && *user.Phone != "" {
			identifier = *user.Phone
		} else {
			identifier = user.ID
		}

		var token string
		var err error

		if req.RememberMe {
			token, err = utils.GenerateRememberMeToken(user.ID, identifier, user.Role)
		} else {
			token, err = utils.GenerateUnifiedToken(user.ID, identifier, user.Role, "", "")
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to generate token",
			})
			return
		}

		// 更新最后登录时间
		now := time.Now()
		db.Model(&user).Update("last_login_at", &now)

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

// LoginWithTokenPair 支持双Token的登录
// POST /api/v1/auth/login-with-token-pair
func LoginWithTokenPair(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Account  string `json:"account" binding:"required"`
			Password string `json:"password" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request data: " + err.Error(),
			})
			return
		}

		// 识别账号类型
		accountType := utils.IdentifyAccountType(req.Account)
		if accountType == utils.AccountTypeUnknown {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid account format. Please use email, phone number, or username",
			})
			return
		}

		// 根据账号类型查找用户
		var user models.User
		var queryErr error

		switch accountType {
		case utils.AccountTypeEmail:
			queryErr = db.Where("email = ?", req.Account).First(&user).Error
		case utils.AccountTypePhone:
			queryErr = db.Where("phone = ?", req.Account).First(&user).Error
		case utils.AccountTypeUsername:
			queryErr = db.Where("username = ?", req.Account).First(&user).Error
		}

		if queryErr != nil {
			c.JSON(http.StatusUnauthorized, models.Response{
				Code:    401,
				Message: "Invalid account or password",
			})
			return
		}

		// 检查用户状态
		if user.Status != "active" {
			c.JSON(http.StatusForbidden, models.Response{
				Code:    403,
				Message: "Account is disabled",
			})
			return
		}

		// 验证密码
		if !user.CheckPassword(req.Password) {
			c.JSON(http.StatusUnauthorized, models.Response{
				Code:    401,
				Message: "Invalid account or password",
			})
			return
		}

		// 生成双Token对
		var identifier string
		if user.Email != nil && *user.Email != "" {
			identifier = *user.Email
		} else if user.Phone != nil && *user.Phone != "" {
			identifier = *user.Phone
		} else {
			identifier = user.ID
		}

		tokenPair, err := utils.GenerateTokenPair(user.ID, identifier, user.Role)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to generate token pair",
			})
			return
		}

		// 撤销用户现有的所有Refresh Token（单点登录）
		if err := RevokeUserRefreshTokens(user.ID); err != nil {
			// 记录错误并阻止登录
			log.Printf("Failed to revoke old refresh tokens: %v", err)
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to revoke old refresh tokens",
			})
			return
		}

		// 创建新的Refresh Token记录
		if err := CreateRefreshTokenRecord(user.ID, tokenPair.RefreshToken, c.ClientIP(), c.GetHeader("User-Agent")); err != nil {
			// 记录错误但不阻止登录（Refresh Token记录失败不影响登录）
			log.Printf("Failed to create refresh token record: %v", err)
		}

		// 更新最后登录时间
		now := time.Now()
		db.Model(&user).Update("last_login_at", &now)

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Login successful",
			Data: map[string]interface{}{
				"user":               user.ToResponse(),
				"access_token":       tokenPair.AccessToken,
				"refresh_token":      tokenPair.RefreshToken,
				"expires_in":         tokenPair.ExpiresIn,
				"refresh_expires_in": tokenPair.RefreshExpiresIn,
			},
		})
	}
}

// refreshAccessTokenWithDB 使用数据库验证Refresh Token并生成新的访问token
func refreshAccessTokenWithDB(refreshToken string, ipAddress, userAgent string) (*utils.TokenResponse, error) {
	// 解析Refresh Token获取用户信息
	refreshClaims, err := utils.ValidateTokenType(refreshToken, "refresh")
	if err != nil {
		return nil, err
	}

	// 查找Refresh Token记录 - 查询所有有效的Refresh Token（未过期且未撤销）
	var refreshTokens []models.RefreshToken
	if err := models.DB.Where("user_id = ? AND is_revoked = ? AND expires_at > ?",
		refreshClaims.UserID, false, time.Now()).Find(&refreshTokens).Error; err != nil {
		return nil, errors.New("no valid refresh token found")
	}

	if len(refreshTokens) == 0 {
		return nil, errors.New("no valid refresh token found")
	}

	// 找到匹配的Refresh Token
	var matchedToken *models.RefreshToken
	for _, rt := range refreshTokens {
		if rt.VerifyTokenHash(refreshToken) {
			matchedToken = &rt
			break
		}
	}

	if matchedToken == nil {
		return nil, errors.New("invalid refresh token")
	}

	rt := *matchedToken

	// 生成新的访问token
	accessToken, err := utils.GenerateAccessToken(refreshClaims.UserID, refreshClaims.Email, refreshClaims.Role)
	if err != nil {
		return nil, err
	}

	// 生成新的Refresh Token
	newRefreshToken, err := utils.GenerateRefreshToken(refreshClaims.UserID, refreshClaims.Email, refreshClaims.Role)
	if err != nil {
		return nil, err
	}

	// 撤销旧的Refresh Token
	rt.Revoke()
	if err := models.DB.Save(&rt).Error; err != nil {
		return nil, err
	}

	// 创建新的Refresh Token记录
	newRT := models.RefreshToken{
		UserID:    refreshClaims.UserID,
		ExpiresAt: time.Now().Add(time.Duration(config.AppConfig.JWTRefreshExpiration) * time.Hour),
		IPAddress: ipAddress,
		UserAgent: userAgent,
	}
	newRT.GenerateTokenHash(newRefreshToken)

	if err := models.DB.Create(&newRT).Error; err != nil {
		return nil, err
	}

	return &utils.TokenResponse{
		AccessToken:      accessToken,
		RefreshToken:     newRefreshToken,
		TokenType:        "Bearer",
		ExpiresIn:        int64(config.AppConfig.JWTExpiration * 3600),
		RefreshExpiresIn: int64(config.AppConfig.JWTRefreshExpiration * 3600),
		UserID:           refreshClaims.UserID,
		Email:            refreshClaims.Email,
		Role:             refreshClaims.Role,
	}, nil
}

// CreateRefreshTokenRecord 在双Token登录时创建Refresh Token记录
func CreateRefreshTokenRecord(userID, refreshToken, ipAddress, userAgent string) error {
	var rt models.RefreshToken
	rt.UserID = userID
	rt.ExpiresAt = time.Now().Add(time.Duration(config.AppConfig.JWTRefreshExpiration) * time.Hour)
	rt.IPAddress = ipAddress
	rt.UserAgent = userAgent
	rt.GenerateTokenHash(refreshToken)

	return models.DB.Create(&rt).Error
}

// RevokeUserRefreshTokens 撤销用户的所有Refresh Token
func RevokeUserRefreshTokens(userID string) error {
	return models.DB.Model(&models.RefreshToken{}).
		Where("user_id = ? AND is_revoked = ?", userID, false).
		Update("is_revoked", true).Error
}

// CleanupExpiredRefreshTokens 清理过期的Refresh Token
func CleanupExpiredRefreshTokens() error {
	return models.DB.Where("expires_at < ?", time.Now()).Delete(&models.RefreshToken{}).Error
}
