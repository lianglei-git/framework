package models

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// UnifiedOAuthLoginRequest 统一的OAuth登录请求结构（用于OIDC流程）
type UnifiedOAuthLoginRequest struct {
	Provider           string `json:"provider" binding:"required"`
	Code               string `json:"code,omitempty"`
	CodeVerifier       string `json:"code_verifier,omitempty"`
	State              string `json:"state,omitempty"`
	AppID              string `json:"app_id,omitempty"`
	InternalAuth       string `json:"internal_auth,omitempty"`
	DoubleVerification string `json:"double_verification,omitempty"`
	ClientID           string `json:"client_id,omitempty"`

	// 本地登录参数
	Username string `json:"username,omitempty"`
	Password string `json:"password,omitempty"`

	// 邮箱登录参数
	Email string `json:"email,omitempty"`

	// 手机号登录参数
	Phone string `json:"phone,omitempty"`
}

// Validate 根据provider验证必需参数
func (r *UnifiedOAuthLoginRequest) Validate() error {
	switch r.Provider {
	case "local":
		if r.Username == "" || r.Password == "" {
			return fmt.Errorf("missing required parameters: username and password")
		}
	case "github", "google", "wechat":
		if r.Code == "" {
			return fmt.Errorf("missing required parameter: code")
		}
		if r.InternalAuth == "true" && r.DoubleVerification == "true" {
			if r.CodeVerifier == "" {
				return fmt.Errorf("PKCE code_verifier required for double verification")
			}
			if r.State == "" {
				return fmt.Errorf("state parameter required for CSRF protection")
			}
		}
	case "email":
		if r.Email == "" || r.Code == "" {
			return fmt.Errorf("missing required parameters: email and code")
		}
	case "phone":
		if r.Phone == "" || r.Code == "" {
			return fmt.Errorf("missing required parameters: phone and code")
		}
	default:
		if r.Code == "" {
			return fmt.Errorf("missing required parameter: code")
		}
	}
	return nil
}

// SSOClient SSO客户端模型
type SSOClient struct {
	ID            string    `json:"id" gorm:"primaryKey;type:varchar(36)"`
	Name          string    `json:"name" gorm:"not null;size:100"`
	Description   string    `json:"description" gorm:"size:500"`
	Secret        string    `json:"-" gorm:"not null;size:255"`        // 客户端密钥，响应时不返回
	RedirectURIs  string    `json:"redirect_uris" gorm:"type:text"`    // 回调URI，JSON数组
	GrantTypes    string    `json:"grant_types" gorm:"type:text"`      // 支持的授权类型
	ResponseTypes string    `json:"response_types" gorm:"type:text"`   // 支持的响应类型
	Scope         string    `json:"scope" gorm:"type:text"`            // 支持的权限范围
	AutoApprove   bool      `json:"auto_approve" gorm:"default:false"` // 自动批准
	IsActive      bool      `json:"is_active" gorm:"default:true"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// SSOClientResponse SSO客户端响应（不包含敏感信息）
type SSOClientResponse struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	RedirectURIs  string    `json:"redirect_uris"`
	GrantTypes    string    `json:"grant_types"`
	ResponseTypes string    `json:"response_types"`
	Scope         string    `json:"scope"`
	AutoApprove   bool      `json:"auto_approve"`
	IsActive      bool      `json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// CreateSSOClientRequest 创建SSO客户端请求
type CreateSSOClientRequest struct {
	Name          string   `json:"name" binding:"required"`
	Description   string   `json:"description"`
	RedirectURIs  []string `json:"redirect_uris" binding:"required"`
	GrantTypes    []string `json:"grant_types"`
	ResponseTypes []string `json:"response_types"`
	Scope         []string `json:"scope"`
	AutoApprove   bool     `json:"auto_approve"`
}

// UpdateSSOClientRequest 更新SSO客户端请求
type UpdateSSOClientRequest struct {
	Name          string   `json:"name"`
	Description   string   `json:"description"`
	RedirectURIs  []string `json:"redirect_uris"`
	GrantTypes    []string `json:"grant_types"`
	ResponseTypes []string `json:"response_types"`
	Scope         []string `json:"scope"`
	AutoApprove   *bool    `json:"auto_approve"`
	IsActive      *bool    `json:"is_active"`
}

// SSOSession SSO会话模型
type SSOSession struct {
	// 基本信息
	ID       string `json:"id" gorm:"primaryKey;type:varchar(128)"`
	UserID   string `json:"user_id" gorm:"not null;index;type:varchar(64)"`
	ClientID string `json:"client_id" gorm:"not null;index;type:varchar(64)"`

	// SSO相关信息
	AuthorizationCode   string `json:"authorization_code" gorm:"type:varchar(500)"`
	CodeChallenge       string `json:"code_challenge" gorm:"type:varchar(100)"`
	CodeChallengeMethod string `json:"code_challenge_method" gorm:"type:varchar(20)"`
	RedirectURI         string `json:"redirect_uri" gorm:"type:varchar(500)"`
	Scope               string `json:"scope" gorm:"type:text"`
	State               string `json:"state" gorm:"type:varchar(100)"`
	Used                bool   `json:"used" gorm:"default:false"`

	// Token管理（中心化架构）
	CurrentAccessTokenHash string `json:"current_access_token_hash" gorm:"type:varchar(256)"`
	RefreshTokenHash       string `json:"refresh_token_hash" gorm:"not null;type:varchar(256)"`

	// 状态管理
	Status        string     `json:"status" gorm:"default:'active';type:varchar(20)"`
	ExpiresAt     time.Time  `json:"expires_at" gorm:"not null"`
	LastActivity  time.Time  `json:"last_activity" gorm:"default:CURRENT_TIMESTAMP;type:timestamp"`
	LastRefreshAt *time.Time `json:"last_refresh_at" gorm:"null"`
	RefreshCount  int        `json:"refresh_count" gorm:"default:0"`

	// 安全信息
	UserAgent         string `json:"user_agent" gorm:"type:text"`
	IPAddress         string `json:"ip_address" gorm:"type:varchar(45)"`
	DeviceFingerprint string `json:"device_fingerprint" gorm:"type:varchar(128)"`

	// 应用上下文
	CurrentAppID string `json:"current_app_id" gorm:"type:varchar(64)"`

	// 时间戳
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// 关联
	User User `json:"user" gorm:"foreignKey:UserID"`
}

// TokenBlacklist 令牌黑名单模型
type TokenBlacklist struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	TokenJTI  string    `json:"token_jti" gorm:"uniqueIndex;size:100"`
	ExpiresAt time.Time `json:"expires_at" gorm:"not null"`
	CreatedAt time.Time `json:"created_at"`
}

// TokenRefreshLogs Token刷新审计日志模型（中心化架构）
type TokenRefreshLogs struct {
	ID uint `json:"id" gorm:"primaryKey;autoIncrement"`
	// SessionID        string    `json:"session_id" gorm:"column:session_id;not null;index;type:varchar(128);constraint:fk_token_refresh_logs_session:OnUpdate:CASCADE,OnDelete:CASCADE"`
	SessionID        string    `json:"session_id" gorm:"not null;type:varchar(128)`
	UserID           string    `json:"user_id" gorm:"not null;index;type:varchar(64)"`
	AppID            string    `json:"app_id" gorm:"not null;index;type:varchar(64)"`
	OldTokenHash     string    `json:"old_token_hash" gorm:"type:varchar(256)"`
	NewTokenHash     string    `json:"new_token_hash" gorm:"type:varchar(256)"`
	RefreshedAt      time.Time `json:"refreshed_at" gorm:"default:CURRENT_TIMESTAMP;type:timestamp"`
	UserAgent        string    `json:"user_agent" gorm:"type:text"`
	IPAddress        string    `json:"ip_address" gorm:"type:varchar(45)"`
	Success          bool      `json:"success" gorm:"default:true"`
	ErrorReason      string    `json:"error_reason" gorm:"type:varchar(64)"`
	RefreshCount     int       `json:"refresh_count" gorm:"default:1"`
	ProcessingTimeMs int       `json:"processing_time_ms"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`

	// 关联
	Session *SSOSession `json:"session" gorm:"foreignKey:SessionID;references:ID"`
}

// 方法实现

// BeforeCreate 在创建客户端前生成ID和密钥
func (c *SSOClient) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	if c.Secret == "" {
		c.Secret = GenerateClientSecret()
	}
	return nil
}

// ToResponse 转换为响应格式
func (c *SSOClient) ToResponse() SSOClientResponse {
	return SSOClientResponse{
		ID:            c.ID,
		Name:          c.Name,
		Description:   c.Description,
		RedirectURIs:  c.RedirectURIs,
		GrantTypes:    c.GrantTypes,
		ResponseTypes: c.ResponseTypes,
		Scope:         c.Scope,
		AutoApprove:   c.AutoApprove,
		IsActive:      c.IsActive,
		CreatedAt:     c.CreatedAt,
		UpdatedAt:     c.UpdatedAt,
	}
}

// GetRedirectURIs 获取重定向URI列表
func (c *SSOClient) GetRedirectURIs() []string {
	var uris []string
	if err := json.Unmarshal([]byte(c.RedirectURIs), &uris); err != nil {
		return []string{}
	}
	return uris
}

// SetRedirectURIs 设置重定向URI列表
func (c *SSOClient) SetRedirectURIs(uris []string) error {
	data, err := json.Marshal(uris)
	if err != nil {
		return err
	}
	c.RedirectURIs = string(data)
	return nil
}

// GetGrantTypes 获取授权类型列表
func (c *SSOClient) GetGrantTypes() []string {
	var types []string
	if err := json.Unmarshal([]byte(c.GrantTypes), &types); err != nil {
		return []string{}
	}
	return types
}

// SetGrantTypes 设置授权类型列表
func (c *SSOClient) SetGrantTypes(types []string) error {
	data, err := json.Marshal(types)
	if err != nil {
		return err
	}
	c.GrantTypes = string(data)
	return nil
}

// GetResponseTypes 获取响应类型列表
func (c *SSOClient) GetResponseTypes() []string {
	var types []string
	if err := json.Unmarshal([]byte(c.ResponseTypes), &types); err != nil {
		return []string{}
	}
	return types
}

// SetResponseTypes 设置响应类型列表
func (c *SSOClient) SetResponseTypes(types []string) error {
	data, err := json.Marshal(types)
	if err != nil {
		return err
	}
	c.ResponseTypes = string(data)
	return nil
}

// GetScope 获取权限范围列表
func (c *SSOClient) GetScope() []string {
	var scopes []string
	if err := json.Unmarshal([]byte(c.Scope), &scopes); err != nil {
		return []string{}
	}
	return scopes
}

// SetScope 设置权限范围列表
func (c *SSOClient) SetScope(scopes []string) error {
	data, err := json.Marshal(scopes)
	if err != nil {
		return err
	}
	c.Scope = string(data)
	return nil
}

// ValidateRedirectURI 验证重定向URI
func (c *SSOClient) ValidateRedirectURI(uri string) bool {
	allowedURIs := c.GetRedirectURIs()
	for _, allowedURI := range allowedURIs {
		// 简单的字符串匹配，实际应该进行更严格的URL验证
		if strings.HasPrefix(uri, allowedURI) || allowedURI == "*" {
			return true
		}
	}
	return false
}

// IsValidGrantType 验证授权类型
func (c *SSOClient) IsValidGrantType(grantType string) bool {
	allowedTypes := c.GetGrantTypes()
	for _, allowedType := range allowedTypes {
		if allowedType == grantType {
			return true
		}
	}
	return false
}

// IsValidResponseType 验证响应类型
func (c *SSOClient) IsValidResponseType(responseType string) bool {
	allowedTypes := c.GetResponseTypes()
	for _, allowedType := range allowedTypes {
		if allowedType == responseType {
			return true
		}
	}
	return false
}

// IsValidScope 验证权限范围
func (c *SSOClient) IsValidScope(scope string) bool {
	requestedScopes := strings.Fields(scope)
	allowedScopes := c.GetScope()

	if len(allowedScopes) == 0 {
		return true // 如果客户端未设置范围限制，允许所有范围
	}

	for _, requestedScope := range requestedScopes {
		found := false
		for _, allowedScope := range allowedScopes {
			if requestedScope == allowedScope {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}

// BeforeCreate 为会话生成ID
func (s *SSOSession) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}

// IsExpired 检查会话是否过期
func (s *SSOSession) IsExpired() bool {
	return time.Now().After(s.ExpiresAt)
}

// MarkAsUsed 标记会话为已使用
func (s *SSOSession) MarkAsUsed() {
	s.Used = true
}

// GenerateClientSecret 生成客户端密钥
func GenerateClientSecret() string {
	return "client_secret_" + uuid.New().String()
}

// CreateSSOClient 创建SSO客户端
func CreateSSOClient(db *gorm.DB, req *CreateSSOClientRequest) (*SSOClient, error) {
	client := &SSOClient{
		Name:        req.Name,
		Description: req.Description,
		AutoApprove: req.AutoApprove,
		IsActive:    true,
	}

	// 设置数组字段
	if err := client.SetRedirectURIs(req.RedirectURIs); err != nil {
		return nil, err
	}

	grantTypes := req.GrantTypes
	if len(grantTypes) == 0 {
		grantTypes = []string{"authorization_code", "refresh_token"}
	}
	if err := client.SetGrantTypes(grantTypes); err != nil {
		return nil, err
	}

	responseTypes := req.ResponseTypes
	if len(responseTypes) == 0 {
		responseTypes = []string{"code"}
	}
	if err := client.SetResponseTypes(responseTypes); err != nil {
		return nil, err
	}

	scope := req.Scope
	if len(scope) == 0 {
		scope = []string{"openid", "profile", "email"}
	}
	if err := client.SetScope(scope); err != nil {
		return nil, err
	}

	if err := db.Create(client).Error; err != nil {
		return nil, err
	}

	return client, nil
}

// GetSSOClientByID 根据ID获取SSO客户端
func GetSSOClientByID(db *gorm.DB, id string) (*SSOClient, error) {
	var client SSOClient
	if err := db.Where("id = ? AND is_active = ?", id, true).First(&client).Error; err != nil {
		return nil, err
	}
	return &client, nil
}

// GetSSOClients 获取所有活跃的SSO客户端
func GetSSOClients(db *gorm.DB) ([]SSOClient, error) {
	var clients []SSOClient
	if err := db.Where("is_active = ?", true).Find(&clients).Error; err != nil {
		return nil, err
	}
	return clients, nil
}

// UpdateSSOClient 更新SSO客户端
func UpdateSSOClient(db *gorm.DB, id string, req *UpdateSSOClientRequest) (*SSOClient, error) {
	var client SSOClient
	if err := db.Where("id = ?", id).First(&client).Error; err != nil {
		return nil, err
	}

	// 更新字段
	if req.Name != "" {
		client.Name = req.Name
	}
	if req.Description != "" {
		client.Description = req.Description
	}
	if req.AutoApprove != nil {
		client.AutoApprove = *req.AutoApprove
	}
	if req.IsActive != nil {
		client.IsActive = *req.IsActive
	}

	// 更新数组字段
	if req.RedirectURIs != nil {
		if err := client.SetRedirectURIs(req.RedirectURIs); err != nil {
			return nil, err
		}
	}
	if req.GrantTypes != nil {
		if err := client.SetGrantTypes(req.GrantTypes); err != nil {
			return nil, err
		}
	}
	if req.ResponseTypes != nil {
		if err := client.SetResponseTypes(req.ResponseTypes); err != nil {
			return nil, err
		}
	}
	if req.Scope != nil {
		if err := client.SetScope(req.Scope); err != nil {
			return nil, err
		}
	}

	if err := db.Save(&client).Error; err != nil {
		return nil, err
	}

	return &client, nil
}

// DeleteSSOClient 删除SSO客户端
func DeleteSSOClient(db *gorm.DB, id string) error {
	return db.Where("id = ?", id).Delete(&SSOClient{}).Error
}

// CreateSSOSession 创建SSO会话
func CreateSSOSession(db *gorm.DB, session *SSOSession) error {
	return db.Create(session).Debug().Error
}

// GetSSOSessionByCode 根据授权码获取会话
func GetSSOSessionByCode(db *gorm.DB, code string) (*SSOSession, error) {
	var session SSOSession
	if err := db.Where("authorization_code = ? AND used = ? AND expires_at > ?",
		code, false, time.Now()).First(&session).Error; err != nil {
		return nil, err
	}
	return &session, nil
}

// MarkSSOSessionAsUsed 标记会话为已使用
func MarkSSOSessionAsUsed(db *gorm.DB, id string) error {
	return db.Model(&SSOSession{}).Where("id = ?", id).Update("used", true).Error
}

// CleanupExpiredSSOSessions 清理过期的SSO会话
func CleanupExpiredSSOSessions(db *gorm.DB) error {
	return db.Where("expires_at < ?", time.Now()).Delete(&SSOSession{}).Error
}

// AddTokenToBlacklist 将令牌添加到黑名单
func AddTokenToBlacklist(db *gorm.DB, tokenJTI string, expiresAt time.Time) error {
	blacklistEntry := TokenBlacklist{
		TokenJTI:  tokenJTI,
		ExpiresAt: expiresAt,
	}
	return db.Create(&blacklistEntry).Error
}

// IsTokenInBlacklist 检查令牌是否在黑名单中
func IsTokenInBlacklist(db *gorm.DB, tokenJTI string) (bool, error) {
	var count int64
	err := db.Model(&TokenBlacklist{}).Where("token_jti = ? AND expires_at > ?", tokenJTI, time.Now()).Count(&count).Error
	return count > 0, err
}

// CleanupExpiredTokens 清理过期的黑名单令牌
func CleanupExpiredTokens(db *gorm.DB) error {
	return db.Where("expires_at < ?", time.Now()).Delete(&TokenBlacklist{}).Error
}
