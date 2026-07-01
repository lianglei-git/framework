package middleware

import (
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRateLimitConcurrentAccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	t.Setenv("RATE_LIMIT_SKIP_LOCALHOST", "false")
	t.Setenv("RATE_LIMIT_REQUESTS", "1000")
	t.Setenv("RATE_LIMIT_DURATION", "1m")

	r := gin.New()
	r.Use(RateLimit())
	r.GET("/ping", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	var wg sync.WaitGroup
	for i := 0; i < 200; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			req := httptest.NewRequest(http.MethodGet, "/ping", nil)
			req.RemoteAddr = "203.0.113.1:12345"
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
		}()
	}
	wg.Wait()
}
