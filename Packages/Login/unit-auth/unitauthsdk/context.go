package unitauthsdk

import (
	"context"

	"github.com/gin-gonic/gin"
	"unit-auth/unitauthsdk/internal"
)

// UserID returns the UUID string from gin context; "" if unset.
func UserID(c *gin.Context) string {
	if c == nil {
		return ""
	}
	if v, ok := c.Get(ContextKeyUserID); ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

// Email returns the email from gin context; "" if unset.
func Email(c *gin.Context) string {
	if c == nil {
		return ""
	}
	if v, ok := c.Get(ContextKeyEmail); ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

// Role returns the role from gin context; "" if unset.
func Role(c *gin.Context) string {
	if c == nil {
		return ""
	}
	if v, ok := c.Get(ContextKeyRole); ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

// UserIDFromContext returns UUID from a stdlib context previously set via middleware
// (Request.Context after gin inject) or internal.WithIdentity.
func UserIDFromContext(ctx context.Context) string {
	id, ok := internal.FromContext(ctx)
	if !ok {
		return ""
	}
	return id.UserID
}

func setIdentity(c *gin.Context, id internal.Identity) {
	c.Set(ContextKeyUserID, id.UserID)
	c.Set(ContextKeyEmail, id.Email)
	c.Set(ContextKeyRole, id.Role)
	c.Request = c.Request.WithContext(internal.WithIdentity(c.Request.Context(), id))
}
