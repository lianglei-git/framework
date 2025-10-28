package main

import (
	"bytes"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"net/url"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var GlobalAuthConfig map[string]interface{} = map[string]interface{}{
	"ssoServerUrl": "http://localhost:8080",
	"clientSecret": "client_secret_a4121ad0-bc7e-4b59-8ab1-e29544060fc4",

	"tokenEndpoint": "/api/v1/auth/oauth/token",
	"authorize":     "/api/v1/auth/oauth/authorize",
	"logoutUrl":     "/api/v1/auth/oauth/logout",
	"userInfoUrl":   "/api/v1/auth/oauth/userinfo",
	"clientId":      "8c1dd65d-7d2a-4ba4-aff1-610960a295e7",

	"redirectUri":  "http://localhost:3000/auth/callback",
	"scope":        "openid profile email phone",
	"responseType": "code",
	"grantType":    "authorization_code",
}

const private = `
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAnDBkAtd9b/mpIgWLPmxCXHJUNZrQF2+ofiFM/xL/VNHXRxxt
yepSjUwIPQsp91N6sf9z38qQwE16Xo/hj2AIeP4dZ7zkyPk6YEjhzHf5rgeczl0w
SBap415CF6BwH5d+2qhSeMj9HuiRVlHAM3yBjgsUU+Tf4UPlKIEsXaYsGHwsqu5i
AmyfB8DlGz1b5IeSv5NA+/r2S2SjewanUDvxeecsc7/aeB9uzNNzoU9F+CgDyPcB
+tBej0fJn6egHKMNFsNHfPQ3HHDqZ9mdi4EOBgswSH4WMB3e6TqJsfJJ1nbZCbWy
3a6RswnPbd9HGt/4paHLIkJFXNbLpZuvYQW9cwIDAQABAoIBAH7xzbeJkYg7ML5Y
Jy5bKyycN9lBtLP3qsipJD2FIUW9L+26K3mbG/F/xIpo0nkUvnqBl5pit3e1ASpu
YvP3J6u/TgMMwh6eglXTpsJbGPHbehU4JI/S683CxJETc04aAZ6ShEVrhl9iww2X
cFHodhwO4Ty2n0gluNFM+9Q5xUk4Doj7TygcpJPpMzEBonUHo/9vptt/IcpqBMDU
iGGra609dCVfIv/lBlByCRz/IgMLLdNqrpe0VSMdRruGzK7aG6JbzDTo4uGiNO3q
YcyzaW/wR28EkXy/XcMqjU26AmLJ83VX8l7SOLY/WZk9Uc+gB+9IdwObAybBjrMC
3TeRtoECgYEAwLBvijLzVcYqydieOeu0UI9uoEcnGB/96U3LMde24RK+OUMDLCXv
bqhMkmQGwyUfk8LrQNETr1xK8V+HyDCylr++QcZnSgZ2LWYJKGLs2ujT7N4KQSqp
uhvVoQSUoP5J41MHLM6+89Iz53vCUlfcsDvn3/8zEE7PyoUmGFXLCJMCgYEAz4HV
yLtWWjMheiZ2tOZelN3RG0Pik+12KxiR0W3Z7FNQqR/6F1GtjaLH1Mbv/O+iCQvD
QAqW20h4A+8MW8+5UKrvsLWmvFcYr+BWqeUk2h5VDesGPeIk6wfkYf2aBfGZHUfR
dxQ10P5L5U8nd3t1+hsxdB6AzMEvPlCeRHk546ECgYBXrPBTtbM7CBxYE5SLTlCR
h3ISw81qEMR778XRPBIef2TGsVM0N16mvzV4NsNM8AtaNIrOx1Npq1j+UzV5RY89
QKnVS+2bpS0IozDvi3Oyd9ZWJQINfNgVsqyVw3vNdWcxZIoTPU9tqeusHIfi58+m
8Nsk9P3LIdEymTsoP4FOuQKBgCSVPT1wWZ75WLOSSGdIHfCc0pq98xolSSn74OlN
NphFb/kBHDQ0QCayRgyrLfAnxydVHY0S0NnEAvSelk0xZ/hiynMa81RM/pszL9Qw
A7k4k8IqZyVN0zhkYc0sypS1rUrOOI2H0J0R2AuLUufrqjb3yFYycn6mqE+SIvTr
cltBAoGBAK7x6WWWj/dzM+ivMaP4v2YsxYSPPeMLxRM6YHw8Ov8cGlz54PBuRBGm
jde230ENBVWeegZDSwuqSa0CgTS3OaCJzPNkCl51BggLcFmG8amlmggLjwIywOTZ
XpXRWk9F4IFu+EooLd9miwv3JFfyV8p0Z4Kr3GINTypBD7A85YIV
-----END RSA PRIVATE KEY-----
`

const public = `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnDBkAtd9b/mpIgWLPmxC
XHJUNZrQF2+ofiFM/xL/VNHXRxxtyepSjUwIPQsp91N6sf9z38qQwE16Xo/hj2AI
eP4dZ7zkyPk6YEjhzHf5rgeczl0wSBap415CF6BwH5d+2qhSeMj9HuiRVlHAM3yB
jgsUU+Tf4UPlKIEsXaYsGHwsqu5iAmyfB8DlGz1b5IeSv5NA+/r2S2SjewanUDvx
eecsc7/aeB9uzNNzoU9F+CgDyPcB+tBej0fJn6egHKMNFsNHfPQ3HHDqZ9mdi4EO
BgswSH4WMB3e6TqJsfJJ1nbZCbWy3a6RswnPbd9HGt/4paHLIkJFXNbLpZuvYQW9
cwIDAQAB
-----END PUBLIC KEY-----
`

// JWKSet JSON Web Key Set
type JWKSet struct {
	Keys []JWK `json:"keys"`
}

// JWK JSON Web Key
type JWK struct {
	Kty     string   `json:"kty"`
	Use     string   `json:"use,omitempty"`
	KeyOps  []string `json:"key_ops,omitempty"`
	Alg     string   `json:"alg,omitempty"`
	Kid     string   `json:"kid"`
	X5u     string   `json:"x5u,omitempty"`
	X5c     []string `json:"x5c,omitempty"`
	X5t     string   `json:"x5t,omitempty"`
	X5tS256 string   `json:"x5t#S256,omitempty"`
	N       string   `json:"n,omitempty"` // RSA modulus
	E       string   `json:"e,omitempty"` // RSA public exponent
}

var (
	rsaPrivateKey *rsa.PrivateKey
	rsaPublicKey  *rsa.PublicKey
	jwkSet        *JWKSet
)

// OAuthTokenRequest OAuth 2.0令牌请求结构体
type OAuthTokenRequest struct {
	GrantType          string `json:"grant_type" binding:"required"`
	Code               string `json:"code,omitempty"`
	RedirectURI        string `json:"redirect_uri,omitempty"`
	ClientID           string `json:"client_id,omitempty"`
	ClientSecret       string `json:"client_secret,omitempty"`
	RefreshToken       string `json:"refresh_token,omitempty"`
	Username           string `json:"username,omitempty"`
	Password           string `json:"password,omitempty"`
	CodeVerifier       string `json:"code_verifier,omitempty"`
	State              string `json:"state,omitempty"`
	AppID              string `json:"app_id,omitempty"`
	InternalAuth       string `json:"internal_auth,omitempty"`
	DoubleVerification string `json:"double_verification,omitempty"`
}

// 生成JWK Set
func generateJWKSet() {
	kid := uuid.New().String()
	jwkSet = &JWKSet{
		Keys: []JWK{
			{
				Kty: "RSA",
				Use: "sig",
				Alg: "RS256",
				Kid: kid,
				N:   base64.RawURLEncoding.EncodeToString(rsaPublicKey.N.Bytes()),
				E:   base64.RawURLEncoding.EncodeToString(big.NewInt(int64(rsaPublicKey.E)).Bytes()),
			},
		},
	}

}

// 初始化RSA密钥对
func initRSAKeys() {
	if rsaPrivateKey != nil && rsaPublicKey != nil {
		return
	}
	// os.Getenv("RSA_PRIVATE_KEY")
	// 尝试从环境变量加载私钥
	privateKeyPEM := private
	if privateKeyPEM != "" {
		block, _ := pem.Decode([]byte(privateKeyPEM))
		if block != nil && block.Type == "RSA PRIVATE KEY" {
			var err error
			rsaPrivateKey, err = x509.ParsePKCS1PrivateKey(block.Bytes)
			if err == nil {
				rsaPublicKey = &rsaPrivateKey.PublicKey
				generateJWKSet()
				fmt.Println("🔐 RSA密钥对从环境变量加载成功")
				return
			} else {
				fmt.Printf("❌ 从环境变量解析RSA私钥失败: %v\n", err)
			}
		} else {
			log.Println("不符合规则")
		}
	}

}

// 验证访问令牌
func validateAccessToken(tokenString string) (jwt.MapClaims, error) {
	// 初始化RSA密钥
	initRSAKeys()

	// 解析并验证令牌
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// 验证签名方法
		switch token.Method {
		case jwt.SigningMethodRS256:
			// 确保RSA公钥已初始化
			if rsaPublicKey == nil {
				return nil, jwt.ErrSignatureInvalid
			}
			return rsaPublicKey, nil
		case jwt.SigningMethodHS256:
			// 如果使用HS256，需要返回密钥字符串
			return []byte("your-secret-key"), nil
		default:
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %v", err)
	}

	if !token.Valid {
		return nil, jwt.ErrSignatureInvalid
	}

	// 提取声明
	if claims, ok := token.Claims.(jwt.MapClaims); ok {
		return claims, nil
	}

	return nil, jwt.ErrSignatureInvalid
}

// ProxyRequest 通用的请求转发函数
func ProxyRequest(targetURL string, method string, headers map[string]string, body []byte) (int, []byte, error) {
	// 创建请求
	req, err := http.NewRequest(method, targetURL, bytes.NewBuffer(body))
	if err != nil {
		return 0, nil, fmt.Errorf("failed to create request: %v", err)
	}

	// 设置请求头
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	// 执行请求
	client := &http.Client{}
	response, err := client.Do(req)
	if err != nil {
		return 0, nil, fmt.Errorf("failed to forward request: %v", err)
	}
	defer response.Body.Close()

	// 读取响应
	bodyBytes, err := io.ReadAll(response.Body)
	if err != nil {
		return response.StatusCode, nil, fmt.Errorf("failed to read response: %v", err)
	}

	return response.StatusCode, bodyBytes, nil
}

// ProxyHandler 通用的转发处理函数
func ProxyHandler(targetURL string, requireAuth bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 如果需要认证，检查 Authorization header
		if requireAuth {
			authHeader := c.GetHeader("Authorization")
			if authHeader == "" {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error":             "invalid_token",
					"error_description": "Missing or invalid access token",
				})
				return
			}
		}

		// 复制请求头
		headers := make(map[string]string)
		for key, values := range c.Request.Header {
			if len(values) > 0 {
				headers[key] = values[0]
			}
		}

		// 读取请求体
		var body []byte
		if c.Request.Body != nil {
			body, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(body))
		}

		// 转发请求
		statusCode, responseBody, err := ProxyRequest(targetURL, c.Request.Method, headers, body)
		if err != nil {
			log.Printf("Proxy error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":             "server_error",
				"error_description": err.Error(),
			})
			return
		}

		log.Printf("Proxy response:: %d %s", statusCode, string(responseBody))

		// 解析并返回响应
		var responseBodyMap map[string]interface{}
		if err := json.Unmarshal(responseBody, &responseBodyMap); err != nil {
			// 如果解析失败，直接返回原始响应
			c.Data(statusCode, "application/json", responseBody)
			return
		}

		c.JSON(statusCode, responseBodyMap)
	}
}

// CORS中间件
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, X-Genres-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
func middlewareAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.GetHeader("Authorization")
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}
	}
}

func SetupRoutes() {
	r := gin.Default()
	r.Use(CORS())
	// r.Use(middlewareAuth())

	auth := r.Group("/api/v1/auth")
	{

		// 获取认证接口
		auth.GET("/oauth/:provider/url", func(c *gin.Context) {
			providerName := c.Param("provider")
			log.Println("providerName:: ", providerName)
			// 转发到认证端点
			uri := GlobalAuthConfig["ssoServerUrl"].(string) + GlobalAuthConfig["authorize"].(string)
			query := c.Request.URL.Query()
			uri += "?" + query.Encode()
			log.Println("uri:: ", uri)

			c.JSON(http.StatusOK, gin.H{
				"code":    200,
				"message": "OAuth URL generated",
				"data": gin.H{
					"auth_url": uri,
				},
			})
		})

		// 用户信息端点 - 使用代理转发，需要认证
		userInfoURI := GlobalAuthConfig["ssoServerUrl"].(string) + GlobalAuthConfig["userInfoUrl"].(string)
		logoutURI := GlobalAuthConfig["ssoServerUrl"].(string) + GlobalAuthConfig["logoutUrl"].(string)
		auth.GET("/oauth/userinfo", ProxyHandler(userInfoURI, true))
		auth.GET("/oauth/logout", func(c *gin.Context) {
			logoutParams := map[string]string{
				"id_token_hint":            c.Query("id_token_hint"),
				"post_logout_redirect_uri": c.Query("post_logout_redirect_uri"),
				"state":                    c.Query("state"),
			}

			// Build query string manually
			params := url.Values{}
			for key, value := range logoutParams {
				if value != "" {
					params.Add(key, value)
				}
			}

			c.Redirect(http.StatusFound, logoutURI+"?"+params.Encode())
		})

		// Token端点 - 使用代理转发，并处理client_secret
		auth.POST("/oauth/token", func(c *gin.Context) {
			var req OAuthTokenRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error":             "invalid_request",
					"error_description": "Request body must be valid JSON",
				})
				return
			}
			// 自动注入client_secret
			req.ClientSecret = GlobalAuthConfig["clientSecret"].(string)

			log.Println("token request:: ", req)

			// 转发到unit-auth的token端点
			tokenURI := GlobalAuthConfig["ssoServerUrl"].(string) + GlobalAuthConfig["tokenEndpoint"].(string)

			// 使用ProxyHandler进行转发
			jsonData, _ := json.Marshal(req)
			headers := map[string]string{
				"Content-Type": "application/json",
			}

			statusCode, responseBody, err := ProxyRequest(tokenURI, "POST", headers, jsonData)
			if err != nil {
				log.Printf("Token proxy error: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"error":             "server_error",
					"error_description": err.Error(),
				})
				return
			}

			log.Printf("Token response:: %d %s", statusCode, string(responseBody))

			// 解析并返回响应
			var responseBodyMap map[string]interface{}
			if err := json.Unmarshal(responseBody, &responseBodyMap); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error":             "server_error",
					"error_description": "Failed to unmarshal response",
				})
				return
			}

			c.JSON(statusCode, responseBodyMap)
		})
	}

	r.Run(":5555")
}

func main() {
	// tokenString := "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBfaWQiOiJkZWZhdWx0IiwiYXVkIjoiOGMxZGQ2NWQtN2QyYS00YmE0LWFmZjEtNjEwOTYwYTI5NWU3IiwiZXhwIjoxNzYwNTEwNTc3LCJpYXQiOjE3NjA1MDY5NzcsImlzcyI6Ind3dy55YW5icmlkZ2UuY29tIiwianRpIjoiNGNiNzdmZDgtMjk4NC00OTc0LTliMzctZWMxMjE2Y2UwY2MzIiwibGlkIjoiIiwibG9jYWxfdXNlcl9pZCI6IiIsInJvbGUiOiJ1c2VyIiwic3ViIjoiMjAyYjMzODktZDQwZC00NjM5LWE3ZTctZDZmMzk4OWZlNWI2In0.kVb2lk3w7jBP5XktyxXZWhvXL-3urehz_nrGbOZVTMdZVan0lkpw1JAx0ICg8fjZTAIPZOgXjyjIT32op6gZ96a2F3wUwN-mCgYA-tVB_5coqM8deH-nl3N7sasAr64I5D5fcpmzrj1yT0weeLk3kYDSfJly0-X81knpZwUHBd51ENqOg8ZOhspyghd4281yjg09PAGwAva6FDRHSgwt9m94QXBJLitA-cKcpDnwxjNWNkii4saLWUvp6Zhr1O5TKXKS5x5807hzqULUF_T8YkNheF4-IWJXXVq0NxldONjIEhO9D9z5UuaQybcNBy0JwbX-TwbQ2HMbrHfDt4R2Mw"
	// refreshToken := "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiI4YzFkZDY1ZC03ZDJhLTRiYTQtYWZmMS02MTA5NjBhMjk1ZTciLCJleHAiOjE3NjE2NDEzNzEsImlhdCI6MTc2MTU1NDk3MSwiaXNzIjoid3d3LnlhbmJyaWRnZS5jb20iLCJqdGkiOiJkNmQ4YWMyMi1jMGFlLTQ5ZTgtYTI4My05ZDMxZGE0M2I4NDQiLCJzdWIiOiIyMDJiMzM4OS1kNDBkLTQ2MzktYTdlNy1kNmYzOTg5ZmU1YjYifQ.i-NLW_A5-V2HVDMy_Jd1I9iBz5ZUVDtNm4WrUAQ6x0YhvjysfLsWkEkKHp_SIVQBO0XfYXnH6WmkoR_yU3oe5J8rQpHOYsL4F_OSwqBxhBhZcaaaTdlsOKyQIndGiBMJch4l6_e793dUiFQfy-KM9nW2gnP72tzJPs285EZts_a1JvvFFtjXkEhifm8SJNUiHewyWIhd8vUkpjoSOIeFFu1iJvtTgsMzwb9dBY5W3XV_2SQ_1kw64SW5cLqvYpUn266F4cDA3e5i4-qs-PZssth37pobrzWfG5FvXJl2aFUAeDXCqVegQzeR1eiz3Y0L1IJ9aZAdwFI0Ug6mDq8zHw"
	// claims, err := validateAccessToken(refreshToken)
	// if err != nil {
	// 	log.Fatalf("failed to validate access token: %v", err)
	// }
	// prettyJSON, err := json.MarshalIndent(claims, "", "  ")
	// fmt.Printf("claims: %+v\n", string(prettyJSON))

	// fmt.Println(reflect.TypeOf(claims["exp"]), int64(claims["exp"].(float64)))
	// fmt.Println("过期时间:", time.Unix(int64(claims["exp"].(float64)), 0))
	// fmt.Println("颁发时间:", time.Unix(int64(claims["iat"].(float64)), 0))
	// fmt.Println("JWT ID:", claims["jti"])
	// fmt.Println("客户端ID:", claims["aud"])
	// fmt.Println("用户ID:", claims["sub"])
	SetupRoutes()
}
