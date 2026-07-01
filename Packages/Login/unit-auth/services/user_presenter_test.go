package services

import (
	"strings"
	"testing"
	"unit-auth/models"
)

func TestPresentUserResponse_DefaultAvatar(t *testing.T) {
	user := &models.User{Username: "alice"}
	resp := PresentUserResponse(user, "http://api.test")
	if !strings.HasPrefix(resp.AvatarURL, "https://api.dicebear.com/") {
		t.Fatalf("expected dicebear url, got %q", resp.AvatarURL)
	}
	if !strings.Contains(resp.AvatarURL, "alice") {
		t.Fatalf("expected seed in url, got %q", resp.AvatarURL)
	}
}

func TestPresentUserResponse_LocalRef(t *testing.T) {
	user := &models.User{Username: "alice"}
	_ = user.SetAvatar("local:u1.jpg")

	resp := PresentUserResponse(user, "http://api.test")
	want := "http://api.test/api/v1/user/avatar/u1.jpg"
	if resp.AvatarURL != want {
		t.Fatalf("got %q want %q", resp.AvatarURL, want)
	}
}

func TestPresentUserResponse_ExternalRef(t *testing.T) {
	user := &models.User{Username: "alice"}
	external := "https://cdn.example.com/a.png"
	_ = user.SetAvatar(external)

	resp := PresentUserResponse(user, "http://api.test")
	if resp.AvatarURL != external {
		t.Fatalf("got %q want %q", resp.AvatarURL, external)
	}
}

func TestPresentUserResponse_OSSWithCDN(t *testing.T) {
	t.Setenv("FILE_COS_CDN_BASE", "https://cdn.test")
	user := &models.User{Username: "alice"}
	_ = user.SetAvatar("oss:avatars/u1.jpg")

	resp := PresentUserResponse(user, "http://api.test")
	want := "https://cdn.test/avatars/u1.jpg"
	if resp.AvatarURL != want {
		t.Fatalf("got %q want %q", resp.AvatarURL, want)
	}
}

func TestBuildOAuthUserInfo(t *testing.T) {
	user := &models.User{
		ID:       "user-1",
		Username: "alice",
		Nickname: "爱丽丝",
	}
	email := "alice@example.com"
	user.Email = &email
	_ = user.SetAvatar("oss:avatars/u1.jpg")

	t.Setenv("FILE_COS_CDN_BASE", "https://cdn.test")
	info := BuildOAuthUserInfo(user, "http://api.test")

	if info["id"] != "user-1" || info["sub"] != "user-1" {
		t.Fatalf("unexpected id/sub: %+v", info)
	}
	if info["name"] != "爱丽丝" {
		t.Fatalf("name should prefer nickname, got %v", info["name"])
	}
	if info["username"] != "alice" {
		t.Fatalf("unexpected username: %v", info["username"])
	}
	if info["avatar_url"] != "https://cdn.test/avatars/u1.jpg" {
		t.Fatalf("unexpected avatar_url: %v", info["avatar_url"])
	}
	if info["picture"] != info["avatar_url"] || info["avatar"] != info["avatar_url"] {
		t.Fatalf("picture/avatar should match avatar_url: %+v", info)
	}
}
