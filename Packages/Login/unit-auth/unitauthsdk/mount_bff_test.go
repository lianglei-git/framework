package unitauthsdk_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"unit-auth/unitauthsdk"
)

func TestMountBFF_AuthorizeURLAndProviders(t *testing.T) {
	gin.SetMode(gin.TestMode)

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/v1/sso/providers":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"providers":["local"]}`))
		case "/api/v1/openid-configuration":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"issuer":"test"}`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer upstream.Close()

	auth := unitauthsdk.New(unitauthsdk.Config{
		BaseURL:      upstream.URL,
		ClientID:     "cid",
		ClientSecret: "csec",
		RedirectURI:  "http://localhost:5179",
	})

	r := gin.New()
	unitauthsdk.MountBFF(r, auth, unitauthsdk.MountBFFConfig{AppID: "sso_demo"})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/oauth/local/url?state=abc", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("authorize url status = %d body=%s", w.Code, w.Body.String())
	}
	var body map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	data, _ := body["data"].(map[string]interface{})
	authURL, _ := data["auth_url"].(string)
	if authURL == "" {
		t.Fatalf("missing auth_url: %v", body)
	}

	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/sso/providers", nil)
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)
	if w2.Code != http.StatusOK {
		t.Fatalf("providers status = %d body=%s", w2.Code, w2.Body.String())
	}
	if !json.Valid(w2.Body.Bytes()) {
		t.Fatalf("providers body not json: %s", w2.Body.String())
	}
}
