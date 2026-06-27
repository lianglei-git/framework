package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

// VerificationCode 验证码信息
type VerificationCode struct {
	ID        uint      `json:"id"`
	Email     string    `json:"email"`
	Code      string    `json:"code"`
	Type      string    `json:"type"`
	ExpiresAt time.Time `json:"expires_at"`
	Used      bool      `json:"used"`
	CreatedAt time.Time `json:"created_at"`
}

// 数据库配置
const (
	DBHost     = "localhost"
	DBPort     = 3306
	DBUser     = "test"
	DBPassword = "test"
	DBName     = "unit_auth"
)

// 获取数据库连接
func getDB() (*sql.DB, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		DBUser, DBPassword, DBHost, DBPort, DBName)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("连接数据库失败: %v", err)
	}

	// 测试连接
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("数据库连接测试失败: %v", err)
	}

	return db, nil
}

// 获取所有验证码
func getAllVerificationCodes(db *sql.DB) ([]VerificationCode, error) {
	query := `
		SELECT id, email, code, type, expires_at, used, created_at 
		FROM email_verifications 
		ORDER BY created_at DESC
		LIMIT 20
	`

	rows, err := db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("查询验证码失败: %v", err)
	}
	defer rows.Close()

	var codes []VerificationCode
	for rows.Next() {
		var code VerificationCode
		err := rows.Scan(&code.ID, &code.Email, &code.Code, &code.Type, &code.ExpiresAt, &code.Used, &code.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("扫描验证码数据失败: %v", err)
		}
		codes = append(codes, code)
	}

	return codes, nil
}

// 根据邮箱获取验证码
func getVerificationCodesByEmail(db *sql.DB, email string) ([]VerificationCode, error) {
	query := `
		SELECT id, email, code, type, expires_at, used, created_at 
		FROM email_verifications 
		WHERE email = ?
		ORDER BY created_at DESC
	`

	rows, err := db.Query(query, email)
	if err != nil {
		return nil, fmt.Errorf("查询验证码失败: %v", err)
	}
	defer rows.Close()

	var codes []VerificationCode
	for rows.Next() {
		var code VerificationCode
		err := rows.Scan(&code.ID, &code.Email, &code.Code, &code.Type, &code.ExpiresAt, &code.Used, &code.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("扫描验证码数据失败: %v", err)
		}
		codes = append(codes, code)
	}

	return codes, nil
}

// 打印验证码信息
func printVerificationCode(code VerificationCode) {
	fmt.Printf("=== 验证码信息 ===\n")
	fmt.Printf("ID: %d\n", code.ID)
	fmt.Printf("邮箱: %s\n", code.Email)
	fmt.Printf("验证码: %s\n", code.Code)
	fmt.Printf("类型: %s\n", code.Type)
	fmt.Printf("过期时间: %s\n", code.ExpiresAt.Format("2006-01-02 15:04:05"))
	fmt.Printf("是否已使用: %t\n", code.Used)
	fmt.Printf("创建时间: %s\n", code.CreatedAt.Format("2006-01-02 15:04:05"))

	// 检查是否过期
	now := time.Now()
	if code.ExpiresAt.Before(now) {
		fmt.Printf("状态: ❌ 已过期\n")
	} else if code.Used {
		fmt.Printf("状态: ⚠️  已使用\n")
	} else {
		fmt.Printf("状态: ✅ 有效\n")
	}
	fmt.Println()
}

// 主函数
func main() {
	// 获取命令行参数
	args := os.Args[1:]

	if len(args) == 0 {
		fmt.Println("使用方法:")
		fmt.Println("  go run verification_tool.go list                    # 列出所有验证码")
		fmt.Println("  go run verification_tool.go email <email>           # 获取指定邮箱的验证码")
		fmt.Println("  go run verification_tool.go latest <email>          # 获取最新的有效验证码")
		return
	}

	// 连接数据库
	db, err := getDB()
	if err != nil {
		log.Fatalf("❌ 数据库连接失败: %v", err)
	}
	defer db.Close()

	command := args[0]

	switch command {
	case "list":
		// 列出所有验证码
		codes, err := getAllVerificationCodes(db)
		if err != nil {
			log.Fatalf("❌ 获取验证码列表失败: %v", err)
		}

		fmt.Printf("=== 验证码列表 (共 %d 个) ===\n", len(codes))
		for i, code := range codes {
			fmt.Printf("%d. ", i+1)
			printVerificationCode(code)
		}

	case "email":
		// 获取指定邮箱的验证码
		if len(args) < 2 {
			fmt.Println("❌ 请提供邮箱地址")
			return
		}

		email := args[1]
		codes, err := getVerificationCodesByEmail(db, email)
		if err != nil {
			log.Fatalf("❌ 获取验证码失败: %v", err)
		}

		if len(codes) == 0 {
			fmt.Printf("❌ 未找到邮箱 %s 的验证码\n", email)
			return
		}

		fmt.Printf("=== %s 的验证码 (共 %d 个) ===\n", email, len(codes))
		for i, code := range codes {
			fmt.Printf("%d. ", i+1)
			printVerificationCode(code)
		}

	case "latest":
		// 获取最新的有效验证码
		if len(args) < 2 {
			fmt.Println("❌ 请提供邮箱地址")
			return
		}

		email := args[1]
		codes, err := getVerificationCodesByEmail(db, email)
		if err != nil {
			log.Fatalf("❌ 获取验证码失败: %v", err)
		}

		if len(codes) == 0 {
			fmt.Printf("❌ 未找到邮箱 %s 的验证码\n", email)
			return
		}

		// 找到最新的有效验证码
		var latestCode *VerificationCode
		now := time.Now()

		for i := range codes {
			code := &codes[i]
			if !code.Used && code.ExpiresAt.After(now) {
				if latestCode == nil || code.CreatedAt.After(latestCode.CreatedAt) {
					latestCode = code
				}
			}
		}

		if latestCode == nil {
			fmt.Printf("❌ 未找到邮箱 %s 的有效验证码\n", email)
			return
		}

		fmt.Printf("=== %s 的最新有效验证码 ===\n", email)
		printVerificationCode(*latestCode)

	default:
		fmt.Printf("❌ 未知命令: %s\n", command)
		fmt.Println("可用命令: list, email, latest")
	}
}
