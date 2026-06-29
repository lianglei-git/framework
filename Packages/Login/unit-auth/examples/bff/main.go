// Sub-project BFF: proxies OAuth token/userinfo and builds authorize URLs.
// Keeps client_secret server-side. Configure via env or -config file.
package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

type Config struct {
	Port         string
	SSOServerURL string
	ClientID     string
	ClientSecret string
	RedirectURI  string
}

func loadConfig() Config {
	cfg := Config{
		Port:         envOr("BFF_PORT", "5555"),
		SSOServerURL: strings.TrimRight(envOr("BFF_SSO_SERVER_URL", "http://localhost:8080"), "/"),
		ClientID:     os.Getenv("BFF_CLIENT_ID"),
		ClientSecret: os.Getenv("BFF_CLIENT_SECRET"),
		RedirectURI:  os.Getenv("BFF_REDIRECT_URI"),
	}

	configFile := flag.String("config", "", "optional JSON config file")
	flag.Parse()

	if *configFile != "" {
		raw, err := os.ReadFile(*configFile)
		if err != nil {
			log.Fatalf("read config: %v", err)
		}
		var fileCfg map[string]string
		if err := json.Unmarshal(raw, &fileCfg); err != nil {
			log.Fatalf("parse config: %v", err)
		}
		if v := fileCfg["port"]; v != "" {
			cfg.Port = v
		}
		if v := fileCfg["sso_server_url"]; v != "" {
			cfg.SSOServerURL = strings.TrimRight(v, "/")
		}
		if v := fileCfg["client_id"]; v != "" {
			cfg.ClientID = v
		}
		if v := fileCfg["client_secret"]; v != "" {
			cfg.ClientSecret = v
		}
		if v := fileCfg["redirect_uri"]; v != "" {
			cfg.RedirectURI = v
		}
	}

	if cfg.ClientID == "" || cfg.ClientSecret == "" {
		log.Fatal("BFF_CLIENT_ID and BFF_CLIENT_SECRET are required")
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
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, Accept")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func proxyRequest(targetURL, method string, headers map[string]string, body []byte) (int, []byte, error) {
	req, err := http.NewRequest(method, targetURL, bytes.NewBuffer(body))
	if err != nil {
		return 0, nil, err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(resp.Body)
	return resp.StatusCode, data, err
}

func main() {
	cfg := loadConfig()
	log.Printf("BFF starting on :%s client=%s redirect=%s upstream=%s",
		cfg.Port, cfg.ClientID, cfg.RedirectURI, cfg.SSOServerURL)

	r := gin.Default()
	r.Use(cors())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "client_id": cfg.ClientID})
	})

	auth := r.Group("/api/v1/auth")
	{
		auth.GET("/oauth/:provider/url", func(c *gin.Context) {
			authorizeURI := cfg.SSOServerURL + "/api/v1/auth/oauth/authorize"
			q := c.Request.URL.Query()
			if q.Get("client_id") == "" {
				q.Set("client_id", cfg.ClientID)
			}
			if q.Get("redirect_uri") == "" && cfg.RedirectURI != "" {
				q.Set("redirect_uri", cfg.RedirectURI)
			}
			if q.Get("response_type") == "" {
				q.Set("response_type", "code")
			}
			if q.Get("scope") == "" {
				q.Set("scope", "openid profile email")
			}
			authURL := authorizeURI + "?" + q.Encode()
			c.JSON(http.StatusOK, gin.H{
				"code":    200,
				"message": "OAuth URL generated",
				"data": gin.H{
					"auth_url": authURL,
				},
			})
		})

		userInfoURI := cfg.SSOServerURL + "/api/v1/auth/oauth/userinfo"
		auth.GET("/oauth/userinfo", func(c *gin.Context) {
			headers := map[string]string{"Accept": "application/json"}
			if h := c.GetHeader("Authorization"); h != "" {
				headers["Authorization"] = h
			}
			status, body, err := proxyRequest(userInfoURI, http.MethodGet, headers, nil)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.Data(status, "application/json", body)
		})

		auth.POST("/oauth/refresh", func(c *gin.Context) {
			var req map[string]interface{}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request"})
				return
			}
			req["client_id"] = cfg.ClientID
			req["client_secret"] = cfg.ClientSecret
			if req["grant_type"] == nil {
				req["grant_type"] = "refresh_token"
			}
			payload, _ := json.Marshal(req)
			tokenURI := cfg.SSOServerURL + "/api/v1/auth/oauth/token"
			status, body, err := proxyRequest(tokenURI, http.MethodPost, map[string]string{
				"Content-Type": "application/json",
				"Accept":       "application/json",
			}, payload)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.Data(status, "application/json", body)
		})

		auth.POST("/oauth/session-check", func(c *gin.Context) {
			var req map[string]interface{}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request"})
				return
			}
			if req["app_id"] == nil || req["app_id"] == "" {
				// 由子项目 SDK 传入 app_id（如 sso_test_a），勿用 client_id 替代
			}
			payload, _ := json.Marshal(req)
			sessionURI := cfg.SSOServerURL + "/api/v1/auth/oauth/session-check"
			status, body, err := proxyRequest(sessionURI, http.MethodPost, map[string]string{
				"Content-Type": "application/json",
				"Accept":       "application/json",
			}, payload)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.Data(status, "application/json", body)
		})

		auth.POST("/oauth/token", func(c *gin.Context) {
			var req map[string]interface{}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request"})
				return
			}
			req["client_id"] = cfg.ClientID
			req["client_secret"] = cfg.ClientSecret
			if req["redirect_uri"] == nil && cfg.RedirectURI != "" {
				req["redirect_uri"] = cfg.RedirectURI
			}
			payload, _ := json.Marshal(req)
			tokenURI := cfg.SSOServerURL + "/api/v1/auth/oauth/token"
			status, body, err := proxyRequest(tokenURI, http.MethodPost, map[string]string{
				"Content-Type": "application/json",
				"Accept":       "application/json",
			}, payload)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.Data(status, "application/json", body)
		})

		auth.GET("/oauth/logout", func(c *gin.Context) {
			logoutURI := cfg.SSOServerURL + "/api/v1/auth/oauth/logout"
			params := url.Values{}
			for _, key := range []string{"id_token_hint", "post_logout_redirect_uri", "state"} {
				if v := c.Query(key); v != "" {
					params.Set(key, v)
				}
			}
			c.Redirect(http.StatusFound, logoutURI+"?"+params.Encode())
		})
	}

	addr := fmt.Sprintf(":%s", cfg.Port)
	if err := r.Run(addr); err != nil {
		log.Fatal(err)
	}
}
