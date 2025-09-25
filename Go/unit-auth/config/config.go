package config

import (
	"os"
	"strconv"

	"gorm.io/gorm"
)

type Config struct {
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string

	// JWT配置 - 支持双Token扩展
	JWTSecret               string
	JWTExpiration           int // 访问token有效期（小时）
	JWTRefreshExpiration    int // 刷新token有效期（小时）
	JWTRememberMeExpiration int // 记住我token有效期（小时）

	// RSA密钥配置（用于OAuth 2.0/OpenID Connect）
	RSAPrivateKey string // PEM格式的RSA私钥
	RSAPublicKey  string // PEM格式的RSA公钥

	// OAuth 2.0配置
	OAuthIssuer                string // OAuth发行者URL
	OAuthAuthorizationEndpoint string // 授权端点路径
	OAuthTokenEndpoint         string // 令牌端点路径
	OAuthUserInfoEndpoint      string // 用户信息端点路径
	OAuthRevocationEndpoint    string // 令牌撤销端点路径
	OAuthIntrospectionEndpoint string // 令牌内省端点路径

	// SSO客户端配置
	SSOClientID     string // 默认SSO客户端ID
	SSOClientSecret string // 默认SSO客户端密钥

	// 中心化SSO服务器配置
	SSOServerURL string // 中心化SSO服务器URL

	// 支持的OAuth提供者
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURI  string

	GitHubClientID     string
	GitHubClientSecret string
	GitHubRedirectURI  string

	WeChatAppID       string
	WeChatAppSecret   string
	WeChatRedirectURI string

	SMTPHost     string
	SMTPPort     int
	SMTPUser     string
	SMTPPassword string
	SMTPFrom     string

	ServerPort string
	ServerHost string
}

var AppConfig Config
var DB *gorm.DB

func Init() {
	AppConfig = Config{
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "3306"),
		DBUser:     getEnv("DB_USER", "root"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "auth_service"),

		JWTSecret:               getEnv("JWT_SECRET", "verita-unit-auth-secret"),
		JWTExpiration:           getEnvAsInt("JWT_EXPIRATION", 1),               // 7天 (168小时) - 学习类网站
		JWTRefreshExpiration:    getEnvAsInt("JWT_REFRESH_EXPIRATION", 24),      // 刷新token 24小时
		JWTRememberMeExpiration: getEnvAsInt("JWT_REMEMBER_ME_EXPIRATION", 720), // 记住我模式 30天

		// RSA密钥配置
		RSAPrivateKey: getEnv("RSA_PRIVATE_KEY", ""),
		RSAPublicKey:  getEnv("RSA_PUBLIC_KEY", ""),

		// OAuth 2.0配置
		OAuthIssuer:                getEnv("OAUTH_ISSUER", "https://sso.yourcompany.com"),
		OAuthAuthorizationEndpoint: getEnv("OAUTH_AUTHORIZATION_ENDPOINT", "/oauth/authorize"),
		OAuthTokenEndpoint:         getEnv("OAUTH_TOKEN_ENDPOINT", "/oauth/token"),
		OAuthUserInfoEndpoint:      getEnv("OAUTH_USERINFO_ENDPOINT", "/oauth/userinfo"),
		OAuthRevocationEndpoint:    getEnv("OAUTH_REVOCATION_ENDPOINT", "/oauth/revoke"),
		OAuthIntrospectionEndpoint: getEnv("OAUTH_INTROSPECTION_ENDPOINT", "/oauth/introspect"),

		// SSO客户端配置
		SSOClientID:     getEnv("SSO_CLIENT_ID", "default-client"),
		SSOClientSecret: getEnv("SSO_CLIENT_SECRET", "default-client-secret"),

		// 中心化SSO服务器配置
		SSOServerURL: getEnv("SSO_SERVER_URL", "http://localhost:8080"),

		// OAuth提供者配置
		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURI:  getEnv("GOOGLE_REDIRECT_URI", "/auth/google/callback"),

		GitHubClientID:     getEnv("GITHUB_CLIENT_ID", ""),
		GitHubClientSecret: getEnv("GITHUB_CLIENT_SECRET", ""),
		GitHubRedirectURI:  getEnv("GITHUB_REDIRECT_URI", "/auth/github/callback"),

		WeChatAppID:       getEnv("WECHAT_APP_ID", ""),
		WeChatAppSecret:   getEnv("WECHAT_APP_SECRET", ""),
		WeChatRedirectURI: getEnv("WECHAT_REDIRECT_URI", "/auth/wechat/callback"),

		SMTPHost:     getEnv("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:     getEnvAsInt("SMTP_PORT", 587),
		SMTPUser:     getEnv("SMTP_USER", ""),
		SMTPPassword: getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:     getEnv("SMTP_FROM", ""),

		ServerPort: getEnv("PORT", "8080"),
		ServerHost: getEnv("HOST", "0.0.0.0"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

// GetAccessTokenExpiry 获取访问token过期时间（小时）
func GetAccessTokenExpiry() int {
	return AppConfig.JWTExpiration
}
