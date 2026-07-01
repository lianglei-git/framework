package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"unit-auth/models"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupSessionRevokeTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.SSOSession{}, &models.User{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

func TestRevokeOtherUserSessions(t *testing.T) {
	db := setupSessionRevokeTestDB(t)
	expires := time.Now().Add(24 * time.Hour)
	sessions := []models.SSOSession{
		{ID: "sess-keep", UserID: "user-1", ClientID: "c1", RefreshTokenHash: "h1", Status: "active", ExpiresAt: expires},
		{ID: "sess-old-1", UserID: "user-1", ClientID: "c1", RefreshTokenHash: "h2", Status: "active", ExpiresAt: expires},
		{ID: "sess-old-2", UserID: "user-1", ClientID: "c1", RefreshTokenHash: "h3", Status: "active", ExpiresAt: expires},
		{ID: "sess-other-user", UserID: "user-2", ClientID: "c1", RefreshTokenHash: "h4", Status: "active", ExpiresAt: expires},
	}
	for i := range sessions {
		if err := db.Create(&sessions[i]).Error; err != nil {
			t.Fatalf("create session: %v", err)
		}
	}

	revokeOtherUserSessions(db, "user-1", "sess-keep")

	var keep models.SSOSession
	if err := db.First(&keep, "id = ?", "sess-keep").Error; err != nil {
		t.Fatal(err)
	}
	if keep.Status != "active" {
		t.Fatalf("keep session status %q want active", keep.Status)
	}

	for _, id := range []string{"sess-old-1", "sess-old-2"} {
		var s models.SSOSession
		if err := db.First(&s, "id = ?", id).Error; err != nil {
			t.Fatal(err)
		}
		if s.Status != "revoked" {
			t.Fatalf("%s status %q want revoked", id, s.Status)
		}
	}

	var other models.SSOSession
	if err := db.First(&other, "id = ?", "sess-other-user").Error; err != nil {
		t.Fatal(err)
	}
	if other.Status != "active" {
		t.Fatalf("other user session should stay active, got %q", other.Status)
	}
}

func TestCheckSessionAndGetToken_RevokedReturnsSessionRevoked(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupSessionRevokeTestDB(t)
	expires := time.Now().Add(24 * time.Hour)
	sess := models.SSOSession{
		ID: "revoked-sess", UserID: "user-1", ClientID: "c1",
		RefreshTokenHash: "hash", Status: "revoked", ExpiresAt: expires,
	}
	if err := db.Create(&sess).Error; err != nil {
		t.Fatal(err)
	}

	body, _ := json.Marshal(SessionCheckRequest{SessionID: "revoked-sess", AppID: "app-1"})
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/auth/oauth/session-check", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	CheckSessionAndGetToken(db)(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("status %d want 401", w.Code)
	}
	if !strings.Contains(w.Body.String(), "SESSION_REVOKED") {
		t.Fatalf("body %q", w.Body.String())
	}
}

func TestGetSSOSessionCheck_RevokedCookie(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupSessionRevokeTestDB(t)
	expires := time.Now().Add(24 * time.Hour)
	sess := models.SSOSession{
		ID: "cookie-revoked", UserID: "user-1", ClientID: "c1",
		RefreshTokenHash: "hash", Status: "revoked", ExpiresAt: expires,
	}
	if err := db.Create(&sess).Error; err != nil {
		t.Fatal(err)
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/sso/session/check", nil)
	c.Request.AddCookie(&http.Cookie{Name: "sso_session_id", Value: "cookie-revoked"})

	GetSSOSessionCheck(db)(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("status %d want 401", w.Code)
	}
	if !strings.Contains(w.Body.String(), "SESSION_REVOKED") {
		t.Fatalf("body %q", w.Body.String())
	}
}
