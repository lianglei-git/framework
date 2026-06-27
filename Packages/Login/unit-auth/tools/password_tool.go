package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

	_ "github.com/go-sql-driver/mysql"
	"golang.org/x/crypto/bcrypt"
)

// UserPassword 用户密码信息
type UserPassword struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	Username string `json:"username"`
	Password string `json:"password"`
	Role     string `json:"role"`
	Status   string `json:"status"`
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

// 获取所有用户密码信息
func getAllUserPasswords(db *sql.DB) ([]UserPassword, error) {
	query := `
		SELECT id, email, username, password, role, status 
		FROM users 
		WHERE deleted_at IS NULL
		ORDER BY created_at DESC
	`

	rows, err := db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("查询用户失败: %v", err)
	}
	defer rows.Close()

	var users []UserPassword
	for rows.Next() {
		var user UserPassword
		err := rows.Scan(&user.ID, &user.Email, &user.Username, &user.Password, &user.Role, &user.Status)
		if err != nil {
			return nil, fmt.Errorf("扫描用户数据失败: %v", err)
		}
		users = append(users, user)
	}

	return users, nil
}

// 根据邮箱获取用户密码
func getUserPasswordByEmail(db *sql.DB, email string) (*UserPassword, error) {
	query := `
		SELECT id, email, username, password, role, status 
		FROM users 
		WHERE email = ? AND deleted_at IS NULL
	`

	var user UserPassword
	err := db.QueryRow(query, email).Scan(&user.ID, &user.Email, &user.Username, &user.Password, &user.Role, &user.Status)
	if err != nil {
		return nil, fmt.Errorf("查询用户失败: %v", err)
	}

	return &user, nil
}

// 根据用户名获取用户密码
func getUserPasswordByUsername(db *sql.DB, username string) (*UserPassword, error) {
	query := `
		SELECT id, email, username, password, role, status 
		FROM users 
		WHERE username = ? AND deleted_at IS NULL
	`

	var user UserPassword
	err := db.QueryRow(query, username).Scan(&user.ID, &user.Email, &user.Username, &user.Password, &user.Role, &user.Status)
	if err != nil {
		return nil, fmt.Errorf("查询用户失败: %v", err)
	}

	return &user, nil
}

// 验证密码是否正确
func verifyPassword(hashedPassword, plainPassword string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(plainPassword))
	return err == nil
}

// 生成密码哈希（用于测试）
func hashPassword(password string) (string, error) {
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashedBytes), nil
}

// 分析密码强度
func analyzePasswordStrength(password string) map[string]interface{} {
	score := 0
	feedback := []string{}

	// 长度检查
	if len(password) < 8 {
		feedback = append(feedback, "密码长度不足8位")
	} else if len(password) >= 12 {
		score += 2
		feedback = append(feedback, "密码长度良好")
	} else {
		score += 1
		feedback = append(feedback, "密码长度适中")
	}

	// 字符类型检查
	hasLower := false
	hasUpper := false
	hasDigit := false
	hasSpecial := false

	for _, char := range password {
		switch {
		case char >= 'a' && char <= 'z':
			hasLower = true
		case char >= 'A' && char <= 'Z':
			hasUpper = true
		case char >= '0' && char <= '9':
			hasDigit = true
		case char >= 33 && char <= 47 || char >= 58 && char <= 64 || char >= 91 && char <= 96 || char >= 123 && char <= 126:
			hasSpecial = true
		}
	}

	if hasLower {
		score += 1
		feedback = append(feedback, "包含小写字母")
	} else {
		feedback = append(feedback, "缺少小写字母")
	}

	if hasUpper {
		score += 1
		feedback = append(feedback, "包含大写字母")
	} else {
		feedback = append(feedback, "缺少大写字母")
	}

	if hasDigit {
		score += 1
		feedback = append(feedback, "包含数字")
	} else {
		feedback = append(feedback, "缺少数字")
	}

	if hasSpecial {
		score += 1
		feedback = append(feedback, "包含特殊字符")
	} else {
		feedback = append(feedback, "缺少特殊字符")
	}

	// 评估强度等级
	var strength string
	switch {
	case score <= 2:
		strength = "弱"
	case score <= 4:
		strength = "中等"
	case score <= 5:
		strength = "强"
	default:
		strength = "很强"
	}

	return map[string]interface{}{
		"score":      score,
		"strength":   strength,
		"feedback":   feedback,
		"length":     len(password),
		"hasLower":   hasLower,
		"hasUpper":   hasUpper,
		"hasDigit":   hasDigit,
		"hasSpecial": hasSpecial,
	}
}

// 测试常见密码
func testCommonPasswords(hashedPassword string) []string {
	commonPasswords := []string{
		"123456", "password", "123456789", "12345678", "12345",
		"qwerty", "abc123", "111111", "1234567", "dragon",
		"123123", "baseball", "abc123", "football", "monkey",
		"letmein", "shadow", "master", "666666", "qwertyuiop",
		"123321", "mustang", "1234567890", "michael", "654321",
		"superman", "1qaz2wsx", "7777777", "121212", "000000",
		"qazwsx", "123qwe", "killer", "trustno1", "jordan",
		"jennifer", "zxcvbnm", "asdfgh", "hunter", "buster",
		"soccer", "harley", "batman", "andrew", "tigger",
		"sunshine", "iloveyou", "fuckme", "2000", "charlie",
		"robert", "thomas", "hockey", "ranger", "daniel",
		"starwars", "klaster", "112233", "george", "computer",
		"michelle", "jessica", "pepper", "1111", "zxcvbn",
		"555555", "11111111", "131313", "freedom", "777777",
		"pass", "maggie", "159753", "aaaaaa", "ginger",
		"princess", "joshua", "cheese", "amanda", "summer",
		"love", "ashley", "nicole", "chelsea", "biteme",
		"matthew", "access", "yankees", "987654321", "dallas",
		"austin", "thunder", "taylor", "matrix", "mobilemail",
		"mom", "monitor", "monitoring", "montana", "moon",
		"moscow", "mother", "movie", "mozilla", "music",
		"mustang", "password", "pa$$w0rd", "p@ssw0rd", "p@$$w0rd",
		"admin", "administrator", "root", "user", "guest",
		"test", "demo", "sample", "example", "temp",
		"123456789", "qwerty123", "password123", "admin123",
		"user123", "test123", "demo123", "guest123",
	}

	var matched []string
	for _, pwd := range commonPasswords {
		if verifyPassword(hashedPassword, pwd) {
			matched = append(matched, pwd)
		}
	}

	return matched
}

// 分析哈希信息
func analyzeHash(hashedPassword string) map[string]interface{} {
	// bcrypt 哈希格式: $2a$10$...
	// $2a$ - 算法标识
	// 10 - 成本因子
	// 剩余部分 - 盐值和哈希

	if len(hashedPassword) < 7 || !strings.HasPrefix(hashedPassword, "$2a$") {
		return map[string]interface{}{
			"valid": false,
			"error": "不是有效的 bcrypt 哈希",
		}
	}

	parts := strings.Split(hashedPassword, "$")
	if len(parts) != 4 {
		return map[string]interface{}{
			"valid": false,
			"error": "bcrypt 哈希格式错误",
		}
	}

	cost, err := strconv.Atoi(parts[2])
	if err != nil {
		return map[string]interface{}{
			"valid": false,
			"error": "无法解析成本因子",
		}
	}

	return map[string]interface{}{
		"valid":     true,
		"algorithm": "bcrypt",
		"cost":      cost,
		"length":    len(hashedPassword),
		"format":    "标准 bcrypt 格式",
	}
}

// 打印用户信息
func printUserInfo(user UserPassword, showPassword bool) {
	fmt.Printf("=== 用户信息 ===\n")
	fmt.Printf("ID: %s\n", user.ID)
	fmt.Printf("邮箱: %s\n", user.Email)
	fmt.Printf("用户名: %s\n", user.Username)
	fmt.Printf("角色: %s\n", user.Role)
	fmt.Printf("状态: %s\n", user.Status)
	if showPassword {
		fmt.Printf("密码哈希: %s\n", user.Password)
	}
	fmt.Println()
}

// 测试密码验证
func testPasswordVerification(db *sql.DB, email, testPassword string) {
	user, err := getUserPasswordByEmail(db, email)
	if err != nil {
		fmt.Printf("❌ 获取用户失败: %v\n", err)
		return
	}

	fmt.Printf("=== 密码验证测试 ===\n")
	fmt.Printf("测试用户: %s\n", email)
	fmt.Printf("测试密码: %s\n", testPassword)

	isValid := verifyPassword(user.Password, testPassword)
	if isValid {
		fmt.Printf("✅ 密码验证成功\n")
	} else {
		fmt.Printf("❌ 密码验证失败\n")
	}
	fmt.Println()
}

// 主函数
func main() {
	// 获取命令行参数
	args := os.Args[1:]

	if len(args) == 0 {
		fmt.Println("使用方法:")
		fmt.Println("  go run password_tool.go list                    # 列出所有用户")
		fmt.Println("  go run password_tool.go user <email>            # 获取指定用户信息")
		fmt.Println("  go run password_tool.go verify <email> <password> # 验证密码")
		fmt.Println("  go run password_tool.go hash <password>         # 生成密码哈希")
		fmt.Println("  go run password_tool.go analyze <email>         # 分析用户密码强度")
		fmt.Println("  go run password_tool.go crack <email>           # 测试常见密码")
		fmt.Println("  go run password_tool.go info <email>            # 分析哈希信息")
		fmt.Println("  go run password_tool.go strength <password>     # 分析密码强度")
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
		// 列出所有用户
		users, err := getAllUserPasswords(db)
		if err != nil {
			log.Fatalf("❌ 获取用户列表失败: %v", err)
		}

		fmt.Printf("=== 用户列表 (共 %d 个用户) ===\n", len(users))
		for i, user := range users {
			fmt.Printf("%d. ", i+1)
			printUserInfo(user, false)
		}

	case "user":
		// 获取指定用户信息
		if len(args) < 2 {
			fmt.Println("❌ 请提供邮箱地址")
			return
		}

		email := args[1]
		user, err := getUserPasswordByEmail(db, email)
		if err != nil {
			log.Fatalf("❌ 获取用户失败: %v", err)
		}

		printUserInfo(*user, true)

	case "verify":
		// 验证密码
		if len(args) < 3 {
			fmt.Println("❌ 请提供邮箱和密码")
			return
		}

		email := args[1]
		password := args[2]
		testPasswordVerification(db, email, password)

	case "hash":
		// 生成密码哈希
		if len(args) < 2 {
			fmt.Println("❌ 请提供密码")
			return
		}

		password := args[1]
		hashedPassword, err := hashPassword(password)
		if err != nil {
			log.Fatalf("❌ 生成密码哈希失败: %v", err)
		}

		fmt.Printf("=== 密码哈希生成 ===\n")
		fmt.Printf("原始密码: %s\n", password)
		fmt.Printf("哈希结果: %s\n", hashedPassword)

	case "analyze":
		// 分析用户密码强度
		if len(args) < 2 {
			fmt.Println("❌ 请提供邮箱地址")
			return
		}

		email := args[1]
		user, err := getUserPasswordByEmail(db, email)
		if err != nil {
			log.Fatalf("❌ 获取用户失败: %v", err)
		}

		fmt.Printf("=== 用户密码分析 ===\n")
		fmt.Printf("用户: %s\n", email)
		fmt.Printf("哈希: %s\n", user.Password)

		// 分析哈希信息
		hashInfo := analyzeHash(user.Password)
		fmt.Printf("哈希算法: %s\n", hashInfo["algorithm"])
		fmt.Printf("成本因子: %d\n", hashInfo["cost"])
		fmt.Printf("哈希长度: %d\n", hashInfo["length"])

	case "crack":
		// 测试常见密码
		if len(args) < 2 {
			fmt.Println("❌ 请提供邮箱地址")
			return
		}

		email := args[1]
		user, err := getUserPasswordByEmail(db, email)
		if err != nil {
			log.Fatalf("❌ 获取用户失败: %v", err)
		}

		fmt.Printf("=== 常见密码测试 ===\n")
		fmt.Printf("用户: %s\n", email)
		fmt.Printf("正在测试常见密码...\n")

		matched := testCommonPasswords(user.Password)
		if len(matched) > 0 {
			fmt.Printf("⚠️  发现匹配的常见密码:\n")
			for _, pwd := range matched {
				fmt.Printf("  - %s\n", pwd)
			}
		} else {
			fmt.Printf("✅ 未发现常见密码匹配\n")
		}

	case "info":
		// 分析哈希信息
		if len(args) < 2 {
			fmt.Println("❌ 请提供邮箱地址")
			return
		}

		email := args[1]
		user, err := getUserPasswordByEmail(db, email)
		if err != nil {
			log.Fatalf("❌ 获取用户失败: %v", err)
		}

		fmt.Printf("=== 哈希信息分析 ===\n")
		fmt.Printf("用户: %s\n", email)

		hashInfo := analyzeHash(user.Password)
		if hashInfo["valid"].(bool) {
			fmt.Printf("✅ 有效哈希\n")
			fmt.Printf("算法: %s\n", hashInfo["algorithm"])
			fmt.Printf("成本因子: %d\n", hashInfo["cost"])
			fmt.Printf("长度: %d 字符\n", hashInfo["length"])
			fmt.Printf("格式: %s\n", hashInfo["format"])
		} else {
			fmt.Printf("❌ 无效哈希: %s\n", hashInfo["error"])
		}

	case "strength":
		// 分析密码强度
		if len(args) < 2 {
			fmt.Println("❌ 请提供密码")
			return
		}

		password := args[1]
		analysis := analyzePasswordStrength(password)

		fmt.Printf("=== 密码强度分析 ===\n")
		fmt.Printf("密码: %s\n", password)
		fmt.Printf("长度: %d 字符\n", analysis["length"])
		fmt.Printf("强度评分: %d/6\n", analysis["score"])
		fmt.Printf("强度等级: %s\n", analysis["strength"])
		fmt.Printf("字符类型:\n")
		fmt.Printf("  - 小写字母: %t\n", analysis["hasLower"])
		fmt.Printf("  - 大写字母: %t\n", analysis["hasUpper"])
		fmt.Printf("  - 数字: %t\n", analysis["hasDigit"])
		fmt.Printf("  - 特殊字符: %t\n", analysis["hasSpecial"])
		fmt.Printf("建议:\n")
		for _, feedback := range analysis["feedback"].([]string) {
			fmt.Printf("  - %s\n", feedback)
		}

	default:
		fmt.Printf("❌ 未知命令: %s\n", command)
		fmt.Println("可用命令: list, user, verify, hash")
	}
}
