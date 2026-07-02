package utils

import (
	"crypto/x509"
	"encoding/pem"
	"testing"
	"time"
	"unit-auth/config"

	"github.com/golang-jwt/jwt/v5"
)

func TestValidateEnhancedToken_RS256(t *testing.T) {
	config.AppConfig.JWTSecret = "test-secret"

	block, _ := pem.Decode([]byte(`
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
`))
	privateKey, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		t.Fatalf("parse private key: %v", err)
	}

	now := time.Now()
	claims := jwt.MapClaims{
		"sub":  "user-123",
		"role": "admin",
		"exp":  now.Add(time.Hour).Unix(),
		"iat":  now.Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	tokenString, err := token.SignedString(privateKey)
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}

	parsed, err := ValidateEnhancedToken(tokenString)
	if err != nil {
		t.Fatalf("validate RS256 token: %v", err)
	}
	if parsed.UserID != "user-123" {
		t.Fatalf("expected user-123, got %s", parsed.UserID)
	}
	if parsed.Role != "admin" {
		t.Fatalf("expected admin role, got %s", parsed.Role)
	}
}

func TestValidateEnhancedToken_HS256(t *testing.T) {
	config.AppConfig.JWTSecret = "test-secret"
	config.AppConfig.AccessTokenExpirationMinutes = 15
	tokenString, err := GenerateAccessToken("user-456", "a@b.com", "user")
	if err != nil {
		t.Fatalf("generate HS256 token: %v", err)
	}

	parsed, err := ValidateEnhancedToken(tokenString)
	if err != nil {
		t.Fatalf("validate HS256 token: %v", err)
	}
	if parsed.UserID != "user-456" {
		t.Fatalf("expected user-456, got %s", parsed.UserID)
	}
}
