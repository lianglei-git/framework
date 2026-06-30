// 一次性将弱口令管理员升级为 ADMIN_INITIAL_PASSWORD（无需启动 HTTP 服务）
package main

import (
	"log"

	"github.com/joho/godotenv"
	"unit-auth/config"
	"unit-auth/models"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}
	config.Init()
	if _, err := models.InitDB(); err != nil {
		log.Fatal("database init failed:", err)
	}
	log.Println("Admin password migration check completed")
}
