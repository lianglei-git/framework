// My SSO App — minimal BFF: MountBFF + whoami.
// client_secret 仅保存在服务端。
package main

import (
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"unit-auth/unitauthsdk"
)

type config struct {
	Port         string `json:"port"`
	UnitAuthURL  string `json:"unit_auth_url"`
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	RedirectURI  string `json:"redirect_uri"`
	AppID        string `json:"app_id"`
}

func main() {
	cfg := loadConfig()

	auth := unitauthsdk.New(unitauthsdk.Config{
		BaseURL:      cfg.UnitAuthURL,
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		RedirectURI:  cfg.RedirectURI,
	})

	mw, err := unitauthsdk.NewMiddleware(unitauthsdk.MiddlewareConfig{
		Mode:         unitauthsdk.ModeStandalone,
		UnitAuthURL:  cfg.UnitAuthURL,
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
	})
	if err != nil {
		log.Fatal(err)
	}

	r := gin.Default()
	r.Use(unitauthsdk.CORS())
	unitauthsdk.MountBFF(r, auth, unitauthsdk.MountBFFConfig{AppID: cfg.AppID})

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	r.GET("/api/v1/demo/whoami", mw, func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"user_id": unitauthsdk.UserID(c),
			"email":   unitauthsdk.Email(c),
			"role":    unitauthsdk.Role(c),
		})
	})

	log.Printf("my_sso bff :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}

func loadConfig() config {
	cfg := config{
		Port:         envOr("PORT", "5558"),
		UnitAuthURL:  envOr("UNIT_AUTH_URL", "http://localhost:8080"),
		ClientID:     os.Getenv("CLIENT_ID"),
		ClientSecret: os.Getenv("CLIENT_SECRET"),
		RedirectURI:  envOr("REDIRECT_URI", "http://localhost:5176"),
		AppID:        envOr("APP_ID", "sso_test_my"),
	}
	path := flag.String("config", "config.json", "config path")
	flag.Parse()
	if raw, err := os.ReadFile(*path); err == nil {
		_ = json.Unmarshal(raw, &cfg)
	}
	if v := os.Getenv("PORT"); v != "" {
		cfg.Port = v
	}
	if cfg.ClientID == "" || cfg.ClientSecret == "" {
		log.Fatal("client_id/client_secret required (config.json or env)")
	}
	return cfg
}

func envOr(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}
