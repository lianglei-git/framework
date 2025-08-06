package handlers

import (
	"net/http"
	"strconv"
	"time"
	"unit-auth/services"

	"github.com/gin-gonic/gin"
)

// MonitoringHandler 监控处理器
type MonitoringHandler struct {
	monitoringService *services.MonitoringService
}

// NewMonitoringHandler 创建监控处理器
func NewMonitoringHandler(monitoringService *services.MonitoringService) *MonitoringHandler {
	return &MonitoringHandler{
		monitoringService: monitoringService,
	}
}

// GetPrometheusMetrics 获取Prometheus指标
func (h *MonitoringHandler) GetPrometheusMetrics(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "Prometheus metrics endpoint",
		"data": gin.H{
			"endpoint": "/metrics",
			"note":     "Use /metrics endpoint to get Prometheus format metrics",
		},
	})
}

// GetMetrics 获取自定义指标
func (h *MonitoringHandler) GetMetrics(c *gin.Context) {
	metrics := h.monitoringService.GetMetrics()

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "Metrics retrieved successfully",
		"data":    metrics,
	})
}

// GetUserActivityStats 获取用户活跃度统计
func (h *MonitoringHandler) GetUserActivityStats(c *gin.Context) {
	stats := h.monitoringService.GetActiveUsersStats()

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "User activity stats retrieved successfully",
		"data":    stats,
	})
}

// GetUserActivityDetails 获取用户活跃度详情
func (h *MonitoringHandler) GetUserActivityDetails(c *gin.Context) {
	details := h.monitoringService.GetUserActivityDetails()

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "User activity details retrieved successfully",
		"data":    details,
	})
}

// GetDailyActiveUsers 获取日活跃用户数
func (h *MonitoringHandler) GetDailyActiveUsers(c *gin.Context) {
	date := c.Query("date")
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	count := h.monitoringService.GetDailyActiveUsers(date)

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "Daily active users retrieved successfully",
		"data": gin.H{
			"date":  date,
			"count": count,
		},
	})
}

// GetMonthlyActiveUsers 获取月活跃用户数
func (h *MonitoringHandler) GetMonthlyActiveUsers(c *gin.Context) {
	month := c.Query("month")
	if month == "" {
		month = time.Now().Format("2006-01")
	}

	count := h.monitoringService.GetMonthlyActiveUsers(month)

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "Monthly active users retrieved successfully",
		"data": gin.H{
			"month": month,
			"count": count,
		},
	})
}

// ExportMetrics 导出指标到数据库
func (h *MonitoringHandler) ExportMetrics(c *gin.Context) {
	err := h.monitoringService.ExportMetrics()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "Failed to export metrics",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "Metrics exported successfully",
	})
}

// GetMetricsHistory 获取指标历史数据
func (h *MonitoringHandler) GetMetricsHistory(c *gin.Context) {
	// 这里可以从数据库获取历史指标数据
	// 暂时返回空数据
	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "Metrics history retrieved successfully",
		"data":    []interface{}{},
	})
}

// GetSystemHealth 获取系统健康状态
func (h *MonitoringHandler) GetSystemHealth(c *gin.Context) {
	stats := h.monitoringService.GetActiveUsersStats()

	// 计算系统健康度
	totalUsers := stats["total_users"].(int64)
	validUsers := stats["valid_users"].(int64)

	var healthScore float64
	if totalUsers > 0 {
		healthScore = float64(validUsers) / float64(totalUsers) * 100
	}

	healthStatus := "healthy"
	if healthScore < 50 {
		healthStatus = "unhealthy"
	} else if healthScore < 80 {
		healthStatus = "degraded"
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "System health status retrieved successfully",
		"data": gin.H{
			"status":       healthStatus,
			"health_score": healthScore,
			"total_users":  totalUsers,
			"valid_users":  validUsers,
			"timestamp":    time.Now(),
		},
	})
}

// GetMetricsSummary 获取指标摘要
func (h *MonitoringHandler) GetMetricsSummary(c *gin.Context) {
	stats := h.monitoringService.GetActiveUsersStats()

	// 计算增长率
	today := stats["daily_active_users"].(map[string]int64)["today"]
	yesterday := stats["daily_active_users"].(map[string]int64)["yesterday"]

	var dailyGrowth float64
	if yesterday > 0 {
		dailyGrowth = float64(today-yesterday) / float64(yesterday) * 100
	}

	thisMonth := stats["monthly_active_users"].(map[string]int64)["this_month"]
	lastMonth := stats["monthly_active_users"].(map[string]int64)["last_month"]

	var monthlyGrowth float64
	if lastMonth > 0 {
		monthlyGrowth = float64(thisMonth-lastMonth) / float64(lastMonth) * 100
	}

	summary := gin.H{
		"daily_active_users": gin.H{
			"today":     today,
			"yesterday": yesterday,
			"growth":    dailyGrowth,
		},
		"monthly_active_users": gin.H{
			"this_month": thisMonth,
			"last_month": lastMonth,
			"growth":     monthlyGrowth,
		},
		"valid_users": stats["valid_users"],
		"total_users": stats["total_users"],
		"timestamp":   time.Now(),
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "Metrics summary retrieved successfully",
		"data":    summary,
	})
}

// GetMetricsByPeriod 按时间段获取指标
func (h *MonitoringHandler) GetMetricsByPeriod(c *gin.Context) {
	period := c.Query("period") // daily, weekly, monthly
	if period == "" {
		period = "daily"
	}

	var data interface{}
	switch period {
	case "daily":
		data = h.getDailyMetrics()
	case "weekly":
		data = h.getWeeklyMetrics()
	case "monthly":
		data = h.getMonthlyMetrics()
	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "Invalid period. Use: daily, weekly, monthly",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "Metrics by period retrieved successfully",
		"data": gin.H{
			"period":  period,
			"metrics": data,
		},
	})
}

// getDailyMetrics 获取日指标
func (h *MonitoringHandler) getDailyMetrics() map[string]interface{} {
	// 获取最近7天的数据
	metrics := make(map[string]int64)
	for i := 6; i >= 0; i-- {
		date := time.Now().AddDate(0, 0, -i).Format("2006-01-02")
		metrics[date] = h.monitoringService.GetDailyActiveUsers(date)
	}

	return map[string]interface{}{
		"daily_metrics": metrics,
	}
}

// getWeeklyMetrics 获取周指标
func (h *MonitoringHandler) getWeeklyMetrics() map[string]interface{} {
	// 获取最近4周的数据
	metrics := make(map[string]int64)
	for i := 3; i >= 0; i-- {
		weekStart := time.Now().AddDate(0, 0, -i*7)
		weekKey := weekStart.Format("2006-W01")
		// 这里简化处理，实际应该计算每周的活跃用户
		metrics[weekKey] = h.monitoringService.GetDailyActiveUsers(weekStart.Format("2006-01-02"))
	}

	return map[string]interface{}{
		"weekly_metrics": metrics,
	}
}

// getMonthlyMetrics 获取月指标
func (h *MonitoringHandler) getMonthlyMetrics() map[string]interface{} {
	// 获取最近12个月的数据
	metrics := make(map[string]int64)
	for i := 11; i >= 0; i-- {
		month := time.Now().AddDate(0, -i, 0).Format("2006-01")
		metrics[month] = h.monitoringService.GetMonthlyActiveUsers(month)
	}

	return map[string]interface{}{
		"monthly_metrics": metrics,
	}
}

// GetTopActiveUsers 获取最活跃用户
func (h *MonitoringHandler) GetTopActiveUsers(c *gin.Context) {
	limitStr := c.Query("limit")
	limit := 10
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	details := h.monitoringService.GetUserActivityDetails()
	userActivity := details["user_activity"].(map[string]interface{})

	// 这里应该根据活跃度排序，简化处理
	topUsers := make([]interface{}, 0)
	count := 0
	for userID, activity := range userActivity {
		if count >= limit {
			break
		}
		topUsers = append(topUsers, gin.H{
			"user_id":  userID,
			"activity": activity,
		})
		count++
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "Top active users retrieved successfully",
		"data": gin.H{
			"limit": limit,
			"users": topUsers,
		},
	})
}
