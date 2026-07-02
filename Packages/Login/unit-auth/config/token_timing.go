package config

import "time"

// AccessTokenTTL access_token JWT 有效期（与 API expires_in 一致）
func AccessTokenTTL() time.Duration {
	return time.Duration(AppConfig.AccessTokenExpirationMinutes) * time.Minute
}

// AccessTokenExpiresInSeconds OAuth 响应 expires_in（秒）
func AccessTokenExpiresInSeconds() int {
	return AppConfig.AccessTokenExpirationMinutes * 60
}

// RefreshTokenTTL refresh_token 有效期
func RefreshTokenTTL() time.Duration {
	return time.Duration(AppConfig.JWTRefreshExpirationHours) * time.Hour
}

// RefreshTokenExpiresInSeconds refresh_token 对应 expires_in（秒）
func RefreshTokenExpiresInSeconds() int64 {
	return int64(AppConfig.JWTRefreshExpirationHours) * 3600
}

// RememberMeTTL 「记住我」access token 有效期
func RememberMeTTL() time.Duration {
	return time.Duration(AppConfig.JWTRememberMeExpirationHours) * time.Hour
}

// RememberMeExpiresInSeconds 「记住我」expires_in（秒）
func RememberMeExpiresInSeconds() int64 {
	return int64(AppConfig.JWTRememberMeExpirationHours) * 3600
}

// SSOSessionTTL IdP sso_sessions 记录 / session cookie 有效期
func SSOSessionTTL() time.Duration {
	return time.Duration(AppConfig.SSOSessionExpirationDays) * 24 * time.Hour
}

// AuthorizationCodeTTL OAuth 授权码有效期
func AuthorizationCodeTTL() time.Duration {
	return time.Duration(AppConfig.AuthCodeExpirationMinutes) * time.Minute
}

// SSOMaxInactiveTTL 超过该时间不活跃的 session 可被清理
func SSOMaxInactiveTTL() time.Duration {
	return time.Duration(AppConfig.SSOMaxInactiveDays) * 24 * time.Hour
}
