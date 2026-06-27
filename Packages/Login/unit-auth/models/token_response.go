package models

import "time"

// TokenResponse OAuth 2.0 标准 Token 响应
type TokenResponse struct {
	// OAuth 2.0 标准字段
	AccessToken  string `json:"access_token"`  // JWT访问令牌，1小时有效
	RefreshToken string `json:"refresh_token"` // JWT刷新令牌，30天有效
	IDToken      string `json:"id_token"`      // OpenID Connect ID令牌
	TokenType    string `json:"token_type"`    // 固定值 "Bearer"
	ExpiresIn    int    `json:"expires_in"`    // access_token有效期（秒）
	Scope        string `json:"scope"`         // 授权范围

	// 扩展字段
	User        UserResponse `json:"user"`                   // 用户信息
	Provider    string       `json:"provider"`               // 认证提供者
	SessionID   string       `json:"session_id,omitempty"`   // Session ID（仅中心登录系统）
	SessionInfo *SessionInfo `json:"session_info,omitempty"` // Session详细信息（仅登录时）
}

// SessionInfo Session 详细信息
type SessionInfo struct {
	SessionID    string    `json:"session_id"`
	StartTime    time.Time `json:"start_time"`
	LastActivity time.Time `json:"last_activity"`
	ExpiresAt    time.Time `json:"expires_at"`
	CurrentAppID string    `json:"current_app_id"`
	Events       []string  `json:"events"`
}

// TokenErrorResponse OAuth 2.0 标准错误响应
type TokenErrorResponse struct {
	// OAuth 2.0 标准错误字段
	Error            string `json:"error"`             // 错误类型
	ErrorDescription string `json:"error_description"` // 人类可读的错误描述

	// 扩展字段（用于前端智能处理）
	ErrorCode     string `json:"error_code,omitempty"`     // 详细错误码
	SuggestAction string `json:"suggest_action,omitempty"` // 建议前端执行的操作
	ErrorURI      string `json:"error_uri,omitempty"`      // 错误详情文档链接
}

// 错误类型常量（OAuth 2.0 标准）
const (
	// OAuth 2.0 标准错误类型
	ErrorInvalidRequest         = "invalid_request"         // 请求缺少必需参数
	ErrorInvalidClient          = "invalid_client"          // 客户端认证失败
	ErrorInvalidGrant           = "invalid_grant"           // 授权无效或过期
	ErrorUnauthorizedClient     = "unauthorized_client"     // 客户端无权使用此授权方式
	ErrorUnsupportedGrantType   = "unsupported_grant_type"  // 不支持的授权类型
	ErrorInvalidScope           = "invalid_scope"           // 请求的作用域无效
	ErrorAccessDenied           = "access_denied"           // 用户拒绝授权
	ErrorServerError            = "server_error"            // 服务器内部错误
	ErrorTemporarilyUnavailable = "temporarily_unavailable" // 服务暂时不可用
)

// 详细错误码常量
const (
	// Refresh Token 相关错误码
	ErrorCodeRefreshTokenInvalid = "REFRESH_TOKEN_INVALID" // Refresh token 无效
	ErrorCodeRefreshTokenExpired = "REFRESH_TOKEN_EXPIRED" // Refresh token 已过期
	ErrorCodeTokenHashMismatch   = "TOKEN_HASH_MISMATCH"   // Token hash 不匹配
	ErrorCodeTokenUserMismatch   = "TOKEN_USER_MISMATCH"   // Token 用户不匹配
	ErrorCodeSessionInactive     = "SESSION_INACTIVE"      // Session 未激活
	ErrorCodeSessionExpired      = "SESSION_EXPIRED"       // Session 已过期
	ErrorCodeSessionNotFound     = "SESSION_NOT_FOUND"     // Session 未找到
	ErrorCodeSessionRevoked      = "SESSION_REVOKED"       // Session 已撤销（强制登出）

	// Authorization Code 相关错误码
	ErrorCodeAuthCodeInvalid     = "AUTH_CODE_INVALID"     // 授权码无效
	ErrorCodeAuthCodeExpired     = "AUTH_CODE_EXPIRED"     // 授权码已过期
	ErrorCodeAuthCodeUsed        = "AUTH_CODE_USED"        // 授权码已使用
	ErrorCodeRedirectURIMismatch = "REDIRECT_URI_MISMATCH" // 重定向URI不匹配

	// Client 认证错误码
	ErrorCodeClientNotFound      = "CLIENT_NOT_FOUND"      // 客户端未找到
	ErrorCodeClientSecretInvalid = "CLIENT_SECRET_INVALID" // 客户端密钥无效
	ErrorCodeClientInactive      = "CLIENT_INACTIVE"       // 客户端未激活

	// User 相关错误码
	ErrorCodeUserNotFound  = "USER_NOT_FOUND" // 用户未找到
	ErrorCodeUserSuspended = "USER_SUSPENDED" // 用户已暂停
	ErrorCodeUserDeleted   = "USER_DELETED"   // 用户已删除

	// 服务器错误码
	ErrorCodeTokenGenerationFailed = "TOKEN_GENERATION_FAILED" // Token生成失败
	ErrorCodeDatabaseError         = "DATABASE_ERROR"          // 数据库错误
	ErrorCodeServiceUnavailable    = "SERVICE_UNAVAILABLE"     // 服务不可用
)

// 建议操作常量
const (
	SuggestActionCheckSession = "check_session" // 尝试用 session_id 恢复
	SuggestActionRelogin      = "relogin"       // 立即跳转登录
	SuggestActionRetryAuth    = "retry_auth"    // 重新发起OAuth授权
	SuggestActionContactAdmin = "contact_admin" // 联系管理员
	SuggestActionRetry        = "retry"         // 重试请求
	SuggestActionRetryLater   = "retry_later"   // 稍后重试
)
