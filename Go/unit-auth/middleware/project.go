package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

const CtxProjectKey = "project_key"

// ProjectKeyMiddleware reads X-Genres-Type header or genres-type query and stores into context
func ProjectKeyMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.GetHeader("X-Genres-Type")
		if key == "" {
			key = c.Query("genres-type")
		}
		if key == "" {
			c.Next()
			return
		}
		c.Set(CtxProjectKey, key)
		c.Header("Vary", "X-Genres-Type")
		c.Next()
	}
}

// RequireProjectKey ensures project key exists in context
func RequireProjectKey() gin.HandlerFunc {
	return func(c *gin.Context) {
		if _, ok := c.Get(CtxProjectKey); !ok {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"code": 400, "message": "missing X-Genres-Type"})
			return
		}
		c.Next()
	}
}
