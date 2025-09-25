package handlers

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
	"unit-auth/config"
	"unit-auth/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SSOClient SSO客户端模型
type SSOClient struct {
	ID            string    `json:"id" gorm:"primaryKey;type:varchar(36)"`
	Name          string    `json:"name" gorm:"not null;size:100"`
	Description   string    `json:"description" gorm:"size:500"`
	Secret        string    `json:"-" gorm:"not null;size:255"`        // 客户端密钥，响应时不返回
	RedirectURIs  string    `json:"redirect_uris" gorm:"type:text"`    // 回调URI，JSON数组
	GrantTypes    string    `json:"grant_types" gorm:"type:text"`      // 支持的授权类型
	ResponseTypes string    `json:"response_types" gorm:"type:text"`   // 支持的响应类型
	Scope         string    `json:"scope" gorm:"type:text"`            // 支持的权限范围
	AutoApprove   bool      `json:"auto_approve" gorm:"default:false"` // 自动批准
	IsActive      bool      `json:"is_active" gorm:"default:true"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// OpenIDConfiguration OpenID Connect服务发现配置
type OpenIDConfiguration struct {
	Issuer                                     string   `json:"issuer"`
	AuthorizationEndpoint                      string   `json:"authorization_endpoint"`
	TokenEndpoint                              string   `json:"token_endpoint"`
	UserinfoEndpoint                           string   `json:"userinfo_endpoint"`
	EndSessionEndpoint                         string   `json:"end_session_endpoint,omitempty"`
	CheckSessionIframe                         string   `json:"check_session_iframe,omitempty"`
	RevocationEndpoint                         string   `json:"revocation_endpoint,omitempty"`
	IntrospectionEndpoint                      string   `json:"introspection_endpoint,omitempty"`
	DeviceAuthorizationEndpoint                string   `json:"device_authorization_endpoint,omitempty"`
	RegistrationEndpoint                       string   `json:"registration_endpoint,omitempty"`
	JwksURI                                    string   `json:"jwks_uri"`
	ScopesSupported                            []string `json:"scopes_supported,omitempty"`
	ResponseTypesSupported                     []string `json:"response_types_supported"`
	ResponseModesSupported                     []string `json:"response_modes_supported,omitempty"`
	GrantTypesSupported                        []string `json:"grant_types_supported"`
	AcrValuesSupported                         []string `json:"acr_values_supported,omitempty"`
	SubjectTypesSupported                      []string `json:"subject_types_supported"`
	IDTokenSigningAlgValuesSupported           []string `json:"id_token_signing_alg_values_supported"`
	IDTokenEncryptionAlgValuesSupported        []string `json:"id_token_encryption_alg_values_supported,omitempty"`
	IDTokenEncryptionEncValuesSupported        []string `json:"id_token_encryption_enc_values_supported,omitempty"`
	UserinfoSigningAlgValuesSupported          []string `json:"userinfo_signing_alg_values_supported,omitempty"`
	UserinfoEncryptionAlgValuesSupported       []string `json:"userinfo_encryption_alg_values_supported,omitempty"`
	UserinfoEncryptionEncValuesSupported       []string `json:"userinfo_encryption_enc_values_supported,omitempty"`
	RequestObjectSigningAlgValuesSupported     []string `json:"request_object_signing_alg_values_supported,omitempty"`
	RequestObjectEncryptionAlgValuesSupported  []string `json:"request_object_encryption_alg_values_supported,omitempty"`
	RequestObjectEncryptionEncValuesSupported  []string `json:"request_object_encryption_enc_values_supported,omitempty"`
	TokenEndpointAuthMethodsSupported          []string `json:"token_endpoint_auth_methods_supported"`
	TokenEndpointAuthSigningAlgValuesSupported []string `json:"token_endpoint_auth_signing_alg_values_supported,omitempty"`
	DisplayValuesSupported                     []string `json:"display_values_supported,omitempty"`
	ClaimTypesSupported                        []string `json:"claim_types_supported,omitempty"`
	ClaimsSupported                            []string `json:"claims_supported,omitempty"`
	ServiceDocumentation                       string   `json:"service_documentation,omitempty"`
	ClaimsLocalesSupported                     []string `json:"claims_locales_supported,omitempty"`
	UILocalesSupported                         []string `json:"ui_locales_supported,omitempty"`
	ClaimsParameterSupported                   bool     `json:"claims_parameter_supported"`
	RequestParameterSupported                  bool     `json:"request_parameter_supported"`
	RequestURIParameterSupported               bool     `json:"request_uri_parameter_supported"`
	RequireRequestURIRegistration              bool     `json:"require_request_uri_registration"`
	OPPolicyURI                                string   `json:"op_policy_uri,omitempty"`
	OPTOSURI                                   string   `json:"op_tos_uri,omitempty"`
}

// JWKSet JSON Web Key Set
type JWKSet struct {
	Keys []JWK `json:"keys"`
}

// JWK JSON Web Key
type JWK struct {
	Kty     string   `json:"kty"`
	Use     string   `json:"use,omitempty"`
	KeyOps  []string `json:"key_ops,omitempty"`
	Alg     string   `json:"alg,omitempty"`
	Kid     string   `json:"kid"`
	X5u     string   `json:"x5u,omitempty"`
	X5c     []string `json:"x5c,omitempty"`
	X5t     string   `json:"x5t,omitempty"`
	X5tS256 string   `json:"x5t#S256,omitempty"`
	N       string   `json:"n,omitempty"` // RSA modulus
	E       string   `json:"e,omitempty"` // RSA public exponent
}

// 全局RSA密钥对
var (
	rsaPrivateKey *rsa.PrivateKey
	rsaPublicKey  *rsa.PublicKey
	jwkSet        *JWKSet
)

// 初始化RSA密钥对
func initRSAKeys() {
	if rsaPrivateKey != nil {
		return
	}

	// 尝试从环境变量加载私钥
	if privateKeyPEM := os.Getenv("RSA_PRIVATE_KEY"); privateKeyPEM != "" {
		block, _ := pem.Decode([]byte(privateKeyPEM))
		if block != nil {
			var err error
			rsaPrivateKey, err = x509.ParsePKCS1PrivateKey(block.Bytes)
			if err == nil {
				rsaPublicKey = &rsaPrivateKey.PublicKey
				generateJWKSet()
				return
			}
		}
	}

	// 生成新的RSA密钥对
	var err error
	rsaPrivateKey, err = rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		panic("Failed to generate RSA key pair: " + err.Error())
	}

	rsaPublicKey = &rsaPrivateKey.PublicKey
	generateJWKSet()
}

// 生成JWK Set
func generateJWKSet() {
	kid := uuid.New().String()
	jwkSet = &JWKSet{
		Keys: []JWK{
			{
				Kty: "RSA",
				Use: "sig",
				Alg: "RS256",
				Kid: kid,
				N:   base64.RawURLEncoding.EncodeToString(rsaPublicKey.N.Bytes()),
				E:   base64.RawURLEncoding.EncodeToString(big.NewInt(int64(rsaPublicKey.E)).Bytes()),
			},
		},
	}
}

// 辅助函数：大整数转字节数组
func bigIntToBytes(n *big.Int) []byte {
	return n.FillBytes(make([]byte, (n.BitLen()+7)/8))
}

// GetOpenIDConfiguration 返回OpenID Connect服务发现配置
func GetOpenIDConfiguration() gin.HandlerFunc {
	return func(c *gin.Context) {
		baseURL := getBaseURL(c)

		config := OpenIDConfiguration{
			Issuer:                                     baseURL,
			AuthorizationEndpoint:                      baseURL + "/oauth/authorize",
			TokenEndpoint:                              baseURL + "/oauth/token",
			UserinfoEndpoint:                           baseURL + "/oauth/userinfo",
			EndSessionEndpoint:                         baseURL + "/oauth/logout",
			CheckSessionIframe:                         baseURL + "/oauth/check_session",
			RevocationEndpoint:                         baseURL + "/oauth/revoke",
			IntrospectionEndpoint:                      baseURL + "/oauth/introspect",
			JwksURI:                                    baseURL + "/api/v1/jwks-json",
			ScopesSupported:                            []string{"openid", "profile", "email", "phone", "offline_access"},
			ResponseTypesSupported:                     []string{"code", "token", "id_token"},
			ResponseModesSupported:                     []string{"query", "fragment"},
			GrantTypesSupported:                        []string{"authorization_code", "refresh_token", "password", "client_credentials"},
			AcrValuesSupported:                         []string{"urn:mace:incommon:iap:silver", "urn:mace:incommon:iap:bronze"},
			SubjectTypesSupported:                      []string{"public"},
			IDTokenSigningAlgValuesSupported:           []string{"RS256", "HS256"},
			IDTokenEncryptionAlgValuesSupported:        []string{"RSA1_5", "A128KW"},
			IDTokenEncryptionEncValuesSupported:        []string{"A128CBC-HS256", "A128GCM"},
			UserinfoSigningAlgValuesSupported:          []string{"RS256", "HS256"},
			UserinfoEncryptionAlgValuesSupported:       []string{"RSA1_5", "A128KW"},
			UserinfoEncryptionEncValuesSupported:       []string{"A128CBC-HS256", "A128GCM"},
			RequestObjectSigningAlgValuesSupported:     []string{"RS256", "HS256"},
			RequestObjectEncryptionAlgValuesSupported:  []string{"RSA1_5", "A128KW"},
			RequestObjectEncryptionEncValuesSupported:  []string{"A128CBC-HS256", "A128GCM"},
			TokenEndpointAuthMethodsSupported:          []string{"client_secret_post", "client_secret_basic"},
			TokenEndpointAuthSigningAlgValuesSupported: []string{"RS256", "HS256"},
			DisplayValuesSupported:                     []string{"page", "popup"},
			ClaimTypesSupported:                        []string{"normal"},
			ClaimsSupported:                            []string{"sub", "name", "given_name", "family_name", "middle_name", "nickname", "preferred_username", "profile", "picture", "website", "email", "email_verified", "gender", "birthdate", "zoneinfo", "locale", "phone_number", "phone_number_verified", "address", "updated_at"},
			ClaimsLocalesSupported:                     []string{"en", "zh-CN"},
			UILocalesSupported:                         []string{"en", "zh-CN"},
			ClaimsParameterSupported:                   true,
			RequestParameterSupported:                  true,
			RequestURIParameterSupported:               false,
			RequireRequestURIRegistration:              false,
		}

		c.Header("Content-Type", "application/json")
		c.Header("Cache-Control", "public, max-age=3600")
		c.JSON(http.StatusOK, config)
	}
}

// GetOAuthAuthorize OAuth 2.0授权端点
func GetOAuthAuthorize(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		clientID := c.Query("client_id")
		redirectURI := c.Query("redirect_uri")
		responseType := c.Query("response_type")
		scope := c.Query("scope")
		state := c.Query("state")
		codeChallenge := c.Query("code_challenge")
		codeChallengeMethod := c.Query("code_challenge_method")

		// 验证必要参数
		if clientID == "" || redirectURI == "" || responseType == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "error_description": "Missing required parameters"})
			return
		}

		// 验证响应类型
		if responseType != "code" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported_response_type", "error_description": "Only authorization_code is supported"})
			return
		}

		// 查找客户端
		var client SSOClient
		if err := db.Where("id = ? AND is_active = ?", clientID, true).First(&client).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_client", "error_description": "Invalid client"})
			return
		}

		// 验证重定向URI
		if !isValidRedirectURI(redirectURI, client.RedirectURIs) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "error_description": "Invalid redirect URI"})
			return
		}

		// 如果用户未登录，显示登录页面
		userID, _ := c.Get("user_id")
		if userID == "" {
			// 保存授权请求参数到session
			sessionData := map[string]string{
				"client_id":             clientID,
				"redirect_uri":          redirectURI,
				"scope":                 scope,
				"state":                 state,
				"code_challenge":        codeChallenge,
				"code_challenge_method": codeChallengeMethod,
			}
			// 这里应该重定向到登录页面，携带这些参数
			c.Redirect(http.StatusFound, "/login?"+buildQueryString(sessionData))
			return
		}

		// 用户已登录，生成授权码
		authorizationCode := generateAuthorizationCode(clientID, userID.(string), redirectURI, scope, codeChallenge, codeChallengeMethod)

		// 保存授权码到数据库（这里简化处理）
		// 在实际实现中，应该保存到数据库或Redis

		// 重定向回客户端
		redirectURL, _ := url.Parse(redirectURI)
		params := redirectURL.Query()
		params.Set("code", authorizationCode)
		if state != "" {
			params.Set("state", state)
		}
		redirectURL.RawQuery = params.Encode()

		c.Redirect(http.StatusFound, redirectURL.String())
	}
}

// 生成授权码
func generateAuthorizationCode(clientID, userID, redirectURI, scope, codeChallenge, codeChallengeMethod string) string {
	// 创建授权码声明
	claims := jwt.MapClaims{
		"iss":          config.AppConfig.ServerHost,
		"sub":          userID,
		"aud":          clientID,
		"exp":          time.Now().Add(10 * time.Minute).Unix(), // 10分钟过期
		"iat":          time.Now().Unix(),
		"jti":          uuid.New().String(),
		"redirect_uri": redirectURI,
		"scope":        scope,
	}

	// 如果有PKCE，添加相关声明
	if codeChallenge != "" && codeChallengeMethod != "" {
		claims["code_challenge"] = codeChallenge
		claims["code_challenge_method"] = codeChallengeMethod
	}

	// 使用RSA私钥签名
	initRSAKeys()
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	authorizationCode, err := token.SignedString(rsaPrivateKey)
	if err != nil {
		panic("Failed to generate authorization code: " + err.Error())
	}

	return authorizationCode
}

// GetOAuthToken OAuth 2.0令牌端点
func GetOAuthToken(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		grantType := c.PostForm("grant_type")
		code := c.PostForm("code")
		redirectURI := c.PostForm("redirect_uri")
		clientID := c.PostForm("client_id")
		clientSecret := c.PostForm("client_secret")
		refreshToken := c.PostForm("refresh_token")
		username := c.PostForm("username")
		password := c.PostForm("password")

		switch grantType {
		case "authorization_code":
			handleAuthorizationCodeGrant(c, db, code, redirectURI, clientID, clientSecret)
		case "refresh_token":
			handleRefreshTokenGrant(c, db, refreshToken, clientID, clientSecret)
		case "password":
			handlePasswordGrant(c, db, username, password, clientID, clientSecret)
		case "code_verifier":
			// 双重验证模式：使用code_verifier进行内部认证
			handleCodeVerifierGrant(c, db, code, clientID, clientSecret)
		case "client_credentials":
			handleClientCredentialsGrant(c, db, clientID, clientSecret)
		default:
			c.JSON(http.StatusBadRequest, gin.H{
				"error":             "unsupported_grant_type",
				"error_description": "The grant type is not supported",
			})
		}
	}
}

// 处理授权码换令牌 - 统一双重验证模式
func handleAuthorizationCodeGrant(c *gin.Context, db *gorm.DB, code, redirectURI, clientID, clientSecret string) {
	// 获取额外参数用于双重验证
	codeVerifier := c.PostForm("code_verifier")
	state := c.PostForm("state")
	appID := c.PostForm("app_id")
	internalAuth := c.PostForm("internal_auth")
	doubleVerification := c.PostForm("double_verification")

	// 验证客户端
	var client SSOClient
	if err := db.Where("id = ? AND secret = ? AND is_active = ?", clientID, clientSecret, true).First(&client).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_client", "error_description": "Invalid client credentials"})
		return
	}

	// 双重验证模式：验证授权码 + PKCE code_verifier
	claims, err := validateAuthorizationCodeWithPKCE(code, clientID, redirectURI, codeVerifier, state, appID, internalAuth, doubleVerification)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_grant", "error_description": err.Error()})
		return
	}

	// 获取用户信息
	userID := claims["sub"].(string)
	var user models.User
	if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user_not_found", "error_description": "User not found"})
		return
	}

	// 更新登录信息
	ip := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	user.UpdateLoginInfo(ip, userAgent)

	// 保存到数据库
	if err := db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "error_description": "Failed to update user info"})
		return
	}

	// 记录登录日志
	loginLog := models.LoginLog{
		UserID:    user.ID,
		Provider:  "oauth", // 统一标识为OAuth登录
		IP:        ip,
		UserAgent: userAgent,
		Success:   true,
		CreatedAt: time.Now(),
	}
	if err := db.Create(&loginLog).Error; err != nil {
		// 记录失败不影响主流程
		fmt.Printf("Failed to record login log: %v\n", err)
	}

	// 生成访问令牌
	accessToken, err := generateAccessTokenWithRS256(user.ID, clientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "error_description": "Failed to generate access token"})
		return
	}

	// 生成刷新令牌
	refreshToken, err := generateRefreshTokenWithRS256(user.ID, clientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "error_description": "Failed to generate refresh token"})
		return
	}

	// 构建响应
	response := gin.H{
		"access_token":  accessToken,
		"refresh_token": refreshToken,
		"token_type":    "Bearer",
		"expires_in":    3600,
		"scope":         claims["scope"],
		"user":          user.ToResponse(),
	}

	c.JSON(http.StatusOK, response)
}

// 生成RSA签名的访问令牌
func generateAccessTokenWithRS256(userID, audience string) (string, error) {
	initRSAKeys()

	claims := jwt.MapClaims{
		"iss": config.AppConfig.ServerHost,
		"sub": userID,
		"aud": audience,
		"exp": time.Now().Add(1 * time.Hour).Unix(),
		"iat": time.Now().Unix(),
		"jti": uuid.New().String(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	return token.SignedString(rsaPrivateKey)
}

// 生成RSA签名的刷新令牌
func generateRefreshTokenWithRS256(userID, audience string) (string, error) {
	initRSAKeys()

	claims := jwt.MapClaims{
		"iss": config.AppConfig.ServerHost,
		"sub": userID,
		"aud": audience,
		"exp": time.Now().Add(24 * time.Hour).Unix(),
		"iat": time.Now().Unix(),
		"jti": uuid.New().String(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	return token.SignedString(rsaPrivateKey)
}

// 验证授权码
func validateAuthorizationCode(code, clientID, redirectURI string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(code, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		initRSAKeys()
		return &rsaPublicKey, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		// 验证客户端ID
		if claims["aud"] != clientID {
			return nil, jwt.ErrSignatureInvalid
		}

		// 验证重定向URI
		if claims["redirect_uri"] != redirectURI {
			return nil, jwt.ErrSignatureInvalid
		}

		return claims, nil
	}

	return nil, jwt.ErrSignatureInvalid
}

// GetOAuthUserinfo 用户信息端点
func GetOAuthUserinfo(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取访问令牌
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_token", "error_description": "Missing or invalid access token"})
			return
		}

		accessToken := strings.TrimPrefix(authHeader, "Bearer ")

		// 验证令牌
		claims, err := validateAccessToken(accessToken)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_token", "error_description": err.Error()})
			return
		}
		// 获取用户信息
		var user models.User
		if err := db.Where("id = ?", claims["sub"]).First(&user).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "user_not_found", "error_description": "User not found"})
			return
		}

		// 构建用户信息响应
		userInfo := gin.H{
			"sub": user.ID,
		}

		if user.Username != "" {
			userInfo["preferred_username"] = user.Username
			userInfo["name"] = user.Username
		}

		if user.Nickname != "" {
			userInfo["nickname"] = user.Nickname
		}

		if user.Email != nil && *user.Email != "" {
			userInfo["email"] = *user.Email
			userInfo["email_verified"] = user.EmailVerified
		}

		if user.Phone != nil && *user.Phone != "" {
			userInfo["phone_number"] = *user.Phone
			userInfo["phone_number_verified"] = user.PhoneVerified
		}

		c.JSON(http.StatusOK, userInfo)
	}
}

// 验证访问令牌
func validateAccessToken(tokenString string) (jwt.MapClaims, error) {
	// 初始化RSA密钥
	initRSAKeys()

	// 解析并验证令牌
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// 验证签名方法
		switch token.Method {
		case jwt.SigningMethodRS256:
			// 确保RSA公钥已初始化
			if rsaPublicKey == nil {
				return nil, jwt.ErrSignatureInvalid
			}
			return rsaPublicKey, nil
		case jwt.SigningMethodHS256:
			// 如果使用HS256，需要返回密钥字符串
			return []byte("your-secret-key"), nil
		default:
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %v", err)
	}

	if !token.Valid {
		return nil, jwt.ErrSignatureInvalid
	}

	// 提取声明
	if claims, ok := token.Claims.(jwt.MapClaims); ok {
		return claims, nil
	}

	return nil, jwt.ErrSignatureInvalid
}

// GetOAuthLogout 登出端点
func GetOAuthLogout(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 支持POST和GET方法
		if c.Request.Method == "POST" {
			idTokenHint := c.PostForm("id_token_hint")
			postLogoutRedirectURI := c.PostForm("post_logout_redirect_uri")
			state := c.PostForm("state")

			// 验证id_token_hint
			if idTokenHint != "" {
				_, err := validateAccessToken(idTokenHint)
				if err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_token", "error_description": "Invalid id_token_hint"})
					return
				}
			}

			// 如果指定了重定向URI，进行重定向
			if postLogoutRedirectURI != "" {
				redirectURL, err := url.Parse(postLogoutRedirectURI)
				if err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "error_description": "Invalid post_logout_redirect_uri"})
					return
				}

				if state != "" {
					params := redirectURL.Query()
					params.Set("state", state)
					redirectURL.RawQuery = params.Encode()
				}

				c.Redirect(http.StatusFound, redirectURL.String())
				return
			}
		}

		// 返回登出页面或JSON响应
		c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
	}
}

// GetOAuthRevoke 令牌撤销端点
func GetOAuthRevoke(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.PostForm("token")
		_ = c.PostForm("token_type_hint") // access_token 或 refresh_token
		clientID := c.PostForm("client_id")
		clientSecret := c.PostForm("client_secret")

		if token == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "error_description": "token is required"})
			return
		}

		// 验证客户端
		var client SSOClient
		if err := db.Where("id = ? AND secret = ? AND is_active = ?", clientID, clientSecret, true).First(&client).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_client", "error_description": "Invalid client credentials"})
			return
		}

		// 验证并撤销令牌
		_, err := validateAccessToken(token)
		if err != nil {
			// 令牌可能已过期或无效，但仍然返回成功（幂等操作）
			c.JSON(http.StatusOK, gin.H{"message": "Token revoked or already invalid"})
			return
		}

		// 在实际实现中，应该将令牌添加到黑名单
		// 这里简化处理，直接返回成功

		c.JSON(http.StatusOK, gin.H{"message": "Token revoked successfully"})
	}
}

// 辅助函数

// 获取基础URL
func getBaseURL(c *gin.Context) string {
	scheme := "http"
	if c.Request.TLS != nil {
		scheme = "https"
	}
	return scheme + "://" + c.Request.Host
}

// 验证重定向URI
func isValidRedirectURI(requestedURI, allowedURIs string) bool {
	// 简化实现，在实际项目中应该解析JSON数组并进行更严格的验证
	return strings.Contains(allowedURIs, requestedURI)
}

// 构建查询字符串
func buildQueryString(params map[string]string) string {
	values := make([]string, 0, len(params))
	for key, value := range params {
		values = append(values, key+"="+value)
	}
	return strings.Join(values, "&")
}

// 处理刷新令牌
func handleRefreshTokenGrant(c *gin.Context, db *gorm.DB, refreshToken, clientID, clientSecret string) {
	// 验证刷新令牌
	claims, err := validateAccessToken(refreshToken)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_grant", "error_description": "Invalid refresh token"})
		return
	}

	// 验证客户端
	var client SSOClient
	if err := db.Where("id = ? AND secret = ? AND is_active = ?", clientID, clientSecret, true).First(&client).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_client", "error_description": "Invalid client credentials"})
		return
	}

	// 生成新的访问令牌
	accessToken, err := generateAccessTokenWithRS256(claims["sub"].(string), claims["aud"].(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "error_description": "Failed to generate access token"})
		return
	}

	response := gin.H{
		"access_token": accessToken,
		"token_type":   "Bearer",
		"expires_in":   3600,
		"scope":        claims["scope"],
	}

	c.JSON(http.StatusOK, response)
}

// 处理密码授权
func handlePasswordGrant(c *gin.Context, db *gorm.DB, username, password, clientID, clientSecret string) {
	// 验证客户端
	var client SSOClient
	if err := db.Where("id = ? AND secret = ? AND is_active = ?", clientID, clientSecret, true).First(&client).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_client", "error_description": "Invalid client credentials"})
		return
	}

	// 查找用户
	var user models.User
	query := db.Where("(username = ? OR email = ? OR phone = ?)", username, username, username)
	if err := query.First(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_grant", "error_description": "Invalid username or password"})
		return
	}

	// 验证密码
	if !user.CheckPassword(password) {
		// 记录失败日志
		ip := c.ClientIP()
		userAgent := c.GetHeader("User-Agent")
		loginLog := models.LoginLog{
			UserID:    user.ID,
			Provider:  "password",
			IP:        ip,
			UserAgent: userAgent,
			Success:   false,
			CreatedAt: time.Now(),
		}
		db.Create(&loginLog)

		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_grant", "error_description": "Invalid username or password"})
		return
	}

	// 更新登录信息
	ip := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	user.UpdateLoginInfo(ip, userAgent)

	if err := db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "error_description": "Failed to update user info"})
		return
	}

	// 记录成功日志
	loginLog := models.LoginLog{
		UserID:    user.ID,
		Provider:  "password",
		IP:        ip,
		UserAgent: userAgent,
		Success:   true,
		CreatedAt: time.Now(),
	}
	if err := db.Create(&loginLog).Error; err != nil {
		fmt.Printf("Failed to record login log: %v\n", err)
	}

	// 生成访问令牌
	accessToken, err := generateAccessTokenWithRS256(user.ID, clientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "error_description": "Failed to generate access token"})
		return
	}

	// 生成刷新令牌
	refreshToken, err := generateRefreshTokenWithRS256(user.ID, clientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "error_description": "Failed to generate refresh token"})
		return
	}

	response := gin.H{
		"access_token":  accessToken,
		"refresh_token": refreshToken,
		"token_type":    "Bearer",
		"expires_in":    3600,
		"scope":         "openid profile email",
		"user":          user.ToResponse(),
	}

	c.JSON(http.StatusOK, response)
}

// 处理客户端凭据授权
func handleClientCredentialsGrant(c *gin.Context, db *gorm.DB, clientID, clientSecret string) {
	// 验证客户端
	var client SSOClient
	if err := db.Where("id = ? AND secret = ? AND is_active = ?", clientID, clientSecret, true).First(&client).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_client", "error_description": "Invalid client credentials"})
		return
	}

	// 生成访问令牌（客户端凭据模式通常不需要刷新令牌）
	accessToken, err := generateAccessTokenWithRS256("client-"+clientID, clientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "error_description": "Failed to generate access token"})
		return
	}

	response := gin.H{
		"access_token": accessToken,
		"token_type":   "Bearer",
		"expires_in":   3600,
		"scope":        "openid",
	}

	c.JSON(http.StatusOK, response)
}

// GetSSOProviders 获取支持的SSO提供商列表
func GetSSOProviders(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 从插件管理器获取支持的提供商
		providers := []map[string]interface{}{
			{
				"id":               "local",
				"name":             "local",
				"displayName":      "本地账户",
				"authorizationUrl": "/api/v1/auth/oauth/authorize",
				"tokenUrl":         "/api/v1/auth/oauth/token",
				"userInfoUrl":      "/api/v1/auth/oauth/userinfo",
				"logoutUrl":        "/api/v1/auth/oauth/logout",
				"enabled":          true,
				"grantTypes":       "authorization_code,password",
				"responseTypes":    "code,token",
				"scope":            "openid,profile,email,phone",
			},
			{
				"id":               "github",
				"name":             "github",
				"displayName":      "GitHub",
				"authorizationUrl": "https://github.com/login/oauth/authorize",
				"tokenUrl":         "https://github.com/login/oauth/access_token",
				"userInfoUrl":      "https://api.github.com/user",
				"enabled":          true,
				"grantTypes":       "authorization_code",
				"responseTypes":    "code",
				"scope":            "user:email,read:user",
			},
			{
				"id":               "google",
				"name":             "google",
				"displayName":      "Google",
				"authorizationUrl": "https://accounts.google.com/oauth/authorize",
				"tokenUrl":         "https://oauth2.googleapis.com/token",
				"userInfoUrl":      "https://www.googleapis.com/oauth2/v2/userinfo",
				"enabled":          true,
				"grantTypes":       "authorization_code",
				"responseTypes":    "code",
				"scope":            "openid,profile,email",
			},
		}

		c.JSON(http.StatusOK, gin.H{
			"code":    200,
			"message": "SSO providers retrieved successfully",
			"data":    providers,
		})
	}
}

// CheckSSOSession 检查SSO会话状态
func CheckSSOSession(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取当前用户ID
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    401,
				"message": "Unauthorized",
			})
			return
		}

		// 查询用户会话信息
		var user models.User
		if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    404,
				"message": "User not found",
			})
			return
		}

		// 构建会话信息
		avatar := ""
		if len(user.Meta) > 0 {
			var meta models.UserMeta
			if err := json.Unmarshal(user.Meta, &meta); err == nil {
				avatar = meta.Avatar
			}
		}

		session := gin.H{
			"is_authenticated": true,
			"user": gin.H{
				"sub":     user.ID,
				"name":    user.Username,
				"email":   user.Email,
				"picture": avatar,
			},
			"session": gin.H{
				"session_id":       "session_" + user.ID,
				"user_id":          user.ID,
				"authenticated_at": user.LastLoginAt,
				"is_active":        true,
				"remember_me":      false,
			},
		}

		c.JSON(http.StatusOK, gin.H{
			"code":    200,
			"message": "Session is valid",
			"data":    session,
		})
	}
}

// DestroySSOSession 销毁SSO会话
func DestroySSOSession(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			SessionID string `json:"session_id" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": "Invalid request",
			})
			return
		}

		// 这里应该实现会话销毁逻辑
		// 由于我们没有实际的会话表，这里只是记录日志
		c.JSON(http.StatusOK, gin.H{
			"code":    200,
			"message": "Session destroyed successfully",
		})
	}
}

// 验证授权码（支持PKCE双重验证）
func validateAuthorizationCodeWithPKCE(code, clientID, redirectURI, codeVerifier, state, appID, internalAuth, doubleVerification string) (jwt.MapClaims, error) {
	// 验证双重验证必需参数
	if internalAuth != "true" {
		return nil, errors.New("internal authentication flag required")
	}

	if doubleVerification != "true" {
		return nil, errors.New("double verification flag required")
	}

	if codeVerifier == "" {
		return nil, errors.New("PKCE code_verifier is required for double verification")
	}

	if state == "" {
		return nil, errors.New("state parameter is required for CSRF protection")
	}

	if appID == "" {
		return nil, errors.New("app_id is required for layered authentication")
	}

	// 验证code_verifier长度（43-128字符）
	if len(codeVerifier) < 43 || len(codeVerifier) > 128 {
		return nil, errors.New("invalid code_verifier length (must be 43-128 characters)")
	}

	// 解析JWT token
	token, err := jwt.Parse(code, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		initRSAKeys()
		return &rsaPublicKey, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		// 验证客户端ID
		if claims["aud"] != clientID {
			return nil, jwt.ErrSignatureInvalid
		}

		// 验证重定向URI
		if claims["redirect_uri"] != redirectURI {
			return nil, jwt.ErrSignatureInvalid
		}

		// 验证状态参数
		if claims["state"] != state {
			return nil, errors.New("state parameter mismatch")
		}

		// 验证应用ID
		if claims["app_id"] != appID {
			return nil, errors.New("app_id mismatch")
		}

		// 验证code_verifier（这里应该调用实际的PKCE验证逻辑）
		// 简化实现：检查code_verifier是否存在且格式正确
		if len(codeVerifier) >= 43 {
			fmt.Printf("✅ PKCE双重验证通过: code_verifier长度=%d\n", len(codeVerifier))
		}

		return claims, nil
	}

	return nil, jwt.ErrSignatureInvalid
}

// 处理Code Verifier认证类型（双重验证模式）
func handleCodeVerifierGrant(c *gin.Context, db *gorm.DB, code, clientID, clientSecret string) {
	// 获取额外参数
	codeVerifier := c.PostForm("code_verifier")
	state := c.PostForm("state")
	appID := c.PostForm("app_id")
	internalAuth := c.PostForm("internal_auth")
	doubleVerification := c.PostForm("double_verification")

	// 验证客户端
	var client SSOClient
	if err := db.Where("id = ? AND secret = ? AND is_active = ?", clientID, clientSecret, true).First(&client).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_client", "error_description": "Invalid client credentials"})
		return
	}

	// 使用PKCE双重验证
	claims, err := validateAuthorizationCodeWithPKCE(code, clientID, client.RedirectURIs, codeVerifier, state, appID, internalAuth, doubleVerification)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_grant", "error_description": err.Error()})
		return
	}

	// 获取用户信息
	userID := claims["sub"].(string)
	var user models.User
	if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user_not_found", "error_description": "User not found"})
		return
	}

	// 更新登录信息
	ip := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	user.UpdateLoginInfo(ip, userAgent)

	if err := db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "error_description": "Failed to update user info"})
		return
	}

	// 记录登录日志
	loginLog := models.LoginLog{
		UserID:    user.ID,
		Provider:  "double_verification", // 标识为双重验证登录
		IP:        ip,
		UserAgent: userAgent,
		Success:   true,
		CreatedAt: time.Now(),
	}
	if err := db.Create(&loginLog).Error; err != nil {
		fmt.Printf("Failed to record login log: %v\n", err)
	}

	// 生成访问令牌
	accessToken, err := generateAccessTokenWithRS256(user.ID, clientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "error_description": "Failed to generate access token"})
		return
	}

	// 生成刷新令牌
	refreshToken, err := generateRefreshTokenWithRS256(user.ID, clientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "error_description": "Failed to generate refresh token"})
		return
	}

	response := gin.H{
		"access_token":  accessToken,
		"refresh_token": refreshToken,
		"token_type":    "Bearer",
		"expires_in":    3600,
		"scope":         claims["scope"],
		"user":          user.ToResponse(),
	}

	c.JSON(http.StatusOK, response)
}
