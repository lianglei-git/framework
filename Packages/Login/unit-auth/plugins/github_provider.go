package plugins

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
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

func (p *GitHubProvider) GetAuthURL(ctx *gin.Context, state string) (string, error) {
	if !p.IsEnabled() {
		return "", errors.New("github oauth not configured")
	}

	params := url.Values{}
	params.Set("client_id", p.ClientID)
	params.Set("scope", "read:user user:email")

	params.Set("redirect_uri", ctx.Query("redirect_uri"))
	params.Set("state", ctx.Query("state"))
	params.Set("response_type", "code")
	params.Set("code_challenge", ctx.Query("code_challenge"))
	params.Set("code_challenge_method", ctx.Query("code_challenge_method"))

	//

	return fmt.Sprintf("https://github.com/login/oauth/authorize?%s", params.Encode()), nil
}

func (p *GitHubProvider) HandleCallback(ctx context.Context, code string, state string) (*models.User, error) {
	if !p.IsEnabled() {
		return nil, errors.New("github oauth not configured")
	}

	// 1) 交换 access_token
	tokenResp, err := p.exchangeToken(ctx, state, code, "")
	if err != nil {
		return nil, err
	}

	// 2) 获取用户信息
	ghUser, ghEmail, err := p.fetchGitHubUser(tokenResp.AccessToken)
	if err != nil {
		return nil, err
	}
	idStr := strconv.FormatInt(ghUser.ID, 10)

	// 3) 用 github_id 或 email 查找/创建用户
	var user models.User
	if err := p.DB.Where("github_id = ?", idStr).First(&user).Error; err == nil {
		return &user, nil
	}

	// 若未绑定，尝试用邮箱匹配
	if ghEmail != "" {
		if err := p.DB.Where("email = ?", ghEmail).First(&user).Error; err == nil {
			user.GitHubID = ptr(idStr)
			p.DB.Save(&user)
			return &user, nil
		}
	}

	// 创建用户（统一注册 + 可选项目映射）
	emailPtr := (*string)(nil)
	if ghEmail != "" {
		emailPtr = &ghEmail
	}
	username := ghUser.Login

	// 尝试从 gin context 读取项目Key（若存在）
	ginCtx, _ := ctx.(*gin.Context)
	projectKey := ""
	if ginCtx != nil {
		if v, ok := ginCtx.Get("project_key"); ok {
			if s, ok2 := v.(string); ok2 {
				projectKey = s
			}
		}
	}

	created, err := services.RegisterUser(p.DB, nil, services.RegistrationOptions{
		Email:                emailPtr,
		Username:             username,
		Nickname:             ghUser.NameOrLogin(),
		Role:                 "user",
		Status:               "active",
		SendWelcome:          false,
		ProjectKey:           projectKey,
		GinContext:           ginCtx,
		StrictProjectMapping: projectKey != "",
	})
	if err != nil {
		return nil, err
	}

	created.GitHubID = ptr(idStr)
	p.DB.Save(created)
	return created, nil
}

// HandleCallbackWithCodeVerifier 支持双重验证的回调处理
func (p *GitHubProvider) HandleCallbackWithCodeVerifier(ctx context.Context, code string, state string, codeVerifier string) (*models.User, error) {
	if !p.IsEnabled() {
		return nil, errors.New("github oauth not configured")
	}

	// 1) 交换 access_token - 传递 codeVerifier
	tokenResp, err := p.exchangeToken(ctx, state, code, codeVerifier)
	if err != nil {
		return nil, err
	}

	// 2) 获取用户信息
	ghUser, ghEmail, err := p.fetchGitHubUser(tokenResp.AccessToken)
	if err != nil {
		return nil, err
	}
	idStr := strconv.FormatInt(ghUser.ID, 10)

	// 3) 用 github_id 或 email 查找/创建用户
	var user models.User
	if err := p.DB.Where("github_id = ?", idStr).First(&user).Error; err == nil {
		return &user, nil
	}

	// 若未绑定，尝试用邮箱匹配
	if ghEmail != "" {
		if err := p.DB.Where("email = ?", ghEmail).First(&user).Error; err == nil {
			user.GitHubID = ptr(idStr)
			p.DB.Save(&user)
			return &user, nil
		}
	}

	// 创建用户（统一注册 + 可选项目映射）
	emailPtr := (*string)(nil)
	if ghEmail != "" {
		emailPtr = &ghEmail
	}
	username := ghUser.Login

	// 尝试从 gin context 读取项目Key（若存在）
	ginCtx, _ := ctx.(*gin.Context)
	projectKey := ""
	if ginCtx != nil {
		if v, ok := ginCtx.Get("project_key"); ok {
			if s, ok2 := v.(string); ok2 {
				projectKey = s
			}
		}
	}

	created, err := services.RegisterUser(p.DB, nil, services.RegistrationOptions{
		Email:                emailPtr,
		Username:             username,
		Nickname:             ghUser.NameOrLogin(),
		Role:                 "user",
		Status:               "active",
		SendWelcome:          false,
		ProjectKey:           projectKey,
		GinContext:           ginCtx,
		StrictProjectMapping: projectKey != "",
	})
	if err != nil {
		return nil, err
	}

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

func (p *GitHubProvider) exchangeToken(c context.Context, state string, code string, codeVerifier string) (*githubTokenResp, error) {
	data := url.Values{}
	data.Set("client_id", p.ClientID)
	data.Set("client_secret", p.Secret)
	data.Set("state", state)

	// 如果有 code_verifier，添加双重验证参数
	if codeVerifier != "" {
		data.Set("code_verifier", codeVerifier)
		log.Printf("🔐 GitHub双重验证模式: code_verifier长度=%d", len(codeVerifier))
		log.Printf("🔐 code_verifier内容: %s", codeVerifier)
	} else {
		log.Println("🔐 GitHub标准模式: 无code_verifier")
	}

	data.Set("code", code)
	data.Set("grant_type", "authorization_code")
	redirectURI := p.Redirect
	if ginCtx, ok := c.(*gin.Context); ok {
		if v, exists := ginCtx.Get("oauth_redirect_uri"); exists {
			if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
				redirectURI = strings.TrimSpace(s)
			}
		}
		if fromForm := strings.TrimSpace(ginCtx.PostForm("redirect_uri")); fromForm != "" {
			redirectURI = fromForm
		} else if fromQuery := strings.TrimSpace(ginCtx.Query("redirect_uri")); fromQuery != "" {
			redirectURI = fromQuery
		}
	}
	data.Set("redirect_uri", redirectURI)

	log.Printf("🔐 GitHub exchangeToken完整请求参数:")
	log.Printf("   client_id: %s", p.ClientID)
	log.Printf("   client_secret: %s", p.Secret)
	log.Printf("   code: %s", code)
	log.Printf("   state: %s", state)
	log.Printf("   redirect_uri: %s", redirectURI)
	log.Printf("   has_code_verifier: %t", codeVerifier != "")
	if codeVerifier != "" {
		log.Printf("   code_verifier长度: %d", len(codeVerifier))
	}
	log.Printf("   完整请求体: %s", data.Encode())

	req, _ := http.NewRequest(http.MethodPost, "https://github.com/login/oauth/access_token", strings.NewReader(data.Encode()))
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := oauthOutboundClient.Do(req)
	if err != nil {
		log.Printf("❌ GitHub token exchange failed: %v", err)
		return nil, fmt.Errorf("github token exchange failed: %w", err)
	}
	defer resp.Body.Close()

	var tr githubTokenResp
	if err := json.NewDecoder(resp.Body).Decode(&tr); err != nil {
		return nil, err
	}
	log.Printf("🔐 GitHub token exchange status=%d body=%+v", resp.StatusCode, tr)

	if tr.AccessToken == "" {
		return nil, errors.New("empty access token from GitHub")
	}
	return &tr, nil
}

func (p *GitHubProvider) fetchGitHubUser(token string) (githubUserResp, string, error) {
	// user profile
	req, _ := http.NewRequest(http.MethodGet, "https://api.github.com/user", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := oauthOutboundClient.Do(req)
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
	resp2, err := oauthOutboundClient.Do(req2)
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
