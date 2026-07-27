package unitauthsdk

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"unit-auth/unitauthsdk/internal"
)

// NewMiddleware returns a Gin middleware that internalizes AUTH_MODE.
//
// plugin: missing X-User-Id → 400 {"error":"missing_user_id"}
// standalone: Bearer (Introspect/JWT); when INTERNAL_TOKEN is set, a matching
// X-Internal-Token opens a service-to-service path that trusts X-User-Id.
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
		return standaloneMiddleware(cfg, sc), nil
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

func standaloneMiddleware(cfg MiddlewareConfig, sc internal.StandaloneConfig) gin.HandlerFunc {
	expectedInternal := strings.TrimSpace(cfg.InternalToken)
	identityHeaders := internal.PluginHeaders{
		UserID: cfg.userIDHeader(),
		Email:  cfg.userEmailHeader(),
		Role:   cfg.userRoleHeader(),
		// Token already verified before calling AuthenticatePlugin on S2S path.
		InternalToken: "",
	}
	return func(c *gin.Context) {
		// S2S channel: only when INTERNAL_TOKEN is configured and the header is present.
		if expectedInternal != "" {
			got := strings.TrimSpace(c.GetHeader(HeaderInternalToken))
			if got != "" {
				if got != expectedInternal {
					c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
					return
				}
				res := internal.AuthenticatePlugin(c.Request, identityHeaders)
				if !res.OK {
					c.AbortWithStatusJSON(res.Status, gin.H{"error": res.Error})
					return
				}
				setIdentity(c, res.Identity)
				c.Next()
				return
			}
		}

		id, err := internal.AuthenticateStandalone(c.GetHeader("Authorization"), sc)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		setIdentity(c, id)
		c.Next()
	}
}
