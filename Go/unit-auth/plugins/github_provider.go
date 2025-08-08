package plugins

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"

	"gorm.io/gorm"

	"unit-auth/models"
	"unit-auth/services"
)

// GitHubProvider 实现基于 GitHub 的 OAuth 登录
type GitHubProvider struct {
	Name     string
	Type     string
	Enabled  bool
	ClientID string
	Secret   string
	Redirect string
	DB       *gorm.DB
}

func NewGitHubProvider(db *gorm.DB) *GitHubProvider {
	return &GitHubProvider{
		Name:     "github",
		Type:     "oauth",
		Enabled:  os.Getenv("GITHUB_OAUTH_ENABLED") != "false",
		ClientID: os.Getenv("GITHUB_CLIENT_ID"),
		Secret:   os.Getenv("GITHUB_CLIENT_SECRET"),
		Redirect: os.Getenv("GITHUB_REDIRECT_URI"),
		DB:       db,
	}
}

func (p *GitHubProvider) GetName() string { return p.Name }
func (p *GitHubProvider) GetType() string { return p.Type }
func (p *GitHubProvider) IsEnabled() bool {
	return p.Enabled && p.ClientID != "" && p.Secret != "" && p.Redirect != ""
}
func (p *GitHubProvider) Authenticate(ctx context.Context, credentials map[string]interface{}) (*models.User, error) {
	return nil, errors.New("github provider does not support direct Authenticate; use OAuth flow")
}

func (p *GitHubProvider) GetAuthURL(ctx context.Context, state string) (string, error) {
	if !p.IsEnabled() {
		return "", errors.New("github oauth not configured")
	}
	params := url.Values{}
	params.Set("client_id", p.ClientID)
	params.Set("redirect_uri", p.Redirect)
	params.Set("scope", "read:user user:email")
	params.Set("state", state)
	return fmt.Sprintf("https://github.com/login/oauth/authorize?%s", params.Encode()), nil
}

func (p *GitHubProvider) HandleCallback(ctx context.Context, code string, state string) (*models.User, error) {
	if !p.IsEnabled() {
		return nil, errors.New("github oauth not configured")
	}

	// 1) 交换 access_token
	tokenResp, err := p.exchangeToken(code)
	if err != nil {
		return nil, err
	}

	// 2) 获取用户信息
	ghUser, ghEmail, err := p.fetchGitHubUser(tokenResp.AccessToken)
	if err != nil {
		return nil, err
	}
	idStr := strconv.FormatInt(ghUser.ID, 10)

	fmt.Println("ghUser", ghUser)
	fmt.Println("ghEmail", ghEmail)
	fmt.Println("idStr", idStr)

	// 3) 用 github_id 或 email 查找/创建用户
	var user models.User
	if err := p.DB.Where("github_id = ?", idStr).First(&user).Error; err == nil {
		return &user, nil
	}

	// 若未绑定，尝试用邮箱匹配
	if ghEmail != "" {
		if err := p.DB.Where("email = ?", ghEmail).First(&user).Error; err == nil {
			// 绑定 GitHubID
			user.GitHubID = ptr(idStr)
			p.DB.Save(&user)
			return &user, nil
		}
	}

	// 创建用户（统一注册）
	emailPtr := (*string)(nil)
	if ghEmail != "" {
		emailPtr = &ghEmail
	}
	username := ghUser.Login
	created, err := services.RegisterUser(p.DB, nil, services.RegistrationOptions{
		Email:       emailPtr,
		Username:    username,
		Nickname:    ghUser.NameOrLogin(),
		Role:        "user",
		Status:      "active",
		SendWelcome: false,
	})
	if err != nil {
		return nil, err
	}
	// 绑定 GitHubID
	created.GitHubID = ptr(idStr)
	p.DB.Save(created)
	return created, nil
}

// --- GitHub API helpers ---

type githubTokenResp struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	Scope       string `json:"scope"`
}

type githubUserResp struct {
	ID    int64  `json:"id"`
	Login string `json:"login"`
	Name  string `json:"name"`
}

func (g githubUserResp) NameOrLogin() string {
	if strings.TrimSpace(g.Name) != "" {
		return g.Name
	}
	return g.Login
}

func (p *GitHubProvider) exchangeToken(code string) (*githubTokenResp, error) {
	data := url.Values{}
	data.Set("client_id", p.ClientID)
	data.Set("client_secret", p.Secret)
	data.Set("code", code)
	data.Set("redirect_uri", p.Redirect)

	req, _ := http.NewRequest(http.MethodPost, "https://github.com/login/oauth/access_token", strings.NewReader(data.Encode()))
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var tr githubTokenResp
	if err := json.NewDecoder(resp.Body).Decode(&tr); err != nil {
		return nil, err
	}
	if tr.AccessToken == "" {
		return nil, errors.New("empty access token")
	}
	return &tr, nil
}

func (p *GitHubProvider) fetchGitHubUser(token string) (githubUserResp, string, error) {
	// user profile
	req, _ := http.NewRequest(http.MethodGet, "https://api.github.com/user", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return githubUserResp{}, "", err
	}
	defer resp.Body.Close()
	var gu githubUserResp
	if err := json.NewDecoder(resp.Body).Decode(&gu); err != nil {
		return githubUserResp{}, "", err
	}

	// primary email
	req2, _ := http.NewRequest(http.MethodGet, "https://api.github.com/user/emails", nil)
	req2.Header.Set("Authorization", "Bearer "+token)
	resp2, err := http.DefaultClient.Do(req2)
	if err != nil {
		return githubUserResp{}, "", err
	}
	defer resp2.Body.Close()
	var emails []struct {
		Email    string `json:"email"`
		Primary  bool   `json:"primary"`
		Verified bool   `json:"verified"`
	}
	_ = json.NewDecoder(resp2.Body).Decode(&emails)
	primary := ""
	for _, e := range emails {
		if e.Primary && e.Verified {
			primary = e.Email
			break
		}
	}
	return gu, primary, nil
}

func ptr[T any](v T) *T { return &v }
