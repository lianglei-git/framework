package models

import (
	"encoding/json"
	"time"
)

// UserProfile 用户画像表
type UserProfile struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	UserID      string    `json:"user_id" gorm:"not null;size:36;uniqueIndex"`
	ProfileData JSON      `json:"profile_data" gorm:"type:json"`         // 画像数据
	Tags        JSON      `json:"tags" gorm:"type:json"`                 // 用户标签
	Score       float64   `json:"score" gorm:"default:0"`                // 用户价值评分
	Level       string    `json:"level" gorm:"default:'normal';size:20"` // 用户等级
	LastUpdated time.Time `json:"last_updated"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// 关联用户
	User User `json:"user" gorm:"foreignKey:UserID"`
}

// UserBehavior 用户行为记录表
type UserBehavior struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	UserID       string    `json:"user_id" gorm:"not null;size:36"`
	ProjectName  string    `json:"project_name" gorm:"not null;size:50"`
	BehaviorType string    `json:"behavior_type" gorm:"not null;size:50"` // 行为类型
	Action       string    `json:"action" gorm:"not null;size:100"`       // 具体动作
	Target       string    `json:"target" gorm:"size:200"`                // 操作目标
	Duration     int       `json:"duration" gorm:"default:0"`             // 持续时间（秒）
	Value        float64   `json:"value" gorm:"default:0"`                // 行为价值
	IPAddress    string    `json:"ip_address" gorm:"size:45"`
	UserAgent    string    `json:"user_agent" gorm:"size:500"`
	CreatedAt    time.Time `json:"created_at"`

	// 关联用户
	User User `json:"user" gorm:"foreignKey:UserID"`
}

// UserPreference 用户偏好表
type UserPreference struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    string    `json:"user_id" gorm:"not null;size:36"`
	Category  string    `json:"category" gorm:"not null;size:50"` // 偏好类别
	Key       string    `json:"key" gorm:"not null;size:100"`     // 偏好键
	Value     JSON      `json:"value" gorm:"type:json"`           // 偏好值
	Weight    float64   `json:"weight" gorm:"default:1"`          // 权重
	LastUsed  time.Time `json:"last_used"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// 关联用户
	User User `json:"user" gorm:"foreignKey:UserID"`
}

// UserSegment 用户分群表
type UserSegment struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"not null;size:100;uniqueIndex"`
	Description string    `json:"description" gorm:"size:500"`
	Rules       JSON      `json:"rules" gorm:"type:json"`      // 分群规则
	UserCount   int       `json:"user_count" gorm:"default:0"` // 用户数量
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// UserSegmentMapping 用户分群映射表
type UserSegmentMapping struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    string    `json:"user_id" gorm:"not null;size:36"`
	SegmentID uint      `json:"segment_id" gorm:"not null"`
	Score     float64   `json:"score" gorm:"default:0"` // 匹配度评分
	JoinedAt  time.Time `json:"joined_at"`
	CreatedAt time.Time `json:"created_at"`

	// 关联
	User    User        `json:"user" gorm:"foreignKey:UserID"`
	Segment UserSegment `json:"segment" gorm:"foreignKey:SegmentID"`
}

// ProfileData 用户画像数据结构
type ProfileData struct {
	// 基础信息
	BasicInfo struct {
		Age        int    `json:"age,omitempty"`
		Gender     string `json:"gender,omitempty"`
		Location   string `json:"location,omitempty"`
		Occupation string `json:"occupation,omitempty"`
		Education  string `json:"education,omitempty"`
		Income     string `json:"income,omitempty"`
	} `json:"basic_info"`

	// 行为特征
	Behavioral struct {
		LoginFrequency    float64 `json:"login_frequency"`    // 登录频率（次/天）
		SessionDuration   float64 `json:"session_duration"`   // 平均会话时长（分钟）
		ActiveTime        string  `json:"active_time"`        // 活跃时间段
		DevicePreference  string  `json:"device_preference"`  // 设备偏好
		BrowserPreference string  `json:"browser_preference"` // 浏览器偏好
		OSPreference      string  `json:"os_preference"`      // 操作系统偏好
	} `json:"behavioral"`

	// 兴趣偏好
	Interests struct {
		Categories []string `json:"categories"` // 兴趣类别
		Keywords   []string `json:"keywords"`   // 关键词
		Topics     []string `json:"topics"`     // 关注话题
	} `json:"interests"`

	// 消费能力
	Consumption struct {
		SpendingLevel     string  `json:"spending_level"`     // 消费水平
		PurchaseFrequency float64 `json:"purchase_frequency"` // 购买频率
		PreferredPayment  string  `json:"preferred_payment"`  // 偏好支付方式
	} `json:"consumption"`

	// 社交特征
	Social struct {
		SocialLevel     string  `json:"social_level"`     // 社交活跃度
		InfluenceScore  float64 `json:"influence_score"`  // 影响力评分
		NetworkSize     int     `json:"network_size"`     // 社交网络规模
		InteractionType string  `json:"interaction_type"` // 互动类型偏好
	} `json:"social"`

	// 风险特征
	Risk struct {
		RiskLevel       string  `json:"risk_level"`       // 风险等级
		FraudScore      float64 `json:"fraud_score"`      // 欺诈风险评分
		ComplianceScore float64 `json:"compliance_score"` // 合规评分
	} `json:"risk"`

	// 生命周期
	Lifecycle struct {
		Stage           string    `json:"stage"`            // 用户生命周期阶段
		AcquisitionDate time.Time `json:"acquisition_date"` // 获客时间
		RetentionRate   float64   `json:"retention_rate"`   // 留存率
		ChurnRisk       float64   `json:"churn_risk"`       // 流失风险
	} `json:"lifecycle"`

	// 自定义字段
	Custom map[string]interface{} `json:"custom,omitempty"`
}

// UserTag 用户标签结构
type UserTag struct {
	Category   string  `json:"category"`   // 标签类别
	Name       string  `json:"name"`       // 标签名称
	Value      string  `json:"value"`      // 标签值
	Confidence float64 `json:"confidence"` // 置信度
	Source     string  `json:"source"`     // 标签来源
	CreatedAt  string  `json:"created_at"` // 创建时间
}

// SegmentRule 分群规则结构
type SegmentRule struct {
	Field    string      `json:"field"`    // 字段名
	Operator string      `json:"operator"` // 操作符：eq, ne, gt, lt, gte, lte, in, not_in, contains, not_contains
	Value    interface{} `json:"value"`    // 值
	Logic    string      `json:"logic"`    // 逻辑关系：and, or
}

// 请求和响应结构体

// UpdateUserProfileRequest 更新用户画像请求
type UpdateUserProfileRequest struct {
	ProfileData *ProfileData `json:"profile_data,omitempty"`
	Tags        []UserTag    `json:"tags,omitempty"`
	Score       *float64     `json:"score,omitempty"`
	Level       *string      `json:"level,omitempty"`
}

// RecordBehaviorRequest 记录用户行为请求
type RecordBehaviorRequest struct {
	UserID       string  `json:"user_id" binding:"required"`
	ProjectName  string  `json:"project_name" binding:"required"`
	BehaviorType string  `json:"behavior_type" binding:"required"`
	Action       string  `json:"action" binding:"required"`
	Target       string  `json:"target,omitempty"`
	Duration     int     `json:"duration,omitempty"`
	Value        float64 `json:"value,omitempty"`
	IPAddress    string  `json:"ip_address,omitempty"`
	UserAgent    string  `json:"user_agent,omitempty"`
}

// UpdatePreferenceRequest 更新用户偏好请求
type UpdatePreferenceRequest struct {
	Category string      `json:"category" binding:"required"`
	Key      string      `json:"key" binding:"required"`
	Value    interface{} `json:"value" binding:"required"`
	Weight   *float64    `json:"weight,omitempty"`
}

// CreateSegmentRequest 创建用户分群请求
type CreateSegmentRequest struct {
	Name        string        `json:"name" binding:"required"`
	Description string        `json:"description,omitempty"`
	Rules       []SegmentRule `json:"rules" binding:"required"`
}

// UserProfileResponse 用户画像响应
type UserProfileResponse struct {
	UserID      string       `json:"user_id"`
	ProfileData *ProfileData `json:"profile_data"`
	Tags        []UserTag    `json:"tags"`
	Score       float64      `json:"score"`
	Level       string       `json:"level"`
	Segments    []string     `json:"segments"`
	LastUpdated time.Time    `json:"last_updated"`
	CreatedAt   time.Time    `json:"created_at"`
}

// SegmentResponse 分群响应
type SegmentResponse struct {
	ID          uint          `json:"id"`
	Name        string        `json:"name"`
	Description string        `json:"description"`
	Rules       []SegmentRule `json:"rules"`
	UserCount   int           `json:"user_count"`
	IsActive    bool          `json:"is_active"`
	CreatedAt   time.Time     `json:"created_at"`
}

// 方法实现

// GetProfileData 获取用户画像数据
func (p *UserProfile) GetProfileData() (*ProfileData, error) {
	if len(p.ProfileData) == 0 {
		return &ProfileData{}, nil
	}

	var data ProfileData
	err := json.Unmarshal(p.ProfileData, &data)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

// SetProfileData 设置用户画像数据
func (p *UserProfile) SetProfileData(data *ProfileData) error {
	if data == nil {
		p.ProfileData = nil
		return nil
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}
	p.ProfileData = JSON(jsonData)
	return nil
}

// GetTags 获取用户标签
func (p *UserProfile) GetTags() ([]UserTag, error) {
	if len(p.Tags) == 0 {
		return []UserTag{}, nil
	}

	var tags []UserTag
	err := json.Unmarshal(p.Tags, &tags)
	if err != nil {
		return nil, err
	}
	return tags, nil
}

// SetTags 设置用户标签
func (p *UserProfile) SetTags(tags []UserTag) error {
	if tags == nil {
		p.Tags = nil
		return nil
	}

	jsonData, err := json.Marshal(tags)
	if err != nil {
		return err
	}
	p.Tags = JSON(jsonData)
	return nil
}

// AddTag 添加用户标签
func (p *UserProfile) AddTag(tag UserTag) error {
	tags, err := p.GetTags()
	if err != nil {
		return err
	}

	// 检查是否已存在相同标签
	for i, existingTag := range tags {
		if existingTag.Category == tag.Category && existingTag.Name == tag.Name {
			// 更新现有标签
			tags[i] = tag
			return p.SetTags(tags)
		}
	}

	// 添加新标签
	tags = append(tags, tag)
	return p.SetTags(tags)
}

// RemoveTag 移除用户标签
func (p *UserProfile) RemoveTag(category, name string) error {
	tags, err := p.GetTags()
	if err != nil {
		return err
	}

	var newTags []UserTag
	for _, tag := range tags {
		if !(tag.Category == category && tag.Name == name) {
			newTags = append(newTags, tag)
		}
	}

	return p.SetTags(newTags)
}

// GetSegmentRules 获取分群规则
func (s *UserSegment) GetSegmentRules() ([]SegmentRule, error) {
	if len(s.Rules) == 0 {
		return []SegmentRule{}, nil
	}

	var rules []SegmentRule
	err := json.Unmarshal(s.Rules, &rules)
	if err != nil {
		return nil, err
	}
	return rules, nil
}

// SetSegmentRules 设置分群规则
func (s *UserSegment) SetSegmentRules(rules []SegmentRule) error {
	if rules == nil {
		s.Rules = nil
		return nil
	}

	jsonData, err := json.Marshal(rules)
	if err != nil {
		return err
	}
	s.Rules = JSON(jsonData)
	return nil
}
