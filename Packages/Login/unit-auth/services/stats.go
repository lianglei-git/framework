package services

import (
	"time"
	"unit-auth/models"

	"gorm.io/gorm"
)

// StatsService 用户统计服务
type StatsService struct {
	db *gorm.DB
}

// NewStatsService 创建统计服务
func NewStatsService(db *gorm.DB) *StatsService {
	return &StatsService{db: db}
}

// GetDB 获取数据库连接
func (ss *StatsService) GetDB() *gorm.DB {
	return ss.db
}

// GetDailyStats 获取每日统计
func (ss *StatsService) GetDailyStats(date time.Time) (*models.UserStats, error) {
	var stats models.UserStats

	// 获取指定日期的统计
	if err := ss.db.Where("date = ?", date.Format("2006-01-02")).First(&stats).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// 如果不存在，则计算并创建
			return ss.CalculateDailyStats(date)
		}
		return nil, err
	}

	return &stats, nil
}

// CalculateDailyStats 计算每日统计
func (ss *StatsService) CalculateDailyStats(date time.Time) (*models.UserStats, error) {
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	// 总用户数
	var totalUsers int64
	ss.db.Model(&models.User{}).Count(&totalUsers)

	// 新增用户数
	var newUsers int64
	ss.db.Model(&models.User{}).Where("created_at >= ? AND created_at < ?", startOfDay, endOfDay).Count(&newUsers)

	// 活跃用户数（当日登录的用户）
	var activeUsers int64
	ss.db.Model(&models.User{}).Where("last_login_at >= ? AND last_login_at < ?", startOfDay, endOfDay).Count(&activeUsers)

	// 登录次数
	var loginCount int64
	ss.db.Model(&models.LoginLog{}).Where("created_at >= ? AND created_at < ? AND success = ?", startOfDay, endOfDay, true).Count(&loginCount)

	stats := &models.UserStats{
		Date:        startOfDay,
		TotalUsers:  totalUsers,
		NewUsers:    newUsers,
		ActiveUsers: activeUsers,
		LoginCount:  loginCount,
	}

	// 保存或更新统计
	var existingStats models.UserStats
	if err := ss.db.Where("date = ?", startOfDay.Format("2006-01-02")).First(&existingStats).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// 创建新统计
			if err := ss.db.Create(stats).Error; err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	} else {
		// 更新现有统计
		existingStats.TotalUsers = totalUsers
		existingStats.NewUsers = newUsers
		existingStats.ActiveUsers = activeUsers
		existingStats.LoginCount = loginCount
		existingStats.UpdatedAt = time.Now()

		if err := ss.db.Save(&existingStats).Error; err != nil {
			return nil, err
		}
		stats = &existingStats
	}

	return stats, nil
}

// GetWeeklyStats 获取每周统计
func (ss *StatsService) GetWeeklyStats(endDate time.Time) ([]models.UserStats, error) {
	var stats []models.UserStats

	startOfWeek := endDate.AddDate(0, 0, -6) // 获取7天前的日期

	if err := ss.db.Where("date >= ? AND date <= ?", startOfWeek.Format("2006-01-02"), endDate.Format("2006-01-02")).
		Order("date ASC").Find(&stats).Error; err != nil {
		return nil, err
	}

	return stats, nil
}

// GetMonthlyStats 获取每月统计
func (ss *StatsService) GetMonthlyStats(year int, month time.Month) ([]models.UserStats, error) {
	var stats []models.UserStats

	startOfMonth := time.Date(year, month, 1, 0, 0, 0, 0, time.UTC)
	endOfMonth := startOfMonth.AddDate(0, 1, 0).Add(-time.Second)

	if err := ss.db.Where("date >= ? AND date <= ?", startOfMonth.Format("2006-01-02"), endOfMonth.Format("2006-01-02")).
		Order("date ASC").Find(&stats).Error; err != nil {
		return nil, err
	}

	return stats, nil
}

// GetOverallStats 获取总体统计
func (ss *StatsService) GetOverallStats() (*models.UserStatsResponse, error) {
	var totalUsers int64
	ss.db.Model(&models.User{}).Count(&totalUsers)

	// 今日新增用户
	today := time.Now()
	startOfDay := time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, today.Location())
	var newUsers int64
	ss.db.Model(&models.User{}).Where("created_at >= ?", startOfDay).Count(&newUsers)

	// 今日活跃用户
	var activeUsers int64
	ss.db.Model(&models.User{}).Where("last_login_at >= ?", startOfDay).Count(&activeUsers)

	// 今日登录次数
	var loginCount int64
	ss.db.Model(&models.LoginLog{}).Where("created_at >= ? AND success = ?", startOfDay, true).Count(&loginCount)

	return &models.UserStatsResponse{
		TotalUsers:  totalUsers,
		NewUsers:    newUsers,
		ActiveUsers: activeUsers,
		LoginCount:  loginCount,
	}, nil
}

// RecordLoginLog 记录登录日志
func (ss *StatsService) RecordLoginLog(userID string, provider, ip, userAgent, location string, success bool, errorMsg string) error {
	log := models.LoginLog{
		UserID:    userID,
		Provider:  provider,
		IP:        ip,
		UserAgent: userAgent,
		Location:  location,
		Success:   success,
		ErrorMsg:  errorMsg,
		CreatedAt: time.Now(),
	}

	return ss.db.Create(&log).Error
}

// UpdateUserLoginInfo 更新用户登录信息
func (ss *StatsService) UpdateUserLoginInfo(userID string, ip, userAgent string) error {
	return ss.db.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"last_login_at":         time.Now(),
		"last_login_ip":         ip,
		"last_login_user_agent": userAgent,
		"login_count":           gorm.Expr("login_count + 1"),
	}).Error
}
