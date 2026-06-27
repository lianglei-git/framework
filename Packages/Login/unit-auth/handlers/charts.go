package handlers

import (
	"fmt"
	"net/http"
	"time"
	"unit-auth/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ChartDataResponse 图表数据响应结构
type ChartDataResponse struct {
	ChartType string      `json:"chart_type"`
	Title     string      `json:"title"`
	Data      interface{} `json:"data"`
	Options   interface{} `json:"options"`
	Config    interface{} `json:"config"`
}

// GetUserGrowthChart 用户增长图表数据
func GetUserGrowthChart(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		period := c.DefaultQuery("period", "7d")
		chartType := c.DefaultQuery("chart_type", "line")

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

		db.Model(&models.User{}).
			Where("created_at BETWEEN ? AND ?", startDate, endDate).
			Select("DATE(created_at) as date, COUNT(*) as count").
			Group("DATE(created_at)").
			Order("date ASC").
			Find(&growthData)

		// 构建图表数据
		var labels []string
		var data []int64
		var backgroundColor []string
		var borderColor []string

		for i, item := range growthData {
			labels = append(labels, item.Date)
			data = append(data, item.Count)

			// 生成渐变色
			alpha := float64(i+1) / float64(len(growthData))
			backgroundColor = append(backgroundColor, fmt.Sprintf("rgba(54, 162, 235, %.2f)", alpha*0.5))
			borderColor = append(borderColor, "rgba(54, 162, 235, 1)")
		}

		chartData := map[string]interface{}{
			"labels": labels,
			"datasets": []map[string]interface{}{
				{
					"label":           "用户增长",
					"data":            data,
					"backgroundColor": backgroundColor,
					"borderColor":     borderColor,
					"borderWidth":     2,
					"fill":            false,
					"tension":         0.4,
				},
			},
		}

		// 图表配置
		options := map[string]interface{}{
			"responsive": true,
			"plugins": map[string]interface{}{
				"title": map[string]interface{}{
					"display": true,
					"text":    "用户增长趋势",
				},
				"legend": map[string]interface{}{
					"display":  true,
					"position": "top",
				},
			},
			"scales": map[string]interface{}{
				"y": map[string]interface{}{
					"beginAtZero": true,
					"title": map[string]interface{}{
						"display": true,
						"text":    "用户数量",
					},
				},
				"x": map[string]interface{}{
					"title": map[string]interface{}{
						"display": true,
						"text":    "日期",
					},
				},
			},
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "User growth chart data retrieved successfully",
			Data: ChartDataResponse{
				ChartType: chartType,
				Title:     "用户增长趋势",
				Data:      chartData,
				Options:   options,
				Config: map[string]interface{}{
					"period":      period,
					"total_users": len(data),
					"growth_rate": calculateGrowthRate(data),
				},
			},
		})
	}
}

// GetLoginBehaviorChart 登录行为图表数据
func GetLoginBehaviorChart(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		period := c.DefaultQuery("period", "7d")
		chartType := c.DefaultQuery("chart_type", "doughnut")

		var startDate, endDate time.Time
		now := time.Now()

		switch period {
		case "7d":
			startDate = now.AddDate(0, 0, -7)
		case "30d":
			startDate = now.AddDate(0, 0, -30)
		case "90d":
			startDate = now.AddDate(0, 0, -90)
		default:
			startDate = now.AddDate(0, 0, -7)
		}
		endDate = now

		// 获取登录方式统计
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

		// 构建图表数据
		var labels []string
		var data []int64
		var backgroundColor []string
		var borderColor []string

		colors := []string{
			"rgba(255, 99, 132, 0.8)",
			"rgba(54, 162, 235, 0.8)",
			"rgba(255, 206, 86, 0.8)",
			"rgba(75, 192, 192, 0.8)",
			"rgba(153, 102, 255, 0.8)",
		}

		borderColors := []string{
			"rgba(255, 99, 132, 1)",
			"rgba(54, 162, 235, 1)",
			"rgba(255, 206, 86, 1)",
			"rgba(75, 192, 192, 1)",
			"rgba(153, 102, 255, 1)",
		}

		for i, stat := range providerStats {
			labels = append(labels, stat.Provider)
			data = append(data, stat.Count)
			backgroundColor = append(backgroundColor, colors[i%len(colors)])
			borderColor = append(borderColor, borderColors[i%len(borderColors)])
		}

		chartData := map[string]interface{}{
			"labels": labels,
			"datasets": []map[string]interface{}{
				{
					"label":           "登录次数",
					"data":            data,
					"backgroundColor": backgroundColor,
					"borderColor":     borderColor,
					"borderWidth":     2,
				},
			},
		}

		// 图表配置
		options := map[string]interface{}{
			"responsive": true,
			"plugins": map[string]interface{}{
				"title": map[string]interface{}{
					"display": true,
					"text":    "登录方式分布",
				},
				"legend": map[string]interface{}{
					"display":  true,
					"position": "bottom",
				},
				"tooltip": map[string]interface{}{
					"callbacks": map[string]interface{}{
						"label": "function(context) { return context.label + ': ' + context.parsed + ' 次'; }",
					},
				},
			},
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Login behavior chart data retrieved successfully",
			Data: ChartDataResponse{
				ChartType: chartType,
				Title:     "登录方式分布",
				Data:      chartData,
				Options:   options,
				Config: map[string]interface{}{
					"period":       period,
					"total_logins": sumInt64(data),
					"providers":    providerStats,
				},
			},
		})
	}
}

// GetUserActivityChart 用户活跃度图表数据
func GetUserActivityChart(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		period := c.DefaultQuery("period", "30d")
		chartType := c.DefaultQuery("chart_type", "bar")

		now := time.Now()

		// 获取用户活跃度数据
		var totalUsers, highActive, mediumActive, lowActive, inactive int64

		db.Model(&models.User{}).Count(&totalUsers)

		if totalUsers > 0 {
			// 高活跃用户（7天内登录）
			db.Model(&models.User{}).
				Where("last_login_at >= ?", now.AddDate(0, 0, -7)).
				Count(&highActive)

			// 中活跃用户（30天内登录）
			db.Model(&models.User{}).
				Where("last_login_at >= ? AND last_login_at < ?",
					now.AddDate(0, 0, -30), now.AddDate(0, 0, -7)).
				Count(&mediumActive)

			// 低活跃用户（90天内登录）
			db.Model(&models.User{}).
				Where("last_login_at >= ? AND last_login_at < ?",
					now.AddDate(0, 0, -90), now.AddDate(0, 0, -30)).
				Count(&lowActive)

			// 不活跃用户
			inactive = totalUsers - highActive - mediumActive - lowActive
		}

		// 构建图表数据
		labels := []string{"高活跃", "中活跃", "低活跃", "不活跃"}
		data := []int64{highActive, mediumActive, lowActive, inactive}
		backgroundColor := []string{
			"rgba(75, 192, 192, 0.8)",
			"rgba(54, 162, 235, 0.8)",
			"rgba(255, 206, 86, 0.8)",
			"rgba(255, 99, 132, 0.8)",
		}
		borderColor := []string{
			"rgba(75, 192, 192, 1)",
			"rgba(54, 162, 235, 1)",
			"rgba(255, 206, 86, 1)",
			"rgba(255, 99, 132, 1)",
		}

		chartData := map[string]interface{}{
			"labels": labels,
			"datasets": []map[string]interface{}{
				{
					"label":           "用户数量",
					"data":            data,
					"backgroundColor": backgroundColor,
					"borderColor":     borderColor,
					"borderWidth":     2,
				},
			},
		}

		// 图表配置
		options := map[string]interface{}{
			"responsive": true,
			"plugins": map[string]interface{}{
				"title": map[string]interface{}{
					"display": true,
					"text":    "用户活跃度分布",
				},
				"legend": map[string]interface{}{
					"display":  true,
					"position": "top",
				},
			},
			"scales": map[string]interface{}{
				"y": map[string]interface{}{
					"beginAtZero": true,
					"title": map[string]interface{}{
						"display": true,
						"text":    "用户数量",
					},
				},
				"x": map[string]interface{}{
					"title": map[string]interface{}{
						"display": true,
						"text":    "活跃度级别",
					},
				},
			},
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "User activity chart data retrieved successfully",
			Data: ChartDataResponse{
				ChartType: chartType,
				Title:     "用户活跃度分布",
				Data:      chartData,
				Options:   options,
				Config: map[string]interface{}{
					"period":      period,
					"total_users": totalUsers,
					"activity_rates": map[string]float64{
						"high":     float64(highActive) / float64(totalUsers) * 100,
						"medium":   float64(mediumActive) / float64(totalUsers) * 100,
						"low":      float64(lowActive) / float64(totalUsers) * 100,
						"inactive": float64(inactive) / float64(totalUsers) * 100,
					},
				},
			},
		})
	}
}

// GetSystemPerformanceChart 系统性能图表数据
func GetSystemPerformanceChart(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		period := c.DefaultQuery("period", "24h")
		chartType := c.DefaultQuery("chart_type", "line")

		// 模拟系统性能数据
		labels := []string{"00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"}
		cpuData := []float64{45.2, 38.7, 52.1, 68.9, 75.3, 62.8, 48.5}
		memoryData := []float64{65.8, 62.3, 68.7, 72.1, 78.9, 71.2, 66.5}
		diskData := []float64{23.1, 23.2, 23.5, 24.1, 24.8, 24.3, 23.7}

		chartData := map[string]interface{}{
			"labels": labels,
			"datasets": []map[string]interface{}{
				{
					"label":           "CPU使用率",
					"data":            cpuData,
					"borderColor":     "rgba(255, 99, 132, 1)",
					"backgroundColor": "rgba(255, 99, 132, 0.2)",
					"borderWidth":     2,
					"fill":            true,
					"tension":         0.4,
				},
				{
					"label":           "内存使用率",
					"data":            memoryData,
					"borderColor":     "rgba(54, 162, 235, 1)",
					"backgroundColor": "rgba(54, 162, 235, 0.2)",
					"borderWidth":     2,
					"fill":            true,
					"tension":         0.4,
				},
				{
					"label":           "磁盘使用率",
					"data":            diskData,
					"borderColor":     "rgba(75, 192, 192, 1)",
					"backgroundColor": "rgba(75, 192, 192, 0.2)",
					"borderWidth":     2,
					"fill":            true,
					"tension":         0.4,
				},
			},
		}

		// 图表配置
		options := map[string]interface{}{
			"responsive": true,
			"plugins": map[string]interface{}{
				"title": map[string]interface{}{
					"display": true,
					"text":    "系统资源使用率",
				},
				"legend": map[string]interface{}{
					"display":  true,
					"position": "top",
				},
			},
			"scales": map[string]interface{}{
				"y": map[string]interface{}{
					"beginAtZero": true,
					"max":         100,
					"title": map[string]interface{}{
						"display": true,
						"text":    "使用率 (%)",
					},
				},
				"x": map[string]interface{}{
					"title": map[string]interface{}{
						"display": true,
						"text":    "时间",
					},
				},
			},
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "System performance chart data retrieved successfully",
			Data: ChartDataResponse{
				ChartType: chartType,
				Title:     "系统资源使用率",
				Data:      chartData,
				Options:   options,
				Config: map[string]interface{}{
					"period":     period,
					"avg_cpu":    calculateAverage(cpuData),
					"avg_memory": calculateAverage(memoryData),
					"avg_disk":   calculateAverage(diskData),
				},
			},
		})
	}
}

// GetDashboardCharts 仪表板图表数据
func GetDashboardCharts(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取多个图表数据
		charts := map[string]interface{}{
			"user_growth":   getUserGrowthSummary(db),
			"login_stats":   getLoginStatsSummary(db),
			"user_activity": getUserActivitySummary(db),
			"system_health": getSystemHealthSummary(db),
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Dashboard charts data retrieved successfully",
			Data:    charts,
		})
	}
}

// 辅助函数

// calculateGrowthRate 计算增长率
func calculateGrowthRate(data []int64) float64 {
	if len(data) < 2 {
		return 0.0
	}

	first := data[0]
	last := data[len(data)-1]

	if first == 0 {
		return 0.0
	}

	return float64(last-first) / float64(first) * 100
}

// sumInt64 计算int64切片的总和
func sumInt64(data []int64) int64 {
	var sum int64
	for _, v := range data {
		sum += v
	}
	return sum
}

// calculateAverage 计算float64切片的平均值
func calculateAverage(data []float64) float64 {
	if len(data) == 0 {
		return 0.0
	}

	var sum float64
	for _, v := range data {
		sum += v
	}
	return sum / float64(len(data))
}

// getUserGrowthSummary 获取用户增长摘要
func getUserGrowthSummary(db *gorm.DB) map[string]interface{} {
	var totalUsers, newUsersToday, newUsersWeek int64

	db.Model(&models.User{}).Count(&totalUsers)

	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	weekAgo := today.AddDate(0, 0, -7)

	db.Model(&models.User{}).
		Where("created_at >= ?", today).
		Count(&newUsersToday)

	db.Model(&models.User{}).
		Where("created_at >= ?", weekAgo).
		Count(&newUsersWeek)

	return map[string]interface{}{
		"total_users":     totalUsers,
		"new_users_today": newUsersToday,
		"new_users_week":  newUsersWeek,
		"growth_rate":     float64(newUsersToday) / float64(totalUsers) * 100,
	}
}

// getLoginStatsSummary 获取登录统计摘要
func getLoginStatsSummary(db *gorm.DB) map[string]interface{} {
	var totalLogins, successfulLogins int64

	now := time.Now()
	dayAgo := now.AddDate(0, 0, -1)

	db.Model(&models.LoginLog{}).
		Where("created_at >= ?", dayAgo).
		Count(&totalLogins)

	db.Model(&models.LoginLog{}).
		Where("created_at >= ? AND success = ?", dayAgo, true).
		Count(&successfulLogins)

	successRate := 0.0
	if totalLogins > 0 {
		successRate = float64(successfulLogins) / float64(totalLogins) * 100
	}

	return map[string]interface{}{
		"total_logins":      totalLogins,
		"successful_logins": successfulLogins,
		"success_rate":      successRate,
	}
}

// getUserActivitySummary 获取用户活跃度摘要
func getUserActivitySummary(db *gorm.DB) map[string]interface{} {
	var totalUsers, activeUsers int64

	db.Model(&models.User{}).Count(&totalUsers)

	now := time.Now()
	weekAgo := now.AddDate(0, 0, -7)

	db.Model(&models.User{}).
		Where("last_login_at >= ?", weekAgo).
		Count(&activeUsers)

	activityRate := 0.0
	if totalUsers > 0 {
		activityRate = float64(activeUsers) / float64(totalUsers) * 100
	}

	return map[string]interface{}{
		"total_users":   totalUsers,
		"active_users":  activeUsers,
		"activity_rate": activityRate,
	}
}

// getSystemHealthSummary 获取系统健康摘要
func getSystemHealthSummary(db *gorm.DB) map[string]interface{} {
	// 模拟系统健康数据
	return map[string]interface{}{
		"cpu_usage":    45.2,
		"memory_usage": 68.7,
		"disk_usage":   23.1,
		"network_io":   1024.5,
		"status":       "healthy",
		"uptime":       "99.9%",
	}
}
