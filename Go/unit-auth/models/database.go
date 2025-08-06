package models

import (
	"fmt"
	"log"
	"unit-auth/config"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB() (*gorm.DB, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		config.AppConfig.DBUser,
		config.AppConfig.DBPassword,
		config.AppConfig.DBHost,
		config.AppConfig.DBPort,
		config.AppConfig.DBName,
	)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %v", err)
	}

	// 自动迁移数据库表 - 包含所有扩展功能
	err = db.AutoMigrate(
		// 核心用户表
		&User{},              // 核心用户表
		&EmailVerification{}, // 邮箱验证表
		&PasswordReset{},     // 密码重置表
		&SMSVerification{},   // 短信验证表
		&UserStats{},         // 用户统计表
		&LoginLog{},          // 登录日志表
		&WeChatQRSession{},   // 微信二维码会话表

		// 中心化用户管理
		&ProjectMapping{},  // 项目映射表
		&GlobalUserStats{}, // 全局用户统计表
		&AuthLog{},         // 认证日志表

		// 用户画像系统
		&UserProfile{},        // 用户画像表
		&UserBehavior{},       // 用户行为记录表
		&UserPreference{},     // 用户偏好表
		&UserSegment{},        // 用户分群表
		&UserSegmentMapping{}, // 用户分群映射表

		// 权限管理系统
		&Role{},                // 角色表
		&Permission{},          // 权限表
		&RolePermission{},      // 角色权限关联表
		&UserRole{},            // 用户角色关联表
		&AccessControl{},       // 访问控制表
		&PermissionGroup{},     // 权限组表
		&PermissionGroupItem{}, // 权限组项目表
		&AuditLog{},            // 审计日志表

		// 数据同步机制
		&SyncTask{},       // 同步任务表
		&SyncLog{},        // 同步日志表
		&DataChange{},     // 数据变更记录表
		&SyncMapping{},    // 同步映射表
		&SyncConflict{},   // 同步冲突表
		&SyncCheckpoint{}, // 同步检查点表

		// 监控告警系统
		&Metric{},               // 指标表
		&MetricValue{},          // 指标值表
		&AlertRule{},            // 告警规则表
		&Alert{},                // 告警表
		&Notification{},         // 通知表
		&NotificationTemplate{}, // 通知模板表
		&SystemHealth{},         // 系统健康状态表
		&PerformanceLog{},       // 性能日志表
	)
	if err != nil {
		return nil, fmt.Errorf("failed to migrate database: %v", err)
	}

	// 创建跨项目统计视图
	err = createCrossProjectStatsView(db)
	if err != nil {
		log.Printf("Warning: failed to create cross project stats view: %v", err)
	}

	// 创建用户画像统计视图
	err = createUserProfileStatsView(db)
	if err != nil {
		log.Printf("Warning: failed to create user profile stats view: %v", err)
	}

	// 创建权限统计视图
	err = createPermissionStatsView(db)
	if err != nil {
		log.Printf("Warning: failed to create permission stats view: %v", err)
	}

	// 创建监控统计视图
	err = createMonitoringStatsView(db)
	if err != nil {
		log.Printf("Warning: failed to create monitoring stats view: %v", err)
	}

	DB = db
	log.Println("Database connected and migrated successfully")
	return db, nil
}

// 创建跨项目统计视图
func createCrossProjectStatsView(db *gorm.DB) error {
	viewSQL := `
	CREATE OR REPLACE VIEW cross_project_stats AS
	SELECT 
		u.id as user_id,
		u.username,
		u.email,
		COUNT(DISTINCT gus.project_name) as active_projects,
		SUM(gus.login_count) as total_logins,
		MAX(gus.last_activity_at) as last_activity,
		SUM(gus.total_usage_time) as total_usage_time,
		u.created_at
	FROM users u
	LEFT JOIN global_user_stats gus ON u.id = gus.user_id
	WHERE u.deleted_at IS NULL
	GROUP BY u.id, u.username, u.email, u.created_at
	`

	return db.Exec(viewSQL).Error
}

// 创建用户画像统计视图
func createUserProfileStatsView(db *gorm.DB) error {
	viewSQL := `
	CREATE OR REPLACE VIEW user_profile_stats AS
	SELECT 
		up.user_id,
		u.username,
		u.email,
		up.score,
		up.level,
		COUNT(ub.id) as behavior_count,
		COUNT(upref.id) as preference_count,
		COUNT(usm.id) as segment_count,
		up.last_updated,
		up.created_at
	FROM user_profiles up
	JOIN users u ON up.user_id = u.id
	LEFT JOIN user_behaviors ub ON up.user_id = ub.user_id
	LEFT JOIN user_preferences upref ON up.user_id = upref.user_id
	LEFT JOIN user_segment_mappings usm ON up.user_id = usm.user_id
	WHERE u.deleted_at IS NULL
	GROUP BY up.user_id, u.username, u.email, up.score, up.level, up.last_updated, up.created_at
	`

	return db.Exec(viewSQL).Error
}

// 创建权限统计视图
func createPermissionStatsView(db *gorm.DB) error {
	viewSQL := `
	CREATE OR REPLACE VIEW permission_stats AS
	SELECT 
		r.id as role_id,
		r.name as role_name,
		r.level as role_level,
		COUNT(DISTINCT ur.user_id) as user_count,
		COUNT(DISTINCT rp.permission_id) as permission_count,
		r.is_active,
		r.created_at
	FROM roles r
	LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.is_active = true
	LEFT JOIN role_permissions rp ON r.id = rp.role_id
	GROUP BY r.id, r.name, r.level, r.is_active, r.created_at
	`

	return db.Exec(viewSQL).Error
}

// 创建监控统计视图
func createMonitoringStatsView(db *gorm.DB) error {
	viewSQL := `
	CREATE OR REPLACE VIEW monitoring_stats AS
	SELECT 
		m.id as metric_id,
		m.name as metric_name,
		m.type as metric_type,
		m.project,
		COUNT(mv.id) as value_count,
		AVG(mv.value) as avg_value,
		MIN(mv.value) as min_value,
		MAX(mv.value) as max_value,
		COUNT(DISTINCT ar.id) as alert_rule_count,
		COUNT(DISTINCT a.id) as active_alert_count
	FROM metrics m
	LEFT JOIN metric_values mv ON m.id = mv.metric_id
	LEFT JOIN alert_rules ar ON m.id = ar.metric_id AND ar.is_active = true
	LEFT JOIN alerts a ON ar.id = a.rule_id AND a.status = 'firing'
	WHERE m.is_active = true
	GROUP BY m.id, m.name, m.type, m.project
	`

	return db.Exec(viewSQL).Error
}

// 获取数据库连接
func GetDB() *gorm.DB {
	return DB
}
