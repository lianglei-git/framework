package handlers

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"unit-auth/utils"

	"github.com/gin-gonic/gin"
)

func TestWantsAuthorizeJSONResponse(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		accept string
		want   bool
	}{
		{"", false},
		{"text/html", false},
		{"application/json", true},
		{"application/json, text/plain", true},
	}

	for _, tt := range tests {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodGet, "/", nil)
		if tt.accept != "" {
			c.Request.Header.Set("Accept", tt.accept)
		}
		got := utils.WantsAuthorizeJSONResponse(c)
		if got != tt.want {
			t.Fatalf("accept %q: got %v want %v", tt.accept, got, tt.want)
		}
	}
}

func TestRedirectAuthorizeToLoginWeb(t *testing.T) {
	gin.SetMode(gin.TestMode)
	t.Setenv("LOGIN_WEB_URL", "http://localhost:3033")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(
		http.MethodGet,
		"/api/v1/auth/oauth/authorize?client_id=test-client&redirect_uri=http://localhost:5173&response_type=code&state=abc",
		nil,
	)
	c.Request.Host = "localhost:8080"

	redirectAuthorizeToLoginWeb(c, "session_not_found")

	if w.Code != http.StatusFound {
		t.Fatalf("status %d want %d", w.Code, http.StatusFound)
	}

	loc := w.Header().Get("Location")
	if loc == "" {
		t.Fatal("missing Location header")
	}
	parsed, err := url.Parse(loc)
	if err != nil {
		t.Fatal(err)
	}
	if parsed.Host != "localhost:3033" {
		t.Fatalf("host %q want localhost:3033", parsed.Host)
	}
	q := parsed.Query()
	if q.Get("app_origin") != "true" {
		t.Fatalf("app_origin %q", q.Get("app_origin"))
	}
	if q.Get("authorize_url") == "" {
		t.Fatalf("missing authorize_url in %q", loc)
	}
	if !strings.Contains(q.Get("authorize_url"), "/oauth/authorize") {
		t.Fatalf("authorize_url should point to authorize endpoint: %q", q.Get("authorize_url"))
	}
	if q.Get("sso_error") != "session_not_found" {
		t.Fatalf("sso_error %q", q.Get("sso_error"))
	}
	redirectURI := q.Get("authorize_url")
	if !strings.Contains(redirectURI, "client_id=test-client") {
		t.Fatalf("authorize_url missing client_id: %q", redirectURI)
	}

	cleared := false
	for _, cookie := range w.Result().Cookies() {
		if cookie.Name == "sso_session_id" && cookie.MaxAge < 0 {
			cleared = true
		}
	}
	if !cleared {
		t.Fatal("expected sso_session_id clearing cookie")
	}
}

func TestHandleAuthorizeLoginRequired_JSON(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/auth/oauth/authorize", nil)
	c.Request.Header.Set("Accept", "application/json")

	handleAuthorizeLoginRequired(c, "session_not_found")

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("status %d want 401", w.Code)
	}
	body := w.Body.String()
	if !strings.Contains(body, "SESSION_NOT_FOUND") {
		t.Fatalf("body %q", body)
	}
}
