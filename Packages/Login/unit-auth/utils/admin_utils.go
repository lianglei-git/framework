package utils

// IsValidRole 验证角色是否有效
func IsValidRole(role string) bool {
	validRoles := []string{"user", "admin", "moderator", "beta", "ops"}
	for _, validRole := range validRoles {
		if role == validRole {
			return true
		}
	}
	return false
}

// IsValidStatus 验证账号状态是否有效（1 正常 / 2 冻结 / 3 注销）
func IsValidStatus(status string) bool {
	validStatuses := []string{"active", "frozen", "cancelled"}
	for _, validStatus := range validStatuses {
		if status == validStatus {
			return true
		}
	}
	return false
}

// GetValidRoles 获取所有有效角色
func GetValidRoles() []string {
	return []string{"user", "admin", "moderator", "beta", "ops"}
}

// GetValidStatuses 获取所有有效账号状态
func GetValidStatuses() []string {
	return []string{"active", "frozen", "cancelled"}
}

// GetRoleDescription 获取角色描述
func GetRoleDescription(role string) string {
	descriptions := map[string]string{
		"user":      "普通用户",
		"admin":     "管理员",
		"moderator": "版主",
		"beta":      "内测",
		"ops":       "运营",
	}
	return descriptions[role]
}

// GetStatusDescription 获取账号状态描述
func GetStatusDescription(status string) string {
	descriptions := map[string]string{
		"active":    "正常",
		"frozen":    "冻结",
		"cancelled": "注销",
	}
	return descriptions[status]
}

// IsValidBetaGroup 内测分组仅 A/B/C
func IsValidBetaGroup(group string) bool {
	return group == "A" || group == "B" || group == "C"
}

// IsValidBetaStatus 内测资格：0 失效 / 1 有效 / 2 暂停
func IsValidBetaStatus(status int) bool {
	return status == 0 || status == 1 || status == 2
}

// AccountStatusBlocksLogin 冻结、注销立即拦登录
func AccountStatusBlocksLogin(status string) bool {
	return status != "active"
}
