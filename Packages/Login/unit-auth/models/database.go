package models

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"regexp"
	"unit-auth/config"

	_ "github.com/go-sql-driver/mysql"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

var dbNamePattern = regexp.MustCompile(`^[a-zA-Z0-9_]+$`)

// ensureDatabaseExists 在目标库不存在时自动创建（需 MySQL 用户具备 CREATE 权限）
func ensureDatabaseExists() error {
	dbName := config.AppConfig.DBName
	if !dbNamePattern.MatchString(dbName) {
		return fmt.Errorf("invalid database name: %s", dbName)
	}

	serverDSN := fmt.Sprintf("%s:%s@tcp(%s:%s)/?charset=utf8mb4&parseTime=True&loc=Local",
		config.AppConfig.DBUser,
		config.AppConfig.DBPassword,
		config.AppConfig.DBHost,
		config.AppConfig.DBPort,
	)

	conn, err := sql.Open("mysql", serverDSN)
	if err != nil {
		return fmt.Errorf("failed to connect to mysql server: %v", err)
	}
	defer conn.Close()

	if err := conn.Ping(); err != nil {
		return fmt.Errorf("failed to ping mysql server: %v", err)
	}

	createSQL := fmt.Sprintf(
		"CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
		dbName,
	)
	if _, err := conn.Exec(createSQL); err != nil {
		return fmt.Errorf("failed to create database: %v", err)
	}

	log.Printf("Database '%s' ensured (created if not exists)", dbName)
	return nil
}

func InitDB() (*gorm.DB, error) {
	if err := ensureDatabaseExists(); err != nil {
		return nil, err
	}

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
		&UserBetaProfile{},   // 内测资格档案
		&EmailVerification{}, // 邮箱验证表
		&PasswordReset{},     // 密码重置表
		&SMSVerification{},   // 短信验证表
		&UserStats{},         // 用户统计表
		&LoginLog{},          // 登录日志表
		&WeChatQRSession{},   // 微信二维码会话表
		&RefreshToken{},      // Refresh Token表

		// SSO支持
		&SSOClient{},        // SSO客户端表
		&SSOSession{},       // SSO会话表
		&TokenBlacklist{},   // 令牌黑名单表
		&TokenRefreshLogs{}, // Token刷新审计日志表（中心化架构）

		// 中心化用户管理
		&Project{},         // 第三方项目表
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
		&PerformanceLog{},       // 性能日志表,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to migrate database: %v", err)
	}

	migrateUserAccountStatus(db)

	// 默认种子：nature_trans 项目（若不存在）
	var cnt int64
	db.Model(&Project{}).Where("`key` = ?", "nature_trans").Count(&cnt)
	if cnt == 0 {
		seed := Project{Key: "nature_trans", Name: "Nature Translate", BaseURL: "http://localhost:9001", AuthMode: "none", CredentialsEnc: "", Enabled: true}
		if err := db.Create(&seed).Error; err != nil {
			log.Printf("Warning: failed to seed default project: %v", err)
		}
	}

	seedDefaultAdminUser(db)
	upgradeWeakDefaultAdminPassword(db)
	seedSubprojectSSOClients(db)

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

const defaultAdminUsername = "zayne"

// defaultAdminInitialPassword 开发环境默认管理员初始密码（可通过 ADMIN_INITIAL_PASSWORD 覆盖）
func defaultAdminInitialPassword() string {
	if p := os.Getenv("ADMIN_INITIAL_PASSWORD"); p != "" {
		return p
	}
	return "Sparrow@Admin2026"
}

// seedDefaultAdminUser 首次初始化时创建默认超级管理员
func seedDefaultAdminUser(db *gorm.DB) {
	username := os.Getenv("ADMIN_USERNAME")
	if username == "" {
		username = defaultAdminUsername
	}
	password := defaultAdminInitialPassword()

	var cnt int64
	db.Model(&User{}).Where("username = ?", username).Count(&cnt)
	if cnt > 0 {
		return
	}

	email := username + "@local"
	user := &User{
		Email:         &email,
		Username:      username,
		Nickname:      username,
		Password:      password,
		Role:          "admin",
		Status:        "active",
		EmailVerified: true,
	}
	if err := user.HashPassword(); err != nil {
		log.Printf("Warning: failed to hash default admin password: %v", err)
		return
	}
	if err := db.Create(user).Error; err != nil {
		log.Printf("Warning: failed to seed default admin user: %v", err)
		return
	}
	log.Printf("Default admin user '%s' seeded (password from ADMIN_INITIAL_PASSWORD or built-in dev default)", username)
}

// upgradeWeakDefaultAdminPassword 将仍为弱口令 zayne 的默认管理员升级为强口令（仅执行一次）
func upgradeWeakDefaultAdminPassword(db *gorm.DB) {
	username := os.Getenv("ADMIN_USERNAME")
	if username == "" {
		username = defaultAdminUsername
	}

	var user User
	if err := db.Where("username = ? AND role = ?", username, "admin").First(&user).Error; err != nil {
		return
	}
	if !user.CheckPassword("zayne") {
		return
	}

	user.Password = defaultAdminInitialPassword()
	if err := user.HashPassword(); err != nil {
		log.Printf("Warning: failed to upgrade weak admin password: %v", err)
		return
	}
	if err := db.Model(&user).Update("password", user.Password).Error; err != nil {
		log.Printf("Warning: failed to save upgraded admin password: %v", err)
		return
	}
	log.Printf("Admin user '%s' password upgraded from weak default; set ADMIN_INITIAL_PASSWORD in .env for custom value", username)
}

// seedSubprojectSSOClients 种子数据：a_sso / b_sso 联调客户端（固定 ID 与 secret，便于本地 BFF 配置）
func seedSubprojectSSOClients(db *gorm.DB) {
	type seedClient struct {
		id, secret, name, appID, description, redirect string
		port, bffPort                                 int
	}
	seeds := []seedClient{
		{
			id:          "8c1dd65d-7d2a-4ba4-aff1-610960a295e7",
			secret:      "client_secret_a4121ad0-bc7e-4b59-8ab1-e29544060fc4",
			name:        "sso_test_a",
			appID:       "sso_test_a",
			description: "Sub-project a_sso (localhost:5173)",
			redirect:    "http://localhost:5173",
			port:        5173,
			bffPort:     5555,
		},
		{
			id:          "6a7db4e5-1c21-4cf1-92c9-507a0f924e29",
			secret:      "client_secret_22e58ccf-c367-4ead-b517-3be17f796211",
			name:        "sso_test_b",
			appID:       "sso_test_b",
			description: "Sub-project b_sso (localhost:5174)",
			redirect:    "http://localhost:5174",
			port:        5174,
			bffPort:     5556,
		},
		{
			id:          "f3e8a2b1-9c4d-4e5f-a6b7-c8d9e0f1a2b3",
			secret:      "client_secret_f3e8c2b1-c9c4-4ead-c517-c8175517c5cc",
			name:        "sso_test_c",
			appID:       "sso_test_c",
			description: "Sub-project c_sso (localhost:5175)",
			redirect:    "http://localhost:5175",
			port:        5175,
			bffPort:     5557,
		},
	}
	for _, s := range seeds {
		var existing SSOClient
		err := db.Where("id = ?", s.id).First(&existing).Error
		if err == nil {
			// 已存在：同步 redirect_uri 与 app_id（便于本地联调）
			updates := map[string]interface{}{
				"app_id":         s.appID,
				"frontend_port":  s.port,
				"bff_port":       s.bffPort,
			}
			if err := existing.SetRedirectURIs([]string{s.redirect}); err == nil {
				updates["redirect_uris"] = existing.RedirectURIs
			}
			db.Model(&existing).Updates(updates)
			continue
		}
		if err != gorm.ErrRecordNotFound {
			log.Printf("Warning: seed SSO client lookup %s: %v", s.name, err)
			continue
		}
		client := &SSOClient{
			ID:           s.id,
			Name:         s.name,
			AppID:        s.appID,
			Description:  s.description,
			Secret:       s.secret,
			FrontendPort: s.port,
			BffPort:      s.bffPort,
			IsActive:     true,
			AutoApprove:  true,
		}
		if err := client.SetRedirectURIs([]string{s.redirect}); err != nil {
			log.Printf("Warning: seed SSO client %s redirect: %v", s.name, err)
			continue
		}
		if err := client.SetGrantTypes([]string{"authorization_code", "refresh_token"}); err != nil {
			log.Printf("Warning: seed SSO client %s grant_types: %v", s.name, err)
			continue
		}
		if err := client.SetResponseTypes([]string{"code"}); err != nil {
			log.Printf("Warning: seed SSO client %s response_types: %v", s.name, err)
			continue
		}
		if err := client.SetScope([]string{"openid", "profile", "email"}); err != nil {
			log.Printf("Warning: seed SSO client %s scope: %v", s.name, err)
			continue
		}
		if err := db.Create(client).Error; err != nil {
			log.Printf("Warning: failed to seed SSO client %s: %v", s.name, err)
			continue
		}
		log.Printf("Seeded SSO client %s (%s)", s.name, s.id)
	}
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

// migrateUserAccountStatus 将旧状态值收敛为 active / frozen / cancelled
func migrateUserAccountStatus(db *gorm.DB) {
	if err := db.Exec("UPDATE users SET status = 'frozen' WHERE status IN ('suspended', 'inactive')").Error; err != nil {
		log.Printf("Warning: failed to migrate frozen account status: %v", err)
	}
	if err := db.Exec("UPDATE users SET status = 'active' WHERE status = 'pending'").Error; err != nil {
		log.Printf("Warning: failed to migrate pending account status: %v", err)
	}
}

// 获取数据库连接
func GetDB() *gorm.DB {
	return DB
}
