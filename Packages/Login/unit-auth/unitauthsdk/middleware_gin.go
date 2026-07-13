package unitauthsdk

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"unit-auth/unitauthsdk/internal"
)

// NewMiddleware returns a Gin middleware that internalizes AUTH_MODE.
//
// plugin: missing X-User-Id → 400 {"error":"missing_user_id"}
// standalone: missing/invalid token → 401
func NewMiddleware(cfg MiddlewareConfig) (gin.HandlerFunc, error) {
	mode := cfg.resolvedMode()
	switch mode {
	case ModePlugin:
		return pluginMiddleware(cfg), nil
	case ModeStandalone:
		sc := internal.StandaloneConfig{
			UnitAuthURL:  cfg.UnitAuthURL,
			JWTSecret:    cfg.JWTSecret,
			ClientID:     cfg.ClientID,
			ClientSecret: cfg.ClientSecret,
			HTTPClient:   cfg.HTTPClient,
		}
		if err := internal.ValidateStandaloneConfig(sc); err != nil {
			return nil, err
		}
		return standaloneMiddleware(sc), nil
	default:
		return nil, fmt.Errorf("unknown AUTH_MODE %q", mode)
	}
}

func pluginMiddleware(cfg MiddlewareConfig) gin.HandlerFunc {
	headers := internal.PluginHeaders{
		UserID:        cfg.userIDHeader(),
		Email:         cfg.userEmailHeader(),
		Role:          cfg.userRoleHeader(),
		InternalToken: cfg.InternalToken,
	}
	return func(c *gin.Context) {
		res := internal.AuthenticatePlugin(c.Request, headers)
		if !res.OK {
			c.AbortWithStatusJSON(res.Status, gin.H{"error": res.Error})
			return
		}
		setIdentity(c, res.Identity)
		c.Next()
	}
}

func standaloneMiddleware(sc internal.StandaloneConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := internal.AuthenticateStandalone(c.GetHeader("Authorization"), sc)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		setIdentity(c, id)
		c.Next()
	}
}
