// utils/jwt_enhanced.go
package utils

import (
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"
	"unit-auth/config"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// EnhancedClaims 增强的JWT声明 - 支持双Token扩展
type EnhancedClaims struct {
	UserID      string `json:"user_id"`
	Email       string `json:"email"`
	Role        string `json:"role"`
	ProjectKey  string `json:"project_key,omitempty"`
	LocalUserID string `json:"local_user_id,omitempty"`
	TokenType   string `json:"token_type"`           // "access", "refresh", "remember_me"
	SessionID   string `json:"session_id,omitempty"` // 会话ID（中心化SSO）
	ProjectID   string `json:"project_id,omitempty"` // 项目ID
	jwt.RegisteredClaims
}

// 实现jwt.Claims接口方法
func (e *EnhancedClaims) GetAudience() (jwt.ClaimStrings, error) {
	if len(e.RegisteredClaims.Audience) > 0 {
		return e.RegisteredClaims.Audience, nil
	}
	return jwt.ClaimStrings{}, nil
}

func (e *EnhancedClaims) GetExpiresAt() (*jwt.NumericDate, error) {
	return e.RegisteredClaims.ExpiresAt, nil
}

func (e *EnhancedClaims) GetIssuedAt() (*jwt.NumericDate, error) {
	return e.RegisteredClaims.IssuedAt, nil
}

func (e *EnhancedClaims) GetNotBefore() (*jwt.NumericDate, error) {
	return e.RegisteredClaims.NotBefore, nil
}

func (e *EnhancedClaims) GetIssuer() (string, error) {
	return e.RegisteredClaims.Issuer, nil
}

func (e *EnhancedClaims) GetSubject() (string, error) {
	return e.RegisteredClaims.Subject, nil
}

// 自定义JWT声明结构，避免类型冲突
type CustomClaims struct {
	UserID      string `json:"user_id"`
	Email       string `json:"email"`
	Role        string `json:"role"`
	ProjectKey  string `json:"project_key,omitempty"`
	LocalUserID string `json:"local_user_id,omitempty"`
	TokenType   string `json:"token_type"`           // "access", "refresh", "remember_me"
	SessionID   string `json:"session_id,omitempty"` // 会话ID（中心化SSO）
	ProjectID   string `json:"project_id,omitempty"` // 项目ID
	jwt.RegisteredClaims
}

// TokenClaims 用于创建Token的声明结构
type TokenClaims struct {
	UserID      string `json:"user_id"`
	Email       string `json:"email"`
	Role        string `json:"role"`
	ProjectKey  string `json:"project_key,omitempty"`
	LocalUserID string `json:"local_user_id,omitempty"`
	TokenType   string `json:"token_type"`           // "access", "refresh", "remember_me"
	SessionID   string `json:"session_id,omitempty"` // 会话ID（中心化SSO）
	ProjectID   string `json:"project_id,omitempty"` // 项目ID
	jwt.RegisteredClaims
}

// 实现jwt.Claims接口
func (t *TokenClaims) GetAudience() (jwt.ClaimStrings, error) {
	return t.RegisteredClaims.GetAudience()
}

func (t *TokenClaims) GetExpiresAt() (*jwt.NumericDate, error) {
	return t.RegisteredClaims.ExpiresAt, nil
}

func (t *TokenClaims) GetIssuedAt() (*jwt.NumericDate, error) {
	return t.RegisteredClaims.IssuedAt, nil
}

func (t *TokenClaims) GetNotBefore() (*jwt.NumericDate, error) {
	return t.RegisteredClaims.NotBefore, nil
}

func (t *TokenClaims) GetIssuer() (string, error) {
	return t.RegisteredClaims.Issuer, nil
}

func (t *TokenClaims) GetSubject() (string, error) {
	return t.RegisteredClaims.Subject, nil
}

func (t *TokenClaims) GetExpirationTime() (*jwt.NumericDate, error) {
	return t.GetExpiresAt()
}

func (t *TokenClaims) GetIssuedAtTime() (*jwt.NumericDate, error) {
	return t.GetIssuedAt()
}

func (t *TokenClaims) GetNotBeforeTime() (*jwt.NumericDate, error) {
	return t.GetNotBefore()
}

// 暴露JWT Secret用于JWKS指纹（对称密钥仅用于示例）
func GetJWTSecret() string {
	return config.AppConfig.JWTSecret
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

// ValidateEnhancedTokenIgnoreExpiry 验证增强的JWT Token（忽略过期验证）
func ValidateEnhancedTokenIgnoreExpiry(tokenString string) (*EnhancedClaims, error) {
	claims := jwt.MapClaims{}
	_, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(config.AppConfig.JWTSecret), nil
	})
	if err != nil {
		return nil, err
	}

	// 不验证token的有效性（包括过期时间）
	// 直接提取claims数据

	// 提取注册字段
	enh := &EnhancedClaims{}
	// user id
	if v, ok := claims["user_id"].(string); ok && v != "" {
		enh.UserID = v
	}
	if enh.UserID == "" {
		if v, ok := claims["uid"].(string); ok {
			enh.UserID = v
		}
		if enh.UserID == "" {
			if v, ok := claims["sub"].(string); ok {
				enh.UserID = v
			}
		}
	}
	// email, role
	if v, ok := claims["email"].(string); ok {
		enh.Email = v
	}
	if v, ok := claims["role"].(string); ok {
		enh.Role = v
	}
	// local user id
	if v, ok := claims["local_user_id"].(string); ok {
		enh.LocalUserID = v
	}
	if enh.LocalUserID == "" {
		if v, ok := claims["luid"].(string); ok {
			enh.LocalUserID = v
		}
	}
	// token type
	if v, ok := claims["token_type"].(string); ok {
		enh.TokenType = v
	}
	// session_id
	if v, ok := claims["session_id"].(string); ok {
		enh.SessionID = v
	}
	// project id
	if v, ok := claims["project_id"].(string); ok {
		enh.ProjectID = v
	}
	if enh.ProjectID == "" {
		if v, ok := claims["pid"].(string); ok {
			enh.ProjectID = v
		}
	}
	// issuer
	if v, ok := claims["iss"].(string); ok {
		enh.Issuer = v
	}
	// audience
	if v, ok := claims["aud"].(string); ok {
		enh.RegisteredClaims.Audience = jwt.ClaimStrings{v}
	}
	// issued at
	if v, ok := claims["iat"].(float64); ok {
		enh.RegisteredClaims.IssuedAt = jwt.NewNumericDate(time.Unix(int64(v), 0))
	}
	// expires at
	if v, ok := claims["exp"].(float64); ok {
		enh.RegisteredClaims.ExpiresAt = jwt.NewNumericDate(time.Unix(int64(v), 0))
	}
	// not before
	if v, ok := claims["nbf"].(float64); ok {
		enh.RegisteredClaims.NotBefore = jwt.NewNumericDate(time.Unix(int64(v), 0))
	}

	return enh, nil
}

// ValidateEnhancedToken 验证增强的JWT Token（兼容紧凑字段 uid/pid/luid 与完整字段）
func ValidateEnhancedToken(tokenString string) (*EnhancedClaims, error) {
	claims := jwt.MapClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(config.AppConfig.JWTSecret), nil
	})
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	// 提取注册字段
	enh := &EnhancedClaims{}
	// user id
	if v, ok := claims["user_id"].(string); ok && v != "" {
		enh.UserID = v
	}
	if enh.UserID == "" {
		if v, ok := claims["uid"].(string); ok {
			enh.UserID = v
		}
		if enh.UserID == "" {
			if v, ok := claims["sub"].(string); ok {
				enh.UserID = v
			}
		}
	}
	// email, role
	if v, ok := claims["email"].(string); ok {
		enh.Email = v
	}
	if v, ok := claims["role"].(string); ok {
		enh.Role = v
	}
	// project/local ids
	if v, ok := claims["project_key"].(string); ok {
		enh.ProjectKey = v
	}
	if v, ok := claims["pid"].(string); ok && v != "" {
		enh.ProjectKey = v
	}
	if v, ok := claims["local_user_id"].(string); ok {
		enh.LocalUserID = v
	}
	if v, ok := claims["luid"].(string); ok && v != "" {
		enh.LocalUserID = v
	}
	// token type（默认为 access）
	if v, ok := claims["token_type"].(string); ok && v != "" {
		enh.TokenType = v
	} else {
		enh.TokenType = "access"
	}
	// session_id
	if v, ok := claims["session_id"].(string); ok {
		enh.SessionID = v
	}
	// project id
	if v, ok := claims["project_id"].(string); ok {
		enh.ProjectID = v
	}
	if enh.ProjectID == "" {
		if v, ok := claims["pid"].(string); ok {
			enh.ProjectID = v
		}
	}

	// RegisteredClaims
	if v, ok := claims["iss"].(string); ok {
		enh.RegisteredClaims.Issuer = v
	}
	if v, ok := claims["aud"].(string); ok && v != "" {
		enh.RegisteredClaims.Audience = jwt.ClaimStrings{v}
	}
	if v, ok := claims["iat"].(float64); ok {
		enh.RegisteredClaims.IssuedAt = jwt.NewNumericDate(time.Unix(int64(v), 0))
	}
	if v, ok := claims["exp"].(float64); ok {
		enh.RegisteredClaims.ExpiresAt = jwt.NewNumericDate(time.Unix(int64(v), 0))
	}
	if v, ok := claims["nbf"].(float64); ok {
		enh.RegisteredClaims.NotBefore = jwt.NewNumericDate(time.Unix(int64(v), 0))
	}
	if v, ok := claims["jti"].(string); ok {
		enh.ID = v
	}

	return enh, nil
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
	return GenerateUnifiedToken(userID, email, role, "", "")
}

func ValidateToken(tokenString string) (*EnhancedClaims, error) {
	enhancedClaims, err := ValidateEnhancedToken(tokenString)
	if err != nil {
		return nil, err
	}

	// 转换为旧的Claims格式
	return enhancedClaims, nil
}

func GenerateAccessTokenWithProject(userID string, email, role, projectKey, localUserID string) (string, error) {
	return GenerateUnifiedToken(userID, email, role, projectKey, localUserID)
}

func GenerateTokenWithProject(userID string, email, role, projectKey, localUserID string) (string, error) {
	return GenerateUnifiedToken(userID, email, role, projectKey, localUserID)
}

// GenerateAccessTokenWithAudience 生成带aud、并保留项目字段的访问token
func GenerateAccessTokenWithAudience(userID string, email, role, audience, projectKey, localUserID string) (string, error) {
	now := time.Now()
	claims := &TokenClaims{
		UserID:      userID,
		Email:       email,
		Role:        role,
		ProjectKey:  projectKey,
		LocalUserID: localUserID,
		TokenType:   "access",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(config.AppConfig.JWTExpiration) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    os.Getenv("JWT_ISS"),
			ID:        uuid.New().String(),
		},
	}

	// 设置audience如果有
	if strings.TrimSpace(audience) != "" {
		claims.RegisteredClaims.Audience = jwt.ClaimStrings{audience}
	}

	log.Printf("claims: %+v\n", claims)

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.AppConfig.JWTSecret))
}

// GenerateCompactAccessToken 生成带短字段的访问token（sub, uid, pid, luid, iss, aud, iat, exp, jti）
func GenerateCompactAccessToken(userID string, emailOrIdentifier, role, projectKey, localUserID string) (string, error) {
	// 创建TokenClaims结构
	now := time.Now()
	claims := &TokenClaims{
		UserID:      userID,
		Email:       emailOrIdentifier,
		Role:        role,
		ProjectKey:  projectKey,
		LocalUserID: localUserID,
		TokenType:   "access",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(config.AppConfig.JWTExpiration) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    os.Getenv("JWT_ISS"),
			ID:        uuid.New().String(),
		},
	}

	// 设置audience如果有projectKey
	if strings.TrimSpace(projectKey) != "" {
		claims.RegisteredClaims.Audience = jwt.ClaimStrings{projectKey}
	}

	log.Printf("claims: %+v\n", claims)

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.AppConfig.JWTSecret))
}

// GenerateUnifiedToken 统一的token生成（紧凑字段），当 projectKey/localUserID 为空时不写入相关字段
func GenerateUnifiedToken(userID, identifier, role, projectKey, localUserID string) (string, error) {
	return GenerateCompactAccessToken(userID, identifier, role, projectKey, localUserID)
}
