package handlers

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/subtle"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"log"
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

// 声明结构
type RS256TokenClaims struct {
	ClientID         string `json:"client_id"`
	UserID           string `json:"user_id"`
	Role             string `json:"role"`
	AppID            string `json:"app_id,omitempty"`
	Email            string `json:"email"`
	LocalUserID      string `json:"local_user_id,omitempty"`
	Lid              string `json:"lid,omitempty"`
	RegisteredClaims jwt.RegisteredClaims
	User             *models.User
	// Req              models.UnifiedOAuthLoginRequest
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

// OAuthTokenRequest OAuth 2.0令牌请求结构体
type OAuthTokenRequest struct {
	GrantType          string `json:"grant_type" binding:"required"`
	Code               string `json:"code,omitempty"`
	RedirectURI        string `json:"redirect_uri,omitempty"`
	ClientID           string `json:"client_id,omitempty"`
	ClientSecret       string `json:"client_secret,omitempty"`
	RefreshToken       string `json:"refresh_token,omitempty"`
	Username           string `json:"username,omitempty"`
	Password           string `json:"password,omitempty"`
	CodeVerifier       string `json:"code_verifier,omitempty"`
	State              string `json:"state,omitempty"`
	AppID              string `json:"app_id,omitempty"`
	InternalAuth       string `json:"internal_auth,omitempty"`
	DoubleVerification string `json:"double_verification,omitempty"`
}

// OAuthLogoutRequest OAuth 2.0登出请求结构体
type OAuthLogoutRequest struct {
	IdTokenHint           string `json:"id_token_hint,omitempty"`
	PostLogoutRedirectURI string `json:"post_logout_redirect_uri,omitempty"`
	State                 string `json:"state,omitempty"`
}

// OAuthRevokeRequest OAuth 2.0令牌撤销请求结构体
type OAuthRevokeRequest struct {
	Token         string `json:"token" binding:"required"`
	TokenTypeHint string `json:"token_type_hint,omitempty"`
	ClientID      string `json:"client_id,omitempty"`
	ClientSecret  string `json:"client_secret,omitempty"`
}

// LogoutParams 登出请求参数结构体
type LogoutParams struct {
	IdTokenHint           string `json:"id_token_hint,omitempty"`
	PostLogoutRedirectURI string `json:"post_logout_redirect_uri,omitempty"`
	State                 string `json:"state,omitempty"`
}

// 全局RSA密钥对
var (
	rsaPrivateKey *rsa.PrivateKey
	rsaPublicKey  *rsa.PublicKey
	jwkSet        *JWKSet
)

const private = `
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAnDBkAtd9b/mpIgWLPmxCXHJUNZrQF2+ofiFM/xL/VNHXRxxt
yepSjUwIPQsp91N6sf9z38qQwE16Xo/hj2AIeP4dZ7zkyPk6YEjhzHf5rgeczl0w
SBap415CF6BwH5d+2qhSeMj9HuiRVlHAM3yBjgsUU+Tf4UPlKIEsXaYsGHwsqu5i
AmyfB8DlGz1b5IeSv5NA+/r2S2SjewanUDvxeecsc7/aeB9uzNNzoU9F+CgDyPcB
+tBej0fJn6egHKMNFsNHfPQ3HHDqZ9mdi4EOBgswSH4WMB3e6TqJsfJJ1nbZCbWy
3a6RswnPbd9HGt/4paHLIkJFXNbLpZuvYQW9cwIDAQABAoIBAH7xzbeJkYg7ML5Y
Jy5bKyycN9lBtLP3qsipJD2FIUW9L+26K3mbG/F/xIpo0nkUvnqBl5pit3e1ASpu
YvP3J6u/TgMMwh6eglXTpsJbGPHbehU4JI/S683CxJETc04aAZ6ShEVrhl9iww2X
cFHodhwO4Ty2n0gluNFM+9Q5xUk4Doj7TygcpJPpMzEBonUHo/9vptt/IcpqBMDU
iGGra609dCVfIv/lBlByCRz/IgMLLdNqrpe0VSMdRruGzK7aG6JbzDTo4uGiNO3q
YcyzaW/wR28EkXy/XcMqjU26AmLJ83VX8l7SOLY/WZk9Uc+gB+9IdwObAybBjrMC
3TeRtoECgYEAwLBvijLzVcYqydieOeu0UI9uoEcnGB/96U3LMde24RK+OUMDLCXv
bqhMkmQGwyUfk8LrQNETr1xK8V+HyDCylr++QcZnSgZ2LWYJKGLs2ujT7N4KQSqp
uhvVoQSUoP5J41MHLM6+89Iz53vCUlfcsDvn3/8zEE7PyoUmGFXLCJMCgYEAz4HV
yLtWWjMheiZ2tOZelN3RG0Pik+12KxiR0W3Z7FNQqR/6F1GtjaLH1Mbv/O+iCQvD
QAqW20h4A+8MW8+5UKrvsLWmvFcYr+BWqeUk2h5VDesGPeIk6wfkYf2aBfGZHUfR
dxQ10P5L5U8nd3t1+hsxdB6AzMEvPlCeRHk546ECgYBXrPBTtbM7CBxYE5SLTlCR
h3ISw81qEMR778XRPBIef2TGsVM0N16mvzV4NsNM8AtaNIrOx1Npq1j+UzV5RY89
QKnVS+2bpS0IozDvi3Oyd9ZWJQINfNgVsqyVw3vNdWcxZIoTPU9tqeusHIfi58+m
8Nsk9P3LIdEymTsoP4FOuQKBgCSVPT1wWZ75WLOSSGdIHfCc0pq98xolSSn74OlN
NphFb/kBHDQ0QCayRgyrLfAnxydVHY0S0NnEAvSelk0xZ/hiynMa81RM/pszL9Qw
A7k4k8IqZyVN0zhkYc0sypS1rUrOOI2H0J0R2AuLUufrqjb3yFYycn6mqE+SIvTr
cltBAoGBAK7x6WWWj/dzM+ivMaP4v2YsxYSPPeMLxRM6YHw8Ov8cGlz54PBuRBGm
jde230ENBVWeegZDSwuqSa0CgTS3OaCJzPNkCl51BggLcFmG8amlmggLjwIywOTZ
XpXRWk9F4IFu+EooLd9miwv3JFfyV8p0Z4Kr3GINTypBD7A85YIV
-----END RSA PRIVATE KEY-----
`

const public = `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnDBkAtd9b/mpIgWLPmxC
XHJUNZrQF2+ofiFM/xL/VNHXRxxtyepSjUwIPQsp91N6sf9z38qQwE16Xo/hj2AI
eP4dZ7zkyPk6YEjhzHf5rgeczl0wSBap415CF6BwH5d+2qhSeMj9HuiRVlHAM3yB
jgsUU+Tf4UPlKIEsXaYsGHwsqu5iAmyfB8DlGz1b5IeSv5NA+/r2S2SjewanUDvx
eecsc7/aeB9uzNNzoU9F+CgDyPcB+tBej0fJn6egHKMNFsNHfPQ3HHDqZ9mdi4EO
BgswSH4WMB3e6TqJsfJJ1nbZCbWy3a6RswnPbd9HGt/4paHLIkJFXNbLpZuvYQW9
cwIDAQAB
-----END PUBLIC KEY-----
`

// 初始化RSA密钥对
func initRSAKeys() {
	if rsaPrivateKey != nil && rsaPublicKey != nil {
		return
	}
	// os.Getenv("RSA_PRIVATE_KEY")
	// 尝试从环境变量加载私钥
	if privateKeyPEM := private; privateKeyPEM != "" {
		block, _ := pem.Decode([]byte(privateKeyPEM))
		if block != nil && block.Type == "RSA PRIVATE KEY" {
			var err error
			rsaPrivateKey, err = x509.ParsePKCS1PrivateKey(block.Bytes)
			if err == nil {
				rsaPublicKey = &rsaPrivateKey.PublicKey
				generateJWKSet()
				fmt.Println("🔐 RSA密钥对从环境变量加载成功")
				return
			} else {
				fmt.Printf("❌ 从环境变量解析RSA私钥失败: %v\n", err)
			}
		} else {
			log.Println("不符合规则")
		}
	}

	// 生成新的RSA密钥对
	var err error
	rsaPrivateKey, err = rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		panic("Failed to generate RSA key pair: " + err.Error())
	}

	rsaPublicKey = &rsaPrivateKey.PublicKey

	// 输出新生成的RSA密钥对（PEM格式）
	fmt.Println("🔐 生成了新的RSA密钥对，请保存以下密钥：")
	fmt.Println("========================================")
	fmt.Println("")

	// 输出私钥PEM
	privateKeyPEM := exportRSAPrivateKeyAsPEM(rsaPrivateKey)
	fmt.Println("RSA Private Key (保存为 .pem 文件):")
	fmt.Println("-------------------------------------")
	fmt.Println(privateKeyPEM)
	fmt.Println("")

	// 输出公钥PEM
	publicKeyPEM := exportRSAPublicKeyAsPEM(rsaPublicKey)
	fmt.Println("RSA Public Key (保存为 .pem 文件):")
	fmt.Println("------------------------------------")
	fmt.Println(publicKeyPEM)
	fmt.Println("")

	// 输出环境变量格式（便于配置）
	fmt.Println("环境变量配置:")
	fmt.Println("--------------")
	fmt.Println("RSA_PRIVATE_KEY=" + privateKeyPEM)
	fmt.Println("")
	fmt.Println("注意：请将私钥内容设置为环境变量 RSA_PRIVATE_KEY 的值")
	fmt.Println("========================================")

	generateJWKSet()
	fmt.Println("✅ RSA密钥对生成和输出完成")
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

func getScheme(c *gin.Context) string {
	if c.Request.TLS != nil {
		return "https"
	}
	if scheme := c.GetHeader("X-Forwarded-Proto"); scheme != "" {
		return scheme
	}
	return "http"
}

func getHost(c *gin.Context) string {
	return c.Request.Host
}

func getFullURL(c *gin.Context, includeQueryString bool) string {
	scheme := getScheme(c)
	host := getHost(c)

	var path string
	if includeQueryString {
		path = c.Request.URL.String() // 包含 Query String
	} else {
		path = c.Request.URL.Path // 不包含 Query String
	}

	return fmt.Sprintf("%s://%s%s", scheme, host, path)
}

func GetToken(c *gin.Context) string {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		return ""
	}
	return strings.TrimPrefix(authHeader, "Bearer ")
}

// GetSessionIDFromCookie 从 cookie 中获取 sso_session_id
func GetSessionIDFromCookie(c *gin.Context) string {
	// 首先尝试从请求头获取
	sessionID := c.GetHeader("sso_session_id")
	if sessionID != "" {
		return sessionID
	}

	// 尝试从 cookie 中获取
	cookie, err := c.Cookie("sso_session_id")
	if err == nil && cookie != "" {
		return cookie
	}

	return ""
}

// GetOAuthAuthorize OAuth 2.0授权端点
func GetOAuthAuthorize(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		//
		clientID := c.Query("client_id")
		redirectURI := c.Query("redirect_uri")
		responseType := c.Query("response_type")
		scope := c.Query("scope")
		appId := c.Query("app_id")
		state := c.Query("state")
		codeChallenge := c.Query("code_challenge")
		codeChallengeMethod := c.Query("code_challenge_method")

		sessionID := c.Query("session_id")

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
		// 这个需要在客户端中进行注册。
		// 目前appid=temp1
		// RedirectURIs
		if err := db.Where("id = ? AND is_active = ?", clientID, true).First(&client).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_client", "error_description": "Invalid client"})
			return
		}

		// 验证重定向URI
		if !isValidRedirectURI(redirectURI, client.RedirectURIs) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "error_description": "Invalid redirect URI"})
			return
		}

		// 首先尝试从 cookie 中获取 sso_session_id
		sessionID = GetSessionIDFromCookie(c)
		if sessionID == "" {
			log.Println("No sso_session_id found in cookie, user not logged in")
			// 保存授权请求参数到session
			sessionData := map[string]string{
				"client_id":             clientID,
				"redirect_uri":          redirectURI,
				"scope":                 scope,
				"app_id":                appId,
				"state":                 state,
				"code_challenge":        codeChallenge,
				"code_challenge_method": codeChallengeMethod,
			}
			// 这里应该重定向到登录页面，携带这些参数
			log.Println("Redirecting to login page with parameters:", sessionData, getFullURL(c, true))
			c.Redirect(http.StatusFound, "http://localhost:3033?app_origin=true&redirect_uri="+getFullURL(c, true))
			return
		}

		log.Println("Found sso_session_id:", sessionID)

		// 根据 session ID 查询 sso_sessions 表
		var ssoSession models.SSOSession
		if err := db.Where("id = ? AND status = ? AND expires_at > ?",
			sessionID, "active", time.Now()).First(&ssoSession).Error; err != nil {
			log.Printf("Session not found or expired: %v", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_session", "error_description": "Session not found or expired"})
			return
		}

		log.Printf("Found active session for user: %s", ssoSession.UserID)

		// 从 session 中获取用户信息
		var user models.User
		if err := db.Where("id = ?", ssoSession.UserID).First(&user).Error; err != nil {
			log.Printf("User not found: %v", err)
			c.JSON(http.StatusNotFound, gin.H{"error": "user_not_found", "error_description": "User not found"})
			return
		}

		log.Printf("User authenticated: %s (%s)", user.Username, user.ID)
		userID := user.ID

		// 用户已登录，生成授权码
		authorizationCode := generateAuthorizationCode(clientID, userID, redirectURI, scope, codeChallenge, codeChallengeMethod)

		// 保存授权码到数据库（支持设备去重）
		expiresAt := time.Now().Add(10 * time.Minute) // 10分钟过期，与授权码一致
		ip := c.ClientIP()
		userAgent := c.GetHeader("User-Agent")

		// 生成设备指纹（没有前端传递的 DeviceID，使用 User-Agent）
		deviceFingerprint := generateDeviceFingerprint(userAgent, ip, "")

		// 查找是否已存在该设备+子应用的 session
		var appSession models.SSOSession
		err := db.Where("user_id = ? AND client_id = ? AND device_fingerprint = ? AND status = ?",
			userID, clientID, deviceFingerprint, "active").
			First(&appSession).Error

		if err == gorm.ErrRecordNotFound {
			// 子应用还没有 session，创建一个
			sessionID = uuid.New().String()
			appSession = models.SSOSession{
				ID:                  sessionID,
				UserID:              userID,
				ClientID:            clientID,
				DeviceFingerprint:   deviceFingerprint,
				AuthorizationCode:   authorizationCode,
				CodeChallenge:       codeChallenge,
				CodeChallengeMethod: codeChallengeMethod,
				RedirectURI:         redirectURI,
				Scope:               scope,
				State:               state,
				Used:                false,
				Status:              "active",
				ExpiresAt:           expiresAt,
				LastActivity:        time.Now(),
				UserAgent:           userAgent,
				IPAddress:           ip,
				CurrentAppID:        appId,
			}

			if err := models.CreateSSOSession(db, &appSession); err != nil {
				fmt.Printf("❌ Failed to create app session: %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "error_description": "Failed to save authorization code"})
				return
			}

			fmt.Printf("✅ 为子应用创建session: %s (device=%s)\n", sessionID, deviceFingerprint[:8]+"...")
		} else if err != nil {
			// 数据库错误
			fmt.Printf("❌ 查询已有session失败: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "error_description": "Failed to query session"})
			return
		} else {
			// 已存在，更新授权码信息
			sessionID = appSession.ID
			appSession.AuthorizationCode = authorizationCode
			appSession.CodeChallenge = codeChallenge
			appSession.CodeChallengeMethod = codeChallengeMethod
			appSession.RedirectURI = redirectURI
			appSession.Scope = scope
			appSession.State = state
			appSession.Used = false
			appSession.ExpiresAt = expiresAt
			appSession.LastActivity = time.Now()
			appSession.CurrentAppID = appId
			appSession.IPAddress = ip
			appSession.UserAgent = userAgent

			if err := db.Save(&appSession).Error; err != nil {
				fmt.Printf("❌ Failed to update app session: %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "error_description": "Failed to update authorization code"})
				return
			}

			fmt.Printf("✅ 更新子应用session: %s (device=%s)\n", sessionID, deviceFingerprint[:8]+"...")
		}

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
	// 生成短的授权码（限制在100字符以内）
	// 使用时间戳 + 用户ID + 客户端ID + 随机数生成唯一码
	timestamp := time.Now().UnixNano()
	randomBytes := make([]byte, 8)
	if _, err := rand.Read(randomBytes); err != nil {
		panic("Failed to generate random bytes: " + err.Error())
	}

	// 构建基础数据
	baseData := fmt.Sprintf("%s:%s:%s:%d:%x", userID, clientID, redirectURI, timestamp, randomBytes)

	// 添加PKCE信息（如果有）
	if codeChallenge != "" && codeChallengeMethod != "" {
		baseData += ":" + codeChallenge + ":" + codeChallengeMethod
	}

	// 生成SHA256哈希
	hash := sha256.Sum256([]byte(baseData))

	// 取前64位作为授权码（64个字符，远小于100字符限制）
	authorizationCode := hex.EncodeToString(hash[:8]) // 16个字符

	// 如果需要更长的码，可以使用base64编码
	// authorizationCode := base64.URLEncoding.EncodeToString(hash[:12]) // 16个字符

	// 为了更好的唯一性，添加时间戳前缀（总共24个字符）
	timestampStr := fmt.Sprintf("%x", timestamp%1000000) // 取最后6位（6个字符）
	authorizationCode = timestampStr + authorizationCode

	return authorizationCode
}

// GetOAuthToken OAuth 2.0令牌端点
func GetOAuthToken(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req OAuthTokenRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":             "invalid_request",
				"error_description": "Request body must be valid JSON",
			})
			return
		}

		switch req.GrantType {
		case "authorization_code":
			handleAuthorizationCodeGrant(c, db, req.Code, req.RedirectURI, req.ClientID, req.ClientSecret, req)
		case "refresh_token":
			handleRefreshTokenGrant(c, db, req)
		case "password":
			handlePasswordGrant(c, db, req.Username, req.Password, req.ClientID, req.ClientSecret)
		case "code_verifier":
			// 双重验证模式：使用code_verifier进行内部认证
			handleCodeVerifierGrant(c, db, req.Code, req.ClientID, req.ClientSecret, req)
		case "client_credentials":
			handleClientCredentialsGrant(c, db, req.ClientID, req.ClientSecret)
		default:
			c.JSON(http.StatusBadRequest, gin.H{
				"error":             "unsupported_grant_type",
				"error_description": "The grant type is not supported",
			})
		}
	}
}

// 处理授权码换令牌 - 统一双重验证模式
func handleAuthorizationCodeGrant(c *gin.Context, db *gorm.DB, code, redirectURI, clientID, clientSecret string, req OAuthTokenRequest) {
	// 获取额外参数用于双重验证
	codeVerifier := req.CodeVerifier
	state := req.State
	appID := req.AppID
	internalAuth := req.InternalAuth
	doubleVerification := req.DoubleVerification

	// 验证客户端
	var client SSOClient
	if err := db.Where("id = ? AND secret = ? AND is_active = ?", clientID, clientSecret, true).First(&client).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_client", "error_description": "Invalid client credentials"})
		return
	}

	// 检测是否是双重验证模式
	if internalAuth == "true" && doubleVerification == "true" {
		// 双重验证模式：验证授权码 + PKCE code_verifier
		// 这里签发的code又问题。不是jwt格式的code。
		claims, err := validateAuthorizationCodeWithPKCE(db, code, clientID, redirectURI, codeVerifier, state, appID, internalAuth, doubleVerification)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_grant", "error_description": err.Error()})
			return
		}
		generateTokensFromClaims(c, db, claims, clientID, clientSecret, "double_verification", req)
	} else {
		// 标准OIDC模式：验证授权码（从数据库）
		claims, err := validateAuthorizationCode(db, code, clientID, redirectURI)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_grant", "error_description": err.Error()})
			return
		}

		// 获取session ID用于标记为已使用
		var ssoSession models.SSOSession
		if err := db.Where("authorization_code = ? AND client_id = ?", code, clientID).First(&ssoSession).Error; err == nil {
			// 标记授权码为已使用
			if err := models.MarkSSOSessionAsUsed(db, ssoSession.ID); err != nil {
				fmt.Printf("Failed to mark authorization code as used: %v\n", err)
			} else {
				fmt.Printf("✅ 授权码已标记为已使用，Session ID: %s\n", ssoSession.ID)
			}
		}

		generateTokensFromClaims(c, db, claims, clientID, clientSecret, "authorization_code", req)
	}
}

// generateTokensFromClms 从JWT声明生成令牌
func generateTokensFromClaims(c *gin.Context, db *gorm.DB, claims jwt.MapClaims, clientID, clientSecret, grantType string, req OAuthTokenRequest) {
	// 获取用户信息
	sub, ok := claims["sub"].(string)
	sessionID := claims["jti"].(string)
	sessionExpiresAt := claims["exp"].(int64)
	lastActivity := claims["iat"].(int64)

	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "error_description": "Invalid user ID in token"})
		return
	}
	userID := sub

	var user models.User
	if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user_not_found", "error_description": "User not found"})
		return
	}

	// 更新登录信息
	ip := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	user.UpdateLoginInfo(ip, userAgent)

	// 子应用web请求接口，中间件监测到token已经过期，需要重新生成token，告诉前端重新请求新的token

	// 保存到数据库
	if err := db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "error_description": "Failed to update user info"})
		return
	}

	// // 记录登录日志
	loginLog := models.LoginLog{
		UserID:    user.ID,
		Provider:  grantType,
		IP:        ip,
		UserAgent: userAgent,
		Success:   true,
		CreatedAt: time.Now(),
	}
	if err := db.Create(&loginLog).Error; err != nil {
		fmt.Printf("Failed to record login log: %v\n", err)
	}

	localID := ""
	if req.AppID != "" {
		var pm models.ProjectMapping
		if err := db.Where("project_name = ? AND user_id = ?", req.AppID, user.ID).First(&pm).Error; err == nil {
			localID = pm.LocalUserID
		}
	}

	now := time.Now()
	allJWTDatas := &RS256TokenClaims{
		ClientID:    clientID,
		UserID:      user.ID,
		Email:       *user.Email,
		Role:        user.Role,
		AppID:       req.AppID,
		LocalUserID: localID,
		Lid:         localID,
		// Req:         req,

		User: &user,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(config.AppConfig.JWTExpiration) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    os.Getenv("JWT_ISS"),
			ID:        uuid.New().String(),
		},
	}

	// // 生成访问令牌
	accessToken, err := GenerateAccessTokenWithRS256(allJWTDatas)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "error_description": "Failed to generate access token"})
		return
	}

	// // 生成刷新令牌
	refreshToken, err := GenerateRefreshTokenWithRS256(user.ID, clientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "error_description": "Failed to generate refresh token"})
		return
	}

	calculateAccessTokenHash := calculateTokenHash(accessToken)
	calculateRefreshTokenHash := calculateTokenHash(refreshToken)

	// 更新session中的tokenhash
	if err := db.Model(&models.SSOSession{}).Where("id = ?", sessionID).Update("current_access_token_hash", calculateAccessTokenHash).Update("refresh_token_hash", calculateRefreshTokenHash).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "error_description": "Failed to update session token hash"})
		return
	}
	// // 返回OAuth 2.0标准响应
	response := gin.H{
		"access_token":  accessToken,
		"id_token":      accessToken,
		"refresh_token": refreshToken,
		"token_type":    "Bearer",
		"expires_in":    3600,
		"scope":         "openid profile email phone",
		"user":          user.ToResponse(),
		"provider":      "centralized",
		"session_id":    sessionID,
		"session_info": gin.H{
			"session_id":     sessionID,
			"start_time":     time.Now(),
			"last_activity":  lastActivity,
			"expires_at":     sessionExpiresAt,
			"current_app_id": req.AppID,
			"events":         []string{"login"},
		},
	}

	c.JSON(http.StatusOK, response)
}

// validateAuthorizationCode 验证标准OAuth 2.0授权码（从数据库）
func validateAuthorizationCode(db *gorm.DB, code, clientID, redirectURI string) (jwt.MapClaims, error) {
	// 首先从数据库查找授权码
	var ssoSession models.SSOSession
	if err := db.Where("authorization_code = ? AND client_id = ? AND used = ? AND expires_at > ?",
		code, clientID, false, time.Now()).First(&ssoSession).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("authorization code not found or expired")
		}
		return nil, fmt.Errorf("database error: %v", err)
	}

	// 验证重定向URI
	if ssoSession.RedirectURI != redirectURI {
		return nil, errors.New("redirect URI mismatch")
	}

	// 验证会话状态
	if ssoSession.Status != "active" {
		return nil, errors.New("authorization code is not active")
	}

	// 由于新授权码格式不包含JWT声明，我们需要从数据库记录中构建声明
	claims := jwt.MapClaims{
		"sub":          ssoSession.UserID,
		"aud":          clientID,
		"iss":          config.AppConfig.ServerHost,
		"exp":          ssoSession.ExpiresAt.Unix(),
		"iat":          ssoSession.LastActivity.Unix(),
		"jti":          ssoSession.ID, // 使用session ID作为JWT ID
		"redirect_uri": ssoSession.RedirectURI,
		"scope":        ssoSession.Scope,
	}

	// 如果有PKCE信息，添加到声明中
	if ssoSession.CodeChallenge != "" {
		claims["code_challenge"] = ssoSession.CodeChallenge
		claims["code_challenge_method"] = ssoSession.CodeChallengeMethod
	}

	return claims, nil
}

// GenerateAccessTokenWithRS256 生成RSA签名的访问令牌（导出供其他包使用）
func GenerateAccessTokenWithRS256(allJWTDatas *RS256TokenClaims) (string, error) {
	initRSAKeys()

	// 确保RSA私钥已初始化
	if rsaPrivateKey == nil {
		return "", fmt.Errorf("RSA private key is not initialized")
	}

	claims := jwt.MapClaims{
		"iss": os.Getenv("JWT_ISS"),
		"sub": allJWTDatas.UserID,
		"aud": allJWTDatas.ClientID,
		// jwt.NewNumericDate(now.Add(time.Duration(config.AppConfig.JWTExpiration) * time.Hour))
		"exp":           allJWTDatas.RegisteredClaims.ExpiresAt.Unix(),
		"iat":           allJWTDatas.RegisteredClaims.IssuedAt.Unix(),
		"jti":           allJWTDatas.RegisteredClaims.ID,
		"local_user_id": allJWTDatas.LocalUserID,
		"lid":           allJWTDatas.Lid,
		"role":          allJWTDatas.Role,
		"app_id":        allJWTDatas.AppID,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	signedToken, err := token.SignedString(rsaPrivateKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %v", err)
	}

	return signedToken, nil
}

// GenerateRefreshTokenWithRS256 生成RSA签名的刷新令牌（导出供其他包使用）
func GenerateRefreshTokenWithRS256(userID, audience string) (string, error) {
	initRSAKeys()

	// 确保RSA私钥已初始化
	if rsaPrivateKey == nil {
		return "", fmt.Errorf("RSA private key is not initialized")
	}

	claims := jwt.MapClaims{
		"iss": os.Getenv("JWT_ISS"),
		"sub": userID,
		"aud": audience,
		"exp": time.Now().Add(24 * time.Hour).Unix(),
		"iat": time.Now().Unix(),
		"jti": uuid.New().String(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	signedToken, err := token.SignedString(rsaPrivateKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign refresh token: %v", err)
	}

	return signedToken, nil
}

// exportRSAPrivateKeyAsPEM 将RSA私钥导出为PEM格式字符串
func exportRSAPrivateKeyAsPEM(privateKey *rsa.PrivateKey) string {
	privateKeyBytes := x509.MarshalPKCS1PrivateKey(privateKey)
	privateKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: privateKeyBytes,
	})
	return string(privateKeyPEM)
}

// exportRSAPublicKeyAsPEM 将RSA公钥导出为PEM格式字符串
func exportRSAPublicKeyAsPEM(publicKey *rsa.PublicKey) string {
	publicKeyBytes, err := x509.MarshalPKIXPublicKey(publicKey)
	if err != nil {
		log.Printf("Failed to marshal public key: %v", err)
		return ""
	}
	publicKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: publicKeyBytes,
	})
	return string(publicKeyPEM)
}

// TestTokenGeneration 测试令牌生成和验证
func TestTokenGeneration() error {
	fmt.Println("🧪 测试令牌生成和验证...")

	// 测试访问令牌生成
	accessToken, err := GenerateAccessTokenWithRS256(&RS256TokenClaims{})
	if err != nil {
		return fmt.Errorf("failed to generate access token: %v", err)
	}

	fmt.Printf("✅ 访问令牌生成成功，长度: %d\n", len(accessToken))

	// 测试令牌验证
	claims, err := validateAccessToken(accessToken)
	if err != nil {
		return fmt.Errorf("failed to validate access token: %v", err)
	}

	fmt.Printf("✅ 访问令牌验证成功，用户ID: %s\n", claims["sub"])
	fmt.Printf("✅ 受众: %s\n", claims["aud"])
	fmt.Printf("✅ 签发者: %s\n", claims["iss"])

	return nil
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

		fmt.Printf("🔍 接收到用户信息请求:\n")
		fmt.Printf("   Authorization Header: %s\n", authHeader)
		fmt.Printf("   Access Token Length: %d\n", len(accessToken))
		prefixLen := 20
		if len(accessToken) < 20 {
			prefixLen = len(accessToken)
		}
		fmt.Printf("   Access Token Prefix: %s\n", accessToken[:prefixLen])

		// 验证令牌
		claims, err := validateAccessToken(accessToken)
		if err != nil {
			fmt.Printf("❌ 令牌验证失败: %v\n", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_token", "error_description": err.Error()})
			return
		}

		fmt.Printf("✅ 令牌验证成功\n")
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

// GetOAuthLogout 登出端点 - 完整的SSO登出实现
func GetOAuthLogout(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		userAgent := c.GetHeader("User-Agent")

		// 获取登出请求参数
		var req OAuthLogoutRequest
		var logoutParams LogoutParams

		// 处理POST请求（JSON格式）
		if c.Request.Method == "POST" {
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error":             "invalid_request",
					"error_description": "Request body must be valid JSON",
				})
				return
			}
			logoutParams = LogoutParams{
				IdTokenHint:           req.IdTokenHint,
				PostLogoutRedirectURI: req.PostLogoutRedirectURI,
				State:                 req.State,
			}
		} else {
			// 处理GET请求（URL参数）
			logoutParams = LogoutParams{
				IdTokenHint:           c.Query("id_token_hint"),
				PostLogoutRedirectURI: c.Query("post_logout_redirect_uri"),
				State:                 c.Query("state"),
			}
		}

		// 验证id_token_hint（如果提供）
		var userClaims jwt.MapClaims
		if logoutParams.IdTokenHint != "" {
			claims, err := validateAccessToken(logoutParams.IdTokenHint)
			if err != nil {
				// 如果令牌无效，仍允许登出，但记录警告日志
				fmt.Printf("⚠️  登出请求中的id_token_hint无效: %v\n", err)
			} else {
				userClaims = claims
			}
		}

		// 获取用户信息（如果令牌有效）
		var userID string
		var username string
		if userClaims != nil {
			if sub, ok := userClaims["sub"].(string); ok {
				userID = sub
			}
			if name, ok := userClaims["preferred_username"].(string); ok {
				username = name
			} else if name, ok := userClaims["name"].(string); ok {
				username = name
			}
		}

		// 销毁用户的所有活跃会话
		destroyedSessions := destroyUserSessions(db, userID)

		// 将当前访问令牌和刷新令牌加入黑名单
		blacklistCurrentTokens(db, userClaims)

		// 记录登出日志
		recordLogoutLog(db, userID, username, "sso_logout", ip, userAgent, true, "")

		// 如果是跨应用登出，通知其他应用
		if logoutParams.PostLogoutRedirectURI != "" {
			performCrossAppLogout(db, userID, logoutParams)
		}

		// 处理重定向逻辑
		if logoutParams.PostLogoutRedirectURI != "" {
			// redirectURL
			_, err := url.Parse(logoutParams.PostLogoutRedirectURI)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error":             "invalid_request",
					"error_description": "Invalid post_logout_redirect_uri",
				})
				return
			}

			// 添加状态参数（如果提供）
			if logoutParams.State != "" {
				// params := redirectURL.Query()
				logoutParams.PostLogoutRedirectURI += "&logout=true"
				logoutParams.PostLogoutRedirectURI += "&state=" + logoutParams.State
				// params.Set("state", logoutParams.State)
				// params.Set("logout", "true")
				// redirectURL.RawQuery = params.Encode()
			}

			// 记录重定向日志
			fmt.Printf("🔄 重定向到登出回调URL: %s\n", logoutParams.PostLogoutRedirectURI)

			c.Redirect(http.StatusFound, logoutParams.PostLogoutRedirectURI)
			return
		}

		// 返回登出成功响应
		response := gin.H{
			"message":            "Logged out successfully",
			"destroyed_sessions": destroyedSessions,
			"timestamp":          time.Now().Unix(),
		}

		// 如果是API请求，返回JSON；如果是浏览器请求，返回登出确认页面
		if c.GetHeader("Accept") == "application/json" || c.Request.Method == "POST" {
			c.JSON(http.StatusOK, response)
		} else {
			// 返回登出确认HTML页面
			c.Header("Content-Type", "text/html; charset=utf-8")
			c.String(http.StatusOK, generateLogoutConfirmationHTML(username, destroyedSessions))
		}
	}
}

// GetOAuthRevoke 令牌撤销端点
func GetOAuthRevoke(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req OAuthRevokeRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":             "invalid_request",
				"error_description": "Request body must be valid JSON",
			})
			return
		}

		if req.Token == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "error_description": "token is required"})
			return
		}

		// 验证客户端
		var client SSOClient
		if err := db.Where("id = ? AND secret = ? AND is_active = ?", req.ClientID, req.ClientSecret, true).First(&client).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_client", "error_description": "Invalid client credentials"})
			return
		}

		// 验证并撤销令牌
		_, err := validateAccessToken(req.Token)
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
// func buildQueryString(params map[string]string) string {
// 	values := make([]string, 0, len(params))
// 	for key, value := range params {
// 		values = append(values, key+"="+value)
// 	}
// 	return strings.Join(values, "&")
// }

// cleanupInvalidTokenHash 清理无效的token hash
func cleanupInvalidTokenHash(db *gorm.DB, userID, clientID string) {
	err := db.Model(&models.SSOSession{}).
		Where("user_id = ? AND client_id = ?", userID, clientID).
		Updates(map[string]interface{}{
			"refresh_token_hash":        "",
			"current_access_token_hash": "",
		}).Error

	if err != nil {
		log.Printf("❌ 清理token hash失败: %v", err)
	} else {
		log.Printf("✅ 已清理用户 %s 的无效token hash", userID)
	}
}

// 处理刷新令牌
// 刷新token的逻辑
// SSO 体系中会创建两种不同的 Session，分别在中心登录系统登录时和子系统首次验证时创建，二者功能不同且相互关联，并非只在某一处创建
/**
1. 中心登录系统：创建 “全局 Session”（核心）
创建时机： 仅在用户通过中心登录系统（SSO Server）完成首次登录（如输入账号密码验证通过）时创建。
存储位置：存储在 SSO 服务器端，而非用户客户端或子系统。
核心作用：
	标记用户在整个 SSO 体系中的 “全局登录状态”，是子系统获取登录权限的基础。
	关联用户身份信息（如用户 ID、权限范围）和全局有效期（如 2 小时），后续滑动续签、登出操作均围绕全局 Session 展开。

2. 子系统：创建 “本地 Session”
创建时机： 在用户首次访问子系统（如应用 A、B）时创建。
存储位置：存储在子系统服务器端。
核心作用：
	标记用户在特定子系统中的 “本地登录状态”，是用户在该子系统内访问资源的通行证。
	关联用户身份信息（如用户 ID、权限范围）和本地有效期（如 1 小时），后续滑动续签、登出操作均围绕本地 Session 展开。
	与全局 Session 关联，确保用户在不同子系统间的登录状态一致。

3. 关联关系
	用户首次登录 SSO，SSO 创建全局 Session，并生成临时授权凭证（如 Ticket）。
	用户访问子系统时，子系统携带授权凭证向 SSO 验证，SSO 确认全局 Session 有效后，返回用户身份信息。
	子系统基于该身份信息，创建自己的局部 Session，用户后续在子系统内操作时，直接验证局部 Session 即可。
	若全局 Session 失效（如超时、用户登出），所有子系统的局部 Session 会在下次验证时同步失效，强制用户重新登录 SSO。

4. 子系统持有 “关联凭证” 而非全局 Session ID
用户通过 SSO 登录后，SSO 服务器会向子系统发放一个授权凭证（如access_token或code），该凭证与全局 Session ID 存在映射关系（存储在 SSO 服务器端）。
子系统将这个授权凭证存储在自己的前端（如 Cookie 或 localStorage），作为后续通信的 “钥匙”。


登录阶段：
用户在 SSO 服务器登录，SSO 创建全局 Session（ID：G123），并在自己的 Cookie 中存储G123。
SSO 向子系统发放授权凭证T456（后端记录T456 → G123的映射）。
子系统将T456存储在自己的前端（如https://app1.com的 Cookie）。
续签阶段：
子系统检测到T456即将过期，前端将T456发送给子系统后端（或直接调用 SSO 的/refresh接口）。
SSO 服务器收到T456，通过后端映射找到G123，验证全局 Session 有效后，延长G123的有效期，并生成新凭证T789（映射关系更新为T789 → G123）。
子系统接收T789并替换本地的T456，完成续签。

refresh_token的续签（轮换）机制
基本逻辑当使用refresh_token获取新的access_token时，SSO 服务器不仅返回新的access_token，还会同时返回一个新的refresh_token，并使旧的refresh_token失效。
新refresh_token的有效期通常从当前时间重新计算（如保持 7 天有效期）。
旧refresh_token立即或在短时间内（如 5 分钟）失效，防止重复使用。
与全局会话的关联新refresh_token仍与原全局会话（session id）绑定，延续用户的登录状态。只有当全局会话失效（如超时、用户登出）时，refresh_token的轮换才会失败。
流程示例
初始登录：SSO 返回access_token（30 分钟）和refresh_token（7 天，记为RT1）。
首次续签：子应用用RT1请求续签，SSO 返回新access_token和新refresh_token（RT2），RT1失效。
二次续签：子应用用RT2请求续签，SSO 返回新access_token和RT3，RT2失效。
以此类推，每次续签都生成新的refresh_token，形成 “轮换链”。


子系统中的 session id（局部 session id）依然有重要作用，它和 SSO 的全局 session、refresh token 是分工明确的三层机制，缺一不可。子系统的局部 session id 主要解决 “性能优化” 和 “子系统专属状态管理” 的问题，具体价值如下

*/
func handleRefreshTokenGrant(c *gin.Context, db *gorm.DB, req OAuthTokenRequest) {
	// 验证刷新令牌
	clientID := req.ClientID
	clientSecret := req.ClientSecret
	refreshToken := req.RefreshToken

	// 验证刷新令牌
	claims, err := validateAccessToken(refreshToken)
	if err != nil {
		log.Printf("⚠️ Refresh token无效，尝试清理数据: %v", err)
		// 尝试从claims中获取userID进行清理
		if claims != nil {
			if userID, ok := claims["sub"].(string); ok {
				cleanupInvalidTokenHash(db, userID, clientID)
			}
		}
		c.JSON(http.StatusBadRequest, gin.H{
			"error":             "invalid_grant",
			"error_description": "Refresh token is invalid or expired",
			"error_code":        "REFRESH_TOKEN_INVALID",
			"suggest_action":    "check_session",
		})
		return
	}

	log.Println("claims: ", claims)

	isUpdateRefreshToken := false
	// 如果小于100分钟到期的情况下，则需要重新刷新refreshToken
	if int64(claims["exp"].(float64)) < time.Now().Unix()+6000 {
		isUpdateRefreshToken = true
		log.Panicln("Debug: 更新RefreshToken")
	}
	userID := claims["sub"].(string)

	// 验证客户端
	var client SSOClient
	if err := db.Where("id = ? AND secret = ? AND is_active = ?", clientID, clientSecret, true).First(&client).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_client", "error_description": "Invalid client credentials"})
		return
	}
	var user models.User
	if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_grant", "error_description": "Invalid user"})
		return
	}

	localID := ""
	if req.AppID != "" {
		var pm models.ProjectMapping
		if err := db.Where("project_name = ? AND user_id = ?", req.AppID, user.ID).First(&pm).Error; err == nil {
			localID = pm.LocalUserID
		}
	}

	now := time.Now()
	allJWTDatas := &RS256TokenClaims{
		ClientID:    clientID,
		UserID:      userID,
		Email:       *user.Email,
		Role:        user.Role,
		AppID:       req.AppID,
		LocalUserID: localID,
		Lid:         localID,
		// Req:         req,

		User: &user,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(config.AppConfig.JWTExpiration) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    os.Getenv("JWT_ISS"),
			ID:        uuid.New().String(),
		},
	}
	// 生成新的访问令牌
	accessToken, err := GenerateAccessTokenWithRS256(allJWTDatas)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "error_description": "Failed to generate access token"})
		return
	}

	if isUpdateRefreshToken {
		log.Println("需要重新 刷新refreshToken")

		// 计算 refresh_token 的 hash
		calculateRefreshTokenHash := calculateTokenHash(refreshToken)

		// 直接用 refresh_token_hash 查询（唯一条件）
		var session models.SSOSession
		if err := db.Where("refresh_token_hash = ? AND status = ? AND expires_at > ?",
			calculateRefreshTokenHash, "active", time.Now()).First(&session).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				log.Printf("⚠️ Refresh token hash不存在或session已失效")
				// 清理可能存在的无效数据
				cleanupInvalidTokenHash(db, userID, clientID)
				c.JSON(http.StatusBadRequest, gin.H{
					"error":             "invalid_grant",
					"error_description": "Refresh token not found or session expired",
					"error_code":        "TOKEN_HASH_MISMATCH",
					"suggest_action":    "check_session",
				})
				return
			}
			log.Printf("❌ 查询session失败: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":             "server_error",
				"error_description": "Failed to get session",
			})
			return
		}

		// 验证 session 是否属于当前用户（安全检查）
		if session.UserID != userID {
			log.Printf("⚠️ Refresh token的用户ID与session不匹配: token_user=%s, session_user=%s", userID, session.UserID)
			c.JSON(http.StatusBadRequest, gin.H{
				"error":             "invalid_grant",
				"error_description": "Token user mismatch",
				"error_code":        "TOKEN_USER_MISMATCH",
				"suggest_action":    "relogin",
			})
			return
		}

		log.Printf("✅ 找到有效session: id=%s, user=%s, client=%s", session.ID, session.UserID, session.ClientID)

		// 生成新的 refresh_token
		newRefreshToken, err := GenerateRefreshTokenWithRS256(userID, clientID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":             "server_error",
				"error_description": "Failed to generate refresh token",
			})
			return
		}

		// 更新 session 中的 refresh_token_hash
		newRefreshTokenHash := calculateTokenHash(newRefreshToken)
		session.RefreshTokenHash = newRefreshTokenHash
		if err := db.Save(&session).Error; err != nil {
			log.Printf("❌ 更新session的refresh_token_hash失败: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":             "server_error",
				"error_description": "Failed to update session",
			})
			return
		}

		log.Printf("✅ 已轮换refresh_token并更新session: id=%s, new_hash=%s", session.ID, newRefreshTokenHash[:16]+"...")

		// 使用新的 refresh_token
		refreshToken = newRefreshToken

	}

	// // 返回OAuth 2.0标准响应
	response := gin.H{
		"access_token":  accessToken,
		"id_token":      accessToken,
		"refresh_token": refreshToken,
		"token_type":    "Bearer",
		"expires_in":    3600,
		"scope":         "openid profile email phone",
		"user":          user.ToResponse(),
		"provider":      "centralized",
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
	// 验证刷新令牌
	var req OAuthTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "error_description": "Request body must be valid JSON"})
		return
	}
	allJWTDatas := &RS256TokenClaims{}
	// 生成访问令牌
	accessToken, err := GenerateAccessTokenWithRS256(allJWTDatas)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "error_description": "Failed to generate access token"})
		return
	}

	// 生成刷新令牌
	refreshToken, err := GenerateRefreshTokenWithRS256(user.ID, clientID)
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
	accessToken, err := GenerateAccessTokenWithRS256(&RS256TokenClaims{})
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
func validateAuthorizationCodeWithPKCE(db *gorm.DB, code, clientID, redirectURI, codeVerifier, state, appID, internalAuth, doubleVerification string) (jwt.MapClaims, error) {
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

	// 根据code查询sso_sessions表获取会话信息
	var ssoSession models.SSOSession
	if err := db.Where("authorization_code = ? AND client_id = ? AND used = ? AND expires_at > ? AND status = ?",
		code, clientID, false, time.Now(), "active").First(&ssoSession).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("authorization code not found, expired, or already used")
		}
		return nil, fmt.Errorf("database error: %v", err)
	}

	// 验证重定向URI
	if ssoSession.RedirectURI != redirectURI {
		return nil, errors.New("redirect URI mismatch")
	}

	// 验证状态参数
	if ssoSession.State != state {
		return nil, errors.New("state parameter mismatch")
	}

	// 验证应用ID（如果需要）
	// 可以根据实际情况添加应用ID验证逻辑

	// 验证code_verifier与存储的code_challenge（PKCE验证）
	if ssoSession.CodeChallenge != "" && ssoSession.CodeChallengeMethod != "" {
		// 实现PKCE验证逻辑
		if !validatePKCECodeVerifier(codeVerifier, ssoSession.CodeChallenge, ssoSession.CodeChallengeMethod) {
			return nil, errors.New("PKCE code_verifier validation failed")
		}
		fmt.Printf("✅ PKCE双重验证通过: code_verifier验证成功\n")
	}

	// 获取用户信息
	var user models.User
	if err := db.Where("id = ?", ssoSession.UserID).First(&user).Error; err != nil {
		return nil, fmt.Errorf("user not found: %v", err)
	}

	// 构建JWT声明（基于数据库中的会话信息）
	claims := jwt.MapClaims{
		"sub":          ssoSession.UserID,
		"aud":          clientID,
		"iss":          config.AppConfig.ServerHost,
		"exp":          ssoSession.ExpiresAt.Unix(),
		"iat":          ssoSession.LastActivity.Unix(),
		"jti":          ssoSession.ID,
		"redirect_uri": ssoSession.RedirectURI,
		"scope":        ssoSession.Scope,
		"state":        ssoSession.State,
		"app_id":       appID, // 添加应用ID到声明中
		"user_id":      ssoSession.UserID,
		"email":        user.Email,
		"role":         user.Role,
		"username":     user.Username,
	}

	// 添加用户信息
	if user.Email != nil {
		claims["email"] = *user.Email
	}
	if user.Username != "" {
		claims["preferred_username"] = user.Username
		claims["name"] = user.Username
	}

	return claims, nil
}

// validatePKCECodeVerifier 验证PKCE code_verifier
func validatePKCECodeVerifier(codeVerifier, codeChallenge, codeChallengeMethod string) bool {
	switch codeChallengeMethod {
	case "S256":
		// code_challenge = BASE64URL(SHA256(code_verifier))
		hash := sha256.Sum256([]byte(codeVerifier))
		expectedChallenge := base64.RawURLEncoding.EncodeToString(hash[:])
		// 使用subtle.ConstantTimeCompare防止时序攻击
		return subtle.ConstantTimeCompare([]byte(codeChallenge), []byte(expectedChallenge)) == 1

	case "plain":
		// code_challenge = code_verifier
		return subtle.ConstantTimeCompare([]byte(codeChallenge), []byte(codeVerifier)) == 1

	default:
		// 不支持的code_challenge_method
		return false
	}
}

// 处理Code Verifier认证类型（双重验证模式）
func handleCodeVerifierGrant(c *gin.Context, db *gorm.DB, code, clientID, clientSecret string, req OAuthTokenRequest) {
	// 获取额外参数
	redirectURI := req.RedirectURI
	codeVerifier := req.CodeVerifier
	state := req.State
	appID := req.AppID
	internalAuth := req.InternalAuth
	doubleVerification := req.DoubleVerification

	// 验证客户端
	var client SSOClient
	if err := db.Where("id = ? AND secret = ? AND is_active = ?", clientID, clientSecret, true).First(&client).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_client", "error_description": "Invalid client credentials"})
		return
	}

	// 使用PKCE双重验证
	claims, err := validateAuthorizationCodeWithPKCE(db, code, clientID, redirectURI, codeVerifier, state, appID, internalAuth, doubleVerification)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_grant", "error_description": err.Error()})
		return
	}

	// 获取用户信息
	sub, ok := claims["sub"].(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "error_description": "Invalid user ID in token"})
		return
	}
	userID := sub

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
	accessToken, err := GenerateAccessTokenWithRS256(&RS256TokenClaims{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server_error", "error_description": "Failed to generate access token"})
		return
	}

	// 生成刷新令牌
	refreshToken, err := GenerateRefreshTokenWithRS256(user.ID, clientID)
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

// destroyUserSessions 销毁用户的所有活跃会话
func destroyUserSessions(db *gorm.DB, userID string) int {
	if userID == "" {
		return 0
	}

	// 查询用户的所有活跃会话
	var sessions []models.SSOSession
	err := db.Where("user_id = ? AND status = ? AND expires_at > ?",
		userID, "active", time.Now()).Find(&sessions).Error

	if err != nil {
		fmt.Printf("❌ 查询用户会话失败: %v\n", err)
		return 0
	}

	destroyedCount := 0

	// 销毁每个会话
	for _, session := range sessions {
		// 将会话标记为非活跃状态
		err := db.Model(&session).Updates(map[string]interface{}{
			"status":        "logged_out",
			"last_activity": time.Now(),
		}).Error

		if err != nil {
			fmt.Printf("❌ 销毁会话失败 (ID: %s): %v\n", session.ID, err)
		} else {
			fmt.Printf("✅ 会话已销毁: %s (User: %s)\n", session.ID, userID)
			destroyedCount++
		}
	}

	fmt.Printf("🔒 用户 %s 的 %d 个活跃会话已销毁\n", userID, destroyedCount)
	return destroyedCount
}

// blacklistCurrentTokens 将当前令牌加入黑名单
func blacklistCurrentTokens(db *gorm.DB, claims jwt.MapClaims) {
	if claims == nil {
		return
	}

	// 获取令牌JTI（JWT ID）
	jti, ok := claims["jti"].(string)
	if !ok {
		fmt.Printf("⚠️  令牌中未找到JTI，无法加入黑名单\n")
		return
	}

	// 计算令牌过期时间
	exp := int64(0)
	if expTime, ok := claims["exp"].(float64); ok {
		exp = int64(expTime)
	} else {
		// 如果没有过期时间，默认设置为1小时后
		exp = time.Now().Add(time.Hour).Unix()
	}

	expiresAt := time.Unix(exp, 0)

	// 将令牌加入黑名单
	err := models.AddTokenToBlacklist(db, jti, expiresAt)
	if err != nil {
		fmt.Printf("❌ 将令牌加入黑名单失败: %v\n", err)
	} else {
		fmt.Printf("✅ 令牌已加入黑名单: %s (过期时间: %s)\n", jti, expiresAt.Format(time.RFC3339))
	}
}

// recordLogoutLog 记录登出日志
func recordLogoutLog(db *gorm.DB, userID, username, provider, ip, userAgent string, success bool, errorMsg string) {
	loginLog := models.LoginLog{
		UserID:    userID,
		Provider:  provider,
		IP:        ip,
		UserAgent: userAgent,
		Success:   success,
		ErrorMsg:  errorMsg,
		CreatedAt: time.Now(),
	}

	if err := db.Create(&loginLog).Error; err != nil {
		fmt.Printf("❌ 记录登出日志失败: %v\n", err)
	} else {
		fmt.Printf("📝 登出日志已记录: 用户=%s, IP=%s, 成功=%v\n", username, ip, success)
	}
}

// performCrossAppLogout 执行跨应用登出
func performCrossAppLogout(db *gorm.DB, userID string, params LogoutParams) {
	if userID == "" {
		return
	}

	// 查询用户在其他应用中的活跃会话
	var sessions []models.SSOSession
	err := db.Where("user_id = ? AND status = ? AND current_app_id != ? AND expires_at > ?",
		userID, "active", "", time.Now()).Find(&sessions).Error

	if err != nil {
		fmt.Printf("❌ 查询跨应用会话失败: %v\n", err)
		return
	}

	// 通知其他应用进行登出（这里简化处理，实际应该通过消息队列或RPC调用）
	for _, session := range sessions {
		fmt.Printf("🔄 通知应用 %s 登出用户 %s\n", session.CurrentAppID, userID)

		// 将会话标记为待登出状态
		db.Model(&session).Update("status", "cross_app_logout_pending")
	}

	fmt.Printf("🔗 跨应用登出通知完成，用户 %s 在 %d 个应用中的会话待处理\n", userID, len(sessions))
}

// generateLogoutConfirmationHTML 生成登出确认HTML页面
func generateLogoutConfirmationHTML(username string, destroyedSessions int) string {
	displayName := username
	if displayName == "" {
		displayName = "用户"
	}

	html := `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>登出成功</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .logout-container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 500px;
            width: 90%;
        }
        .success-icon {
            font-size: 64px;
            color: #28a745;
            margin-bottom: 20px;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
        }
        .user-info {
            color: #666;
            margin-bottom: 20px;
            font-size: 16px;
        }
        .session-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #28a745;
        }
        .back-btn {
            display: inline-block;
            background: #007bff;
            color: white;
            padding: 12px 30px;
            border-radius: 6px;
            text-decoration: none;
            margin-top: 20px;
            transition: background-color 0.3s;
        }
        .back-btn:hover {
            background: #0056b3;
        }
        .timestamp {
            color: #999;
            font-size: 14px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="logout-container">
        <div class="success-icon">✓</div>
        <h1>登出成功</h1>
        <div class="user-info">
            您好，` + displayName + `！您已成功登出系统。
        </div>
        <div class="session-info">
            <strong>会话清理完成</strong><br>
            已销毁 ` + fmt.Sprintf("%d", destroyedSessions) + ` 个活跃会话，所有令牌已失效。
        </div>
        <a href="/" class="back-btn">返回首页</a>
        <div class="timestamp">
            登出时间：` + time.Now().Format("2006-01-02 15:04:05") + `
        </div>
    </div>
</body>
</html>`

	return html
}
