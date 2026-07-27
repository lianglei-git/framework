package unitauthsdk

import (
	"net/http"
	"os"
)

// MiddlewareConfig configures NewMiddleware (contract §4.2).
type MiddlewareConfig struct {
	Mode Mode // empty → ModeFromEnv()

	// standalone
	UnitAuthURL  string // Introspect base URL (preferred when set)
	JWTSecret    string // local JWT; used when UnitAuthURL is empty
	ClientID     string
	ClientSecret string // edge / standalone only
	HTTPClient   *http.Client

	// plugin: if non-empty, require matching X-Internal-Token on every request.
	// standalone: if non-empty, matching X-Internal-Token + X-User-Id is an S2S
	// path (no Bearer); absent header falls back to Bearer. Empty = Bearer only.
	InternalToken string

	// optional header overrides (defaults: X-User-Id / X-User-Email / X-User-Role)
	UserIDHeader    string
	UserEmailHeader string
	UserRoleHeader  string
}

// MiddlewareConfigFromEnv builds config from standard env vars (contract §3).
func MiddlewareConfigFromEnv() MiddlewareConfig {
	return MiddlewareConfig{
		Mode:          ModeFromEnv(),
		UnitAuthURL:   os.Getenv("UNIT_AUTH_URL"),
		JWTSecret:     os.Getenv("JWT_SECRET"),
		ClientID:      os.Getenv("UNIT_AUTH_CLIENT_ID"),
		ClientSecret:  os.Getenv("UNIT_AUTH_CLIENT_SECRET"),
		InternalToken: os.Getenv("INTERNAL_TOKEN"),
	}
}

func (c MiddlewareConfig) resolvedMode() Mode {
	if c.Mode == "" {
		return ModeFromEnv()
	}
	return c.Mode
}

func (c MiddlewareConfig) userIDHeader() string {
	if c.UserIDHeader != "" {
		return c.UserIDHeader
	}
	return HeaderUserID
}

func (c MiddlewareConfig) userEmailHeader() string {
	if c.UserEmailHeader != "" {
		return c.UserEmailHeader
	}
	return HeaderUserEmail
}

func (c MiddlewareConfig) userRoleHeader() string {
	if c.UserRoleHeader != "" {
		return c.UserRoleHeader
	}
	return HeaderUserRole
}
