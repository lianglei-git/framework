package unitauthsdk

import (
	"os"
	"strings"
)

// Mode is the AUTH_MODE runtime (contract §3).
type Mode string

const (
	ModePlugin     Mode = "plugin"
	ModeStandalone Mode = "standalone"
)

// ModeFromEnv reads AUTH_MODE. Empty / unknown → ModePlugin.
func ModeFromEnv() Mode {
	switch strings.ToLower(strings.TrimSpace(os.Getenv("AUTH_MODE"))) {
	case string(ModeStandalone):
		return ModeStandalone
	default:
		return ModePlugin
	}
}
