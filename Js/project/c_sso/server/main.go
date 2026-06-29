// c_sso 子项目后端：通过 unit-auth/sdk 对接 OAuth，client_secret 仅保存在服务端。
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
		Port:        envOr("PORT", "5557"),
		UnitAuthURL: envOr("UNIT_AUTH_URL", "http://localhost:8080"),
		ClientID:    os.Getenv("CLIENT_ID"),
		ClientSecret: os.Getenv("CLIENT_SECRET"),
		RedirectURI: envOr("REDIRECT_URI", "http://localhost:5175"),
		AppID:       envOr("APP_ID", "sso_test_c"),
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

	log.Printf("c_sso server :%s app=%s client=%s upstream=%s",
		cfg.Port, cfg.AppID, cfg.ClientID, cfg.UnitAuthURL)

	r := gin.Default()
	r.Use(cors())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "ok",
			"service":   "c_sso",
			"app_id":    cfg.AppID,
			"client_id": cfg.ClientID,
		})
	})

	api := r.Group("/api/v1/auth")
	{
		// 与前端 SDK 约定：sub_job 即子项目 authorize URL 构建
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
			// 透传 PKCE 等前端附加参数
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
				"code":    200,
				"message": "OAuth URL generated",
				"data": gin.H{
					"auth_url": authURL,
				},
			})
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
			token := strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ")
			token = strings.TrimSpace(token)
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
			url := auth.BuildLogoutURL(
				c.Query("id_token_hint"),
				c.Query("post_logout_redirect_uri"),
				c.Query("state"),
			)
			c.Redirect(http.StatusFound, url)
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
