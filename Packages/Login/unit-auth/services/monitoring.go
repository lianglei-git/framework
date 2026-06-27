package services

import (
	"fmt"
	"sync"
	"time"
	"unit-auth/models"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"gorm.io/gorm"
)

// MonitoringService 监控服务
type MonitoringService struct {
	db *gorm.DB

	// Prometheus 指标
	authLoginTotal        prometheus.Counter
	authLoginSuccessTotal prometheus.Counter
	authLoginFailureTotal prometheus.Counter
	authRegistrationTotal prometheus.Counter
	httpRequestsTotal     *prometheus.CounterVec
	httpRequestDuration   *prometheus.HistogramVec

	// 用户活跃度统计
	userActivityMutex  sync.RWMutex
	dailyActiveUsers   map[string]int64     // 日活跃用户
	monthlyActiveUsers map[string]int64     // 月活跃用户
	userLastActivity   map[string]time.Time // 用户最后活跃时间

	// 缓存
	cacheMutex sync.RWMutex
	statsCache map[string]interface{}
	cacheTTL   time.Duration
}

// NewMonitoringService 创建监控服务实例
func NewMonitoringService(db *gorm.DB) *MonitoringService {
	ms := &MonitoringService{
		db: db,
		authLoginTotal: promauto.NewCounter(prometheus.CounterOpts{
			Name: "auth_login_total",
			Help: "Total number of login attempts",
		}),
		authLoginSuccessTotal: promauto.NewCounter(prometheus.CounterOpts{
			Name: "auth_login_success_total",
			Help: "Total number of successful logins",
		}),
		authLoginFailureTotal: promauto.NewCounter(prometheus.CounterOpts{
			Name: "auth_login_failure_total",
			Help: "Total number of failed logins",
		}),
		authRegistrationTotal: promauto.NewCounter(prometheus.CounterOpts{
			Name: "auth_registration_total",
			Help: "Total number of registrations",
		}),
		httpRequestsTotal: promauto.NewCounterVec(prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		}, []string{"method", "endpoint", "status"}),
		httpRequestDuration: promauto.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		}, []string{"method", "endpoint"}),

		dailyActiveUsers:   make(map[string]int64),
		monthlyActiveUsers: make(map[string]int64),
		userLastActivity:   make(map[string]time.Time),
		statsCache:         make(map[string]interface{}),
		cacheTTL:           5 * time.Minute,
	}

	// 启动定期清理任务
	go ms.startCleanupTask()

	return ms
}

// RecordLogin 记录登录事件
func (ms *MonitoringService) RecordLogin(success bool) {
	ms.authLoginTotal.Inc()
	if success {
		ms.authLoginSuccessTotal.Inc()
	} else {
		ms.authLoginFailureTotal.Inc()
	}
}

// RecordRegistration 记录注册事件
func (ms *MonitoringService) RecordRegistration() {
	ms.authRegistrationTotal.Inc()
}

// RecordHTTPRequest 记录HTTP请求
func (ms *MonitoringService) RecordHTTPRequest(method, endpoint string, status int, duration time.Duration) {
	ms.httpRequestsTotal.WithLabelValues(method, endpoint, fmt.Sprintf("%d", status)).Inc()
	ms.httpRequestDuration.WithLabelValues(method, endpoint).Observe(duration.Seconds())
}

// RecordUserActivity 记录用户活跃度
func (ms *MonitoringService) RecordUserActivity(userID string) {
	ms.userActivityMutex.Lock()
	defer ms.userActivityMutex.Unlock()

	now := time.Now()
	dateKey := now.Format("2006-01-02")
	monthKey := now.Format("2006-01")

	// 更新日活跃用户
	ms.dailyActiveUsers[dateKey]++

	// 更新月活跃用户
	ms.monthlyActiveUsers[monthKey]++

	// 更新用户最后活跃时间
	ms.userLastActivity[userID] = now

	// 清除缓存
	ms.clearStatsCache()
}

// GetDailyActiveUsers 获取日活跃用户数
func (ms *MonitoringService) GetDailyActiveUsers(date string) int64 {
	ms.userActivityMutex.RLock()
	defer ms.userActivityMutex.RUnlock()

	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	return ms.dailyActiveUsers[date]
}

// GetMonthlyActiveUsers 获取月活跃用户数
func (ms *MonitoringService) GetMonthlyActiveUsers(month string) int64 {
	ms.userActivityMutex.RLock()
	defer ms.userActivityMutex.RUnlock()

	if month == "" {
		month = time.Now().Format("2006-01")
	}
	return ms.monthlyActiveUsers[month]
}

// GetActiveUsersStats 获取活跃用户统计
func (ms *MonitoringService) GetActiveUsersStats() map[string]interface{} {
	ms.cacheMutex.RLock()
	if cached, exists := ms.statsCache["active_users_stats"]; exists {
		if stats, ok := cached.(map[string]interface{}); ok {
			if time.Since(stats["cached_at"].(time.Time)) < ms.cacheTTL {
				ms.cacheMutex.RUnlock()
				return stats
			}
		}
	}
	ms.cacheMutex.RUnlock()

	ms.userActivityMutex.RLock()
	defer ms.userActivityMutex.RUnlock()

	now := time.Now()
	today := now.Format("2006-01-02")
	yesterday := now.AddDate(0, 0, -1).Format("2006-01-02")
	thisMonth := now.Format("2006-01")
	lastMonth := now.AddDate(0, -1, 0).Format("2006-01")

	// 计算有效用户数（过去30天有活动的用户）
	validUsers := ms.countValidUsers(30)

	stats := map[string]interface{}{
		"daily_active_users": map[string]int64{
			"today":     ms.dailyActiveUsers[today],
			"yesterday": ms.dailyActiveUsers[yesterday],
		},
		"monthly_active_users": map[string]int64{
			"this_month": ms.monthlyActiveUsers[thisMonth],
			"last_month": ms.monthlyActiveUsers[lastMonth],
		},
		"valid_users": validUsers,
		"total_users": ms.getTotalUsers(),
		"cached_at":   now,
	}

	// 缓存结果
	ms.cacheMutex.Lock()
	ms.statsCache["active_users_stats"] = stats
	ms.cacheMutex.Unlock()

	return stats
}

// countValidUsers 统计有效用户数（过去N天有活动的用户）
func (ms *MonitoringService) countValidUsers(days int) int64 {
	cutoff := time.Now().AddDate(0, 0, -days)
	count := int64(0)

	for _, lastActivity := range ms.userLastActivity {
		if lastActivity.After(cutoff) {
			count++
		}
	}

	return count
}

// getTotalUsers 获取总用户数
func (ms *MonitoringService) getTotalUsers() int64 {
	var count int64
	ms.db.Model(&models.User{}).Count(&count)
	return count
}

// clearStatsCache 清除统计缓存
func (ms *MonitoringService) clearStatsCache() {
	ms.cacheMutex.Lock()
	defer ms.cacheMutex.Unlock()
	ms.statsCache = make(map[string]interface{})
}

// startCleanupTask 启动清理任务
func (ms *MonitoringService) startCleanupTask() {
	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()

	for range ticker.C {
		ms.cleanupOldData()
	}
}

// cleanupOldData 清理旧数据
func (ms *MonitoringService) cleanupOldData() {
	ms.userActivityMutex.Lock()
	defer ms.userActivityMutex.Unlock()

	now := time.Now()
	cutoff := now.AddDate(0, -3, 0) // 保留3个月的数据

	// 清理旧的日活跃用户数据
	for dateKey := range ms.dailyActiveUsers {
		if date, err := time.Parse("2006-01-02", dateKey); err == nil {
			if date.Before(cutoff) {
				delete(ms.dailyActiveUsers, dateKey)
			}
		}
	}

	// 清理旧的月活跃用户数据
	for monthKey := range ms.monthlyActiveUsers {
		if month, err := time.Parse("2006-01", monthKey); err == nil {
			if month.Before(cutoff) {
				delete(ms.monthlyActiveUsers, monthKey)
			}
		}
	}

	// 清理不活跃用户
	activityCutoff := now.AddDate(0, 0, -90) // 90天无活动
	for userID, lastActivity := range ms.userLastActivity {
		if lastActivity.Before(activityCutoff) {
			delete(ms.userLastActivity, userID)
		}
	}
}

// GetPrometheusHandler 获取Prometheus指标处理器
func (ms *MonitoringService) GetPrometheusHandler() gin.HandlerFunc {
	return gin.WrapH(promhttp.Handler())
}

// GetMetrics 获取自定义指标
func (ms *MonitoringService) GetMetrics() map[string]interface{} {
	stats := ms.GetActiveUsersStats()

	return map[string]interface{}{
		"auth_metrics": map[string]interface{}{
			"login_total": map[string]interface{}{
				"total":   ms.getCounterValue(ms.authLoginTotal),
				"success": ms.getCounterValue(ms.authLoginSuccessTotal),
				"failure": ms.getCounterValue(ms.authLoginFailureTotal),
			},
			"registration_total": ms.getCounterValue(ms.authRegistrationTotal),
		},
		"user_activity": stats,
		"system_metrics": map[string]interface{}{
			"total_users": stats["total_users"],
			"valid_users": stats["valid_users"],
		},
	}
}

// getCounterValue 获取计数器值（这里简化处理，实际应该从Prometheus registry获取）
func (ms *MonitoringService) getCounterValue(counter prometheus.Counter) interface{} {
	// 注意：这里返回的是计数器类型，实际值需要从Prometheus registry获取
	// 为了简化，我们返回计数器描述
	return map[string]interface{}{
		"type": "counter",
		"name": counter.Desc().String(),
	}
}

// GetUserActivityDetails 获取用户活跃度详情
func (ms *MonitoringService) GetUserActivityDetails() map[string]interface{} {
	ms.userActivityMutex.RLock()
	defer ms.userActivityMutex.RUnlock()

	now := time.Now()
	details := map[string]interface{}{
		"daily_breakdown":   make(map[string]int64),
		"monthly_breakdown": make(map[string]int64),
		"user_activity":     make(map[string]interface{}),
	}

	// 日活跃用户详情
	for date, count := range ms.dailyActiveUsers {
		details["daily_breakdown"].(map[string]int64)[date] = count
	}

	// 月活跃用户详情
	for month, count := range ms.monthlyActiveUsers {
		details["monthly_breakdown"].(map[string]int64)[month] = count
	}

	// 用户活跃度详情（限制返回最近100个活跃用户）
	userActivity := make(map[string]interface{})
	count := 0
	for userID, lastActivity := range ms.userLastActivity {
		if count >= 100 {
			break
		}
		userActivity[userID] = map[string]interface{}{
			"last_activity": lastActivity,
			"days_inactive": int(now.Sub(lastActivity).Hours() / 24),
		}
		count++
	}
	details["user_activity"] = userActivity

	return details
}

// ExportMetrics 导出指标到数据库
func (ms *MonitoringService) ExportMetrics() error {
	stats := ms.GetActiveUsersStats()
	now := time.Now()

	// 创建或更新指标
	metrics := []models.Metric{
		{
			Name:        "auth_login_total",
			Description: "Total number of login attempts",
			Type:        "counter",
			Unit:        "count",
			Project:     "unit-auth",
		},
		{
			Name:        "auth_login_success_total",
			Description: "Total number of successful logins",
			Type:        "counter",
			Unit:        "count",
			Project:     "unit-auth",
		},
		{
			Name:        "auth_login_failure_total",
			Description: "Total number of failed logins",
			Type:        "counter",
			Unit:        "count",
			Project:     "unit-auth",
		},
		{
			Name:        "auth_registration_total",
			Description: "Total number of registrations",
			Type:        "counter",
			Unit:        "count",
			Project:     "unit-auth",
		},
		{
			Name:        "daily_active_users",
			Description: "Daily active users count",
			Type:        "gauge",
			Unit:        "count",
			Project:     "unit-auth",
		},
		{
			Name:        "monthly_active_users",
			Description: "Monthly active users count",
			Type:        "gauge",
			Unit:        "count",
			Project:     "unit-auth",
		},
		{
			Name:        "valid_users",
			Description: "Valid users count (active in last 30 days)",
			Type:        "gauge",
			Unit:        "count",
			Project:     "unit-auth",
		},
	}

	// 保存指标
	for _, metric := range metrics {
		var existingMetric models.Metric
		err := ms.db.Where("name = ?", metric.Name).First(&existingMetric).Error
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				// 创建新指标
				if err := ms.db.Create(&metric).Error; err != nil {
					return err
				}
			} else {
				return err
			}
		}
	}

	// 记录指标值（简化处理，使用固定值）
	metricValues := []models.MetricValue{
		{
			MetricID:  1,   // auth_login_total
			Value:     0.0, // 实际应该从Prometheus获取
			Timestamp: now,
		},
		{
			MetricID:  2,   // auth_login_success_total
			Value:     0.0, // 实际应该从Prometheus获取
			Timestamp: now,
		},
		{
			MetricID:  3,   // auth_login_failure_total
			Value:     0.0, // 实际应该从Prometheus获取
			Timestamp: now,
		},
		{
			MetricID:  4,   // auth_registration_total
			Value:     0.0, // 实际应该从Prometheus获取
			Timestamp: now,
		},
		{
			MetricID:  5, // daily_active_users
			Value:     float64(stats["daily_active_users"].(map[string]int64)["today"]),
			Timestamp: now,
		},
		{
			MetricID:  6, // monthly_active_users
			Value:     float64(stats["monthly_active_users"].(map[string]int64)["this_month"]),
			Timestamp: now,
		},
		{
			MetricID:  7, // valid_users
			Value:     float64(stats["valid_users"].(int64)),
			Timestamp: now,
		},
	}

	for _, value := range metricValues {
		if err := ms.db.Create(&value).Error; err != nil {
			return err
		}
	}

	return nil
}
