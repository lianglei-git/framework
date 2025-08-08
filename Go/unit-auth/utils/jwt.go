package utils

import (
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// // 生成JWT Token
// func GenerateToken(userID string, email, role string) (string, error) {
// 	expirationTime := time.Now().Add(time.Duration(config.AppConfig.JWTExpiration) * time.Hour)

// 	fmt.Println("userID :::::: ", userID)
// 	fmt.Println("email :::::: ", email)
// 	fmt.Println("role :::::: ", role)
// 	fmt.Println("expirationTime :::::: ", expirationTime)

// 	claims := &Claims{
// 		UserID: userID,
// 		Email:  email,
// 		Role:   role,
// 		RegisteredClaims: jwt.RegisteredClaims{
// 			ExpiresAt: jwt.NewNumericDate(expirationTime),
// 			IssuedAt:  jwt.NewNumericDate(time.Now()),
// 			NotBefore: jwt.NewNumericDate(time.Now()),
// 		},
// 	}

// 	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
// 	tokenString, err := token.SignedString([]byte(config.AppConfig.JWTSecret))
// 	if err != nil {
// 		return "", err
// 	}

// 	return tokenString, nil
// }

// // 验证JWT Token
// func ValidateToken(tokenString string) (*Claims, error) {
// 	claims := &Claims{}

// 	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
// 		return []byte(config.AppConfig.JWTSecret), nil
// 	})

// 	if err != nil {
// 		return nil, err
// 	}

// 	if !token.Valid {
// 		return nil, errors.New("invalid token")
// 	}

// 	return claims, nil
// }
