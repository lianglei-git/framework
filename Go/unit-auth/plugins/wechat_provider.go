package plugins

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
	"unit-auth/models"

	"gorm.io/gorm"
)

// WeChatProvider 微信OAuth认证提供者
type WeChatProvider struct {
	db          *gorm.DB
	appID       string
	appSecret   string
	redirectURI string
	enabled     bool
}

// WeChatAccessToken 微信访问令牌响应
type WeChatAccessToken struct {
	AccessToken  string `json:"access_token"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	OpenID       string `json:"openid"`
	Scope        string `json:"scope"`
	UnionID      string `json:"unionid"`
}

// WeChatUserInfo 微信用户信息
type WeChatUserInfo struct {
	OpenID     string   `json:"openid"`
	Nickname   string   `json:"nickname"`
	Sex        int      `json:"sex"`
	Province   string   `json:"province"`
	City       string   `json:"city"`
	Country    string   `json:"country"`
	HeadImgURL string   `json:"headimgurl"`
	Privilege  []string `json:"privilege"`
	UnionID    string   `json:"unionid"`
}

// WeChatQRCode 微信二维码响应
type WeChatQRCode struct {
	AppID       string `json:"appid"`
	Scope       string `json:"scope"`
	State       string `json:"state"`
	RedirectURI string `json:"redirect_uri"`
}

// NewWeChatProvider 创建微信认证提供者
func NewWeChatProvider(db *gorm.DB, appID, appSecret, redirectURI string) *WeChatProvider {
	return &WeChatProvider{
		db:          db,
		appID:       appID,
		appSecret:   appSecret,
		redirectURI: redirectURI,
		enabled:     appID != "" && appSecret != "",
	}
}

func (wp *WeChatProvider) GetName() string {
	return "wechat"
}

func (wp *WeChatProvider) GetType() string {
	return "oauth"
}

func (wp *WeChatProvider) IsEnabled() bool {
	return wp.enabled
}

func (wp *WeChatProvider) Authenticate(ctx context.Context, credentials map[string]interface{}) (*models.User, error) {
	return nil, errors.New("wechat provider requires OAuth flow")
}

func (wp *WeChatProvider) GetAuthURL(ctx context.Context, state string) (string, error) {
	// 微信OAuth2.0授权URL
	authURL := "https://open.weixin.qq.com/connect/qrconnect"
	params := url.Values{}
	params.Set("appid", wp.appID)
	params.Set("redirect_uri", wp.redirectURI)
	params.Set("response_type", "code")
	params.Set("scope", "snsapi_login")
	params.Set("state", state)

	return fmt.Sprintf("%s?%s#wechat_redirect", authURL, params.Encode()), nil
}

func (wp *WeChatProvider) HandleCallback(ctx context.Context, code string, state string) (*models.User, error) {
	// 1. 使用授权码获取访问令牌
	accessToken, err := wp.getAccessToken(code)
	if err != nil {
		return nil, fmt.Errorf("failed to get access token: %v", err)
	}

	// 2. 使用访问令牌获取用户信息
	userInfo, err := wp.getUserInfo(accessToken.AccessToken, accessToken.OpenID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %v", err)
	}

	// 3. 查找或创建用户
	var user models.User
	if err := wp.db.Where("wechat_id = ?", userInfo.OpenID).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 创建新用户
			user = models.User{
				WeChatID:      &userInfo.OpenID,
				Username:      userInfo.OpenID,
				Nickname:      userInfo.Nickname,
				EmailVerified: false,
				PhoneVerified: false,
				Role:          "user",
				Status:        "active",
			}

			// 设置头像到元数据
			meta := &models.UserMeta{
				Avatar: userInfo.HeadImgURL,
			}
			user.SetMeta(meta)
			if err := wp.db.Create(&user).Error; err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	} else {
		// 更新现有用户信息
		user.WeChatID = &userInfo.OpenID
		user.Nickname = userInfo.Nickname

		// 更新头像到元数据
		meta, _ := user.GetMeta()
		if meta == nil {
			meta = &models.UserMeta{}
		}
		meta.Avatar = userInfo.HeadImgURL
		user.SetMeta(meta)

		wp.db.Save(&user)
	}

	// 4. 更新最后登录时间
	now := time.Now()
	wp.db.Model(&user).Update("last_login_at", &now)

	return &user, nil
}

// getAccessToken 获取微信访问令牌
func (wp *WeChatProvider) getAccessToken(code string) (*WeChatAccessToken, error) {
	tokenURL := "https://api.weixin.qq.com/sns/oauth2/access_token"
	params := url.Values{}
	params.Set("appid", wp.appID)
	params.Set("secret", wp.appSecret)
	params.Set("code", code)
	params.Set("grant_type", "authorization_code")

	resp, err := http.PostForm(tokenURL, params)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var tokenResp WeChatAccessToken
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, err
	}

	if tokenResp.AccessToken == "" {
		// 检查是否有错误信息
		var errorResp map[string]interface{}
		if err := json.Unmarshal(body, &errorResp); err == nil {
			if errcode, ok := errorResp["errcode"].(float64); ok {
				if errmsg, ok := errorResp["errmsg"].(string); ok {
					return nil, fmt.Errorf("wechat API error: %d - %s", int(errcode), errmsg)
				}
			}
		}
		return nil, errors.New("failed to get access token from wechat")
	}

	return &tokenResp, nil
}

// getUserInfo 获取微信用户信息
func (wp *WeChatProvider) getUserInfo(accessToken, openID string) (*WeChatUserInfo, error) {
	userInfoURL := "https://api.weixin.qq.com/sns/userinfo"
	params := url.Values{}
	params.Set("access_token", accessToken)
	params.Set("openid", openID)
	params.Set("lang", "zh_CN")

	resp, err := http.Get(userInfoURL + "?" + params.Encode())
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var userInfo WeChatUserInfo
	if err := json.Unmarshal(body, &userInfo); err != nil {
		return nil, err
	}

	if userInfo.OpenID == "" {
		// 检查是否有错误信息
		var errorResp map[string]interface{}
		if err := json.Unmarshal(body, &errorResp); err == nil {
			if errcode, ok := errorResp["errcode"].(float64); ok {
				if errmsg, ok := errorResp["errmsg"].(string); ok {
					return nil, fmt.Errorf("wechat API error: %d - %s", int(errcode), errmsg)
				}
			}
		}
		return nil, errors.New("failed to get user info from wechat")
	}

	return &userInfo, nil
}

// RefreshAccessToken 刷新访问令牌
func (wp *WeChatProvider) RefreshAccessToken(refreshToken string) (*WeChatAccessToken, error) {
	refreshURL := "https://api.weixin.qq.com/sns/oauth2/refresh_token"
	params := url.Values{}
	params.Set("appid", wp.appID)
	params.Set("grant_type", "refresh_token")
	params.Set("refresh_token", refreshToken)

	resp, err := http.PostForm(refreshURL, params)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var tokenResp WeChatAccessToken
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, err
	}

	if tokenResp.AccessToken == "" {
		return nil, errors.New("failed to refresh access token")
	}

	return &tokenResp, nil
}

// CheckAccessToken 检查访问令牌是否有效
func (wp *WeChatProvider) CheckAccessToken(accessToken, openID string) (bool, error) {
	checkURL := "https://api.weixin.qq.com/sns/auth"
	params := url.Values{}
	params.Set("access_token", accessToken)
	params.Set("openid", openID)

	resp, err := http.Get(checkURL + "?" + params.Encode())
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return false, err
	}

	if errcode, ok := result["errcode"].(float64); ok {
		return errcode == 0, nil
	}

	return false, errors.New("invalid response from wechat API")
}

// HandleCallbackWithCodeVerifier 支持双重验证的回调处理
func (wp *WeChatProvider) HandleCallbackWithCodeVerifier(ctx context.Context, code string, state string, codeVerifier string) (*models.User, error) {
	// 微信暂时不支持PKCE，所以忽略codeVerifier参数
	tokenResp, err := wp.getAccessToken(code)
	if err != nil {
		return nil, err
	}

	userInfo, err := wp.getUserInfo(tokenResp.AccessToken, tokenResp.OpenID)
	if err != nil {
		return nil, err
	}

	// 查找或创建用户
	var user models.User
	if err := wp.db.Where("wechat_id = ?", userInfo.OpenID).First(&user).Error; err == nil {
		return &user, nil
	}

	// 尝试用unionid匹配（如果存在的话）
	// 注意：User模型中没有WeChatUnionID字段，所以暂时只处理WeChatID
	if userInfo.UnionID != "" {
		// 可以考虑在User模型中添加WeChatUnionID字段来支持unionid匹配
		// 暂时跳过unionid匹配，直接创建用户
	}

	// 创建新用户
	user = models.User{
		Username: userInfo.OpenID, // 微信没有用户名，使用openid作为用户名
		Nickname: userInfo.Nickname,
		Role:     "user",
		Status:   "active",
		WeChatID: &userInfo.OpenID,
	}

	if err := wp.db.Create(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}
