package services

import (
	"log"
	"time"
	"unit-auth/models"

	"gorm.io/gorm"
)

// CleanupService 清理服务
type CleanupService struct {
	db *gorm.DB
}

// NewCleanupService 创建清理服务
func NewCleanupService(db *gorm.DB) *CleanupService {
	return &CleanupService{db: db}
}

// StartCleanupScheduler 启动清理调度器
func (cs *CleanupService) StartCleanupScheduler() {
	log.Println("🧹 启动验证码清理调度器...")

	// 立即执行一次清理
	cs.CleanupExpiredVerifications()

	// 每5分钟执行一次清理
	ticker := time.NewTicker(5 * time.Minute)
	go func() {
		for range ticker.C {
			cs.CleanupExpiredVerifications()
		}
	}()
}

// CleanupExpiredVerifications 清理过期的验证码
func (cs *CleanupService) CleanupExpiredVerifications() {
	log.Println("🧹 开始清理过期验证码...")

	// 清理过期的邮箱验证码
	var emailCount int64
	if err := cs.db.Model(&models.EmailVerification{}).
		Where("expires_at < ? OR used = ?", time.Now(), true).
		Count(&emailCount).Error; err != nil {
		log.Printf("❌ 统计过期邮箱验证码失败: %v", err)
		return
	}

	if emailCount > 0 {
		if err := cs.db.Where("expires_at < ? OR used = ?", time.Now(), true).
			Delete(&models.EmailVerification{}).Error; err != nil {
			log.Printf("❌ 清理过期邮箱验证码失败: %v", err)
		} else {
			log.Printf("✅ 清理了 %d 条过期邮箱验证码", emailCount)
		}
	}

	// 清理过期的短信验证码
	var smsCount int64
	if err := cs.db.Model(&models.SMSVerification{}).
		Where("expires_at < ? OR used = ?", time.Now(), true).
		Count(&smsCount).Error; err != nil {
		log.Printf("❌ 统计过期短信验证码失败: %v", err)
		return
	}

	if smsCount > 0 {
		if err := cs.db.Where("expires_at < ? OR used = ?", time.Now(), true).
			Delete(&models.SMSVerification{}).Error; err != nil {
			log.Printf("❌ 清理过期短信验证码失败: %v", err)
		} else {
			log.Printf("✅ 清理了 %d 条过期短信验证码", smsCount)
		}
	}

	// 清理过期的密码重置令牌
	var resetCount int64
	if err := cs.db.Model(&models.PasswordReset{}).
		Where("expires_at < ? OR used = ?", time.Now(), true).
		Count(&resetCount).Error; err != nil {
		log.Printf("❌ 统计过期密码重置令牌失败: %v", err)
		return
	}

	if resetCount > 0 {
		if err := cs.db.Where("expires_at < ? OR used = ?", time.Now(), true).
			Delete(&models.PasswordReset{}).Error; err != nil {
			log.Printf("❌ 清理过期密码重置令牌失败: %v", err)
		} else {
			log.Printf("✅ 清理了 %d 条过期密码重置令牌", resetCount)
		}
	}

	// 清理过期的微信二维码会话
	var wechatCount int64
	if err := cs.db.Model(&models.WeChatQRSession{}).
		Where("expires_at < ? OR used = ?", time.Now(), true).
		Count(&wechatCount).Error; err != nil {
		log.Printf("❌ 统计过期微信二维码会话失败: %v", err)
		return
	}

	if wechatCount > 0 {
		if err := cs.db.Where("expires_at < ? OR used = ?", time.Now(), true).
			Delete(&models.WeChatQRSession{}).Error; err != nil {
			log.Printf("❌ 清理过期微信二维码会话失败: %v", err)
		} else {
			log.Printf("✅ 清理了 %d 条过期微信二维码会话", wechatCount)
		}
	}

	// 清理30天前的登录日志
	var logCount int64
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	if err := cs.db.Model(&models.LoginLog{}).
		Where("created_at < ?", thirtyDaysAgo).
		Count(&logCount).Error; err != nil {
		log.Printf("❌ 统计过期登录日志失败: %v", err)
		return
	}

	if logCount > 0 {
		if err := cs.db.Where("created_at < ?", thirtyDaysAgo).
			Delete(&models.LoginLog{}).Error; err != nil {
			log.Printf("❌ 清理过期登录日志失败: %v", err)
		} else {
			log.Printf("✅ 清理了 %d 条过期登录日志", logCount)
		}
	}

	log.Println("🧹 验证码清理完成")
}

// GetVerificationStats 获取验证码统计信息
func (cs *CleanupService) GetVerificationStats() map[string]interface{} {
	stats := make(map[string]interface{})

	// 统计邮箱验证码
	var emailTotal, emailExpired, emailUsed int64
	cs.db.Model(&models.EmailVerification{}).Count(&emailTotal)
	cs.db.Model(&models.EmailVerification{}).Where("expires_at < ?", time.Now()).Count(&emailExpired)
	cs.db.Model(&models.EmailVerification{}).Where("used = ?", true).Count(&emailUsed)

	// 统计短信验证码
	var smsTotal, smsExpired, smsUsed int64
	cs.db.Model(&models.SMSVerification{}).Count(&smsTotal)
	cs.db.Model(&models.SMSVerification{}).Where("expires_at < ?", time.Now()).Count(&smsExpired)
	cs.db.Model(&models.SMSVerification{}).Where("used = ?", true).Count(&smsUsed)

	stats["email_verifications"] = map[string]int64{
		"total":   emailTotal,
		"expired": emailExpired,
		"used":    emailUsed,
		"active":  emailTotal - emailExpired - emailUsed,
	}

	stats["sms_verifications"] = map[string]int64{
		"total":   smsTotal,
		"expired": smsExpired,
		"used":    smsUsed,
		"active":  smsTotal - smsExpired - smsUsed,
	}

	return stats
}
