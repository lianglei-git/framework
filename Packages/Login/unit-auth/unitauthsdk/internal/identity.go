package internal

import "context"

// BetaProfile is optional beta-qualification from token / introspect / plugin headers.
type BetaProfile struct {
	Group     string
	Status    int
	ExpiresAt string
}

// Identity is the v4 business identity (UUID user_id only).
type Identity struct {
	UserID string
	Email  string
	Role   string
	Beta   *BetaProfile
}

type ctxKey int

const identityKey ctxKey = 1

// WithIdentity stores Identity on a stdlib context.
func WithIdentity(ctx context.Context, id Identity) context.Context {
	return context.WithValue(ctx, identityKey, id)
}

// FromContext returns Identity if present.
func FromContext(ctx context.Context) (Identity, bool) {
	if ctx == nil {
		return Identity{}, false
	}
	id, ok := ctx.Value(identityKey).(Identity)
	return id, ok
}
