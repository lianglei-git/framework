package handlers

import (
	"net/http"
	"strconv"
	"time"
	"unit-auth/models"
	"unit-auth/services"

	"github.com/gin-gonic/gin"
)

// StatsHandler 统计处理器
type StatsHandler struct {
	statsService *services.StatsService
}

// NewStatsHandler 创建统计处理器
func NewStatsHandler(statsService *services.StatsService) *StatsHandler {
	return &StatsHandler{
		statsService: statsService,
	}
}

// GetOverallStats 获取总体统计
func (h *StatsHandler) GetOverallStats() gin.HandlerFunc {
	return func(c *gin.Context) {
		stats, err := h.statsService.GetOverallStats()
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to get overall stats: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Overall stats retrieved successfully",
			Data:    stats,
		})
	}
}

// GetDailyStats 获取每日统计
func (h *StatsHandler) GetDailyStats() gin.HandlerFunc {
	return func(c *gin.Context) {
		dateStr := c.Param("date")
		if dateStr == "" {
			dateStr = time.Now().Format("2006-01-02")
		}

		date, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid date format. Use YYYY-MM-DD",
			})
			return
		}

		stats, err := h.statsService.GetDailyStats(date)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to get daily stats: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Daily stats retrieved successfully",
			Data:    stats,
		})
	}
}

// GetWeeklyStats 获取每周统计
func (h *StatsHandler) GetWeeklyStats() gin.HandlerFunc {
	return func(c *gin.Context) {
		endDateStr := c.Query("end_date")
		var endDate time.Time
		var err error

		if endDateStr == "" {
			endDate = time.Now()
		} else {
			endDate, err = time.Parse("2006-01-02", endDateStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, models.Response{
					Code:    400,
					Message: "Invalid end_date format. Use YYYY-MM-DD",
				})
				return
			}
		}

		stats, err := h.statsService.GetWeeklyStats(endDate)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to get weekly stats: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Weekly stats retrieved successfully",
			Data:    stats,
		})
	}
}

// GetMonthlyStats 获取每月统计
func (h *StatsHandler) GetMonthlyStats() gin.HandlerFunc {
	return func(c *gin.Context) {
		yearStr := c.Param("year")
		monthStr := c.Param("month")

		year, err := strconv.Atoi(yearStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid year parameter",
			})
			return
		}

		month, err := strconv.Atoi(monthStr)
		if err != nil || month < 1 || month > 12 {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid month parameter. Must be 1-12",
			})
			return
		}

		stats, err := h.statsService.GetMonthlyStats(year, time.Month(month))
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to get monthly stats: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Monthly stats retrieved successfully",
			Data:    stats,
		})
	}
}

// GetStatsRange 获取指定日期范围的统计
func (h *StatsHandler) GetStatsRange() gin.HandlerFunc {
	return func(c *gin.Context) {
		startDateStr := c.Query("start_date")
		endDateStr := c.Query("end_date")

		if startDateStr == "" || endDateStr == "" {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "start_date and end_date are required",
			})
			return
		}

		startDate, err := time.Parse("2006-01-02", startDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid start_date format. Use YYYY-MM-DD",
			})
			return
		}

		endDate, err := time.Parse("2006-01-02", endDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid end_date format. Use YYYY-MM-DD",
			})
			return
		}

		if startDate.After(endDate) {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "start_date cannot be after end_date",
			})
			return
		}

		// 获取范围内的所有统计
		var stats []models.UserStats
		for d := startDate; !d.After(endDate); d = d.AddDate(0, 0, 1) {
			stat, err := h.statsService.GetDailyStats(d)
			if err != nil {
				c.JSON(http.StatusInternalServerError, models.Response{
					Code:    500,
					Message: "Failed to get stats for date " + d.Format("2006-01-02") + ": " + err.Error(),
				})
				return
			}
			stats = append(stats, *stat)
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Stats range retrieved successfully",
			Data:    stats,
		})
	}
}

// GetUserStats 获取用户统计信息
// GET /api/v1/stats/users
func (h *StatsHandler) GetUserStats() gin.HandlerFunc {
	return func(c *gin.Context) {
		var stats struct {
			TotalUsers      int64 `json:"total_users"`
			ActiveUsers     int64 `json:"active_users"`
			InactiveUsers   int64 `json:"inactive_users"`
			EmailVerified   int64 `json:"email_verified"`
			PhoneVerified   int64 `json:"phone_verified"`
			AdminUsers      int64 `json:"admin_users"`
			RegularUsers    int64 `json:"regular_users"`
			NewUsersToday   int64 `json:"new_users_today"`
			NewUsersWeek    int64 `json:"new_users_week"`
			NewUsersMonth   int64 `json:"new_users_month"`
			LoginCountToday int64 `json:"login_count_today"`
			LoginCountWeek  int64 `json:"login_count_week"`
			LoginCountMonth int64 `json:"login_count_month"`
		}

		// 总用户数
		h.statsService.GetDB().Model(&models.User{}).Count(&stats.TotalUsers)

		// 活跃用户数
		h.statsService.GetDB().Model(&models.User{}).Where("status = ?", "active").Count(&stats.ActiveUsers)

		// 非活跃用户数
		h.statsService.GetDB().Model(&models.User{}).Where("status = ?", "inactive").Count(&stats.InactiveUsers)

		// 邮箱验证用户数
		h.statsService.GetDB().Model(&models.User{}).Where("email_verified = ?", true).Count(&stats.EmailVerified)

		// 手机验证用户数
		h.statsService.GetDB().Model(&models.User{}).Where("phone_verified = ?", true).Count(&stats.PhoneVerified)

		// 管理员用户数
		h.statsService.GetDB().Model(&models.User{}).Where("role = ?", "admin").Count(&stats.AdminUsers)

		// 普通用户数
		h.statsService.GetDB().Model(&models.User{}).Where("role = ?", "user").Count(&stats.RegularUsers)

		// 今日新用户
		today := time.Now().Truncate(24 * time.Hour)
		h.statsService.GetDB().Model(&models.User{}).Where("created_at >= ?", today).Count(&stats.NewUsersToday)

		// 本周新用户
		weekAgo := time.Now().AddDate(0, 0, -7)
		h.statsService.GetDB().Model(&models.User{}).Where("created_at >= ?", weekAgo).Count(&stats.NewUsersWeek)

		// 本月新用户
		monthAgo := time.Now().AddDate(0, -1, 0)
		h.statsService.GetDB().Model(&models.User{}).Where("created_at >= ?", monthAgo).Count(&stats.NewUsersMonth)

		// 今日登录次数
		h.statsService.GetDB().Model(&models.LoginLog{}).Where("created_at >= ? AND success = ?", today, true).Count(&stats.LoginCountToday)

		// 本周登录次数
		h.statsService.GetDB().Model(&models.LoginLog{}).Where("created_at >= ? AND success = ?", weekAgo, true).Count(&stats.LoginCountWeek)

		// 本月登录次数
		h.statsService.GetDB().Model(&models.LoginLog{}).Where("created_at >= ? AND success = ?", monthAgo, true).Count(&stats.LoginCountMonth)

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "User statistics retrieved successfully",
			Data:    stats,
		})
	}
}

// GetLoginStats 获取登录统计信息
// GET /api/v1/stats/logins
func (h *StatsHandler) GetLoginStats() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取查询参数
		startDateStr := c.Query("start_date")
		endDateStr := c.Query("end_date")
		provider := c.Query("provider")

		var startDate, endDate time.Time
		var err error

		// 默认查询最近30天
		if startDateStr == "" {
			startDate = time.Now().AddDate(0, 0, -30)
		} else {
			startDate, err = time.Parse("2006-01-02", startDateStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, models.Response{
					Code:    400,
					Message: "Invalid start_date format. Use YYYY-MM-DD",
				})
				return
			}
		}

		if endDateStr == "" {
			endDate = time.Now()
		} else {
			endDate, err = time.Parse("2006-01-02", endDateStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, models.Response{
					Code:    400,
					Message: "Invalid end_date format. Use YYYY-MM-DD",
				})
				return
			}
		}

		var stats struct {
			TotalLogins      int64            `json:"total_logins"`
			SuccessfulLogins int64            `json:"successful_logins"`
			FailedLogins     int64            `json:"failed_logins"`
			UniqueUsers      int64            `json:"unique_users"`
			TodayLogins      int64            `json:"today_logins"`
			WeekLogins       int64            `json:"week_logins"`
			MonthLogins      int64            `json:"month_logins"`
			ProviderStats    map[string]int64 `json:"provider_stats"`
		}

		// 构建查询
		query := h.statsService.GetDB().Model(&models.LoginLog{}).Where("created_at BETWEEN ? AND ?", startDate, endDate)

		// 按提供商过滤
		if provider != "" {
			query = query.Where("provider = ?", provider)
		}

		// 总登录次数
		query.Count(&stats.TotalLogins)

		// 成功登录次数
		h.statsService.GetDB().Model(&models.LoginLog{}).Where("created_at BETWEEN ? AND ? AND success = ?", startDate, endDate, true).Count(&stats.SuccessfulLogins)

		// 失败登录次数
		h.statsService.GetDB().Model(&models.LoginLog{}).Where("created_at BETWEEN ? AND ? AND success = ?", startDate, endDate, false).Count(&stats.FailedLogins)

		// 唯一用户数
		h.statsService.GetDB().Model(&models.LoginLog{}).Where("created_at BETWEEN ? AND ? AND success = ?", startDate, endDate, true).Distinct("user_id").Count(&stats.UniqueUsers)

		// 今日登录次数
		today := time.Now().Truncate(24 * time.Hour)
		h.statsService.GetDB().Model(&models.LoginLog{}).Where("created_at >= ? AND success = ?", today, true).Count(&stats.TodayLogins)

		// 本周登录次数
		weekAgo := time.Now().AddDate(0, 0, -7)
		h.statsService.GetDB().Model(&models.LoginLog{}).Where("created_at >= ? AND success = ?", weekAgo, true).Count(&stats.WeekLogins)

		// 本月登录次数
		monthAgo := time.Now().AddDate(0, -1, 0)
		h.statsService.GetDB().Model(&models.LoginLog{}).Where("created_at >= ? AND success = ?", monthAgo, true).Count(&stats.MonthLogins)

		// 按提供商统计
		stats.ProviderStats = make(map[string]int64)
		var providerResults []struct {
			Provider string `json:"provider"`
			Count    int64  `json:"count"`
		}

		h.statsService.GetDB().Model(&models.LoginLog{}).
			Select("provider, COUNT(*) as count").
			Where("created_at BETWEEN ? AND ? AND success = ?", startDate, endDate, true).
			Group("provider").
			Find(&providerResults)

		for _, result := range providerResults {
			stats.ProviderStats[result.Provider] = result.Count
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Login statistics retrieved successfully",
			Data: gin.H{
				"stats":      stats,
				"start_date": startDate.Format("2006-01-02"),
				"end_date":   endDate.Format("2006-01-02"),
				"provider":   provider,
			},
		})
	}
}

// GetDailyStatsEnhanced 获取每日统计信息（增强版）
// GET /api/v1/stats/daily
func (h *StatsHandler) GetDailyStatsEnhanced() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取查询参数
		dateStr := c.Query("date")
		daysStr := c.Query("days")

		var targetDate time.Time
		var err error

		// 默认查询今天
		if dateStr == "" {
			targetDate = time.Now()
		} else {
			targetDate, err = time.Parse("2006-01-02", dateStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, models.Response{
					Code:    400,
					Message: "Invalid date format. Use YYYY-MM-DD",
				})
				return
			}
		}

		// 获取天数参数，默认7天
		days := 7
		if daysStr != "" {
			days, err = strconv.Atoi(daysStr)
			if err != nil || days <= 0 || days > 365 {
				c.JSON(http.StatusBadRequest, models.Response{
					Code:    400,
					Message: "Invalid days parameter. Must be 1-365",
				})
				return
			}
		}

		// 计算日期范围
		endDate := targetDate
		startDate := endDate.AddDate(0, 0, -days+1)

		var dailyStats []struct {
			Date          string `json:"date"`
			NewUsers      int64  `json:"new_users"`
			ActiveUsers   int64  `json:"active_users"`
			LoginCount    int64  `json:"login_count"`
			UniqueLogins  int64  `json:"unique_logins"`
			EmailVerified int64  `json:"email_verified"`
			PhoneVerified int64  `json:"phone_verified"`
		}

		// 按日期查询统计数据
		for d := startDate; !d.After(endDate); d = d.AddDate(0, 0, 1) {
			dateStr := d.Format("2006-01-02")
			nextDay := d.AddDate(0, 0, 1)

			var stat struct {
				Date          string
				NewUsers      int64
				ActiveUsers   int64
				LoginCount    int64
				UniqueLogins  int64
				EmailVerified int64
				PhoneVerified int64
			}

			stat.Date = dateStr

			// 新用户数
			h.statsService.GetDB().Model(&models.User{}).Where("created_at >= ? AND created_at < ?", d, nextDay).Count(&stat.NewUsers)

			// 活跃用户数（当日有登录的用户）
			h.statsService.GetDB().Model(&models.LoginLog{}).Where("created_at >= ? AND created_at < ? AND success = ?", d, nextDay, true).Distinct("user_id").Count(&stat.ActiveUsers)

			// 登录次数
			h.statsService.GetDB().Model(&models.LoginLog{}).Where("created_at >= ? AND created_at < ? AND success = ?", d, nextDay, true).Count(&stat.LoginCount)

			// 唯一登录用户数
			h.statsService.GetDB().Model(&models.LoginLog{}).Where("created_at >= ? AND created_at < ? AND success = ?", d, nextDay, true).Distinct("user_id").Count(&stat.UniqueLogins)

			// 邮箱验证用户数
			h.statsService.GetDB().Model(&models.User{}).Where("email_verified = ? AND created_at < ?", true, nextDay).Count(&stat.EmailVerified)

			// 手机验证用户数
			h.statsService.GetDB().Model(&models.User{}).Where("phone_verified = ? AND created_at < ?", true, nextDay).Count(&stat.PhoneVerified)

			dailyStats = append(dailyStats, struct {
				Date          string `json:"date"`
				NewUsers      int64  `json:"new_users"`
				ActiveUsers   int64  `json:"active_users"`
				LoginCount    int64  `json:"login_count"`
				UniqueLogins  int64  `json:"unique_logins"`
				EmailVerified int64  `json:"email_verified"`
				PhoneVerified int64  `json:"phone_verified"`
			}{
				Date:          stat.Date,
				NewUsers:      stat.NewUsers,
				ActiveUsers:   stat.ActiveUsers,
				LoginCount:    stat.LoginCount,
				UniqueLogins:  stat.UniqueLogins,
				EmailVerified: stat.EmailVerified,
				PhoneVerified: stat.PhoneVerified,
			})
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Daily statistics retrieved successfully",
			Data: gin.H{
				"daily_stats": dailyStats,
				"start_date":  startDate.Format("2006-01-02"),
				"end_date":    endDate.Format("2006-01-02"),
				"days":        days,
			},
		})
	}
}
