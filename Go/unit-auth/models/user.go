package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// UserMeta 用户元数据
type UserMeta struct {
	Avatar    string `json:"avatar,omitempty"`    // 头像
	Gender    string `json:"gender,omitempty"`    // 性别
	Birthday  string `json:"birthday,omitempty"`  // 生日
	RealName  string `json:"real_name,omitempty"` // 真实姓名
	Bio       string `json:"bio,omitempty"`       // 个人简介
	Location  string `json:"location,omitempty"`  // 地理位置
	Website   string `json:"website,omitempty"`   // 个人网站
	Company   string `json:"company,omitempty"`   // 公司
	JobTitle  string `json:"job_title,omitempty"` // 职位
	Education string `json:"education,omitempty"` // 教育背景
	Interests string `json:"interests,omitempty"` // 兴趣爱好
	Language  string `json:"language,omitempty"`  // 语言偏好
	Timezone  string `json:"timezone,omitempty"`  // 时区
	// 扩展字段，支持自定义属性
	Custom map[string]interface{} `json:"custom,omitempty"`
}

// User 用户表 - 重构后的核心用户信息
type User struct {
	ID            string  `json:"id" gorm:"primaryKey;type:varchar(36)"`
	Email         *string `json:"email" gorm:"uniqueIndex;size:255"` // 使用指针类型，允许NULL
	Phone         *string `json:"phone" gorm:"uniqueIndex;size:20"`  // 使用指针类型，允许NULL
	Username      string  `json:"username" gorm:"uniqueIndex;size:50"`
	Nickname      string  `json:"nickname" gorm:"size:100"`
	Password      string  `json:"-" gorm:"not null;size:255"` // 不返回密码
	Role          string  `json:"role" gorm:"default:'user';size:20"`
	Status        string  `json:"status" gorm:"default:'active';size:20"`
	EmailVerified bool    `json:"email_verified" gorm:"default:false"`
	PhoneVerified bool    `json:"phone_verified" gorm:"default:false"`

	// 第三方认证ID - 使用指针类型，允许NULL
	GoogleID *string `json:"google_id" gorm:"uniqueIndex;size:100"`
	GitHubID *string `json:"github_id" gorm:"uniqueIndex;size:100"`
	WeChatID *string `json:"wechat_id" gorm:"uniqueIndex;size:100"`

	// 用户元数据 - JSON格式存储非必要信息
	Meta JSON `json:"meta" gorm:"type:json"`

	// 登录统计
	LoginCount         int64      `json:"login_count" gorm:"default:0"`
	LastLoginAt        *time.Time `json:"last_login_at"`
	LastLoginIP        string     `json:"last_login_ip" gorm:"size:45"`
	LastLoginUserAgent string     `json:"last_login_user_agent" gorm:"size:500"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

// JSON 自定义JSON类型
type JSON json.RawMessage

// Value 实现 driver.Valuer 接口
func (j JSON) Value() (interface{}, error) {
	if len(j) == 0 {
		return nil, nil
	}
	return string(j), nil
}

// Scan 实现 sql.Scanner 接口
func (j *JSON) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	switch v := value.(type) {
	case []byte:
		*j = JSON(v)
	case string:
		*j = JSON(v)
	default:
		return nil
	}
	return nil
}

// MarshalJSON 实现 json.Marshaler 接口
func (j JSON) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return []byte("null"), nil
	}
	return j, nil
}

// UnmarshalJSON 实现 json.Unmarshaler 接口
func (j *JSON) UnmarshalJSON(data []byte) error {
	*j = JSON(data)
	return nil
}

// ProjectMapping 项目映射表 - 用于中心化用户管理
type ProjectMapping struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	UserID      string    `json:"user_id" gorm:"not null;size:36"`
	ProjectName string    `json:"project_name" gorm:"not null;size:50"`
	LocalUserID string    `json:"local_user_id" gorm:"not null;size:50"`        // 项目本地的用户ID
	MappingType string    `json:"mapping_type" gorm:"default:'direct';size:20"` // direct, alias, federated
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// 关联用户
	User User `json:"user" gorm:"foreignKey:UserID"`
}

// GlobalUserStats 全局用户统计表
type GlobalUserStats struct {
	ID             uint       `json:"id" gorm:"primaryKey"`
	UserID         string     `json:"user_id" gorm:"not null;size:36"`
	ProjectName    string     `json:"project_name" gorm:"not null;size:50"`
	LoginCount     int        `json:"login_count" gorm:"default:0"`
	LastLoginAt    *time.Time `json:"last_login_at"`
	TotalUsageTime int        `json:"total_usage_time" gorm:"default:0"` // 总使用时间（秒）
	LastActivityAt *time.Time `json:"last_activity_at"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`

	// 关联用户
	User User `json:"user" gorm:"foreignKey:UserID"`
}

// AuthLog 认证日志表
type AuthLog struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	UserID      string    `json:"user_id" gorm:"not null;size:36"`
	ProjectName string    `json:"project_name" gorm:"not null;size:50"`
	AuthType    string    `json:"auth_type" gorm:"not null;size:20"` // login, logout, register, password_reset
	IPAddress   string    `json:"ip_address" gorm:"size:45"`
	UserAgent   string    `json:"user_agent" gorm:"size:500"`
	Success     bool      `json:"success" gorm:"default:true"`
	ErrorMsg    string    `json:"error_msg" gorm:"size:500"`
	CreatedAt   time.Time `json:"created_at"`

	// 关联用户
	User User `json:"user" gorm:"foreignKey:UserID"`
}

// CrossProjectStats 跨项目统计视图
type CrossProjectStats struct {
	UserID         string     `json:"user_id"`
	Username       string     `json:"username"`
	Email          string     `json:"email"`
	ActiveProjects int        `json:"active_projects"`
	TotalLogins    int        `json:"total_logins"`
	LastActivity   *time.Time `json:"last_activity"`
	TotalUsageTime int        `json:"total_usage_time"`
	CreatedAt      time.Time  `json:"created_at"`
}

// EmailVerification 邮箱验证表
type EmailVerification struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Email     string    `json:"email" gorm:"not null"`
	Code      string    `json:"code" gorm:"not null"`
	Type      string    `json:"type" gorm:"not null"` // register, reset_password
	ExpiresAt time.Time `json:"expires_at" gorm:"not null"`
	Used      bool      `json:"used" gorm:"default:false"`
	CreatedAt time.Time `json:"created_at"`
}

// SMSVerification 短信验证表
type SMSVerification struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Phone     string    `json:"phone" gorm:"not null"`
	Code      string    `json:"code" gorm:"not null"`
	Type      string    `json:"type" gorm:"not null"` // login, register
	ExpiresAt time.Time `json:"expires_at" gorm:"not null"`
	Used      bool      `json:"used" gorm:"default:false"`
	CreatedAt time.Time `json:"created_at"`
}

// PasswordReset 密码重置表
type PasswordReset struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Email     string    `json:"email" gorm:"not null"`
	Token     string    `json:"token" gorm:"not null"`
	ExpiresAt time.Time `json:"expires_at" gorm:"not null"`
	Used      bool      `json:"used" gorm:"default:false"`
	CreatedAt time.Time `json:"created_at"`
}

// UserStats 用户统计表
type UserStats struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Date        time.Time `json:"date" gorm:"uniqueIndex"`
	TotalUsers  int64     `json:"total_users"`
	NewUsers    int64     `json:"new_users"`
	ActiveUsers int64     `json:"active_users"`
	LoginCount  int64     `json:"login_count"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// LoginLog 登录日志表
type LoginLog struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    string    `json:"user_id"`
	Provider  string    `json:"provider"` // email, phone, google, github, wechat
	IP        string    `json:"ip"`
	UserAgent string    `json:"user_agent"`
	Location  string    `json:"location"`
	Success   bool      `json:"success"`
	ErrorMsg  string    `json:"error_msg"`
	CreatedAt time.Time `json:"created_at"`
}

// WeChatQRSession 微信二维码会话表
type WeChatQRSession struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	State     string    `json:"state" gorm:"type:varchar(100);uniqueIndex;not null"`
	WeChatID  string    `json:"wechat_id" gorm:"size:100"`
	IP        string    `json:"ip" gorm:"size:45"`
	UserAgent string    `json:"user_agent" gorm:"size:500"`
	Scanned   bool      `json:"scanned" gorm:"default:false"`
	Used      bool      `json:"used" gorm:"default:false"`
	ExpiresAt time.Time `json:"expires_at" gorm:"not null"`
	CreatedAt time.Time `json:"created_at"`
}

// 请求和响应结构体

// RegisterRequest 用户注册请求
type RegisterRequest struct {
	Email    string    `json:"email" binding:"required,email"`
	Username string    `json:"username" binding:"required,min=3,max=20"`
	Nickname string    `json:"nickname" binding:"required,min=2,max=50"`
	Password string    `json:"password" binding:"required,min=6"`
	Code     string    `json:"code" binding:"required,len=6"`
	Meta     *UserMeta `json:"meta,omitempty"`
}

// LoginRequest 用户登录请求
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// UnifiedLoginRequest 统一登录请求
type UnifiedLoginRequest struct {
	Account  string `json:"account" binding:"required"`  // 账号（邮箱/用户名/手机号）
	Password string `json:"password" binding:"required"` // 密码
}

// PhoneLoginRequest 手机号登录请求
type PhoneLoginRequest struct {
	Phone string `json:"phone" binding:"required"`
	Code  string `json:"code" binding:"required,len=6"`
}

// PhoneResetPasswordRequest 手机号重置密码请求
type PhoneResetPasswordRequest struct {
	Phone    string `json:"phone" binding:"required"`
	Code     string `json:"code" binding:"required,len=6"`
	Password string `json:"password" binding:"required,min=6"`
}

// SendPhoneCodeRequest 发送手机验证码请求
type SendPhoneCodeRequest struct {
	Phone string `json:"phone" binding:"required"`
	Type  string `json:"type" binding:"required,oneof=login reset_password"`
}

// OAuthLoginRequest OAuth登录请求
type OAuthLoginRequest struct {
	Provider string `json:"provider" binding:"required"` // google, github, wechat
	Code     string `json:"code" binding:"required"`
	State    string `json:"state"`
}

// SendEmailCodeRequest 发送邮件验证码请求
type SendEmailCodeRequest struct {
	Email string `json:"email" binding:"required,email"`
	Type  string `json:"type" binding:"required,oneof=register reset_password"`
}

// SendSMSCodeRequest 发送短信验证码请求
type SendSMSCodeRequest struct {
	Phone string `json:"phone" binding:"required"`
	Type  string `json:"type" binding:"required,oneof=login register"`
}

// VerifyEmailRequest 验证邮件请求
type VerifyEmailRequest struct {
	Email string `json:"email" binding:"required,email"`
	Code  string `json:"code" binding:"required,len=6"`
}

// ForgotPasswordRequest 忘记密码请求
type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ResetPasswordRequest 重置密码请求
type ResetPasswordRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Code     string `json:"code" binding:"required,len=6"`
	Password string `json:"password" binding:"required,min=6"`
}

// ChangePasswordRequest 修改密码请求
type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

// UpdateProfileRequest 更新用户信息请求
type UpdateProfileRequest struct {
	Nickname string    `json:"nickname" binding:"min=2,max=50"`
	Meta     *UserMeta `json:"meta,omitempty"`
}

// UserResponse 用户响应
type UserResponse struct {
	ID            string     `json:"id"`
	Email         string     `json:"email"`
	Phone         string     `json:"phone"`
	Username      string     `json:"username"`
	Nickname      string     `json:"nickname"`
	Meta          *UserMeta  `json:"meta,omitempty"`
	Role          string     `json:"role"`
	Status        string     `json:"status"`
	EmailVerified bool       `json:"email_verified"`
	PhoneVerified bool       `json:"phone_verified"`
	LoginCount    int64      `json:"login_count"`
	LastLoginAt   *time.Time `json:"last_login_at"`
	CreatedAt     time.Time  `json:"created_at"`
}

// LoginResponse 登录响应
type LoginResponse struct {
	User  UserResponse `json:"user"`
	Token string       `json:"token"`
}

// UserStatsResponse 用户统计响应
type UserStatsResponse struct {
	TotalUsers  int64 `json:"total_users"`
	NewUsers    int64 `json:"new_users"`
	ActiveUsers int64 `json:"active_users"`
	LoginCount  int64 `json:"login_count"`
}

// Response 通用响应
type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// WeChatLoginRequest 微信登录请求
type WeChatLoginRequest struct {
	State string `json:"state" binding:"required"`
}

// WeChatQRStatusResponse 微信扫码状态响应
type WeChatQRStatusResponse struct {
	Status  string        `json:"status"` // pending, scanned, confirmed, expired
	Scanned bool          `json:"scanned"`
	Used    bool          `json:"used"`
	User    *UserResponse `json:"user,omitempty"`
	Token   string        `json:"token,omitempty"`
}

// AdminUpdateUserRequest 管理员更新用户请求
type AdminUpdateUserRequest struct {
	Username      string    `json:"username"`
	Nickname      string    `json:"nickname"`
	Email         string    `json:"email"`
	Phone         string    `json:"phone"`
	Role          string    `json:"role"`
	Status        string    `json:"status"`
	EmailVerified *bool     `json:"email_verified"`
	PhoneVerified *bool     `json:"phone_verified"`
	Meta          *UserMeta `json:"meta,omitempty"`
}

// BulkUpdateUsersRequest 批量更新用户请求
type BulkUpdateUsersRequest struct {
	UserIDs []string `json:"user_ids" binding:"required"`
	Action  string   `json:"action" binding:"required,oneof=activate deactivate delete"`
}

// 方法实现

// HashPassword 密码加密
func (u *User) HashPassword() error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u.Password = string(hashedPassword)
	return nil
}

// CheckPassword 验证密码
func (u *User) CheckPassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
	return err == nil
}

// GetMeta 获取用户元数据
func (u *User) GetMeta() (*UserMeta, error) {
	if len(u.Meta) == 0 {
		return &UserMeta{}, nil
	}

	var meta UserMeta
	err := json.Unmarshal(u.Meta, &meta)
	if err != nil {
		return nil, err
	}
	return &meta, nil
}

// SetMeta 设置用户元数据
func (u *User) SetMeta(meta *UserMeta) error {
	if meta == nil {
		u.Meta = nil
		return nil
	}

	data, err := json.Marshal(meta)
	if err != nil {
		return err
	}
	u.Meta = JSON(data)
	return nil
}

// GetAvatar 获取头像
func (u *User) GetAvatar() string {
	meta, err := u.GetMeta()
	if err != nil {
		return ""
	}
	return meta.Avatar
}

// SetAvatar 设置头像
func (u *User) SetAvatar(avatar string) error {
	meta, err := u.GetMeta()
	if err != nil {
		meta = &UserMeta{}
	}
	meta.Avatar = avatar
	return u.SetMeta(meta)
}

// ToResponse 转换为响应格式
func (u *User) ToResponse() UserResponse {
	meta, _ := u.GetMeta()

	// 处理指针类型字段
	var phone string
	if u.Phone != nil {
		phone = *u.Phone
	}

	// 处理邮箱字段
	var email string
	if u.Email != nil {
		email = *u.Email
	}

	return UserResponse{
		ID:            u.ID,
		Email:         email,
		Phone:         phone,
		Username:      u.Username,
		Nickname:      u.Nickname,
		Meta:          meta,
		Role:          u.Role,
		Status:        u.Status,
		EmailVerified: u.EmailVerified,
		PhoneVerified: u.PhoneVerified,
		LoginCount:    u.LoginCount,
		LastLoginAt:   u.LastLoginAt,
		CreatedAt:     u.CreatedAt,
	}
}

// UpdateLoginInfo 更新登录信息
func (u *User) UpdateLoginInfo(ip, userAgent string) {
	now := time.Now()
	u.LastLoginAt = &now
	u.LastLoginIP = ip
	u.LastLoginUserAgent = userAgent
	u.LoginCount++
}

// RecordProjectActivity 记录项目活动
func (u *User) RecordProjectActivity(db *gorm.DB, projectName, authType, ipAddress, userAgent string, success bool, errorMsg string) error {
	// 记录认证日志
	authLog := AuthLog{
		UserID:      u.ID,
		ProjectName: projectName,
		AuthType:    authType,
		IPAddress:   ipAddress,
		UserAgent:   userAgent,
		Success:     success,
		ErrorMsg:    errorMsg,
	}

	if err := db.Create(&authLog).Error; err != nil {
		return err
	}

	// 更新全局统计
	var stats GlobalUserStats
	err := db.Where("user_id = ? AND project_name = ?", u.ID, projectName).First(&stats).Error

	now := time.Now()
	if err == gorm.ErrRecordNotFound {
		// 创建新统计记录
		stats = GlobalUserStats{
			UserID:         u.ID,
			ProjectName:    projectName,
			LoginCount:     0,
			TotalUsageTime: 0,
		}
	}

	if success && authType == "login" {
		stats.LoginCount++
		stats.LastLoginAt = &now
	}
	stats.LastActivityAt = &now

	if err == gorm.ErrRecordNotFound {
		return db.Create(&stats).Error
	} else {
		return db.Save(&stats).Error
	}
}

// BeforeCreate 在创建用户前自动生成UUID
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}

	// 不再设置假数据，让第三方认证ID字段保持NULL
	// 这样更符合业务逻辑：未绑定的第三方账号字段为NULL

	return nil
}
