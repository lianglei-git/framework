package utils

import (
	"fmt"
	"os"
)

// AvatarStyle 头像风格，可扩展 dicebear 的不同集合
type AvatarStyle string

const (
	AvatarStyleAdventurer AvatarStyle = "adventurer"
	AvatarStyleIdenticon  AvatarStyle = "identicon"
	AvatarStyleBottts     AvatarStyle = "bottts"
)

// GetAvatarStyle 从环境变量获取头像风格，默认 adventurer
func GetAvatarStyle() AvatarStyle {
	style := os.Getenv("AVATAR_STYLE")
	if style == "" {
		return AvatarStyleAdventurer
	}
	switch AvatarStyle(style) {
	case AvatarStyleAdventurer, AvatarStyleIdenticon, AvatarStyleBottts:
		return AvatarStyle(style)
	default:
		return AvatarStyleAdventurer
	}
}

// GetDefaultAvatar 生成默认头像URL（使用 dicebear，无需存储）
// seed 建议传用户名或邮箱前缀，保证同一用户稳定不变
func GetDefaultAvatar(seed string) string {
	style := GetAvatarStyle()
	return fmt.Sprintf("https://api.dicebear.com/7.x/%s/svg?seed=%s", style, seed)
}
