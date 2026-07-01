package main

import (
	"fmt"
	"log"
	"net/http"
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

	// 启动session清理调度器
	handlers.StartSessionCleanupScheduler(db)

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
	r.Use(middleware.ProjectKeyMiddleware())

	// 创建监控服务
	monitoringService := services.NewMonitoringService(db)

	// 指标监控
	// r.GET("/metrics", monitoringService.GetPrometheusHandler())

	// 设置监控路由
	router.SetupMonitoringRoutes(r, monitoringService)
	r.Use(middleware.AutoRefreshMiddleware())

	// 健康检查（根路径）
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"message": "Unit Auth service is running with SSO support",
			"version": "1.0.0",
		})
	})

	// ✅ 工作正常的SSO接口
	r.GET("/api/v1/sso/providers", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"code":    200,
			"message": "SSO providers retrieved successfully",
			"data": []map[string]interface{}{
				{
					"id":               "sub_job",
					"name":             "sub_job",
					"displayName":      "本地账户",
					"authorizationUrl": "/api/v1/auth/oauth/authorize",
					"tokenUrl":         "/api/v1/auth/oauth/token",
					"userInfoUrl":      "/api/v1/auth/oauth/userinfo",
					"logoutUrl":        "/api/v1/auth/oauth/logout",
					"enabled":          true,
					"grantTypes":       "authorization_code,password",
					"responseTypes":    "code,token",
					"scope":            "openid,profile,email,phone",
				},
				{
					"id":          "github",
					"name":        "github",
					"displayName": "GitHub",
					// "authorizationUrl": "https://github.com/login/oauth/authorize",
					// "tokenUrl":         "https://github.com/login/oauth/access_token",
					// "userInfoUrl":      "https://api.github.com/user",
					"enabled":       true,
					"grantTypes":    "authorization_code",
					"responseTypes": "code",
					"scope":         "user:email,read:user",
				},
				{
					"id":          "wechat",
					"name":        "wechat",
					"displayName": "微信",
					// "authorizationUrl": "https://github.com/login/oauth/authorize",
					// "tokenUrl":         "https://github.com/login/oauth/access_token",
					// "userInfoUrl":      "https://api.github.com/user",
					"enabled":       true,
					"grantTypes":    "authorization_code",
					"responseTypes": "code",
					"scope":         "user:email,read:user",
				},
				{
					"id":          "google",
					"name":        "google",
					"displayName": "Google",
					// "authorizationUrl": "https://accounts.google.com/oauth/authorize",
					// "tokenUrl":         "https://oauth2.googleapis.com/token",
					// "userInfoUrl":      "https://www.googleapis.com/oauth2/v2/userinfo",
					"enabled":       true,
					"grantTypes":    "authorization_code",
					"responseTypes": "code",
					"scope":         "openid,profile,email",
				},
			},
		})
	})
	// Session检查接口 - 用于通过session_id自动恢复登录
	r.POST("/api/v1/auth/oauth/session-check", handlers.CheckSessionAndGetToken(db))

	r.GET("/api/v1/sso/session/check", handlers.GetSSOSessionCheck(db))

	r.POST("/api/v1/sso/session/destroy", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"code":    200,
			"message": "Session destroyed successfully",
		})
	})
	// API路由组
	api := r.Group("/api/v1")
	{
		// OpenID Connect服务发现端点（在API组中）
		api.GET("/openid-configuration", handlers.GetOpenIDConfiguration())
		api.GET("/jwks-json", handlers.GetJWKS())

		// 项目相关路由（公开）
		api.GET("/projects/public", handlers.GetPublicProjects(db))
		api.GET("/projects/current", handlers.GetCurrentProject(db))

		// 公开的第三方接入示例
		api.GET("/projects/integration-docs", handlers.GetIntegrationDocs())

		// 认证相关路由
		auth := api.Group("/auth")
		{
			// OAuth 2.0/OpenID Connect OIDC 端点
			auth.GET("/oauth/authorize", handlers.GetOAuthAuthorize(db)) //
			auth.POST("/oauth/token", handlers.GetOAuthToken(db))
			auth.GET("/oauth/userinfo", handlers.GetOAuthUserinfo(db))
			auth.POST("/oauth/logout", handlers.GetOAuthLogout(db))
			auth.GET("/oauth/logout", handlers.GetOAuthLogout(db))
			auth.POST("/oauth/revoke", handlers.GetOAuthRevoke(db))

			// 兼容性端点
			auth.POST("/introspect", handlers.IntrospectToken())
			auth.POST("/token/exchange", handlers.TokenExchange())

			// 插件认证处理器
			// 注册 GitHub Provider
			pluginManager.RegisterProvider(plugins.NewGitHubProvider(db))

			// 创建统一的认证处理器（整合所有认证方式）
			unifiedAuthHandler := handlers.NewUnifiedAuthHandler(db, pluginManager)

			// 统一认证端点（替代原有的分离端点）
			auth.POST("/oauth-login", unifiedAuthHandler.UnifiedOAuthLogin(mailer))
			auth.GET("/oauth/:provider/url", unifiedAuthHandler.UnifiedGetOAuthURL())

			// 兼容性端点（保持原有功能）
			pluginAuthHandler := handlers.NewPluginAuthHandler(db, pluginManager, statsService)
			auth.GET("/providers", pluginAuthHandler.GetAvailableProviders())

			// 微信扫码登录专用路由
			wechatAuthHandler := handlers.NewWeChatAuthHandler(db, wechatProvider, statsService)
			auth.GET("/wechat/qr-code", wechatAuthHandler.GetQRCode())
			auth.GET("/wechat/callback", wechatAuthHandler.HandleCallback())
			auth.GET("/wechat/status/:state", wechatAuthHandler.CheckLoginStatus())

			// 传统认证接口（保持兼容性）
			auth.POST("/register", unifiedAuthHandler.Register(mailer))
			auth.POST("/send-email-code", handlers.SendEmailCode(db, mailer))
			auth.POST("/send-sms-code", handlers.SendPhoneCode(db))
			// auth.POST("/email-login", unifiedAuthHandler.UnifiedEmailLogin()) // 使用统一处理器
			auth.POST("/verify-email", handlers.VerifyEmail(db))
			auth.POST("/forgot-password", handlers.ForgotPassword(db, mailer))
			auth.POST("/reset-password", handlers.ResetPassword(db))
			auth.POST("/account-preview", handlers.AccountPreview(db))

			// 统一登录接口
			// auth.POST("/login", handlers.UnifiedLogin(db))

			// 手机号认证接口
			auth.POST("/phone-login", handlers.PhoneLogin(db))
			auth.POST("/phone-direct-login", handlers.PhoneDirectLogin(db))   // 直接登录（自动注册）
			auth.POST("/phone-reset-password", handlers.PhoneResetPassword(db))

			auth.POST("/refresh-token", handlers.RefreshToken())                              // 简单续签
			auth.POST("/refresh-with-refresh-token", handlers.RefreshTokenWithRefreshToken()) // 双Token续签
			auth.GET("/token-status", handlers.CheckTokenStatus())                            // 检查token状态
			auth.POST("/login-with-remember", handlers.LoginWithRememberMe(db))               // 记住我登录
			auth.POST("/login-with-token-pair", handlers.LoginWithTokenPair(db))              // 双Token登录

			// 双重验证模式端点
			auth.POST("/double-verification", unifiedAuthHandler.UnifiedDoubleVerification()) // 双重验证登录

			// 中心化SSO架构API（后端间调用）
			auth.POST("/token/refresh", handlers.CentralizedTokenRefresh()) // 后端间Token刷新
			auth.POST("/session/validate", handlers.ValidateSession())      // 会话验证
			auth.POST("/session/logout", handlers.CentralizedLogout())      // 中心化登出
		}

		// 需要认证的路由
		protected := api.Group("/user")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.GET("/profile", handlers.GetProfile(db))
			protected.PUT("/profile", handlers.UpdateProfile(db))
			protected.POST("/change-password", handlers.ChangePassword(db))
			protected.POST("/set-password", handlers.SetPassword(db))
			protected.POST("/avatar", handlers.UploadAvatar(db))
			protected.GET("/check-username", handlers.CheckUsername(db))
		}

		// 头像文件（公开读取）
		api.GET("/user/avatar/:filename", handlers.GetAvatar(db))

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

			// SSO客户端管理
			admin.POST("/sso-clients", handlers.CreateSSOClient(db))
			admin.GET("/sso-clients", handlers.GetSSOClients(db))
			admin.GET("/sso-clients/:id", handlers.GetSSOClient(db))
			admin.PUT("/sso-clients/:id", handlers.UpdateSSOClient(db))
			admin.DELETE("/sso-clients/:id", handlers.DeleteSSOClient(db))
			admin.POST("/sso-clients/:id/regenerate-secret", handlers.RegenerateSSOClientSecret(db))
			admin.PUT("/sso-clients/:id/secret", handlers.SetSSOClientSecret(db))
			admin.GET("/sso-clients/stats", handlers.GetSSOClientStats(db))

			// SSO会话管理
			admin.GET("/sso-sessions/stats", handlers.GetSSOSessionStats(db))
			admin.POST("/sso-sessions/cleanup", handlers.CleanupExpiredSSOSessions(db))

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

	// 测试端点（开发环境启用）
	test := r.Group("/test")
	{
		test.GET("/token", func(c *gin.Context) {
			fmt.Printf("🔍 测试令牌端点被调用\n")
			if err := handlers.TestTokenGeneration(); err != nil {
				fmt.Printf("❌ 令牌测试失败: %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": err.Error(),
				})
				return
			}
			c.JSON(http.StatusOK, gin.H{
				"message": "Token generation and validation test successful",
			})
		})
	}

	// 启动服务器
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🎉 Unit Auth SSO service starting on port %s", port)
	log.Printf("📋 Available SSO endpoints:")
	log.Printf("  ✅ GET  /health")
	log.Printf("  ✅ GET  /api/v1/sso/providers")
	log.Printf("  ✅ GET  /api/v1/sso/session/check")
	log.Printf("  ✅ POST /api/v1/sso/session/destroy")
	log.Printf("🚀 SSO service ready for frontend integration!")

	if err := r.Run(":" + port); err != nil {
		log.Fatal("❌ Failed to start server:", err)
	}
}
