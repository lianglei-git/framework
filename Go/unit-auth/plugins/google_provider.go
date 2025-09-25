package plugins

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
	"unit-auth/models"

	"gorm.io/gorm"
)

// GoogleProvider Google OAuth认证提供者
type GoogleProvider struct {
	db           *gorm.DB
	clientID     string
	clientSecret string
	redirectURI  string
	enabled      bool
}

// GoogleUserInfo Google用户信息
type GoogleUserInfo struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	Name          string `json:"name"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Picture       string `json:"picture"`
	VerifiedEmail bool   `json:"verified_email"`
}

// NewGoogleProvider 创建Google认证提供者
func NewGoogleProvider(db *gorm.DB, clientID, clientSecret, redirectURI string) *GoogleProvider {
	return &GoogleProvider{
		db:           db,
		clientID:     clientID,
		clientSecret: clientSecret,
		redirectURI:  redirectURI,
		enabled:      clientID != "" && clientSecret != "",
	}
}

func (gp *GoogleProvider) GetName() string {
	return "google"
}

func (gp *GoogleProvider) GetType() string {
	return "oauth"
}

func (gp *GoogleProvider) IsEnabled() bool {
	return gp.enabled
}

func (gp *GoogleProvider) Authenticate(ctx context.Context, credentials map[string]interface{}) (*models.User, error) {
	return nil, errors.New("google provider requires OAuth flow")
}

func (gp *GoogleProvider) GetAuthURL(ctx context.Context, state string) (string, error) {
	url := fmt.Sprintf(
		"https://accounts.google.com/o/oauth2/v2/auth?client_id=%s&redirect_uri=%s&response_type=code&scope=openid%%20email%%20profile&state=%s",
		gp.clientID,
		gp.redirectURI,
		state,
	)
	return url, nil
}

func (gp *GoogleProvider) HandleCallback(ctx context.Context, code string, state string) (*models.User, error) {
	// 交换授权码获取访问令牌
	tokenURL := "https://oauth2.googleapis.com/token"
	// data := fmt.Sprintf(
	// 	"client_id=%s&client_secret=%s&code=%s&grant_type=authorization_code&redirect_uri=%s",
	// 	gp.clientID,
	// 	gp.clientSecret,
	// 	code,
	// 	gp.redirectURI,
	// )

	resp, err := http.PostForm(tokenURL, map[string][]string{
		"client_id":     {gp.clientID},
		"client_secret": {gp.clientSecret},
		"code":          {code},
		"grant_type":    {"authorization_code"},
		"redirect_uri":  {gp.redirectURI},
	})
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var tokenResp map[string]interface{}
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, err
	}

	accessToken, ok := tokenResp["access_token"].(string)
	if !ok {
		return nil, errors.New("failed to get access token")
	}

	// 获取用户信息
	userInfo, err := gp.getUserInfo(accessToken)
	if err != nil {
		return nil, err
	}

	// 查找或创建用户
	var user models.User
	if err := gp.db.Where("google_id = ? OR email = ?", userInfo.ID, userInfo.Email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 创建新用户
			user = models.User{
				GoogleID:      &userInfo.ID,
				Email:         &userInfo.Email,
				Username:      userInfo.Email,
				Nickname:      userInfo.Name,
				EmailVerified: userInfo.VerifiedEmail,
				Role:          "user",
				Status:        "active",
			}

			// 设置头像到元数据
			meta := &models.UserMeta{
				Avatar: userInfo.Picture,
			}
			user.SetMeta(meta)
			if err := gp.db.Create(&user).Error; err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	} else {
		// 更新现有用户信息
		user.GoogleID = &userInfo.ID
		user.Nickname = userInfo.Name
		user.EmailVerified = userInfo.VerifiedEmail

		// 更新头像到元数据
		meta, _ := user.GetMeta()
		if meta == nil {
			meta = &models.UserMeta{}
		}
		meta.Avatar = userInfo.Picture
		user.SetMeta(meta)

		gp.db.Save(&user)
	}

	// 更新最后登录时间
	now := time.Now()
	gp.db.Model(&user).Update("last_login_at", &now)

	return &user, nil
}

func (gp *GoogleProvider) getUserInfo(accessToken string) (*GoogleUserInfo, error) {
	req, err := http.NewRequest("GET", "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var userInfo GoogleUserInfo
	if err := json.Unmarshal(body, &userInfo); err != nil {
		return nil, err
	}

	return &userInfo, nil
}

// HandleCallbackWithCodeVerifier 支持双重验证的回调处理
func (gp *GoogleProvider) HandleCallbackWithCodeVerifier(ctx context.Context, code string, state string, codeVerifier string) (*models.User, error) {
	// 交换授权码获取访问令牌
	tokenURL := "https://oauth2.googleapis.com/token"

	formData := map[string][]string{
		"client_id":     {gp.clientID},
		"client_secret": {gp.clientSecret},
		"code":          {code},
		"grant_type":    {"authorization_code"},
		"redirect_uri":  {gp.redirectURI},
	}

	// 如果有 code_verifier，添加双重验证参数
	if codeVerifier != "" {
		formData["code_verifier"] = []string{codeVerifier}
	}

	resp, err := http.PostForm(tokenURL, formData)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("google oauth error: %s", string(body))
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, err
	}

	// 获取用户信息
	userURL := "https://www.googleapis.com/oauth2/v2/userinfo"
	req, _ := http.NewRequest("GET", userURL, nil)
	req.Header.Set("Authorization", "Bearer "+tokenResp.AccessToken)

	client := &http.Client{}
	userResp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer userResp.Body.Close()

	if userResp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get google user info")
	}

	body, err = io.ReadAll(userResp.Body)
	if err != nil {
		return nil, err
	}

	var userInfo struct {
		ID    string `json:"id"`
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	if err := json.Unmarshal(body, &userInfo); err != nil {
		return nil, err
	}

	// 查找或创建用户
	var user models.User
	if err := gp.db.Where("google_id = ?", userInfo.ID).First(&user).Error; err == nil {
		return &user, nil
	}

	// 尝试用邮箱匹配
	if userInfo.Email != "" {
		if err := gp.db.Where("email = ?", userInfo.Email).First(&user).Error; err == nil {
			user.GoogleID = &userInfo.ID
			gp.db.Save(&user)
			return &user, nil
		}
	}

	// 创建新用户
	user = models.User{
		Email:    &userInfo.Email,
		Username: strings.Split(userInfo.Email, "@")[0], // 使用邮箱前缀作为用户名
		Nickname: userInfo.Name,
		Role:     "user",
		Status:   "active",
		GoogleID: &userInfo.ID,
	}

	if err := gp.db.Create(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}
