package models

import (
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

// Role 角色表
type Role struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"not null;size:50;uniqueIndex"`
	Description string    `json:"description" gorm:"size:500"`
	Level       int       `json:"level" gorm:"default:0"`         // 角色等级，数字越大权限越高
	IsSystem    bool      `json:"is_system" gorm:"default:false"` // 是否为系统角色
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Permission 权限表
type Permission struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"not null;size:100;uniqueIndex"`
	Description string    `json:"description" gorm:"size:500"`
	Resource    string    `json:"resource" gorm:"not null;size:100"` // 资源名称
	Action      string    `json:"action" gorm:"not null;size:50"`    // 操作类型：create, read, update, delete
	Project     string    `json:"project" gorm:"size:50"`            // 所属项目，空表示全局权限
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// RolePermission 角色权限关联表
type RolePermission struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	RoleID       uint      `json:"role_id" gorm:"not null"`
	PermissionID uint      `json:"permission_id" gorm:"not null"`
	GrantedAt    time.Time `json:"granted_at"`
	GrantedBy    string    `json:"granted_by" gorm:"size:36"` // 授权人ID
	CreatedAt    time.Time `json:"created_at"`

	// 关联
	Role       Role       `json:"role" gorm:"foreignKey:RoleID"`
	Permission Permission `json:"permission" gorm:"foreignKey:PermissionID"`
}

// UserRole 用户角色关联表
type UserRole struct {
	ID        uint       `json:"id" gorm:"primaryKey"`
	UserID    string     `json:"user_id" gorm:"not null;size:36"`
	RoleID    uint       `json:"role_id" gorm:"not null"`
	Project   string     `json:"project" gorm:"size:50"` // 项目特定角色，空表示全局角色
	GrantedAt time.Time  `json:"granted_at"`
	GrantedBy string     `json:"granted_by" gorm:"size:36"` // 授权人ID
	ExpiresAt *time.Time `json:"expires_at"`                // 角色过期时间
	IsActive  bool       `json:"is_active" gorm:"default:true"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`

	// 关联
	User User `json:"user" gorm:"foreignKey:UserID"`
	Role Role `json:"role" gorm:"foreignKey:RoleID"`
}

// AccessControl 访问控制表
type AccessControl struct {
	ID        uint       `json:"id" gorm:"primaryKey"`
	UserID    string     `json:"user_id" gorm:"not null;size:36"`
	Resource  string     `json:"resource" gorm:"not null;size:100"`
	Action    string     `json:"action" gorm:"not null;size:50"`
	Project   string     `json:"project" gorm:"size:50"`
	Condition JSON       `json:"condition" gorm:"type:json"` // 访问条件
	IsAllowed bool       `json:"is_allowed" gorm:"default:true"`
	Priority  int        `json:"priority" gorm:"default:0"` // 优先级，数字越大优先级越高
	ExpiresAt *time.Time `json:"expires_at"`
	IsActive  bool       `json:"is_active" gorm:"default:true"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`

	// 关联
	User User `json:"user" gorm:"foreignKey:UserID"`
}

// PermissionGroup 权限组表
type PermissionGroup struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"not null;size:100;uniqueIndex"`
	Description string    `json:"description" gorm:"size:500"`
	Project     string    `json:"project" gorm:"size:50"`
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// PermissionGroupItem 权限组项目表
type PermissionGroupItem struct {
	ID                uint      `json:"id" gorm:"primaryKey"`
	PermissionGroupID uint      `json:"permission_group_id" gorm:"not null"`
	PermissionID      uint      `json:"permission_id" gorm:"not null"`
	CreatedAt         time.Time `json:"created_at"`

	// 关联
	PermissionGroup PermissionGroup `json:"permission_group" gorm:"foreignKey:PermissionGroupID"`
	Permission      Permission      `json:"permission" gorm:"foreignKey:PermissionID"`
}

// AuditLog 审计日志表
type AuditLog struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	UserID     string    `json:"user_id" gorm:"size:36"`
	Action     string    `json:"action" gorm:"not null;size:100"`
	Resource   string    `json:"resource" gorm:"not null;size:100"`
	ResourceID string    `json:"resource_id" gorm:"size:100"`
	Project    string    `json:"project" gorm:"size:50"`
	Details    JSON      `json:"details" gorm:"type:json"`
	IPAddress  string    `json:"ip_address" gorm:"size:45"`
	UserAgent  string    `json:"user_agent" gorm:"size:500"`
	Status     string    `json:"status" gorm:"size:20"` // success, failed, denied
	ErrorMsg   string    `json:"error_msg" gorm:"size:500"`
	CreatedAt  time.Time `json:"created_at"`

	// 关联
	User User `json:"user" gorm:"foreignKey:UserID"`
}

// 请求和响应结构体

// CreateRoleRequest 创建角色请求
type CreateRoleRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description,omitempty"`
	Level       int    `json:"level,omitempty"`
	IsSystem    bool   `json:"is_system,omitempty"`
}

// UpdateRoleRequest 更新角色请求
type UpdateRoleRequest struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	Level       *int    `json:"level,omitempty"`
	IsActive    *bool   `json:"is_active,omitempty"`
}

// CreatePermissionRequest 创建权限请求
type CreatePermissionRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description,omitempty"`
	Resource    string `json:"resource" binding:"required"`
	Action      string `json:"action" binding:"required"`
	Project     string `json:"project,omitempty"`
}

// AssignRoleRequest 分配角色请求
type AssignRoleRequest struct {
	UserID    string     `json:"user_id" binding:"required"`
	RoleID    uint       `json:"role_id" binding:"required"`
	Project   string     `json:"project,omitempty"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

// GrantPermissionRequest 授权请求
type GrantPermissionRequest struct {
	RoleID       uint   `json:"role_id" binding:"required"`
	PermissionID uint   `json:"permission_id" binding:"required"`
	GrantedBy    string `json:"granted_by" binding:"required"`
}

// CheckPermissionRequest 检查权限请求
type CheckPermissionRequest struct {
	UserID   string `json:"user_id" binding:"required"`
	Resource string `json:"resource" binding:"required"`
	Action   string `json:"action" binding:"required"`
	Project  string `json:"project,omitempty"`
}

// RoleResponse 角色响应
type RoleResponse struct {
	ID          uint      `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Level       int       `json:"level"`
	IsSystem    bool      `json:"is_system"`
	IsActive    bool      `json:"is_active"`
	Permissions []string  `json:"permissions"`
	UserCount   int       `json:"user_count"`
	CreatedAt   time.Time `json:"created_at"`
}

// PermissionResponse 权限响应
type PermissionResponse struct {
	ID          uint      `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Resource    string    `json:"resource"`
	Action      string    `json:"action"`
	Project     string    `json:"project"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
}

// UserPermissionResponse 用户权限响应
type UserPermissionResponse struct {
	UserID      string   `json:"user_id"`
	Username    string   `json:"username"`
	Email       string   `json:"email"`
	Roles       []string `json:"roles"`
	Permissions []string `json:"permissions"`
	Projects    []string `json:"projects"`
}

// AuditLogResponse 审计日志响应
type AuditLogResponse struct {
	ID         uint      `json:"id"`
	UserID     string    `json:"user_id"`
	Username   string    `json:"username"`
	Action     string    `json:"action"`
	Resource   string    `json:"resource"`
	ResourceID string    `json:"resource_id"`
	Project    string    `json:"project"`
	Status     string    `json:"status"`
	IPAddress  string    `json:"ip_address"`
	CreatedAt  time.Time `json:"created_at"`
}

// 方法实现

// GetCondition 获取访问条件
func (ac *AccessControl) GetCondition() (map[string]interface{}, error) {
	if len(ac.Condition) == 0 {
		return map[string]interface{}{}, nil
	}

	var condition map[string]interface{}
	err := json.Unmarshal(ac.Condition, &condition)
	if err != nil {
		return nil, err
	}
	return condition, nil
}

// SetCondition 设置访问条件
func (ac *AccessControl) SetCondition(condition map[string]interface{}) error {
	if condition == nil {
		ac.Condition = nil
		return nil
	}

	jsonData, err := json.Marshal(condition)
	if err != nil {
		return err
	}
	ac.Condition = JSON(jsonData)
	return nil
}

// GetDetails 获取审计日志详情
func (al *AuditLog) GetDetails() (map[string]interface{}, error) {
	if len(al.Details) == 0 {
		return map[string]interface{}{}, nil
	}

	var details map[string]interface{}
	err := json.Unmarshal(al.Details, &details)
	if err != nil {
		return nil, err
	}
	return details, nil
}

// SetDetails 设置审计日志详情
func (al *AuditLog) SetDetails(details map[string]interface{}) error {
	if details == nil {
		al.Details = nil
		return nil
	}

	jsonData, err := json.Marshal(details)
	if err != nil {
		return err
	}
	al.Details = JSON(jsonData)
	return nil
}

// HasPermission 检查用户是否有指定权限
func (u *User) HasPermission(db *gorm.DB, resource, action, project string) (bool, error) {
	// 检查用户角色权限
	var count int64
	err := db.Model(&RolePermission{}).
		Joins("JOIN user_roles ON role_permissions.role_id = user_roles.role_id").
		Joins("JOIN permissions ON role_permissions.permission_id = permissions.id").
		Where("user_roles.user_id = ? AND permissions.resource = ? AND permissions.action = ? AND user_roles.is_active = ? AND permissions.is_active = ?",
			u.ID, resource, action, true, true).
		Where("(user_roles.project = ? OR user_roles.project = '') AND (permissions.project = ? OR permissions.project = '')",
			project, project).
		Count(&count).Error

	if err != nil {
		return false, err
	}

	if count > 0 {
		return true, nil
	}

	// 检查直接访问控制
	var accessControl AccessControl
	err = db.Where("user_id = ? AND resource = ? AND action = ? AND is_active = ?",
		u.ID, resource, action, true).
		Where("(project = ? OR project = '')", project).
		Order("priority DESC").
		First(&accessControl).Error

	if err == gorm.ErrRecordNotFound {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return accessControl.IsAllowed, nil
}

// GetUserRoles 获取用户角色
func (u *User) GetUserRoles(db *gorm.DB, project string) ([]Role, error) {
	var roles []Role
	query := db.Model(&Role{}).
		Joins("JOIN user_roles ON roles.id = user_roles.role_id").
		Where("user_roles.user_id = ? AND user_roles.is_active = ?", u.ID, true)

	if project != "" {
		query = query.Where("(user_roles.project = ? OR user_roles.project = '')", project)
	}

	err := query.Find(&roles).Error
	return roles, err
}

// GetUserPermissions 获取用户权限
func (u *User) GetUserPermissions(db *gorm.DB, project string) ([]Permission, error) {
	var permissions []Permission
	query := db.Model(&Permission{}).
		Joins("JOIN role_permissions ON permissions.id = role_permissions.permission_id").
		Joins("JOIN user_roles ON role_permissions.role_id = user_roles.role_id").
		Where("user_roles.user_id = ? AND user_roles.is_active = ? AND permissions.is_active = ?",
			u.ID, true, true)

	if project != "" {
		query = query.Where("(user_roles.project = ? OR user_roles.project = '') AND (permissions.project = ? OR permissions.project = '')",
			project, project)
	}

	err := query.Distinct().Find(&permissions).Error
	return permissions, err
}
