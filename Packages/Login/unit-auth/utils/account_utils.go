package utils

import (
	"regexp"
	"strings"
)

// AccountType 账号类型
type AccountType string

const (
	AccountTypeEmail    AccountType = "email"
	AccountTypeUsername AccountType = "username"
	AccountTypePhone    AccountType = "phone"
	AccountTypeUnknown  AccountType = "unknown"
)

// IdentifyAccountType 识别账号类型
func IdentifyAccountType(account string) AccountType {
	account = strings.TrimSpace(account)

	// 检查是否为邮箱
	if isEmail(account) {
		return AccountTypeEmail
	}

	// 检查是否为手机号
	if isPhone(account) {
		return AccountTypePhone
	}

	// 检查是否为用户名
	if isUsername(account) {
		return AccountTypeUsername
	}

	return AccountTypeUnknown
}

// isEmail 检查是否为邮箱
func isEmail(email string) bool {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}

// isPhone 检查是否为手机号
func isPhone(phone string) bool {
	// 支持中国大陆手机号格式
	phoneRegex := regexp.MustCompile(`^1[3-9]\d{9}$`)
	return phoneRegex.MatchString(phone)
}

// isUsername 检查是否为用户名
func isUsername(username string) bool {
	// 用户名规则：3-20位字母、数字、下划线
	usernameRegex := regexp.MustCompile(`^[a-zA-Z0-9_]{3,20}$`)
	return usernameRegex.MatchString(username)
}

// ValidateAccount 验证账号格式
func ValidateAccount(account string) (bool, string) {
	accountType := IdentifyAccountType(account)

	switch accountType {
	case AccountTypeEmail:
		return true, "邮箱格式正确"
	case AccountTypePhone:
		return true, "手机号格式正确"
	case AccountTypeUsername:
		return true, "用户名格式正确"
	case AccountTypeUnknown:
		return false, "账号格式不正确，请使用邮箱、手机号或用户名"
	default:
		return false, "未知的账号类型"
	}
}

// GetAccountTypeDescription 获取账号类型描述
func GetAccountTypeDescription(accountType AccountType) string {
	switch accountType {
	case AccountTypeEmail:
		return "邮箱"
	case AccountTypePhone:
		return "手机号"
	case AccountTypeUsername:
		return "用户名"
	case AccountTypeUnknown:
		return "未知类型"
	default:
		return "未知类型"
	}
}
