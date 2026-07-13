package unitauthsdk_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"unit-auth/unitauthsdk"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func newTestRouter(mw gin.HandlerFunc) *gin.Engine {
	r := gin.New()
	r.Use(mw)
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"user_id": unitauthsdk.UserID(c),
			"email":   unitauthsdk.Email(c),
			"role":    unitauthsdk.Role(c),
		})
	})
	return r
}

func TestPlugin_MissingUserID_400(t *testing.T) {
	mw, err := unitauthsdk.NewMiddleware(unitauthsdk.MiddlewareConfig{Mode: unitauthsdk.ModePlugin})
	if err != nil {
		t.Fatal(err)
	}
	r := newTestRouter(mw)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body=%s", w.Code, w.Body.String())
	}
	var body map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["error"] != unitauthsdk.ErrorMissingUserID {
		t.Fatalf("error = %q, want %q", body["error"], unitauthsdk.ErrorMissingUserID)
	}
}

func TestPlugin_WithUserID_OK(t *testing.T) {
	mw, err := unitauthsdk.NewMiddleware(unitauthsdk.MiddlewareConfig{Mode: unitauthsdk.ModePlugin})
	if err != nil {
		t.Fatal(err)
	}
	r := newTestRouter(mw)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	req.Header.Set(unitauthsdk.HeaderUserID, "550e8400-e29b-41d4-a716-446655440000")
	req.Header.Set(unitauthsdk.HeaderUserEmail, "u@example.com")
	req.Header.Set(unitauthsdk.HeaderUserRole, "user")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", w.Code, w.Body.String())
	}
	var body map[string]string
	_ = json.Unmarshal(w.Body.Bytes(), &body)
	if body["user_id"] != "550e8400-e29b-41d4-a716-446655440000" {
		t.Fatalf("user_id = %q", body["user_id"])
	}
	if body["email"] != "u@example.com" || body["role"] != "user" {
		t.Fatalf("email/role = %+v", body)
	}
}

func TestPlugin_InternalTokenMismatch_401(t *testing.T) {
	mw, err := unitauthsdk.NewMiddleware(unitauthsdk.MiddlewareConfig{
		Mode:          unitauthsdk.ModePlugin,
		InternalToken: "secret-internal",
	})
	if err != nil {
		t.Fatal(err)
	}
	r := newTestRouter(mw)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	req.Header.Set(unitauthsdk.HeaderUserID, "550e8400-e29b-41d4-a716-446655440000")
	req.Header.Set(unitauthsdk.HeaderInternalToken, "wrong")
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", w.Code)
	}
}

func TestPlugin_InternalTokenMatch_OK(t *testing.T) {
	mw, err := unitauthsdk.NewMiddleware(unitauthsdk.MiddlewareConfig{
		Mode:          unitauthsdk.ModePlugin,
		InternalToken: "secret-internal",
	})
	if err != nil {
		t.Fatal(err)
	}
	r := newTestRouter(mw)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	req.Header.Set(unitauthsdk.HeaderUserID, "550e8400-e29b-41d4-a716-446655440000")
	req.Header.Set(unitauthsdk.HeaderInternalToken, "secret-internal")
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}
}

func TestStandalone_ConfigError(t *testing.T) {
	_, err := unitauthsdk.NewMiddleware(unitauthsdk.MiddlewareConfig{Mode: unitauthsdk.ModeStandalone})
	if err == nil {
		t.Fatal("expected error when neither UnitAuthURL nor JWTSecret set")
	}
}

func TestStandalone_MissingBearer_401(t *testing.T) {
	mw, err := unitauthsdk.NewMiddleware(unitauthsdk.MiddlewareConfig{
		Mode:      unitauthsdk.ModeStandalone,
		JWTSecret: "test-secret",
	})
	if err != nil {
		t.Fatal(err)
	}
	r := newTestRouter(mw)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", w.Code)
	}
}

func TestStandalone_BadJWT_401(t *testing.T) {
	mw, err := unitauthsdk.NewMiddleware(unitauthsdk.MiddlewareConfig{
		Mode:      unitauthsdk.ModeStandalone,
		JWTSecret: "test-secret",
	})
	if err != nil {
		t.Fatal(err)
	}
	r := newTestRouter(mw)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	req.Header.Set("Authorization", "Bearer not-a-jwt")
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", w.Code)
	}
}

func TestStandalone_ValidJWT_IgnoresLocalUserID(t *testing.T) {
	secret := "test-secret"
	uid := "550e8400-e29b-41d4-a716-446655440000"
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":       uid,
		"email":         "a@b.c",
		"role":          "admin",
		"local_user_id": "999", // must NOT become business identity
		"exp":           time.Now().Add(time.Hour).Unix(),
	})
	signed, err := tok.SignedString([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}

	mw, err := unitauthsdk.NewMiddleware(unitauthsdk.MiddlewareConfig{
		Mode:      unitauthsdk.ModeStandalone,
		JWTSecret: secret,
	})
	if err != nil {
		t.Fatal(err)
	}
	r := newTestRouter(mw)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	req.Header.Set("Authorization", "Bearer "+signed)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", w.Code, w.Body.String())
	}
	var body map[string]string
	_ = json.Unmarshal(w.Body.Bytes(), &body)
	if body["user_id"] != uid {
		t.Fatalf("user_id = %q, want UUID (not local_user_id)", body["user_id"])
	}
}

func TestStandalone_Introspect_Active(t *testing.T) {
	uid := "550e8400-e29b-41d4-a716-446655440000"
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/auth/introspect" {
			http.NotFound(w, r)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"active":  true,
			"user_id": uid,
			"email":   "i@example.com",
			"role":    "user",
		})
	}))
	defer srv.Close()

	mw, err := unitauthsdk.NewMiddleware(unitauthsdk.MiddlewareConfig{
		Mode:        unitauthsdk.ModeStandalone,
		UnitAuthURL: srv.URL,
		HTTPClient:  srv.Client(),
	})
	if err != nil {
		t.Fatal(err)
	}
	r := newTestRouter(mw)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	req.Header.Set("Authorization", "Bearer good-token")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", w.Code, w.Body.String())
	}
	var body map[string]string
	_ = json.Unmarshal(w.Body.Bytes(), &body)
	if body["user_id"] != uid {
		t.Fatalf("user_id = %q", body["user_id"])
	}
}

func TestStandalone_Introspect_Inactive_401(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"active":  false,
			"user_id": "",
		})
	}))
	defer srv.Close()

	mw, err := unitauthsdk.NewMiddleware(unitauthsdk.MiddlewareConfig{
		Mode:        unitauthsdk.ModeStandalone,
		UnitAuthURL: srv.URL,
		HTTPClient:  srv.Client(),
	})
	if err != nil {
		t.Fatal(err)
	}
	r := newTestRouter(mw)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	req.Header.Set("Authorization", "Bearer dead")
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", w.Code)
	}
}

func TestModeFromEnv_DefaultPlugin(t *testing.T) {
	t.Setenv("AUTH_MODE", "")
	if unitauthsdk.ModeFromEnv() != unitauthsdk.ModePlugin {
		t.Fatal("default should be plugin")
	}
	t.Setenv("AUTH_MODE", "standalone")
	if unitauthsdk.ModeFromEnv() != unitauthsdk.ModeStandalone {
		t.Fatal("want standalone")
	}
}

func TestUserIDFromContext(t *testing.T) {
	mw, err := unitauthsdk.NewMiddleware(unitauthsdk.MiddlewareConfig{Mode: unitauthsdk.ModePlugin})
	if err != nil {
		t.Fatal(err)
	}
	r := gin.New()
	r.Use(mw)
	r.GET("/ctx", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"from_ctx": unitauthsdk.UserIDFromContext(c.Request.Context())})
	})
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/ctx", nil)
	req.Header.Set(unitauthsdk.HeaderUserID, "550e8400-e29b-41d4-a716-446655440000")
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d", w.Code)
	}
	var body map[string]string
	_ = json.Unmarshal(w.Body.Bytes(), &body)
	if body["from_ctx"] != "550e8400-e29b-41d4-a716-446655440000" {
		t.Fatalf("from_ctx = %q", body["from_ctx"])
	}
}
