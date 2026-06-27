package utils

// IsValidRole 验证角色是否有效
func IsValidRole(role string) bool {
	validRoles := []string{"user", "admin", "moderator"}
	for _, validRole := range validRoles {
		if role == validRole {
			return true
		}
	}
	return false
}

// IsValidStatus 验证状态是否有效
func IsValidStatus(status string) bool {
	validStatuses := []string{"active", "inactive", "suspended", "pending"}
	for _, validStatus := range validStatuses {
		if status == validStatus {
			return true
		}
	}
	return false
}

// GetValidRoles 获取所有有效角色
func GetValidRoles() []string {
	return []string{"user", "admin", "moderator"}
}

// GetValidStatuses 获取所有有效状态
func GetValidStatuses() []string {
	return []string{"active", "inactive", "suspended", "pending"}
}

// GetRoleDescription 获取角色描述
func GetRoleDescription(role string) string {
	descriptions := map[string]string{
		"user":      "普通用户",
		"admin":     "管理员",
		"moderator": "版主",
	}
	return descriptions[role]
}

// GetStatusDescription 获取状态描述
func GetStatusDescription(status string) string {
	descriptions := map[string]string{
		"active":    "活跃",
		"inactive":  "非活跃",
		"suspended": "已暂停",
		"pending":   "待审核",
	}
	return descriptions[status]
}
