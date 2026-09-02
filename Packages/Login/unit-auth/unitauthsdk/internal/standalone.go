package internal

import (
	"errors"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"unit-auth/sdk"
)

// StandaloneConfig drives standalone token validation.
type StandaloneConfig struct {
	UnitAuthURL  string
	JWTSecret    string
	ClientID     string
	ClientSecret string
	HTTPClient   *http.Client
}

type jwtBeta struct {
	BetaGroup string `json:"beta_group"`
	Status    int    `json:"status"`
	ExpiresAt string `json:"expires_at"`
}

// jwtClaims only consumes UUID user_id; local_user_id is ignored.
type jwtClaims struct {
	UserID string   `json:"user_id"`
	Email  string   `json:"email"`
	Role   string   `json:"role"`
	Beta   *jwtBeta `json:"beta,omitempty"`
	jwt.RegisteredClaims
}

// ValidateStandaloneConfig returns an error when neither Introspect nor JWT is configured.
func ValidateStandaloneConfig(cfg StandaloneConfig) error {
	if strings.TrimSpace(cfg.UnitAuthURL) == "" && strings.TrimSpace(cfg.JWTSecret) == "" {
		return errors.New("standalone mode requires UnitAuthURL (Introspect) or JWTSecret")
	}
	return nil
}

// ExtractBearer returns the raw token from Authorization.
func ExtractBearer(header string) (string, error) {
	if header == "" {
		return "", errors.New("missing authorization")
	}
	h := strings.TrimSpace(header)
	if len(h) >= 7 && strings.EqualFold(h[:7], "bearer ") {
		tok := strings.TrimSpace(h[7:])
		if tok == "" {
			return "", errors.New("empty bearer token")
		}
		return tok, nil
	}
	return h, nil
}

// AuthenticateStandalone validates Bearer token via Introspect (preferred) or local JWT.
func AuthenticateStandalone(authHeader string, cfg StandaloneConfig) (Identity, error) {
	token, err := ExtractBearer(authHeader)
	if err != nil {
		return Identity{}, err
	}

	if strings.TrimSpace(cfg.UnitAuthURL) != "" {
		return introspectToken(token, cfg)
	}
	return verifyLocalJWT(token, cfg.JWTSecret)
}

func introspectToken(token string, cfg StandaloneConfig) (Identity, error) {
	client := sdk.New(sdk.Config{
		BaseURL:      cfg.UnitAuthURL,
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		HTTPClient:   cfg.HTTPClient,
	})
	info, err := client.Introspect(token)
	if err != nil {
		return Identity{}, err
	}
	if info == nil || !info.Active || strings.TrimSpace(info.UserID) == "" {
		return Identity{}, errors.New("token inactive or missing user_id")
	}
	return Identity{
		UserID: info.UserID,
		Email:  info.Email,
		Role:   info.Role,
		Beta:   betaFromSDK(info.Beta),
	}, nil
}

func betaFromSDK(b *sdk.BetaProfile) *BetaProfile {
	if b == nil {
		return nil
	}
	return &BetaProfile{Group: b.BetaGroup, Status: b.Status, ExpiresAt: b.ExpiresAt}
}

func verifyLocalJWT(tokenString, secret string) (Identity, error) {
	token, err := jwt.ParseWithClaims(tokenString, &jwtClaims{}, func(t *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil {
		return Identity{}, err
	}
	claims, ok := token.Claims.(*jwtClaims)
	if !ok || !token.Valid {
		return Identity{}, errors.New("invalid token claims")
	}
	if strings.TrimSpace(claims.UserID) == "" {
		return Identity{}, errors.New("missing user_id claim")
	}
	id := Identity{
		UserID: claims.UserID,
		Email:  claims.Email,
		Role:   claims.Role,
	}
	if claims.Beta != nil {
		id.Beta = &BetaProfile{
			Group:     claims.Beta.BetaGroup,
			Status:    claims.Beta.Status,
			ExpiresAt: claims.Beta.ExpiresAt,
		}
	}
	return id, nil
}
