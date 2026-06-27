package models

import (
	"encoding/json"
	"time"
)

// Metric 指标表
type Metric struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"not null;size:100;uniqueIndex"`
	Description string    `json:"description" gorm:"size:500"`
	Type        string    `json:"type" gorm:"not null;size:20"` // counter, gauge, histogram, summary
	Unit        string    `json:"unit" gorm:"size:20"`          // 单位
	Project     string    `json:"project" gorm:"size:50"`       // 所属项目
	Labels      JSON      `json:"labels" gorm:"type:json"`      // 标签
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// MetricValue 指标值表
type MetricValue struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	MetricID  uint      `json:"metric_id" gorm:"not null"`
	Value     float64   `json:"value" gorm:"not null"`
	Labels    JSON      `json:"labels" gorm:"type:json"` // 标签值
	Timestamp time.Time `json:"timestamp" gorm:"not null"`
	CreatedAt time.Time `json:"created_at"`

	// 关联
	Metric Metric `json:"metric" gorm:"foreignKey:MetricID"`
}

// AlertRule 告警规则表
type AlertRule struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"not null;size:100;uniqueIndex"`
	Description string    `json:"description" gorm:"size:500"`
	MetricID    uint      `json:"metric_id" gorm:"not null"`
	Condition   string    `json:"condition" gorm:"not null;size:500"`        // 告警条件表达式
	Threshold   float64   `json:"threshold" gorm:"not null"`                 // 阈值
	Operator    string    `json:"operator" gorm:"not null;size:10"`          // 操作符：>, <, >=, <=, ==, !=
	Duration    int       `json:"duration" gorm:"default:0"`                 // 持续时间（秒）
	Severity    string    `json:"severity" gorm:"default:'warning';size:20"` // 严重程度：info, warning, error, critical
	Project     string    `json:"project" gorm:"size:50"`
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// 关联
	Metric Metric `json:"metric" gorm:"foreignKey:MetricID"`
}

// Alert 告警表
type Alert struct {
	ID          uint       `json:"id" gorm:"primaryKey"`
	RuleID      uint       `json:"rule_id" gorm:"not null"`
	Name        string     `json:"name" gorm:"not null;size:100"`
	Description string     `json:"description" gorm:"size:500"`
	Status      string     `json:"status" gorm:"default:'firing';size:20"` // firing, resolved
	Severity    string     `json:"severity" gorm:"not null;size:20"`
	Value       float64    `json:"value" gorm:"not null"`
	Threshold   float64    `json:"threshold" gorm:"not null"`
	Labels      JSON       `json:"labels" gorm:"type:json"`
	Project     string     `json:"project" gorm:"size:50"`
	FiredAt     time.Time  `json:"fired_at"`
	ResolvedAt  *time.Time `json:"resolved_at"`
	ResolvedBy  string     `json:"resolved_by" gorm:"size:36"`
	Notes       string     `json:"notes" gorm:"size:1000"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	// 关联
	Rule AlertRule `json:"rule" gorm:"foreignKey:RuleID"`
}

// Notification 通知表
type Notification struct {
	ID         uint       `json:"id" gorm:"primaryKey"`
	AlertID    uint       `json:"alert_id" gorm:"not null"`
	Type       string     `json:"type" gorm:"not null;size:20"` // email, sms, webhook, slack
	Recipient  string     `json:"recipient" gorm:"not null;size:200"`
	Subject    string     `json:"subject" gorm:"size:200"`
	Content    string     `json:"content" gorm:"type:text"`
	Status     string     `json:"status" gorm:"default:'pending';size:20"` // pending, sent, failed
	SentAt     *time.Time `json:"sent_at"`
	ErrorMsg   string     `json:"error_msg" gorm:"size:500"`
	RetryCount int        `json:"retry_count" gorm:"default:0"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`

	// 关联
	Alert Alert `json:"alert" gorm:"foreignKey:AlertID"`
}

// NotificationTemplate 通知模板表
type NotificationTemplate struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"not null;size:100;uniqueIndex"`
	Description string    `json:"description" gorm:"size:500"`
	Type        string    `json:"type" gorm:"not null;size:20"` // email, sms, webhook, slack
	Subject     string    `json:"subject" gorm:"size:200"`
	Content     string    `json:"content" gorm:"type:text"`
	Variables   JSON      `json:"variables" gorm:"type:json"` // 模板变量
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// SystemHealth 系统健康状态表
type SystemHealth struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Component   string    `json:"component" gorm:"not null;size:50"` // 组件名称
	Status      string    `json:"status" gorm:"not null;size:20"`    // healthy, degraded, unhealthy
	Message     string    `json:"message" gorm:"size:500"`
	Details     JSON      `json:"details" gorm:"type:json"`
	LastCheckAt time.Time `json:"last_check_at"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// PerformanceLog 性能日志表
type PerformanceLog struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	Endpoint     string    `json:"endpoint" gorm:"not null;size:200"`
	Method       string    `json:"method" gorm:"not null;size:10"`
	UserID       string    `json:"user_id" gorm:"size:36"`
	Project      string    `json:"project" gorm:"size:50"`
	Duration     int       `json:"duration" gorm:"not null"` // 响应时间（毫秒）
	StatusCode   int       `json:"status_code" gorm:"not null"`
	RequestSize  int       `json:"request_size" gorm:"default:0"`
	ResponseSize int       `json:"response_size" gorm:"default:0"`
	IPAddress    string    `json:"ip_address" gorm:"size:45"`
	UserAgent    string    `json:"user_agent" gorm:"size:500"`
	CreatedAt    time.Time `json:"created_at"`

	// 关联
	User User `json:"user" gorm:"foreignKey:UserID"`
}

// 请求和响应结构体

// CreateMetricRequest 创建指标请求
type CreateMetricRequest struct {
	Name        string            `json:"name" binding:"required"`
	Description string            `json:"description,omitempty"`
	Type        string            `json:"type" binding:"required,oneof=counter gauge histogram summary"`
	Unit        string            `json:"unit,omitempty"`
	Project     string            `json:"project,omitempty"`
	Labels      map[string]string `json:"labels,omitempty"`
}

// RecordMetricRequest 记录指标值请求
type RecordMetricRequest struct {
	MetricID  uint              `json:"metric_id" binding:"required"`
	Value     float64           `json:"value" binding:"required"`
	Labels    map[string]string `json:"labels,omitempty"`
	Timestamp *time.Time        `json:"timestamp,omitempty"`
}

// CreateAlertRuleRequest 创建告警规则请求
type CreateAlertRuleRequest struct {
	Name        string  `json:"name" binding:"required"`
	Description string  `json:"description,omitempty"`
	MetricID    uint    `json:"metric_id" binding:"required"`
	Condition   string  `json:"condition" binding:"required"`
	Threshold   float64 `json:"threshold" binding:"required"`
	Operator    string  `json:"operator" binding:"required,oneof=> < >= <= == !="`
	Duration    int     `json:"duration,omitempty"`
	Severity    string  `json:"severity" binding:"required,oneof=info warning error critical"`
	Project     string  `json:"project,omitempty"`
}

// UpdateAlertRequest 更新告警请求
type UpdateAlertRequest struct {
	Status     *string `json:"status,omitempty"`
	ResolvedBy *string `json:"resolved_by,omitempty"`
	Notes      *string `json:"notes,omitempty"`
}

// CreateNotificationRequest 创建通知请求
type CreateNotificationRequest struct {
	AlertID   uint   `json:"alert_id" binding:"required"`
	Type      string `json:"type" binding:"required,oneof=email sms webhook slack"`
	Recipient string `json:"recipient" binding:"required"`
	Subject   string `json:"subject,omitempty"`
	Content   string `json:"content,omitempty"`
}

// CreateNotificationTemplateRequest 创建通知模板请求
type CreateNotificationTemplateRequest struct {
	Name        string                 `json:"name" binding:"required"`
	Description string                 `json:"description,omitempty"`
	Type        string                 `json:"type" binding:"required,oneof=email sms webhook slack"`
	Subject     string                 `json:"subject,omitempty"`
	Content     string                 `json:"content" binding:"required"`
	Variables   map[string]interface{} `json:"variables,omitempty"`
}

// MetricResponse 指标响应
type MetricResponse struct {
	ID          uint              `json:"id"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Type        string            `json:"type"`
	Unit        string            `json:"unit"`
	Project     string            `json:"project"`
	Labels      map[string]string `json:"labels"`
	IsActive    bool              `json:"is_active"`
	CreatedAt   time.Time         `json:"created_at"`
}

// MetricValueResponse 指标值响应
type MetricValueResponse struct {
	ID         uint              `json:"id"`
	MetricID   uint              `json:"metric_id"`
	MetricName string            `json:"metric_name"`
	Value      float64           `json:"value"`
	Labels     map[string]string `json:"labels"`
	Timestamp  time.Time         `json:"timestamp"`
	CreatedAt  time.Time         `json:"created_at"`
}

// AlertRuleResponse 告警规则响应
type AlertRuleResponse struct {
	ID          uint      `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	MetricID    uint      `json:"metric_id"`
	MetricName  string    `json:"metric_name"`
	Condition   string    `json:"condition"`
	Threshold   float64   `json:"threshold"`
	Operator    string    `json:"operator"`
	Duration    int       `json:"duration"`
	Severity    string    `json:"severity"`
	Project     string    `json:"project"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
}

// AlertResponse 告警响应
type AlertResponse struct {
	ID          uint              `json:"id"`
	RuleID      uint              `json:"rule_id"`
	RuleName    string            `json:"rule_name"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Status      string            `json:"status"`
	Severity    string            `json:"severity"`
	Value       float64           `json:"value"`
	Threshold   float64           `json:"threshold"`
	Labels      map[string]string `json:"labels"`
	Project     string            `json:"project"`
	FiredAt     time.Time         `json:"fired_at"`
	ResolvedAt  *time.Time        `json:"resolved_at"`
	ResolvedBy  string            `json:"resolved_by"`
	Notes       string            `json:"notes"`
	CreatedAt   time.Time         `json:"created_at"`
}

// NotificationResponse 通知响应
type NotificationResponse struct {
	ID         uint       `json:"id"`
	AlertID    uint       `json:"alert_id"`
	AlertName  string     `json:"alert_name"`
	Type       string     `json:"type"`
	Recipient  string     `json:"recipient"`
	Subject    string     `json:"subject"`
	Content    string     `json:"content"`
	Status     string     `json:"status"`
	SentAt     *time.Time `json:"sent_at"`
	ErrorMsg   string     `json:"error_msg"`
	RetryCount int        `json:"retry_count"`
	CreatedAt  time.Time  `json:"created_at"`
}

// SystemHealthResponse 系统健康状态响应
type SystemHealthResponse struct {
	ID          uint                   `json:"id"`
	Component   string                 `json:"component"`
	Status      string                 `json:"status"`
	Message     string                 `json:"message"`
	Details     map[string]interface{} `json:"details"`
	LastCheckAt time.Time              `json:"last_check_at"`
	CreatedAt   time.Time              `json:"created_at"`
}

// PerformanceLogResponse 性能日志响应
type PerformanceLogResponse struct {
	ID           uint      `json:"id"`
	Endpoint     string    `json:"endpoint"`
	Method       string    `json:"method"`
	UserID       string    `json:"user_id"`
	Username     string    `json:"username"`
	Project      string    `json:"project"`
	Duration     int       `json:"duration"`
	StatusCode   int       `json:"status_code"`
	RequestSize  int       `json:"request_size"`
	ResponseSize int       `json:"response_size"`
	IPAddress    string    `json:"ip_address"`
	UserAgent    string    `json:"user_agent"`
	CreatedAt    time.Time `json:"created_at"`
}

// 方法实现

// GetLabels 获取指标标签
func (m *Metric) GetLabels() (map[string]string, error) {
	if len(m.Labels) == 0 {
		return map[string]string{}, nil
	}

	var labels map[string]string
	err := json.Unmarshal(m.Labels, &labels)
	if err != nil {
		return nil, err
	}
	return labels, nil
}

// SetLabels 设置指标标签
func (m *Metric) SetLabels(labels map[string]string) error {
	if labels == nil {
		m.Labels = nil
		return nil
	}

	jsonData, err := json.Marshal(labels)
	if err != nil {
		return err
	}
	m.Labels = JSON(jsonData)
	return nil
}

// GetLabels 获取指标值标签
func (mv *MetricValue) GetLabels() (map[string]string, error) {
	if len(mv.Labels) == 0 {
		return map[string]string{}, nil
	}

	var labels map[string]string
	err := json.Unmarshal(mv.Labels, &labels)
	if err != nil {
		return nil, err
	}
	return labels, nil
}

// SetLabels 设置指标值标签
func (mv *MetricValue) SetLabels(labels map[string]string) error {
	if labels == nil {
		mv.Labels = nil
		return nil
	}

	jsonData, err := json.Marshal(labels)
	if err != nil {
		return err
	}
	mv.Labels = JSON(jsonData)
	return nil
}

// GetLabels 获取告警标签
func (a *Alert) GetLabels() (map[string]string, error) {
	if len(a.Labels) == 0 {
		return map[string]string{}, nil
	}

	var labels map[string]string
	err := json.Unmarshal(a.Labels, &labels)
	if err != nil {
		return nil, err
	}
	return labels, nil
}

// SetLabels 设置告警标签
func (a *Alert) SetLabels(labels map[string]string) error {
	if labels == nil {
		a.Labels = nil
		return nil
	}

	jsonData, err := json.Marshal(labels)
	if err != nil {
		return err
	}
	a.Labels = JSON(jsonData)
	return nil
}

// GetVariables 获取通知模板变量
func (nt *NotificationTemplate) GetVariables() (map[string]interface{}, error) {
	if len(nt.Variables) == 0 {
		return map[string]interface{}{}, nil
	}

	var variables map[string]interface{}
	err := json.Unmarshal(nt.Variables, &variables)
	if err != nil {
		return nil, err
	}
	return variables, nil
}

// SetVariables 设置通知模板变量
func (nt *NotificationTemplate) SetVariables(variables map[string]interface{}) error {
	if variables == nil {
		nt.Variables = nil
		return nil
	}

	jsonData, err := json.Marshal(variables)
	if err != nil {
		return err
	}
	nt.Variables = JSON(jsonData)
	return nil
}

// GetDetails 获取系统健康状态详情
func (sh *SystemHealth) GetDetails() (map[string]interface{}, error) {
	if len(sh.Details) == 0 {
		return map[string]interface{}{}, nil
	}

	var details map[string]interface{}
	err := json.Unmarshal(sh.Details, &details)
	if err != nil {
		return nil, err
	}
	return details, nil
}

// SetDetails 设置系统健康状态详情
func (sh *SystemHealth) SetDetails(details map[string]interface{}) error {
	if details == nil {
		sh.Details = nil
		return nil
	}

	jsonData, err := json.Marshal(details)
	if err != nil {
		return err
	}
	sh.Details = JSON(jsonData)
	return nil
}
