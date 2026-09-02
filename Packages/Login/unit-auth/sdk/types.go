package sdk

import "fmt"

// APIError unit-auth 返回的错误（OAuth 或 JSON 包装）
type APIError struct {
	Status        int
	OAuthError    string `json:"error"`
	Description   string `json:"error_description"`
	ErrorCode     string `json:"error_code"`
	SuggestAction string `json:"suggest_action"`
	Body          string
}

func (e *APIError) Error() string {
	if e.Description != "" {
		return e.OAuthError + ": " + e.Description
	}
	if e.OAuthError != "" {
		return e.OAuthError
	}
	return fmt.Sprintf("api error (status %d)", e.Status)
}

// TokenResponse OAuth token 响应
type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	Scope        string `json:"scope"`
	IDToken      string `json:"id_token"`
}

// UserInfo OIDC userinfo
type UserInfo map[string]interface{}

// AuthorizeURLParams 构建授权 URL 的参数
type AuthorizeURLParams struct {
	ClientID     string
	RedirectURI  string
	ResponseType string
	Scope        string
	State        string
	AppID        string
}

// SessionCheckRequest 静默登录 / 跨应用 session 检查
type SessionCheckRequest struct {
	SessionID string `json:"session_id"`
	AppID     string `json:"app_id"`
}

// IntrospectResponse token 内省结果
type IntrospectResponse struct {
	Active    bool         `json:"active"`
	UserID    string       `json:"user_id"`
	Email     string       `json:"email"`
	Role      string       `json:"role"`
	Beta      *BetaProfile `json:"beta,omitempty"`
	TokenType string       `json:"token_type"`
	Exp       int64        `json:"exp"`
	ExpiresAt string       `json:"expires_at"`
}

// BetaProfile 内测档案（token claims / introspect 嵌套字段）
type BetaProfile struct {
	BetaGroup string `json:"beta_group"`
	Status    int    `json:"status"`
	ExpiresAt string `json:"expires_at,omitempty"`
}

// AuthURLResponse BFF 常用：包装后的授权 URL
type AuthURLResponse struct {
	AuthURL string `json:"auth_url"`
}
