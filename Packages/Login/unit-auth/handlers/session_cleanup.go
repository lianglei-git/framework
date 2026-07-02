package handlers

import (
	"log"
	"time"
	"unit-auth/config"
	"unit-auth/models"

	"gorm.io/gorm"
)

// CleanupExpiredSessions 清理过期、已登出和长期不活跃的session记录
func CleanupExpiredSessions(db *gorm.DB) error {
	now := time.Now()
	var totalCleaned int64

	// 1. 删除已过期的session（expires_at < now）
	result := db.Where("expires_at < ?", now).Delete(&models.SSOSession{})
	if result.Error != nil {
		log.Printf("❌ 清理过期session失败: %v", result.Error)
		return result.Error
	}
	log.Printf("✅ 已清理 %d 个过期session", result.RowsAffected)
	totalCleaned += result.RowsAffected

	// 2. 删除已登出超过7天的session
	sevenDaysAgo := now.Add(-7 * 24 * time.Hour)
	result = db.Where("status = ? AND updated_at < ?", "logged_out", sevenDaysAgo).
		Delete(&models.SSOSession{})
	if result.Error != nil {
		log.Printf("❌ 清理已登出session失败: %v", result.Error)
		return result.Error
	}
	log.Printf("✅ 已清理 %d 个已登出session（超过7天）", result.RowsAffected)
	totalCleaned += result.RowsAffected

	// 3. 删除长期不活跃的active session（last_activity < 90天前）
	inactiveThreshold := now.Add(-config.SSOMaxInactiveTTL())
	result = db.Where("status = ? AND last_activity < ?", "active", inactiveThreshold).
		Delete(&models.SSOSession{})
	if result.Error != nil {
		log.Printf("❌ 清理不活跃session失败: %v", result.Error)
		return result.Error
	}
	log.Printf("✅ 已清理 %d 个不活跃session（超过90天）", result.RowsAffected)
	totalCleaned += result.RowsAffected

	// 4. 汇总日志
	log.Printf("🎉 本次清理总计: %d 条session记录", totalCleaned)

	return nil
}

// StartSessionCleanupScheduler 启动session清理调度器（非阻塞）
func StartSessionCleanupScheduler(db *gorm.DB) {
	log.Println("✅ Session清理调度器启动中...")

	go func() {
		// 计算到下一个凌晨3点的时间
		now := time.Now()
		next3AM := time.Date(now.Year(), now.Month(), now.Day(), 3, 0, 0, 0, now.Location())

		// 如果今天3点已过，计算明天3点
		if next3AM.Before(now) {
			next3AM = next3AM.Add(24 * time.Hour)
		}

		waitDuration := time.Until(next3AM)
		log.Printf("⏰ 下次清理时间: %s (等待 %s)", next3AM.Format("2006-01-02 15:04:05"), waitDuration.Round(time.Minute))

		// 等待到第一个执行时间
		time.Sleep(waitDuration)

		// 首次执行
		log.Println("🧹 开始执行定期session清理...")
		if err := CleanupExpiredSessions(db); err != nil {
			log.Printf("⚠️ 首次session清理失败: %v", err)
		}

		// 创建每24小时执行一次的定时器
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()

		// 定期执行
		for range ticker.C {
			log.Println("🧹 开始执行定期session清理...")
			if err := CleanupExpiredSessions(db); err != nil {
				log.Printf("⚠️ 定期session清理失败: %v", err)
			}
		}
	}()
}
