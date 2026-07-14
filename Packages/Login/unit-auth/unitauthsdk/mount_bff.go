package unitauthsdk

import (
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
)

// MountBFFConfig configures MountBFF.
type MountBFFConfig struct {
	// AppID is the default app_id for authorize URL / session-check when the
	// request omits it.
	AppID string
}

// MountBFF registers the standard edge BFF routes used by sub-project frontends:
//
//	GET  /api/v1/auth/oauth/:provider/url
//	POST /api/v1/auth/oauth/token
//	POST /api/v1/auth/oauth/refresh
//	GET  /api/v1/auth/oauth/userinfo
//	GET  /api/v1/auth/oauth/logout
//	POST /api/v1/auth/oauth/session-check
//	GET  /api/v1/openid-configuration
//	GET  /api/v1/sso/providers
//
// client_secret stays on the Client; callers only New + MountBFF.
func MountBFF(r gin.IRouter, auth *Client, cfg MountBFFConfig) {
	if auth == nil {
		panic("unitauthsdk.MountBFF: auth client is nil")
	}

	api := r.Group("/api/v1/auth")
	{
		api.GET("/oauth/:provider/url", mountAuthorizeURL(auth, cfg))
		api.POST("/oauth/token", mountTokenExchange(auth))
		api.POST("/oauth/refresh", mountRefresh(auth))
		api.GET("/oauth/userinfo", mountUserInfo(auth))
		api.GET("/oauth/logout", mountLogout(auth))
		api.POST("/oauth/session-check", mountSessionCheck(auth, cfg))
	}

	r.GET("/api/v1/openid-configuration", mountProxyGET(auth, "/api/v1/openid-configuration"))
	r.GET("/api/v1/sso/providers", mountProxyGET(auth, "/api/v1/sso/providers"))
}

// PluginProxyConfig configures MountPluginProxy.
type PluginProxyConfig struct {
	// UpstreamURL is the business API base (e.g. http://localhost:5561).
	UpstreamURL string
	// UpstreamPathPrefix is prepended before the wildcard path
	// (default "/api/v1/plugin").
	UpstreamPathPrefix string
	// MountPath is the BFF route pattern (default "/api/v1/proxy/plugin/*path").
	MountPath string
	// InternalToken is sent as X-Internal-Token to the plugin upstream.
	InternalToken string
}

// MountPluginProxy registers a Bearer→Introspect→identity-header forwarder for
// plugin-mode business APIs. Optional; not required for OAuth-only BFFs.
func MountPluginProxy(r gin.IRouter, auth *Client, cfg PluginProxyConfig) {
	if auth == nil {
		panic("unitauthsdk.MountPluginProxy: auth client is nil")
	}
	upstream := strings.TrimRight(cfg.UpstreamURL, "/")
	if upstream == "" {
		panic("unitauthsdk.MountPluginProxy: UpstreamURL is required")
	}
	prefix := cfg.UpstreamPathPrefix
	if prefix == "" {
		prefix = "/api/v1/plugin"
	}
	prefix = "/" + strings.Trim(prefix, "/")
	mountPath := cfg.MountPath
	if mountPath == "" {
		mountPath = "/api/v1/proxy/plugin/*path"
	}

	r.Any(mountPath, func(c *gin.Context) {
		token := strings.TrimSpace(strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer "))
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_token"})
			return
		}
		info, err := auth.Introspect(token)
		if err != nil || info == nil || !info.Active {
			desc := "token inactive or expired"
			if err != nil {
				desc = err.Error()
			}
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":             "invalid_token",
				"error_description": desc,
			})
			return
		}

		suffix := strings.TrimPrefix(c.Param("path"), "/")
		target := upstream + prefix + "/" + suffix
		if raw := c.Request.URL.RawQuery; raw != "" {
			target += "?" + raw
		}

		var bodyReader io.Reader
		if c.Request.Body != nil && c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead {
			bodyReader = c.Request.Body
		}
		req, err := http.NewRequestWithContext(c.Request.Context(), c.Request.Method, target, bodyReader)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if ct := c.GetHeader("Content-Type"); ct != "" {
			req.Header.Set("Content-Type", ct)
		}
		req.Header.Set(HeaderUserID, info.UserID)
		if info.Email != "" {
			req.Header.Set(HeaderUserEmail, info.Email)
		}
		if info.Role != "" {
			req.Header.Set(HeaderUserRole, info.Role)
		}
		if cfg.InternalToken != "" {
			req.Header.Set(HeaderInternalToken, cfg.InternalToken)
		}

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
			return
		}
		defer resp.Body.Close()
		data, err := io.ReadAll(resp.Body)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
			return
		}
		ct := resp.Header.Get("Content-Type")
		if ct == "" {
			ct = "application/json"
		}
		c.Data(resp.StatusCode, ct, data)
	})
}

// CORS is a permissive CORS middleware for local BFF / independent App demos.
// Must allow PATCH/PUT/DELETE — Memo/Memory item updates use PATCH from the browser.
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, Accept")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func mountAuthorizeURL(auth *Client, cfg MountBFFConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		q := c.Request.URL.Query()
		params := AuthorizeURLParams{
			ClientID:     firstNonEmpty(q.Get("client_id"), auth.GetClientID()),
			RedirectURI:  firstNonEmpty(q.Get("redirect_uri"), auth.GetRedirectURI()),
			ResponseType: firstNonEmpty(q.Get("response_type"), "code"),
			Scope:        firstNonEmpty(q.Get("scope"), "openid profile email"),
			State:        q.Get("state"),
			AppID:        firstNonEmpty(q.Get("app_id"), cfg.AppID),
		}
		authURL := auth.BuildAuthorizeURL(params)
		if u, err := url.Parse(authURL); err == nil {
			merged := u.Query()
			for key, vals := range q {
				if len(vals) == 0 || merged.Get(key) != "" {
					continue
				}
				merged.Set(key, vals[0])
			}
			u.RawQuery = merged.Encode()
			authURL = u.String()
		}
		c.JSON(http.StatusOK, gin.H{
			"code": 200, "message": "OAuth URL generated",
			"data": gin.H{"auth_url": authURL},
		})
	}
}

func mountTokenExchange(auth *Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req map[string]interface{}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request"})
			return
		}
		req["client_id"] = auth.GetClientID()
		req["client_secret"] = auth.GetClientSecret()
		if req["redirect_uri"] == nil || req["redirect_uri"] == "" {
			req["redirect_uri"] = auth.GetRedirectURI()
		}
		if req["grant_type"] == nil {
			req["grant_type"] = "authorization_code"
		}
		payload, _ := json.Marshal(req)
		status, data, err := auth.ProxyTokenExchange(payload)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.Data(status, "application/json", data)
	}
}

func mountRefresh(auth *Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			RefreshToken string `json:"refresh_token"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.RefreshToken == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request"})
			return
		}
		tok, err := auth.RefreshToken(req.RefreshToken)
		if err != nil {
			writeMountSDKError(c, err)
			return
		}
		c.JSON(http.StatusOK, tok)
	}
}

func mountUserInfo(auth *Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := strings.TrimSpace(strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer "))
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_token"})
			return
		}
		info, err := auth.GetUserInfo(token)
		if err != nil {
			writeMountSDKError(c, err)
			return
		}
		c.JSON(http.StatusOK, info)
	}
}

func mountLogout(auth *Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		logoutURL := auth.BuildLogoutURL(
			c.Query("id_token_hint"),
			c.Query("post_logout_redirect_uri"),
			c.Query("state"),
		)
		c.Redirect(http.StatusFound, logoutURL)
	}
}

func mountSessionCheck(auth *Client, cfg MountBFFConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req SessionCheckRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request"})
			return
		}
		if req.AppID == "" {
			req.AppID = cfg.AppID
		}
		data, status, err := auth.CheckSession(req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.Data(status, "application/json", data)
	}
}

func mountProxyGET(auth *Client, path string) gin.HandlerFunc {
	return func(c *gin.Context) {
		status, body, err := auth.ProxyGET(path)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
			return
		}
		c.Data(status, "application/json", body)
	}
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

func writeMountSDKError(c *gin.Context, err error) {
	if apiErr, ok := err.(*APIError); ok {
		status := apiErr.Status
		if status == 0 {
			status = http.StatusBadRequest
		}
		c.Data(status, "application/json", []byte(apiErr.Body))
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
}
