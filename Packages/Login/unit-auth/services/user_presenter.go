package services

import (
	"strings"

	"unit-auth/models"
	"unit-auth/utils"
)

// PresentUserResponse 将用户转为 API 响应，并填充可展示的 avatar_url
func PresentUserResponse(u *models.User, apiBase string) models.UserResponse {
	resp := u.ToResponse()
	raw := u.GetAvatar()
	if raw == "" {
		resp.AvatarURL = utils.GetDefaultAvatar(u.Username)
	} else {
		resp.AvatarURL = ResolveStoredFileURL(raw, apiBase)
	}
	return resp
}

// BuildOAuthUserInfo 构建 OIDC userinfo 及子项目 getUserInfo 友好字段
func BuildOAuthUserInfo(u *models.User, apiBase string) map[string]interface{} {
	presented := PresentUserResponse(u, apiBase)
	displayName := strings.TrimSpace(u.Nickname)
	if displayName == "" {
		displayName = u.Username
	}

	info := map[string]interface{}{
		"sub":                u.ID,
		"id":                 u.ID,
		"preferred_username": u.Username,
		"username":           u.Username,
		"name":               displayName,
		"nickname":           u.Nickname,
		"picture":            presented.AvatarURL,
		"avatar_url":         presented.AvatarURL,
		"avatar":             presented.AvatarURL,
	}

	if u.Email != nil && strings.TrimSpace(*u.Email) != "" {
		info["email"] = *u.Email
		info["email_verified"] = u.EmailVerified
	}
	if u.Phone != nil && strings.TrimSpace(*u.Phone) != "" {
		info["phone_number"] = *u.Phone
		info["phone_number_verified"] = u.PhoneVerified
	}

	return info
}
