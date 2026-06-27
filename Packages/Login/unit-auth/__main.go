package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	// 加载环境变量
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	log.Println(os.Getenv("RSA_PRIVATE_KEY"))

}
