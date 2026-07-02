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

	// Token 时效（详见 env.example「Token 时效」一节；Access Token 以 ACCESS_TOKEN_EXPIRATION_MINUTES 为唯一入口）
	JWTSecret                    string
	AccessTokenExpirationMinutes int // access_token 有效期（分钟），JWT exp 与 expires_in 均据此计算
	JWTRefreshExpirationHours    int // refresh_token 有效期（小时）
	JWTRememberMeExpirationHours int // 记住我 token 有效期（小时）
	SSOSessionExpirationDays     int // IdP session 有效期（天）
	AuthCodeExpirationMinutes    int // OAuth 授权码有效期（分钟）
	SSOMaxInactiveDays           int // session 最大不活跃天数（清理任务）

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

		JWTSecret: getEnv("JWT_SECRET", "verita-unit-auth-secret"),

		AccessTokenExpirationMinutes: resolveAccessTokenExpirationMinutes(),
		JWTRefreshExpirationHours:    resolveDurationHours("JWT_REFRESH_EXPIRATION_HOURS", "JWT_REFRESH_EXPIRATION", 720),
		JWTRememberMeExpirationHours: resolveDurationHours("JWT_REMEMBER_ME_EXPIRATION_HOURS", "JWT_REMEMBER_ME_EXPIRATION", 720),
		SSOSessionExpirationDays:     getEnvAsInt("SSO_SESSION_EXPIRATION_DAYS", 365),
		AuthCodeExpirationMinutes:    getEnvAsInt("AUTH_CODE_EXPIRATION_MINUTES", 10),
		SSOMaxInactiveDays:           getEnvAsInt("SSO_MAX_INACTIVE_DAYS", 90),

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

// resolveAccessTokenExpirationMinutes ACCESS_TOKEN_EXPIRATION_MINUTES 为唯一入口；
// 兼容旧 JWT_EXPIRATION（小时）仅在未设置新变量时生效。
func resolveAccessTokenExpirationMinutes() int {
	if v := os.Getenv("ACCESS_TOKEN_EXPIRATION_MINUTES"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	if legacy := os.Getenv("JWT_EXPIRATION"); legacy != "" {
		if h, err := strconv.Atoi(legacy); err == nil && h > 0 {
			return h * 60
		}
	}
	return 15
}

func resolveDurationHours(primaryKey, legacyKey string, defaultHours int) int {
	if v := os.Getenv(primaryKey); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	if v := os.Getenv(legacyKey); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return defaultHours
}

// GetAccessTokenExpiry 兼容旧调用：返回 access token 有效期（分钟）
func GetAccessTokenExpiry() int {
	return AppConfig.AccessTokenExpirationMinutes
}
