package main

import (
	"log"
	"os"
	"unit-auth/config"
	"unit-auth/handlers"
	"unit-auth/middleware"
	"unit-auth/models"
	"unit-auth/plugins"
	"unit-auth/router"
	"unit-auth/services"
	"unit-auth/utils"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// 加载环境变量
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// 初始化配置
	config.Init()

	// 初始化数据库
	db, err := models.InitDB()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// 初始化邮件服务
	mailer := utils.NewMailer()

	// 初始化统计服务
	statsService := services.NewStatsService(db)

	// 初始化清理服务
	cleanupService := services.NewCleanupService(db)

	// 启动验证码清理调度器
	cleanupService.StartCleanupScheduler()

	// 初始化插件管理器
	pluginManager := plugins.NewPluginManager()

	// 注册认证提供者
	emailProvider := plugins.NewEmailProvider(db, mailer)
	phoneProvider := plugins.NewPhoneProvider(db)

	// 注册Google OAuth提供者
	googleProvider := plugins.NewGoogleProvider(
		db,
		os.Getenv("GOOGLE_CLIENT_ID"),
		os.Getenv("GOOGLE_CLIENT_SECRET"),
		os.Getenv("GOOGLE_REDIRECT_URI"),
	)

	// 注册微信OAuth提供者
	wechatProvider := plugins.NewWeChatProvider(
		db,
		os.Getenv("WECHAT_APP_ID"),
		os.Getenv("WECHAT_APP_SECRET"),
		os.Getenv("WECHAT_REDIRECT_URI"),
	)

	pluginManager.RegisterProvider(emailProvider)
	pluginManager.RegisterProvider(phoneProvider)
	pluginManager.RegisterProvider(googleProvider)
	pluginManager.RegisterProvider(wechatProvider)

	// 设置Gin模式
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 创建路由
	r := gin.Default()

	// 添加中间件
	r.Use(middleware.CORS())
	r.Use(middleware.Logger())
	r.Use(middleware.RequestID())
	r.Use(middleware.RateLimit())

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"message": "Unit Auth service is running",
			"version": "1.0.0",
		})
	})

	// 创建监控服务
	monitoringService := services.NewMonitoringService(db)

	// 指标监控
	// r.GET("/metrics", monitoringService.GetPrometheusHandler())

	// 设置监控路由
	router.SetupMonitoringRoutes(r, monitoringService)

	// API路由组
	api := r.Group("/api/v1")
	{
		// 认证相关路由
		auth := api.Group("/auth")
		{
			// 插件认证处理器
			pluginAuthHandler := handlers.NewPluginAuthHandler(db, pluginManager, statsService)

			auth.POST("/oauth-login", pluginAuthHandler.OAuthLogin())
			auth.GET("/oauth/:provider/url", pluginAuthHandler.GetOAuthURL())
			auth.GET("/providers", pluginAuthHandler.GetAvailableProviders())

			// 微信扫码登录专用路由
			wechatAuthHandler := handlers.NewWeChatAuthHandler(db, wechatProvider, statsService)
			auth.GET("/wechat/qr-code", wechatAuthHandler.GetQRCode())
			auth.GET("/wechat/callback", wechatAuthHandler.HandleCallback())
			auth.GET("/wechat/status/:state", wechatAuthHandler.CheckLoginStatus())

			// 传统认证接口（保持兼容性）
			auth.POST("/register", handlers.Register(db, mailer))
			auth.POST("/send-email-code", handlers.SendEmailCode(db, mailer))
			auth.POST("/send-sms-code", handlers.SendPhoneCode(db))
			auth.POST("/verify-email", handlers.VerifyEmail(db))
			auth.POST("/forgot-password", handlers.ForgotPassword(db, mailer))
			auth.POST("/reset-password", handlers.ResetPassword(db))

			// 统一登录接口
			auth.POST("/login", handlers.UnifiedLogin(db))

			// 手机号认证接口
			auth.POST("/phone-login", handlers.PhoneLogin(db))
			auth.POST("/phone-direct-login", handlers.PhoneDirectLogin(db)) // 直接登录（自动注册）
			auth.POST("/phone-reset-password", handlers.PhoneResetPassword(db))
		}

		// 需要认证的路由
		protected := api.Group("/user")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.GET("/profile", handlers.GetProfile(db))
			protected.PUT("/profile", handlers.UpdateProfile(db))
			protected.POST("/change-password", handlers.ChangePassword(db))
		}

		// 统计相关路由
		stats := api.Group("/stats")
		stats.Use(middleware.AuthMiddleware())
		{
			statsHandler := handlers.NewStatsHandler(statsService)

			stats.GET("/overall", statsHandler.GetOverallStats())
			stats.GET("/daily/:date", statsHandler.GetDailyStats())
			stats.GET("/daily", statsHandler.GetDailyStats()) // 默认今日
			stats.GET("/weekly", statsHandler.GetWeeklyStats())
			stats.GET("/monthly/:year/:month", statsHandler.GetMonthlyStats())
			stats.GET("/range", statsHandler.GetStatsRange())
			stats.GET("/users", statsHandler.GetUserStats())
			stats.GET("/logins", statsHandler.GetLoginStats())
			stats.GET("/daily-enhanced", statsHandler.GetDailyStatsEnhanced())
		}

		// 管理接口（需要管理员权限）
		admin := api.Group("/admin")
		admin.Use(middleware.AuthMiddleware())
		admin.Use(middleware.AdminMiddleware())
		{
			// 用户管理
			admin.GET("/users", handlers.GetUsers(db))
			admin.GET("/users/:id", handlers.GetUser(db))
			admin.PUT("/users/:id", handlers.UpdateUser(db))
			admin.DELETE("/users/:id", handlers.DeleteUser(db))
			admin.POST("/users/bulk-update", handlers.BulkUpdateUsers(db))

			// 统计分析
			admin.GET("/stats/users", handlers.GetUserStats(db))
			admin.GET("/stats/login-logs", handlers.GetLoginLogs(db))

			// 高级数据分析
			admin.GET("/analytics/user-growth", handlers.GetUserGrowthAnalytics(db))
			admin.GET("/analytics/login-behavior", handlers.GetLoginAnalytics(db))
			admin.GET("/analytics/user-behavior", handlers.GetUserBehaviorAnalytics(db))
			admin.GET("/analytics/system-performance", handlers.GetSystemPerformanceAnalytics(db))
			admin.GET("/analytics/real-time", handlers.GetRealTimeMetrics(db))

			// 数据可视化图表
			admin.GET("/charts/user-growth", handlers.GetUserGrowthChart(db))
			admin.GET("/charts/login-behavior", handlers.GetLoginBehaviorChart(db))
			admin.GET("/charts/user-activity", handlers.GetUserActivityChart(db))
			admin.GET("/charts/system-performance", handlers.GetSystemPerformanceChart(db))
			admin.GET("/charts/dashboard", handlers.GetDashboardCharts(db))

			// 系统管理
			admin.GET("/verification-stats", handlers.GetVerificationStats(db, cleanupService))
			admin.POST("/cleanup-verifications", handlers.CleanupVerifications(db, cleanupService))

			// 数据备份和恢复
			backupHandler := handlers.NewBackupHandler(db)
			admin.POST("/backup/export", backupHandler.ExportBackup())
			admin.POST("/backup/import", backupHandler.ImportBackup())
			admin.GET("/backup/info", backupHandler.GetBackupInfo())
			admin.POST("/backup/validate", backupHandler.ValidateBackup())
		}
	}

	// 启动服务器
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Unit Auth service starting on port %s", port)
	log.Printf("Available providers: %d", len(pluginManager.GetEnabledProviders()))

	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
