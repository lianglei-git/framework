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

	"github.com/gin-gonic/gin"
	"unit-auth/sdk"
)

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

  const appTsx = `import { useSubProjectSSO } from '@sparrow/login/hooks'
import { appConfig } from './sso'

export default function App() {
  const { isAuthenticated, user, login, logout, isLoading, error } = useSubProjectSSO({
    customConfig: appConfig,
  })

  if (isLoading) return <main className="page">加载中…</main>

  if (error) {
    return (
      <main className="page">
        <p className="err">{error.message}</p>
        <button type="button" onClick={() => login({ redirect: true })}>重新登录</button>
      </main>
    )
  }

  return (
    <main className="page">
      <h1>${c.displayName}</h1>
      <p className="hint">前端 :${c.frontendPort} · BFF :${c.bffPort}</p>
      {isAuthenticated ? (
        <>
          <p>你好，{user?.nickname || user?.name || user?.email}</p>
          <button type="button" onClick={() => logout()}>登出</button>
        </>
      ) : (
        <button type="button" onClick={() => login({ redirect: true })}>SSO 登录</button>
      )}
    </main>
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

  const indexCss = `* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; background: #f5f5f5; color: #222; }
.page { max-width: 420px; margin: 4rem auto; padding: 2rem; background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); text-align: center; }
.hint { color: #888; font-size: 0.9rem; }
.err { color: #c00; }
button { margin-top: 1rem; padding: 0.5rem 1.25rem; border: none; border-radius: 8px; background: #1677ff; color: #fff; cursor: pointer; font-size: 1rem; }
button:hover { background: #4096ff; }
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
