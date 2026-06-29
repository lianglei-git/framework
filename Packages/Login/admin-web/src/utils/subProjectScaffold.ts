import JSZip from 'jszip'

export interface SubProjectScaffoldConfig {
  projectName: string
  displayName: string
  appId: string
  clientId: string
  clientSecret: string
  frontendPort: number
  bffPort: number
  redirectUri: string
  ssoServerUrl: string
  ssoHomeUrl: string
  unitAuthUrl: string
  allowedScopes: string[]
  grantTypes: string[]
  responseTypes: string[]
  autoRefresh: boolean
  autoApprove: boolean
  description: string
}

export interface SavedSubProject {
  id: string
  createdAt: string
  updatedAt: string
  config: SubProjectScaffoldConfig
}

const STORAGE_KEY = 'admin_subproject_scaffolds'
export const SCAFFOLD_NAV_LOAD_KEY = 'admin_scaffold_load_id'

function parseJsonArray(str: string): string[] {
  if (!str) return []
  try {
    return JSON.parse(str) as string[]
  } catch {
    return str.split(',').map((s) => s.trim()).filter(Boolean)
  }
}

/** 与 a/b/c 示例子项目端口规律一致：5173→5555，5175→5557 */
export function inferBffPort(frontendPort: number): number {
  if (frontendPort >= 5173 && frontendPort <= 5199) {
    return frontendPort + 382
  }
  return frontendPort + 1000
}

export function parseRedirectPort(redirectUri: string, fallback = 5176): number {
  try {
    const port = new URL(redirectUri).port
    if (port) return parseInt(port, 10)
  } catch {
    // ignore
  }
  return fallback
}

export function slugProjectName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
  return slug || 'my_sso'
}

/** 从 SSO 客户端记录生成脚手架初始配置（secret 需另行填入） */
export function scaffoldConfigFromSSOClient(client: {
  id: string
  name: string
  description?: string
  redirect_uris: string
  grant_types: string
  response_types: string
  scope: string
  auto_approve: boolean
}, extra?: Partial<SubProjectScaffoldConfig> & { clientSecret?: string }): SubProjectScaffoldConfig {
  const uris = parseJsonArray(client.redirect_uris)
  const redirectUri = uris[0] || 'http://localhost:5176'
  const frontendPort = parseRedirectPort(redirectUri)
  const projectName = slugProjectName(client.name)
  return syncDerivedUrls(
    defaultScaffoldConfig({
      projectName,
      displayName: client.name,
      appId: `sso_${projectName}`,
      clientId: client.id,
      clientSecret: extra?.clientSecret ?? '',
      frontendPort,
      bffPort: inferBffPort(frontendPort),
      redirectUri,
      description: client.description || '',
      allowedScopes: parseJsonArray(client.scope).length
        ? parseJsonArray(client.scope)
        : ['openid', 'profile', 'email'],
      grantTypes: parseJsonArray(client.grant_types).length
        ? parseJsonArray(client.grant_types)
        : ['authorization_code', 'refresh_token'],
      responseTypes: parseJsonArray(client.response_types).length
        ? parseJsonArray(client.response_types)
        : ['code'],
      autoApprove: client.auto_approve,
      ...extra,
    }),
  )
}

export function setPendingScaffoldLoad(recordId: string): void {
  sessionStorage.setItem(SCAFFOLD_NAV_LOAD_KEY, recordId)
}

export function consumePendingScaffoldLoad(): string | null {
  const id = sessionStorage.getItem(SCAFFOLD_NAV_LOAD_KEY)
  if (id) sessionStorage.removeItem(SCAFFOLD_NAV_LOAD_KEY)
  return id
}

export function defaultScaffoldConfig(partial?: Partial<SubProjectScaffoldConfig>): SubProjectScaffoldConfig {
  const frontendPort = partial?.frontendPort ?? 5176
  const bffPort = partial?.bffPort ?? 5558
  const redirectUri = partial?.redirectUri ?? `http://localhost:${frontendPort}`
  return {
    projectName: partial?.projectName ?? 'my_sso',
    displayName: partial?.displayName ?? 'My SSO App',
    appId: partial?.appId ?? 'sso_test_my',
    clientId: partial?.clientId ?? '',
    clientSecret: partial?.clientSecret ?? '',
    frontendPort,
    bffPort,
    redirectUri,
    ssoServerUrl: partial?.ssoServerUrl ?? `http://localhost:${bffPort}`,
    ssoHomeUrl: partial?.ssoHomeUrl ?? 'http://localhost:3033',
    unitAuthUrl: partial?.unitAuthUrl ?? 'http://localhost:8080',
    allowedScopes: partial?.allowedScopes ?? ['openid', 'profile', 'email'],
    grantTypes: partial?.grantTypes ?? ['authorization_code', 'refresh_token'],
    responseTypes: partial?.responseTypes ?? ['code'],
    autoRefresh: partial?.autoRefresh ?? false,
    autoApprove: partial?.autoApprove ?? false,
    description: partial?.description ?? '',
  }
}

export function syncDerivedUrls(config: SubProjectScaffoldConfig): SubProjectScaffoldConfig {
  return {
    ...config,
    redirectUri: `http://localhost:${config.frontendPort}`,
    ssoServerUrl: `http://localhost:${config.bffPort}`,
  }
}

export function listSavedSubProjects(): SavedSubProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedSubProject[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveSubProject(config: SubProjectScaffoldConfig, id?: string): SavedSubProject {
  const list = listSavedSubProjects()
  const now = new Date().toISOString()
  const normalized = syncDerivedUrls(config)
  if (id) {
    const idx = list.findIndex((item) => item.id === id)
    if (idx >= 0) {
      list[idx] = { ...list[idx], config: normalized, updatedAt: now }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
      return list[idx]
    }
  }
  const record: SavedSubProject = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    config: normalized,
  }
  list.unshift(record)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  return record
}

export function deleteSavedSubProject(id: string): void {
  const list = listSavedSubProjects().filter((item) => item.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function buildFrontendConfigJson(config: SubProjectScaffoldConfig): string {
  const c = syncDerivedUrls(config)
  return JSON.stringify(
    {
      id: c.appId,
      name: c.displayName,
      ssoServerUrl: c.ssoServerUrl,
      ssoHomeUrl: c.ssoHomeUrl,
      clientId: c.clientId,
      redirectUri: c.redirectUri,
      redirectUris: [c.redirectUri],
      allowedScopes: c.allowedScopes,
      tokenEndpoint: '/api/v1/auth/oauth/token',
      authorizationUrl: '/api/v1/auth/oauth/authorize',
      tokenUrl: '/api/v1/auth/oauth/token',
      userInfoUrl: '/api/v1/auth/oauth/userinfo',
      logoutUrl: '/api/v1/auth/oauth/logout',
      autoRefresh: c.autoRefresh,
    },
    null,
    2,
  )
}

export function buildBackendConfigJson(config: SubProjectScaffoldConfig): string {
  const c = syncDerivedUrls(config)
  return JSON.stringify(
    {
      port: String(c.bffPort),
      unit_auth_url: c.unitAuthUrl,
      client_id: c.clientId,
      client_secret: c.clientSecret,
      redirect_uri: c.redirectUri,
      app_id: c.appId,
    },
    null,
    2,
  )
}

export function buildEnvExample(config: SubProjectScaffoldConfig): string {
  const c = syncDerivedUrls(config)
  return [
    `VITE_SSO_SERVER_URL=${c.ssoServerUrl}`,
    `VITE_SSO_HOME_URL=${c.ssoHomeUrl}`,
    `VITE_SSO_CLIENT_ID=${c.clientId}`,
    `VITE_SSO_REDIRECT_URI=${c.redirectUri}`,
    '',
  ].join('\n')
}

function moduleName(projectName: string): string {
  return `${projectName.replace(/_/g, '-')}-server`
}

function generateServerMainGo(config: SubProjectScaffoldConfig): string {
  const c = syncDerivedUrls(config)
  const service = c.projectName
  return `// ${c.displayName} — 子项目 BFF，client_secret 仅保存在服务端。
package main

import (
	"encoding/json"
	"flag"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"unit-auth/sdk"
)

var startTime = time.Now()

// requireAuth 校验 Bearer token，通过时将 IntrospectResponse 注入 context key "claims"
func requireAuth(auth *sdk.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := strings.TrimSpace(strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer "))
		if token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid_token", "error_description": "Authorization header missing",
			})
			return
		}
		info, err := auth.Introspect(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid_token", "error_description": err.Error(),
			})
			return
		}
		if !info.Active {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid_token", "error_description": "token inactive or expired",
			})
			return
		}
		c.Set("claims", info)
		c.Next()
	}
}

type ServerConfig struct {
	Port         string \`json:"port"\`
	UnitAuthURL  string \`json:"unit_auth_url"\`
	ClientID     string \`json:"client_id"\`
	ClientSecret string \`json:"client_secret"\`
	RedirectURI  string \`json:"redirect_uri"\`
	AppID        string \`json:"app_id"\`
}

func loadConfig() ServerConfig {
	cfg := ServerConfig{
		Port:         envOr("PORT", "${c.bffPort}"),
		UnitAuthURL:  envOr("UNIT_AUTH_URL", "${c.unitAuthUrl}"),
		ClientID:     os.Getenv("CLIENT_ID"),
		ClientSecret: os.Getenv("CLIENT_SECRET"),
		RedirectURI:  envOr("REDIRECT_URI", "${c.redirectUri}"),
		AppID:        envOr("APP_ID", "${c.appId}"),
	}

	configFile := flag.String("config", "config.json", "JSON 配置文件路径")
	flag.Parse()

	if *configFile != "" {
		if raw, err := os.ReadFile(*configFile); err == nil {
			var fileCfg ServerConfig
			if err := json.Unmarshal(raw, &fileCfg); err != nil {
				log.Fatalf("parse config: %v", err)
			}
			if fileCfg.Port != "" { cfg.Port = fileCfg.Port }
			if fileCfg.UnitAuthURL != "" { cfg.UnitAuthURL = fileCfg.UnitAuthURL }
			if fileCfg.ClientID != "" { cfg.ClientID = fileCfg.ClientID }
			if fileCfg.ClientSecret != "" { cfg.ClientSecret = fileCfg.ClientSecret }
			if fileCfg.RedirectURI != "" { cfg.RedirectURI = fileCfg.RedirectURI }
			if fileCfg.AppID != "" { cfg.AppID = fileCfg.AppID }
		}
	}

	if cfg.ClientID == "" || cfg.ClientSecret == "" {
		log.Fatal("CLIENT_ID and CLIENT_SECRET are required (config.json or env)")
	}
	return cfg
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" { return v }
	return fallback
}

func cors() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, Accept")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func proxyGET(upstream, path string) (int, []byte, error) {
	target := strings.TrimRight(upstream, "/") + path
	resp, err := http.Get(target)
	if err != nil { return 0, nil, err }
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	return resp.StatusCode, body, err
}

func main() {
	cfg := loadConfig()
	auth := sdk.New(sdk.Config{
		BaseURL:      cfg.UnitAuthURL,
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		RedirectURI:  cfg.RedirectURI,
	})

	if err := auth.Health(); err != nil {
		log.Printf("warn: unit-auth not reachable yet: %v", err)
	}

	log.Printf("${service} server :%s app=%s client=%s upstream=%s",
		cfg.Port, cfg.AppID, cfg.ClientID, cfg.UnitAuthURL)

	r := gin.Default()
	r.Use(cors())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok", "service": "${service}",
			"app_id": cfg.AppID, "client_id": cfg.ClientID,
		})
	})

	api := r.Group("/api/v1/auth")
	{
		api.GET("/oauth/:provider/url", func(c *gin.Context) {
			q := c.Request.URL.Query()
			params := sdk.AuthorizeURLParams{
				ClientID:     firstNonEmpty(q.Get("client_id"), cfg.ClientID),
				RedirectURI:  firstNonEmpty(q.Get("redirect_uri"), cfg.RedirectURI),
				ResponseType: firstNonEmpty(q.Get("response_type"), "code"),
				Scope:        firstNonEmpty(q.Get("scope"), "openid profile email"),
				State:        q.Get("state"),
				AppID:        firstNonEmpty(q.Get("app_id"), cfg.AppID),
			}
			authURL := auth.BuildAuthorizeURL(params)
			if u, err := url.Parse(authURL); err == nil {
				merged := u.Query()
				for key, vals := range q {
					if len(vals) == 0 || merged.Get(key) != "" { continue }
					merged.Set(key, vals[0])
				}
				u.RawQuery = merged.Encode()
				authURL = u.String()
			}
			c.JSON(http.StatusOK, gin.H{"code": 200, "message": "OAuth URL generated", "data": gin.H{"auth_url": authURL}})
		})

		api.POST("/oauth/token", func(c *gin.Context) {
			var req map[string]interface{}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request"})
				return
			}
			req["client_id"] = cfg.ClientID
			req["client_secret"] = cfg.ClientSecret
			if req["redirect_uri"] == nil || req["redirect_uri"] == "" {
				req["redirect_uri"] = cfg.RedirectURI
			}
			if req["grant_type"] == nil { req["grant_type"] = "authorization_code" }
			payload, _ := json.Marshal(req)
			status, data, err := auth.ProxyTokenExchange(payload)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.Data(status, "application/json", data)
		})

		api.POST("/oauth/refresh", func(c *gin.Context) {
			var req struct { RefreshToken string \`json:"refresh_token"\` }
			if err := c.ShouldBindJSON(&req); err != nil || req.RefreshToken == "" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request"})
				return
			}
			tok, err := auth.RefreshToken(req.RefreshToken)
			if err != nil { writeSDKError(c, err); return }
			c.JSON(http.StatusOK, tok)
		})

		api.GET("/oauth/userinfo", func(c *gin.Context) {
			token := strings.TrimSpace(strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer "))
			if token == "" {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_token"})
				return
			}
			info, err := auth.GetUserInfo(token)
			if err != nil { writeSDKError(c, err); return }
			c.JSON(http.StatusOK, info)
		})

		api.GET("/oauth/logout", func(c *gin.Context) {
			url := auth.BuildLogoutURL(c.Query("id_token_hint"), c.Query("post_logout_redirect_uri"), c.Query("state"))
			c.Redirect(http.StatusFound, url)
		})

		api.POST("/oauth/session-check", func(c *gin.Context) {
			var req sdk.SessionCheckRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request"})
				return
			}
			if req.AppID == "" { req.AppID = cfg.AppID }
			data, status, err := auth.CheckSession(req)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.Data(status, "application/json", data)
		})
	}

	r.GET("/api/v1/openid-configuration", func(c *gin.Context) {
		status, body, err := proxyGET(cfg.UnitAuthURL, "/api/v1/openid-configuration")
		if err != nil { c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()}); return }
		c.Data(status, "application/json", body)
	})

	r.GET("/api/v1/sso/providers", func(c *gin.Context) {
		status, body, err := proxyGET(cfg.UnitAuthURL, "/api/v1/sso/providers")
		if err != nil { c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()}); return }
		c.Data(status, "application/json", body)
	})

	// ── Demo 业务路由（公开）──
	r.GET("/api/v1/demo/time", func(c *gin.Context) {
		now := time.Now()
		c.JSON(http.StatusOK, gin.H{
			"server_time": now.Format(time.RFC3339),
			"timestamp":   now.UnixMilli(),
			"uptime_sec":  int64(time.Since(startTime).Seconds()),
		})
	})

	// ── Demo 业务路由（需 token）──
	protected := r.Group("/api/v1/demo", requireAuth(auth))
	{
		protected.GET("/time-auth", func(c *gin.Context) {
			claims := c.MustGet("claims").(*sdk.IntrospectResponse)
			now := time.Now()
			c.JSON(http.StatusOK, gin.H{
				"server_time": now.Format(time.RFC3339),
				"timestamp":   now.UnixMilli(),
				"uptime_sec":  int64(time.Since(startTime).Seconds()),
				"user_id":     claims.UserID,
				"email":       claims.Email,
			})
		})
		protected.GET("/whoami", func(c *gin.Context) {
			claims := c.MustGet("claims").(*sdk.IntrospectResponse)
			c.JSON(http.StatusOK, gin.H{
				"active": claims.Active, "user_id": claims.UserID,
				"email": claims.Email, "role": claims.Role,
				"token_type": claims.TokenType, "exp": claims.Exp, "expires_at": claims.ExpiresAt,
			})
		})
		protected.POST("/add", func(c *gin.Context) {
			claims := c.MustGet("claims").(*sdk.IntrospectResponse)
			var req struct { A float64 \`json:"a"\`; B float64 \`json:"b"\` }
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request"})
				return
			}
			c.JSON(http.StatusOK, gin.H{"a": req.A, "b": req.B, "sum": req.A + req.B, "user_id": claims.UserID})
		})
		protected.POST("/echo", func(c *gin.Context) {
			claims := c.MustGet("claims").(*sdk.IntrospectResponse)
			var body interface{}
			if err := c.ShouldBindJSON(&body); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request"})
				return
			}
			c.JSON(http.StatusOK, gin.H{"echo": body, "user_id": claims.UserID})
		})
	}

	if err := r.Run(":" + cfg.Port); err != nil { log.Fatal(err) }
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" { return v }
	}
	return ""
}

func writeSDKError(c *gin.Context, err error) {
	if apiErr, ok := err.(*sdk.APIError); ok {
		status := apiErr.Status
		if status == 0 { status = http.StatusBadRequest }
		c.Data(status, "application/json", []byte(apiErr.Body))
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
}
`
}

export function generateScaffoldFiles(config: SubProjectScaffoldConfig): Record<string, string> {
  const c = syncDerivedUrls(config)
  const pn = c.projectName
  const scopesJson = JSON.stringify(c.allowedScopes)

  const ssoTs = `/**
 * SSO 配置 — 由 admin-web 子项目脚手架生成
 */
import { createAuthConfig } from '@sparrow/login/core'

const redirectUri = import.meta.env.VITE_SSO_REDIRECT_URI || '${c.redirectUri}'
const clientId = import.meta.env.VITE_SSO_CLIENT_ID || '${c.clientId}'
const ssoServerUrl = import.meta.env.VITE_SSO_SERVER_URL || '${c.ssoServerUrl}'
const ssoHomeUrl = import.meta.env.VITE_SSO_HOME_URL || '${c.ssoHomeUrl}'

export const appConfig = {
  id: '${c.appId}',
  ssoServerUrl,
  ssoHomeUrl,
  clientId,
  redirectUri,
  redirectUris: [redirectUri],
  allowedScopes: ${scopesJson},
  tokenEndpoint: '/api/v1/auth/oauth/token',
  authorizationUrl: '/api/v1/auth/oauth/authorize',
  tokenUrl: '/api/v1/auth/oauth/token',
  userInfoUrl: '/api/v1/auth/oauth/userinfo',
  logoutUrl: '/api/v1/auth/oauth/logout',
}

createAuthConfig({
  ...appConfig,
  autoRefresh: ${c.autoRefresh},
})
`

  const appTsx = `import { useEffect, useState } from 'react'
import { useSubProjectSSO } from '@sparrow/login/hooks'
import { readSsoSessionCookies } from '@sparrow/login/utils/ssoSessionCookie'
import { appConfig } from './sso'
import { TestPanel } from './TestPanel'

function detectSessionCookie(): boolean {
  return !!readSsoSessionCookies().sessionId
}

export default function App() {
  const sso = useSubProjectSSO({ customConfig: appConfig })
  const { isAuthenticated, login, isLoading, error } = sso
  const [hasSessionCookie, setHasSessionCookie] = useState(false)

  useEffect(() => {
    const check = () => setHasSessionCookie(detectSessionCookie())
    check()
    const id = setInterval(check, 1000)
    return () => clearInterval(id)
  }, [isAuthenticated])

  const showTestPanel = isAuthenticated || hasSessionCookie

  if (isLoading) {
    return (
      <div className="page-center">
        <div className="spinner" />
        <p>初始化中…</p>
      </div>
    )
  }

  if (!showTestPanel) {
    return (
      <div className="page-center">
        <h1 className="app-title">${c.displayName}</h1>
        <p className="hint">SSO 完整测试台 · 前端 :${c.frontendPort} · BFF :${c.bffPort}</p>
        {error && <p className="err">{error.message}</p>}
        <button type="button" className="btn btn-primary btn-lg" onClick={() => login({ redirect: true })}>
          SSO 登录
        </button>
      </div>
    )
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <span className="app-title">${c.displayName} · SSO 测试台</span>
        <span className="hint">前端 :${c.frontendPort} · BFF :${c.bffPort} · IdP :8080</span>
      </header>
      {!isAuthenticated && hasSessionCookie && (
        <p className="session-hint">本地 token 已清空，IdP session cookie 仍在。可点击 Session-Check 恢复。</p>
      )}
      <TestPanel sso={sso} onAuthChange={() => setHasSessionCookie(detectSessionCookie())} />
    </div>
  )
}
`

  const mainTsx = `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './sso'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`

  const indexCss = `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; background: #f0f2f5; color: #222; min-height: 100vh; }

.page-center { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 12px; }
.spinner { width: 32px; height: 32px; border: 3px solid #e0e0e0; border-top-color: #1677ff; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.app-root { max-width: 900px; margin: 0 auto; padding: 0 16px 48px; }
.app-header { display: flex; align-items: baseline; gap: 12px; padding: 16px 0 12px; border-bottom: 1px solid #e0e0e0; margin-bottom: 16px; }
.app-title { font-size: 1.2rem; font-weight: 700; color: #1677ff; }

.test-panel { display: flex; flex-direction: column; gap: 16px; }
.panel-section { background: #fff; border-radius: 10px; padding: 18px 20px; box-shadow: 0 1px 6px rgba(0,0,0,0.07); }
.section-title { font-size: 0.95rem; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 14px; }

.token-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 0.9rem; border-bottom: 1px solid #f5f5f5; }
.token-row:last-child { border-bottom: none; }
.token-label { color: #888; min-width: 160px; }
.token-countdown { font-size: 1.1rem; font-weight: 700; color: #52c41a; font-variant-numeric: tabular-nums; }
.token-countdown.warning { color: #fa8c16; }
.token-countdown.expired { color: #f5222d; }
.token-ok { color: #52c41a; font-weight: 600; }
.token-missing { color: #f5222d; }
.token-preview { font-size: 0.78rem; background: #f5f5f5; padding: 2px 6px; border-radius: 4px; color: #555; word-break: break-all; }
.token-time { color: #888; font-size: 0.85rem; }

.btn-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.btn { padding: 7px 14px; border: 1px solid #d9d9d9; border-radius: 7px; background: #fafafa; color: #333; cursor: pointer; font-size: 0.875rem; transition: all 0.15s; line-height: 1.4; }
.btn:hover:not(:disabled) { border-color: #1677ff; color: #1677ff; background: #e6f4ff; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: #1677ff; color: #fff; border-color: #1677ff; }
.btn-primary:hover:not(:disabled) { background: #4096ff; border-color: #4096ff; color: #fff; }
.btn-danger { background: #fff1f0; border-color: #ffa39e; color: #cf1322; }
.btn-danger:hover:not(:disabled) { background: #ff4d4f; color: #fff; border-color: #ff4d4f; }
.btn-warning { background: #fffbe6; border-color: #ffe58f; color: #d48806; }
.btn-warning:hover:not(:disabled) { background: #fa8c16; color: #fff; border-color: #fa8c16; }
.btn-api { font-family: 'SF Mono', Menlo, monospace; font-size: 0.82rem; }
.btn-lg { padding: 10px 28px; font-size: 1rem; }
.btn-sm { padding: 3px 10px; font-size: 0.8rem; }

.api-result { margin-top: 12px; background: #f6ffed; border: 1px solid #b7eb8f; border-radius: 6px; padding: 10px 12px; font-size: 0.8rem; font-family: 'SF Mono', Menlo, monospace; max-height: 220px; overflow: auto; white-space: pre-wrap; word-break: break-all; }

.log-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.log-list { max-height: 280px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; font-family: 'SF Mono', Menlo, monospace; font-size: 0.82rem; }
.log-empty { color: #aaa; text-align: center; padding: 16px; }
.log-entry { display: flex; flex-direction: column; gap: 2px; padding: 5px 8px; border-radius: 5px; border-left: 3px solid; }
.log-ok { background: #f6ffed; border-left-color: #52c41a; }
.log-fail { background: #fff1f0; border-left-color: #f5222d; }
.log-time { color: #aaa; margin-right: 6px; }
.log-icon { margin-right: 4px; }
.log-ok .log-icon { color: #52c41a; }
.log-fail .log-icon { color: #f5222d; }
.log-detail { font-size: 0.75rem; margin-top: 4px; background: rgba(0,0,0,0.03); padding: 6px; border-radius: 4px; white-space: pre-wrap; word-break: break-all; max-height: 160px; overflow: auto; }

.hint { color: #888; font-size: 0.88rem; }
.err { color: #cf1322; margin-top: 8px; }
.session-hint { background: #fffbe6; border: 1px solid #ffe58f; color: #ad6800; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; font-size: 0.9rem; }
`

  const demoApiTs = `/**
 * demoApi.ts — 测试台专用 axios 实例
 * 自动注入 SSO token，遇到 401 先 refresh，失败则触发 session recovery
 */
import axios, { type AxiosRequestConfig } from 'axios'
import { storage } from '@sparrow/login/utils'
import { refreshOAuthTokenOnce } from '@sparrow/login/utils/oauthRefreshOn401'
import { recoverOAuthSessionAfterRefreshFailure } from '@sparrow/login/utils/oauthSessionRecovery'

const BFF_URL = import.meta.env.VITE_SSO_SERVER_URL || '${c.ssoServerUrl}'

const demoAxios = axios.create({ baseURL: BFF_URL, timeout: 10000 })

demoAxios.interceptors.request.use((config) => {
  const token = storage.getSSOAccessToken()
  if (token) config.headers.Authorization = \`Bearer \${token}\`
  return config
})

demoAxios.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config as AxiosRequestConfig & { _retried?: boolean }
    if (axios.isAxiosError(error) && error.response?.status === 401 && !config._retried) {
      config._retried = true
      const refreshed = await refreshOAuthTokenOnce()
      if (refreshed) {
        const newToken = storage.getSSOAccessToken()
        if (newToken && config.headers) config.headers['Authorization'] = \`Bearer \${newToken}\`
        return demoAxios(config)
      }
      await recoverOAuthSessionAfterRefreshFailure()
    }
    return Promise.reject(error)
  }
)

export const demoApi = {
  getTime: () => demoAxios.get('/api/v1/demo/time').then((r) => r.data),
  getTimeAuth: () => demoAxios.get('/api/v1/demo/time-auth').then((r) => r.data),
  whoami: () => demoAxios.get('/api/v1/demo/whoami').then((r) => r.data),
  add: (a: number, b: number) => demoAxios.post('/api/v1/demo/add', { a, b }).then((r) => r.data),
  echo: (body: Record<string, unknown>) => demoAxios.post('/api/v1/demo/echo', body).then((r) => r.data),
}
`

  const useCountdownTs = `import { useState, useEffect } from 'react'
import { storage } from '@sparrow/login/utils'

export interface CountdownState {
  remainSec: number
  isExpired: boolean
  expiresAt: number | null
  remainLabel: string
}

function normalizeExpiresAtMs(raw: unknown): number | null {
  if (raw == null) return null
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return null
    return raw > 1e12 ? raw : raw * 1000
  }
  if (typeof raw === 'string') {
    const asNum = Number(raw)
    if (Number.isFinite(asNum)) return asNum > 1e12 ? asNum : asNum * 1000
    const parsed = Date.parse(raw)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

function readExpiresAt(): number | null {
  if (!storage.getSSOAccessToken()) return null
  const ssoData = storage.getSSOData()
  const fromField = normalizeExpiresAtMs(ssoData?.expires_at)
  if (fromField !== null) return fromField
  const token = ssoData?.token as { expires_in?: number; stored_at?: number; expires_at?: unknown } | undefined
  if (token?.stored_at != null && token.expires_in != null) {
    const computed = token.stored_at + token.expires_in * 1000
    if (Number.isFinite(computed)) return computed
  }
  if (token?.expires_in != null) {
    const computed = Date.now() + token.expires_in * 1000
    if (Number.isFinite(computed)) return computed
  }
  const fromTokenField = normalizeExpiresAtMs(token?.expires_at)
  if (fromTokenField !== null) return fromTokenField
  const auth = storage.getAuth() as { expires_at?: unknown } | null
  return normalizeExpiresAtMs(auth?.expires_at)
}

function calc(expiresAt: number | null): CountdownState {
  if (expiresAt === null || !Number.isFinite(expiresAt)) {
    return { remainSec: 0, isExpired: true, expiresAt: null, remainLabel: '—' }
  }
  const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
  const min = Math.floor(diff / 60)
  const sec = diff % 60
  return { remainSec: diff, isExpired: diff === 0, expiresAt, remainLabel: min > 0 ? \`\${min}m \${sec}s\` : \`\${sec}s\` }
}

export function useAccessTokenCountdown(): CountdownState {
  const [state, setState] = useState<CountdownState>(() => calc(readExpiresAt()))
  useEffect(() => {
    const tick = () => setState(calc(readExpiresAt()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return state
}
`

  const testPanelTsx = `/**
 * TestPanel.tsx — SSO 完整测试台（四区域）
 */
import React, { useState, useCallback } from 'react'
import { SSOService } from '@sparrow/login/sso'
import { globalUserStore } from '@sparrow/login/stores/UserStore'
import { storage } from '@sparrow/login/utils'
import { useAccessTokenCountdown } from './useCountdown'
import { demoApi } from './demoApi'
import { readSsoSessionCookies } from '@sparrow/login/utils/ssoSessionCookie'
import type { UseSubProjectSSOResult } from '@sparrow/login/hooks'

interface LogEntry { id: number; time: string; ok: boolean; msg: string; detail?: string }
let _seq = 0

export function TestPanel({ sso, onAuthChange }: { sso: UseSubProjectSSOResult; onAuthChange?: () => void }) {
  const { user, token, refreshToken, getUserInfoFetch, logoutLocal, logout } = sso
  const countdown = useAccessTokenCountdown()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [apiResult, setApiResult] = useState('')
  const [busy, setBusy] = useState('')

  const log = useCallback((ok: boolean, msg: string, detail?: string) => {
    const time = new Date().toTimeString().slice(0, 8)
    setLogs((prev) => [{ id: ++_seq, time, ok, msg, detail }, ...prev].slice(0, 50))
  }, [])

  const run = useCallback(async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label); setApiResult('')
    try {
      const result = await fn()
      const detail = result != null ? JSON.stringify(result, null, 2) : undefined
      log(true, \`\${label} 成功\`, detail)
      if (detail) setApiResult(detail)
    } catch (err: unknown) {
      log(false, \`\${label} 失败：\${err instanceof Error ? err.message : String(err)}\`)
    } finally { setBusy('') }
  }, [log])

  const preview = storage.getSSOAccessToken()?.slice(0, 24) + '...' || '—'
  const hasRT = !!storage.getSSORefreshToken()

  return (
    <div className="test-panel">
      {/* Token 状态 */}
      <section className="panel-section">
        <h2 className="section-title">Token 状态</h2>
        <div className="token-row"><span className="token-label">Access Token 剩余：</span>
          <span className={\`token-countdown \${countdown.isExpired ? 'expired' : countdown.remainSec <= 10 ? 'warning' : ''}\`}>
            {countdown.expiresAt === null ? '无 Token' : countdown.isExpired ? '已过期' : countdown.remainLabel}
          </span>
        </div>
        <div className="token-row"><span className="token-label">Refresh Token：</span>
          <span className={hasRT ? 'token-ok' : 'token-missing'}>{hasRT ? '存在' : '不存在'}</span>
        </div>
        <div className="token-row"><span className="token-label">Token 预览：</span>
          <code className="token-preview">{preview}</code>
        </div>
        <div className="token-row"><span className="token-label">用户：</span>
          <span>{user?.nickname || user?.email || user?.name || '—'}</span>
        </div>
        {token?.expires_in && (
          <div className="token-row"><span className="token-label">过期时间：</span>
            <span className="token-time">{countdown.expiresAt ? new Date(countdown.expiresAt).toLocaleTimeString() : '—'}</span>
          </div>
        )}
      </section>

      {/* SSO 操作 */}
      <section className="panel-section">
        <h2 className="section-title">SSO 操作</h2>
        <div className="btn-grid">
          <button className="btn btn-primary" disabled={!!busy} onClick={() => run('手动续签', () => refreshToken())}>
            {busy === '手动续签' ? '…' : '手动续签'}
          </button>
          <button className="btn" disabled={!!busy} onClick={() => run('getUserInfo', () => getUserInfoFetch())}>
            getUserInfo
          </button>
          <button className="btn btn-warning" disabled={!!busy} onClick={() => run('清本地 Token', async () => {
            globalUserStore.clearAuthTokensOnly(); onAuthChange?.(); return { cleared: true }
          })}>清本地 Token</button>
          <button className="btn" disabled={!!busy} onClick={() => run('Session-Check', async () => {
            const svc = SSOService.instance; if (!svc) throw new Error('SSOService 未初始化')
            const { sessionId } = readSsoSessionCookies(); if (!sessionId) throw new Error('无 session cookie')
            const ok = await svc.tryRecoverSubProjectSession()
            if (ok) { globalUserStore.syncFromStorage(); onAuthChange?.() }
            return { recovered: ok, session_id: sessionId }
          })}>Session-Check 恢复</button>
          <button className="btn" disabled={!!busy} onClick={() => run('静默 Authorize', async () => {
            if (!readSsoSessionCookies().sessionId) throw new Error('无 session cookie')
            const svc = SSOService.instance
            if (!svc || typeof (svc as SSOService).trySilentAuthorize !== 'function') throw new Error('SSOService 未初始化')
            await (svc as SSOService).trySilentAuthorize(); return { status: 'redirecting' }
          })}>静默 Authorize</button>
          <button className="btn btn-danger" disabled={!!busy} onClick={() => run('本地登出', async () => { await logoutLocal(); onAuthChange?.(); return { logout: 'local', note: '未跳转 IdP，session cookie 保留' } })}>
            本地登出
          </button>
          <button className="btn btn-danger" disabled={!!busy} title="跳转 IdP logout" onClick={() => { log(true, '全局登出：即将跳转 IdP…'); logout() }}>
            全局登出（IdP）
          </button>
        </div>
      </section>

      {/* BFF Demo API */}
      <section className="panel-section">
        <h2 className="section-title">BFF Demo API</h2>
        <div className="btn-grid">
          <button className="btn btn-api" disabled={!!busy} onClick={() => run('GET /time（公开）', () => demoApi.getTime())}>GET /time（公开）</button>
          <button className="btn btn-api" disabled={!!busy} onClick={() => run('GET /time-auth', () => demoApi.getTimeAuth())}>GET /time-auth（需 token）</button>
          <button className="btn btn-api" disabled={!!busy} onClick={() => run('GET /whoami', () => demoApi.whoami())}>GET /whoami</button>
          <button className="btn btn-api" disabled={!!busy} onClick={() => run('POST /add（3+5）', () => demoApi.add(3, 5))}>POST /add（3+5）</button>
          <button className="btn btn-api" disabled={!!busy} onClick={() => run('POST /echo', () => demoApi.echo({ msg: 'hello', ts: Date.now() }))}>POST /echo</button>
          <button className="btn btn-api btn-warning" disabled={!!busy} title="清 token → 调 /time-auth → 触发 401→refresh→recovery" onClick={async () => {
            log(true, '401 自动恢复测试：清 token → /time-auth')
            globalUserStore.clearAuthTokensOnly(); onAuthChange?.()
            await run('401→refresh→recovery', () => demoApi.getTimeAuth())
          }}>401 自动恢复测试</button>
        </div>
        {apiResult && <pre className="api-result">{apiResult}</pre>}
      </section>

      {/* 操作日志 */}
      <section className="panel-section">
        <div className="log-header">
          <h2 className="section-title" style={{ margin: 0 }}>操作日志</h2>
          <button className="btn btn-sm" onClick={() => setLogs([])}>清空</button>
        </div>
        <div className="log-list">
          {logs.length === 0 && <p className="log-empty">暂无记录</p>}
          {logs.map((e) => (
            <div key={e.id} className={\`log-entry \${e.ok ? 'log-ok' : 'log-fail'}\`}>
              <div><span className="log-time">[{e.time}]</span><span className="log-icon">{e.ok ? '✓' : '✗'}</span><span className="log-msg">{e.msg}</span></div>
              {e.detail && <details><summary>详情</summary><pre className="log-detail">{e.detail}</pre></details>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
`

  const viteConfig = `import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

const loginWebSrc = path.resolve(__dirname, '../../../Packages/Login/web/src')

export default defineConfig({
  plugins: [react()],
  server: { port: ${c.frontendPort}, strictPort: true },
  resolve: {
    alias: { '@sparrow/login': loginWebSrc },
  },
  optimizeDeps: { include: ['mobx', 'mobx-react-lite', 'axios'] },
})
`

  const packageJson = JSON.stringify(
    {
      name: pn,
      private: true,
      version: '0.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        server: 'cd server && go run .',
        build: 'tsc -b && vite build',
        preview: 'vite preview',
      },
      dependencies: {
        axios: '^1.12.2',
        mobx: '^6.13.7',
        'mobx-react-lite': '^4.1.0',
        react: '^19.1.1',
        'react-dom': '^19.1.1',
      },
      devDependencies: {
        '@vitejs/plugin-react-swc': '^4.1.0',
        typescript: '~5.8.3',
        vite: 'npm:rolldown-vite@7.1.12',
      },
      pnpm: { overrides: { vite: 'npm:rolldown-vite@7.1.12' } },
    },
    null,
    2,
  )

  const goMod = `module ${moduleName(pn)}

go 1.20

require (
	github.com/gin-gonic/gin v1.9.1
	unit-auth v0.0.0
)

replace unit-auth => ../../../../Packages/Login/unit-auth
`

  const readme = `# ${c.displayName}

由 admin-web 子项目脚手架生成。

## 启动

\`\`\`bash
# BFF
cd server && go run .

# 前端
pnpm install && pnpm dev
\`\`\`

- 前端: http://localhost:${c.frontendPort}
- BFF: http://localhost:${c.bffPort}
- 登录中心: ${c.ssoHomeUrl}

详见 Packages/Login/SUBPROJECT_SSO_GUIDE.md
`

  const root = `Js/project/${pn}`
  return {
    [`${root}/frontend-config.json`]: buildFrontendConfigJson(c),
    [`${root}/.env.example`]: buildEnvExample(c),
    [`${root}/package.json`]: packageJson,
    [`${root}/vite.config.ts`]: viteConfig,
    [`${root}/index.html`]: `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${c.displayName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    [`${root}/src/sso.ts`]: ssoTs,
    [`${root}/src/App.tsx`]: appTsx,
    [`${root}/src/main.tsx`]: mainTsx,
    [`${root}/src/index.css`]: indexCss,
    [`${root}/src/demoApi.ts`]: demoApiTs,
    [`${root}/src/useCountdown.ts`]: useCountdownTs,
    [`${root}/src/TestPanel.tsx`]: testPanelTsx,
    [`${root}/server/config.json`]: buildBackendConfigJson(c),
    [`${root}/server/main.go`]: generateServerMainGo(c),
    [`${root}/server/go.mod`]: goMod,
    [`${root}/README.md`]: readme,
  }
}

export function downloadTextFile(filename: string, content: string, mime = 'application/json'): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadScaffoldZip(config: SubProjectScaffoldConfig): Promise<void> {
  const c = syncDerivedUrls(config)
  const files = generateScaffoldFiles(c)
  const zip = new JSZip()
  const folder = zip.folder(`Js/project/${c.projectName}`)
  if (!folder) throw new Error('无法创建 ZIP')

  for (const [path, content] of Object.entries(files)) {
    const relative = path.replace(`Js/project/${c.projectName}/`, '')
    folder.file(relative, content)
  }
  folder.file('backend-config.json', buildBackendConfigJson(c))
  folder.file('frontend-config.json', buildFrontendConfigJson(c))

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${c.projectName}-scaffold.zip`
  a.click()
  URL.revokeObjectURL(url)
}
