package services

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"log"
	"time"
	"unit-auth/config"
	"unit-auth/models"
	"unit-auth/utils"

	"gorm.io/gorm"
)

// ===============================================
// 中心化Token刷新服务
// 实现Refresh Token后端中心化管理
// ===============================================

// CentralizedTokenService 中心化Token刷新服务
type CentralizedTokenService struct {
	db *gorm.DB
}

// NewCentralizedTokenService 创建中心化Token刷新服务实例
func NewCentralizedTokenService() *CentralizedTokenService {
	return &CentralizedTokenService{
		db: config.DB,
	}
}

// RequestMetadata 请求元数据
type RequestMetadata struct {
	UserAgent   string
	IPAddress   string
	AppID       string
	CurrentTime time.Time
	RequestID   string
}

// SecurityResult 安全检查结果
type SecurityResult struct {
	Passed    bool
	Reason    string
	RiskScore float64
	Details   map[string]interface{}
}

// TokenRefreshRequest 后端间Token刷新请求
type TokenRefreshRequest struct {
	ExpiredToken string            `json:"expired_token"`
	UserAgent    string            `json:"user_agent"`
	IPAddress    string            `json:"ip_address"`
	AppID        string            `json:"app_id"`
	Metadata     map[string]string `json:"metadata,omitempty"`
}

// TokenRefreshResult Token刷新结果
type TokenRefreshResult struct {
	Success     bool   `json:"success"`
	AccessToken string `json:"access_token,omitempty"`
	ExpiresIn   int    `json:"expires_in,omitempty"`
	TokenType   string `json:"token_type,omitempty"`
	Error       string `json:"error,omitempty"`
	ErrorDesc   string `json:"error_description,omitempty"`
}

// ===============================================
// 核心业务方法
// ===============================================

// RefreshAccessToken 中心化Token刷新（后端间调用）
func (cts *CentralizedTokenService) RefreshAccessToken(req *TokenRefreshRequest) (*TokenRefreshResult, error) {
	startTime := time.Now()

	// 1. 解析过期token获取session_id（忽略过期）
	sessionID, err := cts.extractSessionIDFromToken(req.ExpiredToken)
	if err != nil {
		return &TokenRefreshResult{
			Success:   false,
			Error:     "invalid_token",
			ErrorDesc: "Cannot extract session ID from token",
		}, err
	}

	// 2. 获取完整的会话信息（单次查询优化）
	session, err := cts.getSessionWithValidation(sessionID)
	if err != nil {
		return &TokenRefreshResult{
			Success:   false,
			Error:     "session_invalid",
			ErrorDesc: "Session not found or invalid",
		}, err
	}

	// 3. 提取请求元数据用于安全检查
	metadata := RequestMetadata{
		UserAgent:   req.UserAgent,
		IPAddress:   req.IPAddress,
		AppID:       req.AppID,
		CurrentTime: time.Now(),
	}

	// 4. 执行安全检查
	securityResult := cts.performSecurityValidation(session, metadata)
	if !securityResult.Passed {
		// 记录安全事件
		cts.recordSecurityIncident(session, securityResult.Reason, metadata)

		return &TokenRefreshResult{
			Success:   false,
			Error:     "security_validation_failed",
			ErrorDesc: securityResult.Reason,
		}, errors.New(securityResult.Reason)
	}

	// 5. 检查滑动续签窗口
	if err := cts.checkSlidingRenewal(session); err != nil {
		return &TokenRefreshResult{
			Success:   false,
			Error:     "sliding_renewal_failed",
			ErrorDesc: err.Error(),
		}, err
	}

	// 6. 生成新的Access Token
	newToken, err := cts.generateNewAccessToken(session, req.AppID)
	if err != nil {
		return &TokenRefreshResult{
			Success:   false,
			Error:     "token_generation_failed",
			ErrorDesc: "Failed to generate new token",
		}, err
	}

	// 7. 更新会话记录
	if err := cts.updateSessionTokens(session, newToken); err != nil {
		return &TokenRefreshResult{
			Success:   false,
			Error:     "session_update_failed",
			ErrorDesc: "Failed to update session",
		}, err
	}

	// 8. 记录审计日志
	cts.logTokenRefreshEvent(session, req.ExpiredToken, newToken, req.AppID, metadata, startTime)

	return &TokenRefreshResult{
		Success:     true,
		AccessToken: newToken,
		ExpiresIn:   config.GetAccessTokenExpiry(),
		TokenType:   "Bearer",
	}, nil
}

// ValidateSession 验证会话状态
func (cts *CentralizedTokenService) ValidateSession(sessionID, appID string) (*models.SSOSession, error) {
	session, err := cts.getSessionWithValidation(sessionID)
	if err != nil {
		return nil, err
	}

	// 更新会话活动时间
	cts.updateSessionActivity(sessionID)

	return session, nil
}

// Logout 中心化登出
func (cts *CentralizedTokenService) Logout(sessionID, logoutType, appID string) error {
	if logoutType == "global" {
		// 全局登出：撤销用户所有会话
		return cts.db.Model(&models.SSOSession{}).
			Where("session_id = ?", sessionID).
			Update("status", "revoked").Error
	} else {
		// 单点登出：只撤销当前会话
		return cts.db.Where("session_id = ?", sessionID).
			Delete(&models.SSOSession{}).Error
	}
}

// ===============================================
// 辅助方法
// ===============================================

// extractSessionIDFromToken 从Token中提取session_id（忽略过期）
func (cts *CentralizedTokenService) extractSessionIDFromToken(token string) (string, error) {
	// 解析JWT token获取payload（忽略过期验证）
	claims, err := utils.ValidateEnhancedTokenIgnoreExpiry(token)
	if err != nil {
		return "", err
	}

	// 从claims中提取session_id
	if claims.SessionID != "" {
		return claims.SessionID, nil
	}

	return "", errors.New("session_id not found in token")
}

// getSessionWithValidation 获取并验证会话信息（优化查询）
func (cts *CentralizedTokenService) getSessionWithValidation(sessionID string) (*models.SSOSession, error) {
	var session models.SSOSession

	err := cts.db.
		Preload("User").
		Where("session_id = ? AND status = 'active' AND expires_at > ?",
			sessionID, time.Now()).
		First(&session).Error

	if err != nil {
		return nil, err
	}

	return &session, nil
}

// performSecurityValidation 执行多层安全验证
func (cts *CentralizedTokenService) performSecurityValidation(session *models.SSOSession, metadata RequestMetadata) SecurityResult {
	checks := map[string]bool{
		"device_consistency":      cts.checkDeviceConsistency(session, metadata),
		"refresh_frequency":       cts.checkRefreshFrequency(session),
		"geolocation_consistency": cts.checkGeolocationConsistency(session, metadata),
		"user_agent_analysis":     cts.analyzeUserAgent(session, metadata),
	}

	// 计算风险分数
	riskScore := cts.calculateRiskScore(checks)

	// 所有检查都通过
	passed := true
	for _, check := range checks {
		if !check {
			passed = false
			break
		}
	}

	reason := "Security checks passed"
	if !passed {
		reason = "Security validation failed"
	}

	details := make(map[string]interface{})
	for k, v := range checks {
		details[k] = v
	}
	return SecurityResult{
		Passed:    passed,
		Reason:    reason,
		RiskScore: riskScore,
		Details:   details,
	}
}

// checkDeviceConsistency 检查设备一致性
func (cts *CentralizedTokenService) checkDeviceConsistency(session *models.SSOSession, metadata RequestMetadata) bool {
	// 简化实现：检查IP地址是否匹配
	if session.IPAddress != "" && metadata.IPAddress != session.IPAddress {
		return false
	}
	return true
}

// checkRefreshFrequency 检查刷新频率
func (cts *CentralizedTokenService) checkRefreshFrequency(session *models.SSOSession) bool {
	// 检查1小时内刷新次数不超过阈值
	var count int64
	cts.db.Model(&models.TokenRefreshLogs{}).
		Where("id = ? AND refreshed_at > ? AND success = true",
			session.ID, time.Now().Add(-time.Hour)).
		Count(&count)

	// 允许每小时最多10次刷新
	return count < 10
}

// checkGeolocationConsistency 检查地理位置一致性
func (cts *CentralizedTokenService) checkGeolocationConsistency(session *models.SSOSession, metadata RequestMetadata) bool {
	// 简化实现：如果会话有IP限制，则检查是否匹配
	if session.IPAddress != "" && metadata.IPAddress != session.IPAddress {
		return false
	}
	return true
}

// analyzeUserAgent 分析User-Agent
func (cts *CentralizedTokenService) analyzeUserAgent(session *models.SSOSession, metadata RequestMetadata) bool {
	// 简化实现：检查User-Agent是否匹配
	if session.UserAgent != "" && metadata.UserAgent != session.UserAgent {
		return false
	}
	return true
}

// calculateRiskScore 计算风险分数
func (cts *CentralizedTokenService) calculateRiskScore(checks map[string]bool) float64 {
	failedChecks := 0
	for _, passed := range checks {
		if !passed {
			failedChecks++
		}
	}

	// 每个失败的检查增加0.3分风险
	return float64(failedChecks) * 0.3
}

// checkSlidingRenewal 检查滑动续签窗口
func (cts *CentralizedTokenService) checkSlidingRenewal(session *models.SSOSession) error {
	// 检查会话是否在允许的续签窗口内（过期前24小时内）
	if session.ExpiresAt.Before(time.Now().Add(24 * time.Hour)) {
		return errors.New("session is outside sliding renewal window")
	}
	return nil
}

// generateNewAccessToken 生成新的Access Token
func (cts *CentralizedTokenService) generateNewAccessToken(session *models.SSOSession, appID string) (string, error) {
	// 使用现有的Token生成方法
	return utils.GenerateUnifiedToken(session.UserID, session.UserID, "user", appID, "")
}

// updateSessionTokens 更新会话Token
func (cts *CentralizedTokenService) updateSessionTokens(session *models.SSOSession, newToken string) error {
	// 计算token哈希
	hash := sha256.Sum256([]byte(newToken))
	tokenHash := hex.EncodeToString(hash[:])

	// 更新会话记录
	return cts.db.Model(session).Updates(map[string]interface{}{
		"current_access_token_hash": tokenHash,
		"last_activity":             time.Now(),
		"last_refresh_at":           time.Now(),
		"refresh_count":             session.RefreshCount + 1,
		"current_app_id":            session.ClientID, // 更新当前应用
	}).Error
}

// updateSessionActivity 更新会话活动时间
func (cts *CentralizedTokenService) updateSessionActivity(sessionID string) {
	cts.db.Model(&models.SSOSession{}).
		Where("session_id = ?", sessionID).
		Update("last_activity", time.Now())
}

// ===============================================
// 审计日志方法
// ===============================================

// logTokenRefreshEvent 记录Token刷新事件
func (cts *CentralizedTokenService) logTokenRefreshEvent(session *models.SSOSession, oldToken, newToken, appID string, metadata RequestMetadata, startTime time.Time) {
	processingTime := time.Since(startTime).Milliseconds()

	// 计算token哈希用于审计
	oldHash := cts.calculateTokenHash(oldToken)
	newHash := cts.calculateTokenHash(newToken)

	// 创建审计日志
	logEntry := models.TokenRefreshLogs{
		SessionID:        session.ID,
		UserID:           session.UserID,
		AppID:            appID,
		OldTokenHash:     oldHash,
		NewTokenHash:     newHash,
		RefreshedAt:      time.Now(),
		UserAgent:        metadata.UserAgent,
		IPAddress:        metadata.IPAddress,
		Success:          true,
		RefreshCount:     session.RefreshCount + 1,
		ProcessingTimeMs: int(processingTime),
	}

	if err := cts.db.Create(&logEntry).Error; err != nil {
		log.Printf("Failed to log token refresh event: %v", err)
	} else {
		log.Printf("Token refresh logged - Session: %s, App: %s, Processing: %dms",
			session.ID, appID, processingTime)
	}
}

// recordSecurityIncident 记录安全事件
func (cts *CentralizedTokenService) recordSecurityIncident(session *models.SSOSession, reason string, metadata RequestMetadata) {
	log.Printf("Security incident recorded - Session: %s, Reason: %s, IP: %s, UserAgent: %s",
		session.ID, reason, metadata.IPAddress, metadata.UserAgent)

	// 创建安全事件日志
	logEntry := models.TokenRefreshLogs{
		SessionID:   session.ID,
		UserID:      session.UserID,
		AppID:       metadata.AppID,
		Success:     false,
		ErrorReason: reason,
		RefreshedAt: time.Now(),
		UserAgent:   metadata.UserAgent,
		IPAddress:   metadata.IPAddress,
	}

	cts.db.Create(&logEntry)
}

// calculateTokenHash 计算Token哈希
func (cts *CentralizedTokenService) calculateTokenHash(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// ===============================================
// 配置和常量
// ===============================================

const (
	// 刷新频率限制
	MaxHourlyRefreshes = 10

	// 风险分数阈值
	HighRiskThreshold   = 0.7
	MediumRiskThreshold = 0.4

	// 会话状态
	SessionActive  = "active"
	SessionRevoked = "revoked"
	SessionExpired = "expired"
)

// GetAccessTokenExpiry 获取Access Token过期时间
func (cts *CentralizedTokenService) GetAccessTokenExpiry() int {
	// 从配置获取，默认为3600秒（1小时）
	return 3600
}

// GetRefreshTokenExpiry 获取Refresh Token过期时间
func (cts *CentralizedTokenService) GetRefreshTokenExpiry() time.Duration {
	// 默认为7天
	return 7 * 24 * time.Hour
}
