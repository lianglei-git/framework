// sso_test_d — 子项目 BFF，client_secret 仅保存在服务端。
package main

import (
	"encoding/json"
	"flag"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"unit-auth/sdk"
)

type ServerConfig struct {
	Port         string `json:"port"`
	UnitAuthURL  string `json:"unit_auth_url"`
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	RedirectURI  string `json:"redirect_uri"`
	AppID        string `json:"app_id"`
}

func loadConfig() ServerConfig {
	cfg := ServerConfig{
		Port:         envOr("PORT", "5558"),
		UnitAuthURL:  envOr("UNIT_AUTH_URL", "http://localhost:8080"),
		ClientID:     os.Getenv("CLIENT_ID"),
		ClientSecret: os.Getenv("CLIENT_SECRET"),
		RedirectURI:  envOr("REDIRECT_URI", "http://localhost:5176"),
		AppID:        envOr("APP_ID", "sso_sso_test_d"),
	}

	configFile := flag.String("config", "config.json", "JSON 配置文件路径")
	flag.Parse()

	if *configFile != "" {
		if raw, err := os.ReadFile(*configFile); err == nil {
			var fileCfg ServerConfig
			if err := json.Unmarshal(raw, &fileCfg); err != nil {
				log.Fatalf("parse config: %v", err)
			}
			if fileCfg.Port != "" {
				cfg.Port = fileCfg.Port
			}
			if fileCfg.UnitAuthURL != "" {
				cfg.UnitAuthURL = fileCfg.UnitAuthURL
			}
			if fileCfg.ClientID != "" {
				cfg.ClientID = fileCfg.ClientID
			}
			if fileCfg.ClientSecret != "" {
				cfg.ClientSecret = fileCfg.ClientSecret
			}
			if fileCfg.RedirectURI != "" {
				cfg.RedirectURI = fileCfg.RedirectURI
			}
			if fileCfg.AppID != "" {
				cfg.AppID = fileCfg.AppID
			}
		}
	}

	if cfg.ClientID == "" || cfg.ClientSecret == "" {
		log.Fatal("CLIENT_ID and CLIENT_SECRET are required (config.json or env)")
	}
	return cfg
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func cors() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, Accept")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func proxyGET(upstream, path string) (int, []byte, error) {
	target := strings.TrimRight(upstream, "/") + path
	resp, err := http.Get(target)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	return resp.StatusCode, body, err
}

// requireAuth 校验 Bearer token，通过时将 IntrospectResponse 注入 context key "claims"
func requireAuth(auth *sdk.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := strings.TrimSpace(strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer "))
		if token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":             "invalid_token",
				"error_description": "Authorization header missing or empty",
			})
			return
		}
		info, err := auth.Introspect(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":             "invalid_token",
				"error_description": err.Error(),
			})
			return
		}
		if !info.Active {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":             "invalid_token",
				"error_description": "token inactive or expired",
			})
			return
		}
		c.Set("claims", info)
		c.Next()
	}
}

var startTime = time.Now()

func main() {
	cfg := loadConfig()
	auth := sdk.New(sdk.Config{
		BaseURL:      cfg.UnitAuthURL,
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		RedirectURI:  cfg.RedirectURI,
	})

	if err := auth.Health(); err != nil {
		log.Printf("warn: unit-auth not reachable yet: %v", err)
	}

	log.Printf("sso_test_d server :%s app=%s client=%s upstream=%s",
		cfg.Port, cfg.AppID, cfg.ClientID, cfg.UnitAuthURL)

	r := gin.Default()
	r.Use(cors())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok", "service": "sso_test_d",
			"app_id": cfg.AppID, "client_id": cfg.ClientID,
		})
	})

	// ──────────────────── OAuth SSO 代理路由 ────────────────────
	api := r.Group("/api/v1/auth")
	{
		api.GET("/oauth/:provider/url", func(c *gin.Context) {
			q := c.Request.URL.Query()
			params := sdk.AuthorizeURLParams{
				ClientID:     firstNonEmpty(q.Get("client_id"), cfg.ClientID),
				RedirectURI:  firstNonEmpty(q.Get("redirect_uri"), cfg.RedirectURI),
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
			c.JSON(http.StatusOK, gin.H{"code": 200, "message": "OAuth URL generated", "data": gin.H{"auth_url": authURL}})
		})

		api.POST("/oauth/token", func(c *gin.Context) {
			var req map[string]interface{}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request"})
				return
			}
			req["client_id"] = cfg.ClientID
			req["client_secret"] = cfg.ClientSecret
			if req["redirect_uri"] == nil || req["redirect_uri"] == "" {
				req["redirect_uri"] = cfg.RedirectURI
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
		})

		api.POST("/oauth/refresh", func(c *gin.Context) {
			var req struct {
				RefreshToken string `json:"refresh_token"`
			}
			if err := c.ShouldBindJSON(&req); err != nil || req.RefreshToken == "" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request"})
				return
			}
			tok, err := auth.RefreshToken(req.RefreshToken)
			if err != nil {
				writeSDKError(c, err)
				return
			}
			c.JSON(http.StatusOK, tok)
		})

		api.GET("/oauth/userinfo", func(c *gin.Context) {
			token := strings.TrimSpace(strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer "))
			if token == "" {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_token"})
				return
			}
			info, err := auth.GetUserInfo(token)
			if err != nil {
				writeSDKError(c, err)
				return
			}
			c.JSON(http.StatusOK, info)
		})

		api.GET("/oauth/logout", func(c *gin.Context) {
			logoutURL := auth.BuildLogoutURL(
				c.Query("id_token_hint"),
				c.Query("post_logout_redirect_uri"),
				c.Query("state"),
			)
			c.Redirect(http.StatusFound, logoutURL)
		})

		api.POST("/oauth/session-check", func(c *gin.Context) {
			var req sdk.SessionCheckRequest
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
		})
	}

	// ──────────────────── Demo 业务路由 ────────────────────

	// 公开接口：无需登录
	r.GET("/api/v1/demo/time", func(c *gin.Context) {
		now := time.Now()
		c.JSON(http.StatusOK, gin.H{
			"server_time": now.Format(time.RFC3339),
			"timestamp":   now.UnixMilli(),
			"uptime_sec":  int64(time.Since(startTime).Seconds()),
		})
	})

	// 受保护接口：需要有效 token
	protected := r.Group("/api/v1/demo", requireAuth(auth))
	{
		// GET /time-auth — 服务器时间 + 当前用户 ID（用于触发 401→refresh 测试）
		protected.GET("/time-auth", func(c *gin.Context) {
			claims := c.MustGet("claims").(*sdk.IntrospectResponse)
			now := time.Now()
			c.JSON(http.StatusOK, gin.H{
				"server_time": now.Format(time.RFC3339),
				"timestamp":   now.UnixMilli(),
				"uptime_sec":  int64(time.Since(startTime).Seconds()),
				"user_id":     claims.UserID,
				"email":       claims.Email,
			})
		})

		// GET /whoami — 返回完整 token claims
		protected.GET("/whoami", func(c *gin.Context) {
			claims := c.MustGet("claims").(*sdk.IntrospectResponse)
			c.JSON(http.StatusOK, gin.H{
				"active":     claims.Active,
				"user_id":    claims.UserID,
				"email":      claims.Email,
				"role":       claims.Role,
				"token_type": claims.TokenType,
				"exp":        claims.Exp,
				"expires_at": claims.ExpiresAt,
			})
		})

		// POST /add — body {"a": number, "b": number}，返回 sum
		protected.POST("/add", func(c *gin.Context) {
			claims := c.MustGet("claims").(*sdk.IntrospectResponse)
			var req struct {
				A float64 `json:"a"`
				B float64 `json:"b"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "detail": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{
				"a":       req.A,
				"b":       req.B,
				"sum":     req.A + req.B,
				"user_id": claims.UserID,
			})
		})

		// POST /echo — 原样回显 body，附加用户 ID
		protected.POST("/echo", func(c *gin.Context) {
			claims := c.MustGet("claims").(*sdk.IntrospectResponse)
			var body interface{}
			if err := c.ShouldBindJSON(&body); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request"})
				return
			}
			c.JSON(http.StatusOK, gin.H{
				"echo":    body,
				"user_id": claims.UserID,
			})
		})
	}

	// OIDC discovery 代理
	r.GET("/api/v1/openid-configuration", func(c *gin.Context) {
		status, body, err := proxyGET(cfg.UnitAuthURL, "/api/v1/openid-configuration")
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
			return
		}
		c.Data(status, "application/json", body)
	})

	r.GET("/api/v1/sso/providers", func(c *gin.Context) {
		status, body, err := proxyGET(cfg.UnitAuthURL, "/api/v1/sso/providers")
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
			return
		}
		c.Data(status, "application/json", body)
	})

	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
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

func writeSDKError(c *gin.Context, err error) {
	if apiErr, ok := err.(*sdk.APIError); ok {
		status := apiErr.Status
		if status == 0 {
			status = http.StatusBadRequest
		}
		c.Data(status, "application/json", []byte(apiErr.Body))
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
}
