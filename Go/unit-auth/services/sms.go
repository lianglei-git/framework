package services

import (
	"fmt"
	"log"
	"time"
	"unit-auth/models"
	"unit-auth/utils"

	"gorm.io/gorm"
)

// SMSService 短信服务接口
type SMSService interface {
	SendVerificationCode(phone, code, template string) error
	SendNotification(phone, message string) error
}

// MockSMSService 模拟短信服务实现
type MockSMSService struct {
	db *gorm.DB
}

// NewMockSMSService 创建模拟短信服务
func NewMockSMSService(db *gorm.DB) *MockSMSService {
	return &MockSMSService{
		db: db,
	}
}

// SendVerificationCode 发送验证码
func (s *MockSMSService) SendVerificationCode(phone, code, template string) error {
	// 模拟发送延迟
	time.Sleep(100 * time.Millisecond)

	// 记录发送日志
	log.Printf("📱 [模拟] 发送短信到 %s: 验证码 %s", phone, code)

	// 这里可以集成真实的短信服务，比如阿里云、腾讯云等
	// 示例：
	// return s.sendViaAliyun(phone, code, template)
	// return s.sendViaTencent(phone, code, template)

	return nil
}

// SendNotification 发送通知消息
func (s *MockSMSService) SendNotification(phone, message string) error {
	// 模拟发送延迟
	time.Sleep(100 * time.Millisecond)

	// 记录发送日志
	log.Printf("📱 [模拟] 发送通知到 %s: %s", phone, message)

	return nil
}

// SMSHandler 短信处理器
type SMSHandler struct {
	db         *gorm.DB
	smsService SMSService
}

// NewSMSHandler 创建短信处理器
func NewSMSHandler(db *gorm.DB, smsService SMSService) *SMSHandler {
	return &SMSHandler{
		db:         db,
		smsService: smsService,
	}
}

// SendVerificationCode 发送验证码
func (h *SMSHandler) SendVerificationCode(phone, codeType string) (*models.SMSVerification, error) {
	// 验证手机号格式
	if utils.IdentifyAccountType(phone) != utils.AccountTypePhone {
		return nil, fmt.Errorf("invalid phone number format")
	}

	// 检查是否在1分钟内已经发送过验证码
	var recentVerification models.SMSVerification
	if err := h.db.Where("phone = ? AND type = ? AND created_at > ?",
		phone, codeType, time.Now().Add(-time.Minute)).First(&recentVerification).Error; err == nil {
		return nil, fmt.Errorf("please wait 1 minute before requesting another code")
	}

	// 生成验证码
	code := utils.GenerateVerificationCode()
	expiresAt := time.Now().Add(10 * time.Minute)

	// 保存验证码到数据库
	verification := models.SMSVerification{
		Phone:     phone,
		Code:      code,
		Type:      codeType,
		ExpiresAt: expiresAt,
		Used:      false,
	}

	if err := h.db.Create(&verification).Error; err != nil {
		return nil, fmt.Errorf("failed to save verification code: %w", err)
	}

	// 发送短信
	template := h.getSMSTemplate(codeType)
	if err := h.smsService.SendVerificationCode(phone, code, template); err != nil {
		// 发送失败，删除验证码记录
		h.db.Delete(&verification)
		return nil, fmt.Errorf("failed to send SMS: %w", err)
	}

	return &verification, nil
}

// VerifyCode 验证验证码
func (h *SMSHandler) VerifyCode(phone, code, codeType string) (*models.SMSVerification, error) {
	var verification models.SMSVerification
	if err := h.db.Where("phone = ? AND code = ? AND type = ? AND used = ? AND expires_at > ?",
		phone, code, codeType, false, time.Now()).First(&verification).Error; err != nil {
		return nil, fmt.Errorf("invalid or expired verification code")
	}

	return &verification, nil
}

// MarkCodeAsUsed 标记验证码为已使用
func (h *SMSHandler) MarkCodeAsUsed(verification *models.SMSVerification) error {
	return h.db.Model(verification).Update("used", true).Error
}

// getSMSTemplate 获取短信模板
func (h *SMSHandler) getSMSTemplate(codeType string) string {
	templates := map[string]string{
		"login":          "您的登录验证码是：{code}，10分钟内有效。",
		"register":       "您的注册验证码是：{code}，10分钟内有效。",
		"reset_password": "您的密码重置验证码是：{code}，10分钟内有效。",
	}

	if template, exists := templates[codeType]; exists {
		return template
	}

	return "您的验证码是：{code}，10分钟内有效。"
}

// CleanupExpiredCodes 清理过期验证码
func (h *SMSHandler) CleanupExpiredCodes() error {
	return h.db.Where("expires_at < ?", time.Now()).Delete(&models.SMSVerification{}).Error
}

// GetSMSStats 获取短信统计
func (h *SMSHandler) GetSMSStats() (map[string]interface{}, error) {
	var totalCount int64
	var todayCount int64
	var expiredCount int64

	// 总验证码数量
	h.db.Model(&models.SMSVerification{}).Count(&totalCount)

	// 今日发送数量
	h.db.Model(&models.SMSVerification{}).Where("created_at >= ?", time.Now().Truncate(24*time.Hour)).Count(&todayCount)

	// 过期验证码数量
	h.db.Model(&models.SMSVerification{}).Where("expires_at < ?", time.Now()).Count(&expiredCount)

	return map[string]interface{}{
		"total_codes":   totalCount,
		"today_codes":   todayCount,
		"expired_codes": expiredCount,
	}, nil
}
