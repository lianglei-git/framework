package internal

import (
	"net/http"
	"strconv"
	"strings"
)

// PluginHeaders are the identity header names for plugin mode.
type PluginHeaders struct {
	UserID        string
	Email         string
	Role          string
	InternalToken string // expected value; empty = skip check
}

// PluginResult is the outcome of plugin-mode auth.
type PluginResult struct {
	Identity Identity
	OK       bool
	Status   int
	Error    string // JSON "error" field when !OK
}

const (
	headerUserBetaGroup   = "X-User-Beta-Group"
	headerUserBetaStatus  = "X-User-Beta-Status"
	headerUserBetaExpires = "X-User-Beta-Expires"
)

func betaFromPluginHeaders(r *http.Request) *BetaProfile {
	group := strings.TrimSpace(r.Header.Get(headerUserBetaGroup))
	statusRaw := strings.TrimSpace(r.Header.Get(headerUserBetaStatus))
	expires := strings.TrimSpace(r.Header.Get(headerUserBetaExpires))
	if group == "" && statusRaw == "" && expires == "" {
		return nil
	}
	status := 0
	if statusRaw != "" {
		if n, err := strconv.Atoi(statusRaw); err == nil {
			status = n
		}
	}
	return &BetaProfile{Group: group, Status: status, ExpiresAt: expires}
}

// AuthenticatePlugin reads identity from headers. Missing X-User-Id → 400 missing_user_id.
// Wrong/missing InternalToken (when configured) → 401.
func AuthenticatePlugin(r *http.Request, h PluginHeaders) PluginResult {
	if h.InternalToken != "" {
		got := strings.TrimSpace(r.Header.Get("X-Internal-Token"))
		if got != h.InternalToken {
			return PluginResult{Status: http.StatusUnauthorized, Error: "unauthorized"}
		}
	}

	userID := strings.TrimSpace(r.Header.Get(h.UserID))
	if userID == "" {
		return PluginResult{Status: http.StatusBadRequest, Error: "missing_user_id"}
	}

	return PluginResult{
		OK: true,
		Identity: Identity{
			UserID: userID,
			Email:  strings.TrimSpace(r.Header.Get(h.Email)),
			Role:   strings.TrimSpace(r.Header.Get(h.Role)),
			Beta:   betaFromPluginHeaders(r),
		},
	}
}
