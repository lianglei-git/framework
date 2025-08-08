// utils/jwt_enhanced.go
package utils

import (
	"errors"
	"fmt"
	"strings"
	"time"
	"unit-auth/config"

	"github.com/golang-jwt/jwt/v5"
)

// EnhancedClaims 增强的JWT声明 - 支持双Token扩展
type EnhancedClaims struct {
	UserID    string `json:"user_id"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	TokenType string `json:"token_type"` // "access", "refresh", "remember_me"
	jwt.RegisteredClaims
}

// TokenResponse token响应结构 - 支持双Token
type TokenResponse struct {
	AccessToken      string `json:"access_token"`
	RefreshToken     string `json:"refresh_token,omitempty"`
	TokenType        string `json:"token_type"`
	ExpiresIn        int64  `json:"expires_in"`
	RefreshExpiresIn int64  `json:"refresh_expires_in,omitempty"`
	UserID           string `json:"user_id"`
	Email            string `json:"email"`
	Role             string `json:"role"`
}

// TokenPair 双Token对
type TokenPair struct {
	AccessToken      string `json:"access_token"`
	RefreshToken     string `json:"refresh_token"`
	ExpiresIn        int64  `json:"expires_in"`
	RefreshExpiresIn int64  `json:"refresh_expires_in"`
}

// GenerateAccessToken 生成访问token
func GenerateAccessToken(userID string, email, role string) (string, error) {
	expirationTime := time.Now().Add(time.Duration(config.AppConfig.JWTExpiration) * time.Hour)

	claims := &EnhancedClaims{
		UserID:    userID,
		Email:     email,
		Role:      role,
		TokenType: "access",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(config.AppConfig.JWTSecret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// GenerateRefreshToken 生成刷新token
func GenerateRefreshToken(userID string, email, role string) (string, error) {
	expirationTime := time.Now().Add(time.Duration(config.AppConfig.JWTRefreshExpiration) * time.Hour)

	claims := &EnhancedClaims{
		UserID:    userID,
		Email:     email,
		Role:      role,
		TokenType: "refresh",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(config.AppConfig.JWTSecret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// GenerateRememberMeToken 生成记住我token
func GenerateRememberMeToken(userID string, email, role string) (string, error) {
	expirationTime := time.Now().Add(time.Duration(config.AppConfig.JWTRememberMeExpiration) * time.Hour)

	claims := &EnhancedClaims{
		UserID:    userID,
		Email:     email,
		Role:      role,
		TokenType: "remember_me",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(config.AppConfig.JWTSecret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// ValidateEnhancedToken 验证增强的JWT Token
func ValidateEnhancedToken(tokenString string) (*EnhancedClaims, error) {
	claims := &EnhancedClaims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(config.AppConfig.JWTSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}

// ValidateTokenType 验证指定类型的token
func ValidateTokenType(tokenString string, expectedType string) (*EnhancedClaims, error) {
	claims, err := ValidateEnhancedToken(tokenString)
	if err != nil {
		return nil, err
	}

	if claims.TokenType != expectedType {
		return nil, fmt.Errorf("invalid token type: expected %s, got %s", expectedType, claims.TokenType)
	}

	return claims, nil
}

// GenerateTokenPair 生成双Token对
func GenerateTokenPair(userID string, email, role string) (*TokenPair, error) {
	accessToken, err := GenerateAccessToken(userID, email, role)
	if err != nil {
		return nil, err
	}

	refreshToken, err := GenerateRefreshToken(userID, email, role)
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:      accessToken,
		RefreshToken:     refreshToken,
		ExpiresIn:        int64(config.AppConfig.JWTExpiration * 3600),
		RefreshExpiresIn: int64(config.AppConfig.JWTRefreshExpiration * 3600),
	}, nil
}

// RefreshAccessToken 使用刷新token续签访问token
func RefreshAccessToken(refreshToken string) (*TokenResponse, error) {
	// 验证刷新token
	claims, err := ValidateTokenType(refreshToken, "refresh")
	if err != nil {
		return nil, err
	}

	// 生成新的访问token
	accessToken, err := GenerateAccessToken(claims.UserID, claims.Email, claims.Role)
	if err != nil {
		return nil, err
	}

	// 生成新的刷新token
	newRefreshToken, err := GenerateRefreshToken(claims.UserID, claims.Email, claims.Role)
	if err != nil {
		return nil, err
	}

	return &TokenResponse{
		AccessToken:      accessToken,
		RefreshToken:     newRefreshToken,
		TokenType:        "Bearer",
		ExpiresIn:        int64(config.AppConfig.JWTExpiration * 3600),
		RefreshExpiresIn: int64(config.AppConfig.JWTRefreshExpiration * 3600),
		UserID:           claims.UserID,
		Email:            claims.Email,
		Role:             claims.Role,
	}, nil
}

// ExtendToken 延长token有效期（自动续签）
func ExtendToken(tokenString string) (*TokenResponse, error) {
	// 验证当前token
	claims, err := ValidateEnhancedToken(tokenString)
	if err != nil {
		return nil, err
	}

	// 检查token类型，只允许延长access token
	if claims.TokenType != "access" && claims.TokenType != "remember_me" {
		return nil, errors.New("can only extend access or remember_me tokens")
	}

	// 生成新的token
	var newToken string
	var err2 error

	if claims.TokenType == "remember_me" {
		newToken, err2 = GenerateRememberMeToken(claims.UserID, claims.Email, claims.Role)
	} else {
		newToken, err2 = GenerateAccessToken(claims.UserID, claims.Email, claims.Role)
	}

	if err2 != nil {
		return nil, err2
	}

	// 确定过期时间
	var expiresIn int64
	if claims.TokenType == "remember_me" {
		expiresIn = int64(config.AppConfig.JWTRememberMeExpiration * 3600)
	} else {
		expiresIn = int64(config.AppConfig.JWTExpiration * 3600)
	}

	return &TokenResponse{
		AccessToken: newToken,
		TokenType:   "Bearer",
		ExpiresIn:   expiresIn,
		UserID:      claims.UserID,
		Email:       claims.Email,
		Role:        claims.Role,
	}, nil
}

// IsTokenExpiringSoon 检查token是否即将过期（提前1小时）
func IsTokenExpiringSoon(tokenString string) (bool, error) {
	claims, err := ValidateEnhancedToken(tokenString)
	if err != nil {
		return false, err
	}

	// 检查是否在1小时内过期
	expirationTime := claims.ExpiresAt.Time
	oneHourFromNow := time.Now().Add(1 * time.Hour)

	return expirationTime.Before(oneHourFromNow), nil
}

// GetTokenExpirationTime 获取token过期时间
func GetTokenExpirationTime(tokenString string) (*time.Time, error) {
	claims, err := ValidateEnhancedToken(tokenString)
	if err != nil {
		return nil, err
	}

	return &claims.ExpiresAt.Time, nil
}

// SplitToken 分割Authorization header
func SplitToken(authHeader string) []string {
	return strings.Split(authHeader, " ")
}

// 保持向后兼容的函数
func GenerateToken(userID string, email, role string) (string, error) {
	return GenerateAccessToken(userID, email, role)
}

func ValidateToken(tokenString string) (*Claims, error) {
	enhancedClaims, err := ValidateEnhancedToken(tokenString)
	if err != nil {
		return nil, err
	}

	// 转换为旧的Claims格式
	return &Claims{
		UserID:           enhancedClaims.UserID,
		Email:            enhancedClaims.Email,
		Role:             enhancedClaims.Role,
		RegisteredClaims: enhancedClaims.RegisteredClaims,
	}, nil
}
