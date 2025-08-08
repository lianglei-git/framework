package config

import (
	"os"
	"strconv"
)

type Config struct {
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string

	// JWT配置 - 支持双Token扩展
	JWTSecret               string
	JWTExpiration           int // 访问token有效期（小时）
	JWTRefreshExpiration    int // 刷新token有效期（小时）
	JWTRememberMeExpiration int // 记住我token有效期（小时）

	SMTPHost     string
	SMTPPort     int
	SMTPUser     string
	SMTPPassword string
	SMTPFrom     string

	ServerPort string
	ServerHost string
}

var AppConfig Config

func Init() {
	AppConfig = Config{
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "3306"),
		DBUser:     getEnv("DB_USER", "root"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "auth_service"),

		JWTSecret:               getEnv("JWT_SECRET", "verita-unit-auth-secret"),
		JWTExpiration:           getEnvAsInt("JWT_EXPIRATION", 1),               // 7天 (168小时) - 学习类网站
		JWTRefreshExpiration:    getEnvAsInt("JWT_REFRESH_EXPIRATION", 24),      // 刷新token 24小时
		JWTRememberMeExpiration: getEnvAsInt("JWT_REMEMBER_ME_EXPIRATION", 720), // 记住我模式 30天

		SMTPHost:     getEnv("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:     getEnvAsInt("SMTP_PORT", 587),
		SMTPUser:     getEnv("SMTP_USER", ""),
		SMTPPassword: getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:     getEnv("SMTP_FROM", ""),

		ServerPort: getEnv("PORT", "8080"),
		ServerHost: getEnv("HOST", "0.0.0.0"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
