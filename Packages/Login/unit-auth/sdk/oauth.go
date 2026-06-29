package sdk

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

func (c *Client) postJSON(path string, payload interface{}, authHeader string) (int, []byte, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return 0, nil, err
	}
	req, err := http.NewRequest(http.MethodPost, c.baseURL()+path, bytes.NewReader(body))
	if err != nil {
		return 0, nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(resp.Body)
	return resp.StatusCode, data, err
}

func (c *Client) getJSON(path string, authHeader string) (int, []byte, error) {
	req, err := http.NewRequest(http.MethodGet, c.baseURL()+path, nil)
	if err != nil {
		return 0, nil, err
	}
	req.Header.Set("Accept", "application/json")
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(resp.Body)
	return resp.StatusCode, data, err
}

func decodeJSON(data []byte, v interface{}) error {
	return json.Unmarshal(data, v)
}

func parseAPIError(status int, data []byte) error {
	var oauthErr APIError
	if err := json.Unmarshal(data, &oauthErr); err == nil && oauthErr.OAuthError != "" {
		oauthErr.Status = status
		oauthErr.Body = string(data)
		return &oauthErr
	}
	var wrapped struct {
		Code    int             `json:"code"`
		Message string          `json:"message"`
		Data    json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(data, &wrapped); err == nil && wrapped.Message != "" {
		return &APIError{Status: status, OAuthError: "api_error", Description: wrapped.Message, Body: string(data)}
	}
	return &APIError{Status: status, OAuthError: "unknown_error", Body: string(data)}
}

// BuildAuthorizeURL 生成 OIDC 授权跳转 URL（浏览器 redirect）
func (c *Client) BuildAuthorizeURL(p AuthorizeURLParams) string {
	q := url.Values{}
	clientID := p.ClientID
	if clientID == "" {
		clientID = c.clientID()
	}
	redirectURI := p.RedirectURI
	if redirectURI == "" {
		redirectURI = c.redirectURI()
	}
	responseType := p.ResponseType
	if responseType == "" {
		responseType = "code"
	}
	scope := p.Scope
	if scope == "" {
		scope = "openid profile email"
	}
	q.Set("client_id", clientID)
	q.Set("redirect_uri", redirectURI)
	q.Set("response_type", responseType)
	q.Set("scope", scope)
	if p.State != "" {
		q.Set("state", p.State)
	}
	if p.AppID != "" {
		q.Set("app_id", p.AppID)
	}
	return c.baseURL() + "/api/v1/auth/oauth/authorize?" + q.Encode()
}

// ExchangeCode 授权码换 token
func (c *Client) ExchangeCode(code, redirectURI string) (*TokenResponse, error) {
	if redirectURI == "" {
		redirectURI = c.redirectURI()
	}
	payload := map[string]string{
		"grant_type":    "authorization_code",
		"code":          code,
		"redirect_uri":  redirectURI,
		"client_id":     c.clientID(),
		"client_secret": c.clientSecret(),
	}
	status, data, err := c.postJSON("/api/v1/auth/oauth/token", payload, "")
	if err != nil {
		return nil, err
	}
	if status != http.StatusOK {
		return nil, parseAPIError(status, data)
	}
	var tok TokenResponse
	if err := decodeJSON(data, &tok); err != nil {
		return nil, err
	}
	return &tok, nil
}

// RefreshToken 用 refresh_token 续签
func (c *Client) RefreshToken(refreshToken string) (*TokenResponse, error) {
	payload := map[string]string{
		"grant_type":    "refresh_token",
		"refresh_token": refreshToken,
		"client_id":     c.clientID(),
		"client_secret": c.clientSecret(),
	}
	status, data, err := c.postJSON("/api/v1/auth/oauth/token", payload, "")
	if err != nil {
		return nil, err
	}
	if status != http.StatusOK {
		return nil, parseAPIError(status, data)
	}
	var tok TokenResponse
	if err := decodeJSON(data, &tok); err != nil {
		return nil, err
	}
	return &tok, nil
}

// GetUserInfo 获取当前用户信息
func (c *Client) GetUserInfo(accessToken string) (UserInfo, error) {
	auth := accessToken
	if auth != "" && !strings.HasPrefix(strings.ToLower(auth), "bearer ") {
		auth = "Bearer " + auth
	}
	status, data, err := c.getJSON("/api/v1/auth/oauth/userinfo", auth)
	if err != nil {
		return nil, err
	}
	if status != http.StatusOK {
		return nil, parseAPIError(status, data)
	}
	var info UserInfo
	if err := decodeJSON(data, &info); err != nil {
		return nil, err
	}
	return info, nil
}

// BuildLogoutURL 构建登出跳转 URL
func (c *Client) BuildLogoutURL(idTokenHint, postLogoutRedirectURI, state string) string {
	q := url.Values{}
	if idTokenHint != "" {
		q.Set("id_token_hint", idTokenHint)
	}
	if postLogoutRedirectURI != "" {
		q.Set("post_logout_redirect_uri", postLogoutRedirectURI)
	}
	if state != "" {
		q.Set("state", state)
	}
	return c.baseURL() + "/api/v1/auth/oauth/logout?" + q.Encode()
}

// CheckSession 检查 IdP session 并尝试恢复 token（W-92 跨应用）
func (c *Client) CheckSession(req SessionCheckRequest) (json.RawMessage, int, error) {
	status, data, err := c.postJSON("/api/v1/auth/oauth/session-check", req, "")
	if err != nil {
		return nil, 0, err
	}
	return data, status, nil
}

// ProxyTokenExchange 转发完整 token 请求体（保留 PKCE / state 等字段）
func (c *Client) ProxyTokenExchange(payload []byte) (int, []byte, error) {
	return c.postJSON("/api/v1/auth/oauth/token", json.RawMessage(payload), "")
}

// Introspect 校验 access token 是否有效
func (c *Client) Introspect(token string) (*IntrospectResponse, error) {
	payload := map[string]string{"token": token}
	status, data, err := c.postJSON("/api/v1/auth/introspect", payload, "")
	if err != nil {
		return nil, err
	}
	if status != http.StatusOK {
		return nil, parseAPIError(status, data)
	}
	var resp IntrospectResponse
	if err := decodeJSON(data, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// Health 检查 unit-auth 是否可达
func (c *Client) Health() error {
	req, err := http.NewRequest(http.MethodGet, c.baseURL()+"/health", nil)
	if err != nil {
		return err
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unit-auth health: status %d", resp.StatusCode)
	}
	return nil
}
