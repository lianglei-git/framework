package sdk

import (
	"net/http"
	"strings"
	"time"
)

// Config unit-auth OAuth 客户端配置（用于子项目 BFF）
type Config struct {
	// BaseURL unit-auth 服务地址，如 http://localhost:8080
	BaseURL string
	// ClientID / ClientSecret OAuth 客户端凭据（secret 仅放服务端）
	ClientID     string
	ClientSecret string
	// RedirectURI 授权回调地址（子项目前端 origin）
	RedirectURI string
	// HTTPClient 可选自定义 HTTP 客户端
	HTTPClient *http.Client
}

// Client 调用 unit-auth OAuth/OIDC API 的 Go SDK 客户端
type Client struct {
	cfg        Config
	httpClient *http.Client
}

// New 创建 SDK 客户端
func New(cfg Config) *Client {
	cfg.BaseURL = strings.TrimRight(cfg.BaseURL, "/")
	hc := cfg.HTTPClient
	if hc == nil {
		hc = &http.Client{Timeout: 15 * time.Second}
	}
	return &Client{cfg: cfg, httpClient: hc}
}

func (c *Client) baseURL() string { return c.cfg.BaseURL }

func (c *Client) clientID() string     { return c.cfg.ClientID }
func (c *Client) clientSecret() string { return c.cfg.ClientSecret }
func (c *Client) redirectURI() string  { return c.cfg.RedirectURI }

// Exported accessors for MountBFF / edge helpers in unitauthsdk.
func (c *Client) BaseURL() string      { return c.cfg.BaseURL }
func (c *Client) GetClientID() string  { return c.cfg.ClientID }
func (c *Client) GetClientSecret() string {
	return c.cfg.ClientSecret
}
func (c *Client) GetRedirectURI() string { return c.cfg.RedirectURI }
