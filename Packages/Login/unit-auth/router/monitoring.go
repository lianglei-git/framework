package router

import (
	"unit-auth/handlers"
	"unit-auth/services"

	"github.com/gin-gonic/gin"
)

// SetupMonitoringRoutes 设置监控路由
func SetupMonitoringRoutes(r *gin.Engine, monitoringService *services.MonitoringService) {
	// 创建监控处理器
	monitoringHandler := handlers.NewMonitoringHandler(monitoringService)

	// 监控API组
	monitoring := r.Group("/api/monitoring")
	{
		// Prometheus指标端点
		monitoring.GET("/prometheus", monitoringHandler.GetPrometheusMetrics)
		monitoring.GET("/metrics", monitoringHandler.GetMetrics)

		// 用户活跃度统计
		monitoring.GET("/user-activity/stats", monitoringHandler.GetUserActivityStats)
		monitoring.GET("/user-activity/details", monitoringHandler.GetUserActivityDetails)
		monitoring.GET("/user-activity/daily", monitoringHandler.GetDailyActiveUsers)
		monitoring.GET("/user-activity/monthly", monitoringHandler.GetMonthlyActiveUsers)
		monitoring.GET("/user-activity/top", monitoringHandler.GetTopActiveUsers)

		// 系统健康状态
		monitoring.GET("/health", monitoringHandler.GetSystemHealth)
		monitoring.GET("/summary", monitoringHandler.GetMetricsSummary)
		monitoring.GET("/metrics/by-period", monitoringHandler.GetMetricsByPeriod)
		monitoring.GET("/metrics/history", monitoringHandler.GetMetricsHistory)

		// 指标导出
		monitoring.POST("/export", monitoringHandler.ExportMetrics)
	}

	// Prometheus格式指标端点
	r.GET("/metrics", monitoringService.GetPrometheusHandler())
}
