package handlers

import (
	"fmt"
	"net/http"
	"time"
	"unit-auth/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// AnalyticsResponse 统计响应结构
type AnalyticsResponse struct {
	Period    string      `json:"period"`
	StartDate time.Time   `json:"start_date"`
	EndDate   time.Time   `json:"end_date"`
	Data      interface{} `json:"data"`
	Summary   interface{} `json:"summary"`
	Trends    interface{} `json:"trends"`
}

// GetUserGrowthAnalytics 用户增长分析
func GetUserGrowthAnalytics(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		period := c.DefaultQuery("period", "7d")     // 7d, 30d, 90d, 1y
		groupBy := c.DefaultQuery("group_by", "day") // day, week, month

		var startDate, endDate time.Time
		now := time.Now()

		switch period {
		case "7d":
			startDate = now.AddDate(0, 0, -7)
		case "30d":
			startDate = now.AddDate(0, 0, -30)
		case "90d":
			startDate = now.AddDate(0, 0, -90)
		case "1y":
			startDate = now.AddDate(-1, 0, 0)
		default:
			startDate = now.AddDate(0, 0, -7)
		}
		endDate = now

		// 获取用户增长数据
		var growthData []struct {
			Date  string `json:"date"`
			Count int64  `json:"count"`
		}

		query := db.Model(&models.User{}).Where("created_at BETWEEN ? AND ?", startDate, endDate)

		switch groupBy {
		case "day":
			query = query.Select("DATE(created_at) as date, COUNT(*) as count").
				Group("DATE(created_at)").
				Order("date ASC")
		case "week":
			query = query.Select("YEARWEEK(created_at) as date, COUNT(*) as count").
				Group("YEARWEEK(created_at)").
				Order("date ASC")
		case "month":
			query = query.Select("DATE_FORMAT(created_at, '%Y-%m') as date, COUNT(*) as count").
				Group("DATE_FORMAT(created_at, '%Y-%m')").
				Order("date ASC")
		}

		query.Find(&growthData)

		// 计算增长率
		var totalGrowth int64
		var avgDailyGrowth float64
		if len(growthData) > 0 {
			totalGrowth = growthData[len(growthData)-1].Count
			days := int(endDate.Sub(startDate).Hours() / 24)
			if days > 0 {
				avgDailyGrowth = float64(totalGrowth) / float64(days)
			}
		}

		// 获取同期对比数据
		var previousPeriodData []struct {
			Date  string `json:"date"`
			Count int64  `json:"count"`
		}

		previousStart := startDate.AddDate(0, 0, -int(endDate.Sub(startDate).Hours()/24))
		previousEnd := startDate

		query = db.Model(&models.User{}).Where("created_at BETWEEN ? AND ?", previousStart, previousEnd)

		switch groupBy {
		case "day":
			query = query.Select("DATE(created_at) as date, COUNT(*) as count").
				Group("DATE(created_at)").
				Order("date ASC")
		case "week":
			query = query.Select("YEARWEEK(created_at) as date, COUNT(*) as count").
				Group("YEARWEEK(created_at)").
				Order("date ASC")
		case "month":
			query = query.Select("DATE_FORMAT(created_at, '%Y-%m') as date, COUNT(*) as count").
				Group("DATE_FORMAT(created_at, '%Y-%m')").
				Order("date ASC")
		}

		query.Find(&previousPeriodData)

		var previousTotal int64
		if len(previousPeriodData) > 0 {
			previousTotal = previousPeriodData[len(previousPeriodData)-1].Count
		}

		growthRate := 0.0
		if previousTotal > 0 {
			growthRate = float64(totalGrowth-previousTotal) / float64(previousTotal) * 100
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "User growth analytics retrieved successfully",
			Data: AnalyticsResponse{
				Period:    period,
				StartDate: startDate,
				EndDate:   endDate,
				Data:      growthData,
				Summary: map[string]interface{}{
					"total_growth":     totalGrowth,
					"avg_daily_growth": avgDailyGrowth,
					"growth_rate":      growthRate,
					"previous_period":  previousTotal,
				},
				Trends: map[string]interface{}{
					"trend": "increasing", // 可以根据数据计算趋势
				},
			},
		})
	}
}

// GetLoginAnalytics 登录行为分析
func GetLoginAnalytics(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		period := c.DefaultQuery("period", "7d")
		provider := c.Query("provider")

		var startDate, endDate time.Time
		now := time.Now()

		switch period {
		case "7d":
			startDate = now.AddDate(0, 0, -7)
		case "30d":
			startDate = now.AddDate(0, 0, -30)
		case "90d":
			startDate = now.AddDate(0, 0, -90)
		case "1y":
			startDate = now.AddDate(-1, 0, 0)
		default:
			startDate = now.AddDate(0, 0, -7)
		}
		endDate = now

		// 构建查询
		query := db.Model(&models.LoginLog{}).Where("created_at BETWEEN ? AND ?", startDate, endDate)
		if provider != "" {
			query = query.Where("provider = ?", provider)
		}

		// 登录成功率
		var totalLogins, successfulLogins int64
		query.Count(&totalLogins)
		query.Where("success = ?", true).Count(&successfulLogins)

		successRate := 0.0
		if totalLogins > 0 {
			successRate = float64(successfulLogins) / float64(totalLogins) * 100
		}

		// 按登录方式统计
		var providerStats []struct {
			Provider     string  `json:"provider"`
			Count        int64   `json:"count"`
			SuccessCount int64   `json:"success_count"`
			SuccessRate  float64 `json:"success_rate"`
		}

		db.Model(&models.LoginLog{}).
			Where("created_at BETWEEN ? AND ?", startDate, endDate).
			Select("provider, COUNT(*) as count, SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count").
			Group("provider").
			Find(&providerStats)

		// 计算成功率
		for i := range providerStats {
			if providerStats[i].Count > 0 {
				providerStats[i].SuccessRate = float64(providerStats[i].SuccessCount) / float64(providerStats[i].Count) * 100
			}
		}

		// 按时间统计登录趋势
		var timeStats []struct {
			Hour  int   `json:"hour"`
			Count int64 `json:"count"`
		}

		db.Model(&models.LoginLog{}).
			Where("created_at BETWEEN ? AND ?", startDate, endDate).
			Select("HOUR(created_at) as hour, COUNT(*) as count").
			Group("HOUR(created_at)").
			Order("hour ASC").
			Find(&timeStats)

		// 获取活跃用户统计
		var activeUsers int64
		db.Model(&models.User{}).
			Where("last_login_at >= ?", startDate).
			Count(&activeUsers)

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Login analytics retrieved successfully",
			Data: AnalyticsResponse{
				Period:    period,
				StartDate: startDate,
				EndDate:   endDate,
				Data: map[string]interface{}{
					"provider_stats": providerStats,
					"time_stats":     timeStats,
				},
				Summary: map[string]interface{}{
					"total_logins":      totalLogins,
					"successful_logins": successfulLogins,
					"success_rate":      successRate,
					"active_users":      activeUsers,
				},
				Trends: map[string]interface{}{
					"peak_hours": getPeakHours(timeStats),
				},
			},
		})
	}
}

// GetUserBehaviorAnalytics 用户行为分析
func GetUserBehaviorAnalytics(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		period := c.DefaultQuery("period", "30d")

		var startDate, endDate time.Time
		now := time.Now()

		switch period {
		case "7d":
			startDate = now.AddDate(0, 0, -7)
		case "30d":
			startDate = now.AddDate(0, 0, -30)
		case "90d":
			startDate = now.AddDate(0, 0, -90)
		case "1y":
			startDate = now.AddDate(-1, 0, 0)
		default:
			startDate = now.AddDate(0, 0, -30)
		}
		endDate = now

		// 用户留存率分析
		var retentionData []struct {
			Day      int     `json:"day"`
			Retained int64   `json:"retained"`
			Total    int64   `json:"total"`
			Rate     float64 `json:"rate"`
		}

		// 计算7天留存率
		for day := 1; day <= 7; day++ {
			var retained, total int64

			// 获取day天前注册的用户总数
			targetDate := now.AddDate(0, 0, -day)
			db.Model(&models.User{}).
				Where("DATE(created_at) = DATE(?)", targetDate).
				Count(&total)

			// 获取这些用户中在day天后仍然活跃的用户数
			if total > 0 {
				db.Model(&models.User{}).
					Where("DATE(created_at) = DATE(?) AND last_login_at >= ?",
						targetDate, targetDate.AddDate(0, 0, day)).
					Count(&retained)
			}

			rate := 0.0
			if total > 0 {
				rate = float64(retained) / float64(total) * 100
			}

			retentionData = append(retentionData, struct {
				Day      int     `json:"day"`
				Retained int64   `json:"retained"`
				Total    int64   `json:"total"`
				Rate     float64 `json:"rate"`
			}{
				Day:      day,
				Retained: retained,
				Total:    total,
				Rate:     rate,
			})
		}

		// 用户活跃度分析
		var activityData []struct {
			ActivityLevel string  `json:"activity_level"`
			Count         int64   `json:"count"`
			Percentage    float64 `json:"percentage"`
		}

		var totalUsers int64
		db.Model(&models.User{}).Count(&totalUsers)

		if totalUsers > 0 {
			// 高活跃用户（7天内登录）
			var highActive int64
			db.Model(&models.User{}).
				Where("last_login_at >= ?", now.AddDate(0, 0, -7)).
				Count(&highActive)

			// 中活跃用户（30天内登录）
			var mediumActive int64
			db.Model(&models.User{}).
				Where("last_login_at >= ? AND last_login_at < ?",
					now.AddDate(0, 0, -30), now.AddDate(0, 0, -7)).
				Count(&mediumActive)

			// 低活跃用户（90天内登录）
			var lowActive int64
			db.Model(&models.User{}).
				Where("last_login_at >= ? AND last_login_at < ?",
					now.AddDate(0, 0, -90), now.AddDate(0, 0, -30)).
				Count(&lowActive)

			// 不活跃用户
			inactive := totalUsers - highActive - mediumActive - lowActive

			activityData = []struct {
				ActivityLevel string  `json:"activity_level"`
				Count         int64   `json:"count"`
				Percentage    float64 `json:"percentage"`
			}{
				{"high", highActive, float64(highActive) / float64(totalUsers) * 100},
				{"medium", mediumActive, float64(mediumActive) / float64(totalUsers) * 100},
				{"low", lowActive, float64(lowActive) / float64(totalUsers) * 100},
				{"inactive", inactive, float64(inactive) / float64(totalUsers) * 100},
			}
		}

		// 用户注册渠道分析
		var channelData []struct {
			Channel    string  `json:"channel"`
			Count      int64   `json:"count"`
			Percentage float64 `json:"percentage"`
		}

		var emailUsers, phoneUsers, oauthUsers int64

		db.Model(&models.User{}).
			Where("email IS NOT NULL AND email != ''").
			Count(&emailUsers)

		db.Model(&models.User{}).
			Where("phone IS NOT NULL AND phone != ''").
			Count(&phoneUsers)

		// OAuth用户（有第三方ID的用户）
		db.Model(&models.User{}).
			Where("google_id IS NOT NULL OR github_id IS NOT NULL OR wechat_id IS NOT NULL").
			Count(&oauthUsers)

		if totalUsers > 0 {
			channelData = []struct {
				Channel    string  `json:"channel"`
				Count      int64   `json:"count"`
				Percentage float64 `json:"percentage"`
			}{
				{"email", emailUsers, float64(emailUsers) / float64(totalUsers) * 100},
				{"phone", phoneUsers, float64(phoneUsers) / float64(totalUsers) * 100},
				{"oauth", oauthUsers, float64(oauthUsers) / float64(totalUsers) * 100},
			}
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "User behavior analytics retrieved successfully",
			Data: AnalyticsResponse{
				Period:    period,
				StartDate: startDate,
				EndDate:   endDate,
				Data: map[string]interface{}{
					"retention": retentionData,
					"activity":  activityData,
					"channels":  channelData,
				},
				Summary: map[string]interface{}{
					"total_users":        totalUsers,
					"avg_retention_rate": calculateAverageRetention(retentionData),
				},
				Trends: map[string]interface{}{
					"retention_trend": analyzeRetentionTrend(retentionData),
				},
			},
		})
	}
}

// GetSystemPerformanceAnalytics 系统性能分析
func GetSystemPerformanceAnalytics(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		period := c.DefaultQuery("period", "24h")

		var startDate, endDate time.Time
		now := time.Now()

		switch period {
		case "1h":
			startDate = now.Add(-1 * time.Hour)
		case "6h":
			startDate = now.Add(-6 * time.Hour)
		case "24h":
			startDate = now.AddDate(0, 0, -1)
		case "7d":
			startDate = now.AddDate(0, 0, -7)
		default:
			startDate = now.AddDate(0, 0, -1)
		}
		endDate = now

		// API响应时间分析（模拟数据，实际需要中间件记录）
		var responseTimeData []struct {
			Endpoint        string  `json:"endpoint"`
			AvgResponseTime float64 `json:"avg_response_time"`
			MaxResponseTime float64 `json:"max_response_time"`
			MinResponseTime float64 `json:"min_response_time"`
			RequestCount    int64   `json:"request_count"`
		}

		// 这里应该从实际的性能监控数据中获取
		// 目前使用模拟数据
		responseTimeData = []struct {
			Endpoint        string  `json:"endpoint"`
			AvgResponseTime float64 `json:"avg_response_time"`
			MaxResponseTime float64 `json:"max_response_time"`
			MinResponseTime float64 `json:"min_response_time"`
			RequestCount    int64   `json:"request_count"`
		}{
			{"/api/v1/auth/login", 150.5, 500.0, 50.0, 1000},
			{"/api/v1/auth/register", 200.3, 800.0, 80.0, 500},
			{"/api/v1/admin/users", 300.7, 1200.0, 120.0, 200},
		}

		// 错误率分析
		var errorStats []struct {
			ErrorType  string  `json:"error_type"`
			Count      int64   `json:"count"`
			Percentage float64 `json:"percentage"`
		}

		var totalErrors, authErrors, validationErrors, serverErrors int64

		// 从登录日志中统计错误
		db.Model(&models.LoginLog{}).
			Where("created_at BETWEEN ? AND ? AND success = ?", startDate, endDate, false).
			Count(&authErrors)

		// 模拟其他错误类型
		validationErrors = authErrors / 2
		serverErrors = authErrors / 4
		totalErrors = authErrors + validationErrors + serverErrors

		if totalErrors > 0 {
			errorStats = []struct {
				ErrorType  string  `json:"error_type"`
				Count      int64   `json:"count"`
				Percentage float64 `json:"percentage"`
			}{
				{"authentication", authErrors, float64(authErrors) / float64(totalErrors) * 100},
				{"validation", validationErrors, float64(validationErrors) / float64(totalErrors) * 100},
				{"server", serverErrors, float64(serverErrors) / float64(totalErrors) * 100},
			}
		}

		// 数据库性能统计
		var dbStats struct {
			TotalQueries    int64   `json:"total_queries"`
			AvgQueryTime    float64 `json:"avg_query_time"`
			SlowQueries     int64   `json:"slow_queries"`
			ConnectionCount int64   `json:"connection_count"`
		}

		// 模拟数据库统计
		dbStats = struct {
			TotalQueries    int64   `json:"total_queries"`
			AvgQueryTime    float64 `json:"avg_query_time"`
			SlowQueries     int64   `json:"slow_queries"`
			ConnectionCount int64   `json:"connection_count"`
		}{
			TotalQueries:    5000,
			AvgQueryTime:    25.5,
			SlowQueries:     50,
			ConnectionCount: 10,
		}

		// 系统资源使用情况
		var resourceStats struct {
			CPUUsage    float64 `json:"cpu_usage"`
			MemoryUsage float64 `json:"memory_usage"`
			DiskUsage   float64 `json:"disk_usage"`
			NetworkIO   float64 `json:"network_io"`
		}

		// 模拟资源统计
		resourceStats = struct {
			CPUUsage    float64 `json:"cpu_usage"`
			MemoryUsage float64 `json:"memory_usage"`
			DiskUsage   float64 `json:"disk_usage"`
			NetworkIO   float64 `json:"network_io"`
		}{
			CPUUsage:    45.2,
			MemoryUsage: 68.7,
			DiskUsage:   23.1,
			NetworkIO:   1024.5, // MB/s
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "System performance analytics retrieved successfully",
			Data: AnalyticsResponse{
				Period:    period,
				StartDate: startDate,
				EndDate:   endDate,
				Data: map[string]interface{}{
					"response_times": responseTimeData,
					"errors":         errorStats,
					"database":       dbStats,
					"resources":      resourceStats,
				},
				Summary: map[string]interface{}{
					"total_requests":    1700,
					"error_rate":        float64(totalErrors) / 1700 * 100,
					"avg_response_time": 216.5,
				},
				Trends: map[string]interface{}{
					"performance_trend": "stable",
					"error_trend":       "decreasing",
				},
			},
		})
	}
}

// GetRealTimeMetrics 实时监控指标
func GetRealTimeMetrics(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		now := time.Now()
		lastHour := now.Add(-1 * time.Hour)

		// 实时用户统计
		var realTimeStats struct {
			OnlineUsers         int64 `json:"online_users"`
			ActiveSessions      int64 `json:"active_sessions"`
			RecentLogins        int64 `json:"recent_logins"`
			RecentRegistrations int64 `json:"recent_registrations"`
		}

		// 最近1小时登录的用户数
		db.Model(&models.User{}).
			Where("last_login_at >= ?", lastHour).
			Count(&realTimeStats.RecentLogins)

		// 最近1小时注册的用户数
		db.Model(&models.User{}).
			Where("created_at >= ?", lastHour).
			Count(&realTimeStats.RecentRegistrations)

		// 模拟在线用户和活跃会话
		realTimeStats.OnlineUsers = realTimeStats.RecentLogins / 2
		realTimeStats.ActiveSessions = realTimeStats.RecentLogins

		// 实时系统指标
		var systemMetrics struct {
			CPUUsage    float64 `json:"cpu_usage"`
			MemoryUsage float64 `json:"memory_usage"`
			DiskUsage   float64 `json:"disk_usage"`
			NetworkIO   float64 `json:"network_io"`
			RequestRate float64 `json:"request_rate"`
			ErrorRate   float64 `json:"error_rate"`
		}

		// 模拟实时系统指标
		systemMetrics = struct {
			CPUUsage    float64 `json:"cpu_usage"`
			MemoryUsage float64 `json:"memory_usage"`
			DiskUsage   float64 `json:"disk_usage"`
			NetworkIO   float64 `json:"network_io"`
			RequestRate float64 `json:"request_rate"`
			ErrorRate   float64 `json:"error_rate"`
		}{
			CPUUsage:    42.5,
			MemoryUsage: 65.8,
			DiskUsage:   23.1,
			NetworkIO:   856.2,
			RequestRate: 125.3, // requests per minute
			ErrorRate:   2.1,   // percentage
		}

		// 最近活动
		var recentActivities []struct {
			Type      string    `json:"type"`
			UserID    string    `json:"user_id"`
			Username  string    `json:"username"`
			Action    string    `json:"action"`
			Timestamp time.Time `json:"timestamp"`
		}

		// 获取最近的登录活动
		var recentLogins []models.LoginLog
		db.Where("created_at >= ? AND success = ?", lastHour, true).
			Order("created_at DESC").
			Limit(10).
			Find(&recentLogins)

		for _, login := range recentLogins {
			var user models.User
			if err := db.Where("id = ?", login.UserID).First(&user).Error; err == nil {
				recentActivities = append(recentActivities, struct {
					Type      string    `json:"type"`
					UserID    string    `json:"user_id"`
					Username  string    `json:"username"`
					Action    string    `json:"action"`
					Timestamp time.Time `json:"timestamp"`
				}{
					Type:      "login",
					UserID:    login.UserID,
					Username:  user.Username,
					Action:    fmt.Sprintf("登录成功 (%s)", login.Provider),
					Timestamp: login.CreatedAt,
				})
			}
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Real-time metrics retrieved successfully",
			Data: map[string]interface{}{
				"timestamp":         now,
				"user_stats":        realTimeStats,
				"system_metrics":    systemMetrics,
				"recent_activities": recentActivities,
			},
		})
	}
}

// 辅助函数

// getPeakHours 获取高峰时段
func getPeakHours(timeStats []struct {
	Hour  int   `json:"hour"`
	Count int64 `json:"count"`
}) []int {
	if len(timeStats) == 0 {
		return []int{}
	}

	var peakHours []int
	maxCount := timeStats[0].Count

	for _, stat := range timeStats {
		if stat.Count > maxCount {
			maxCount = stat.Count
		}
	}

	// 获取所有达到80%以上最大值的时段
	threshold := float64(maxCount) * 0.8
	for _, stat := range timeStats {
		if float64(stat.Count) >= threshold {
			peakHours = append(peakHours, stat.Hour)
		}
	}

	return peakHours
}

// calculateAverageRetention 计算平均留存率
func calculateAverageRetention(retentionData []struct {
	Day      int     `json:"day"`
	Retained int64   `json:"retained"`
	Total    int64   `json:"total"`
	Rate     float64 `json:"rate"`
}) float64 {
	if len(retentionData) == 0 {
		return 0.0
	}

	totalRate := 0.0
	for _, data := range retentionData {
		totalRate += data.Rate
	}

	return totalRate / float64(len(retentionData))
}

// analyzeRetentionTrend 分析留存趋势
func analyzeRetentionTrend(retentionData []struct {
	Day      int     `json:"day"`
	Retained int64   `json:"retained"`
	Total    int64   `json:"total"`
	Rate     float64 `json:"rate"`
}) string {
	if len(retentionData) < 2 {
		return "insufficient_data"
	}

	// 比较第1天和第7天的留存率
	day1Rate := retentionData[0].Rate
	day7Rate := retentionData[len(retentionData)-1].Rate

	if day7Rate > day1Rate {
		return "improving"
	} else if day7Rate < day1Rate {
		return "declining"
	} else {
		return "stable"
	}
}
