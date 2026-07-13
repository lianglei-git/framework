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

/** HTTP 等非安全上下文下 crypto.randomUUID 不可用 */
function createRecordId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
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
  app_id?: string
  description?: string
  redirect_uris: string
  grant_types: string
  response_types: string
  scope: string
  frontend_port?: number
  bff_port?: number
  auto_approve: boolean
}, extra?: Partial<SubProjectScaffoldConfig> & { clientSecret?: string }): SubProjectScaffoldConfig {
  const uris = parseJsonArray(client.redirect_uris)
  const redirectUri = uris[0] || 'http://localhost:5176'
  const frontendPort = client.frontend_port || parseRedirectPort(redirectUri)
  const projectName = slugProjectName(client.name)
  return syncDerivedUrls(
    defaultScaffoldConfig({
      projectName,
      displayName: client.name,
      appId: client.app_id || `sso_${projectName}`,
      clientId: client.id,
      clientSecret: extra?.clientSecret ?? '',
      frontendPort,
      bffPort: client.bff_port || inferBffPort(frontendPort),
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
    id: createRecordId(),
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
  return `// ${c.displayName} — minimal BFF: MountBFF + whoami.
// client_secret 仅保存在服务端。
package main

import (
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"unit-auth/unitauthsdk"
)

type config struct {
	Port         string \`json:"port"\`
	UnitAuthURL  string \`json:"unit_auth_url"\`
	ClientID     string \`json:"client_id"\`
	ClientSecret string \`json:"client_secret"\`
	RedirectURI  string \`json:"redirect_uri"\`
	AppID        string \`json:"app_id"\`
}

func main() {
	cfg := loadConfig()

	auth := unitauthsdk.New(unitauthsdk.Config{
		BaseURL:      cfg.UnitAuthURL,
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		RedirectURI:  cfg.RedirectURI,
	})

	mw, err := unitauthsdk.NewMiddleware(unitauthsdk.MiddlewareConfig{
		Mode:         unitauthsdk.ModeStandalone,
		UnitAuthURL:  cfg.UnitAuthURL,
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
	})
	if err != nil {
		log.Fatal(err)
	}

	r := gin.Default()
	r.Use(unitauthsdk.CORS())
	unitauthsdk.MountBFF(r, auth, unitauthsdk.MountBFFConfig{AppID: cfg.AppID})

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	r.GET("/api/v1/demo/whoami", mw, func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"user_id": unitauthsdk.UserID(c),
			"email":   unitauthsdk.Email(c),
			"role":    unitauthsdk.Role(c),
		})
	})

	log.Printf("${c.projectName} bff :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}

func loadConfig() config {
	cfg := config{
		Port:         envOr("PORT", "${c.bffPort}"),
		UnitAuthURL:  envOr("UNIT_AUTH_URL", "${c.unitAuthUrl}"),
		ClientID:     os.Getenv("CLIENT_ID"),
		ClientSecret: os.Getenv("CLIENT_SECRET"),
		RedirectURI:  envOr("REDIRECT_URI", "${c.redirectUri}"),
		AppID:        envOr("APP_ID", "${c.appId}"),
	}
	path := flag.String("config", "config.json", "config path")
	flag.Parse()
	if raw, err := os.ReadFile(*path); err == nil {
		_ = json.Unmarshal(raw, &cfg)
	}
	if v := os.Getenv("PORT"); v != "" {
		cfg.Port = v
	}
	if cfg.ClientID == "" || cfg.ClientSecret == "" {
		log.Fatal("client_id/client_secret required (config.json or env)")
	}
	return cfg
}

func envOr(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
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
import { createAuthConfig } from '@zayne/login/core'

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
import { useSubProjectSSO } from '@zayne/login/hooks'
import { readSsoSessionCookies } from '@zayne/login/utils/ssoSessionCookie'
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
        <p className="hint">unitauthsdk 脚手架 · 前端 :${c.frontendPort} · BFF :${c.bffPort}</p>
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
        <span className="app-title">${c.displayName}</span>
        <span className="hint">FE :${c.frontendPort} · BFF :${c.bffPort} · IdP :8080</span>
      </header>
      {!isAuthenticated && hasSessionCookie && (
        <p className="session-hint">本地 token 已清空，IdP session cookie 仍在。</p>
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
 * demoApi — BFF only (MountBFF + whoami)
 */
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { storage } from '@zayne/login/utils'
import { refreshOAuthTokenOnce } from '@zayne/login/utils/oauthRefreshOn401'
import { recoverOAuthSessionAfterRefreshFailure } from '@zayne/login/utils/oauthSessionRecovery'

const BFF_URL = import.meta.env.VITE_SSO_SERVER_URL || '${c.ssoServerUrl}'

function createAxios(): AxiosInstance {
  const instance = axios.create({
    baseURL: BFF_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
  })

  instance.interceptors.request.use((config) => {
    const token = storage.getSSOAccessToken()
    if (token) config.headers.Authorization = \`Bearer \${token}\`
    return config
  })

  instance.interceptors.response.use(
    (res) => res,
    async (error) => {
      const config = error.config as AxiosRequestConfig & { _retried?: boolean }
      if (axios.isAxiosError(error) && error.response?.status === 401 && !config._retried) {
        config._retried = true
        if (await refreshOAuthTokenOnce()) {
          const newToken = storage.getSSOAccessToken()
          if (newToken && config.headers) config.headers['Authorization'] = \`Bearer \${newToken}\`
          return instance(config)
        }
        await recoverOAuthSessionAfterRefreshFailure()
      }
      return Promise.reject(error)
    },
  )

  return instance
}

const bff = createAxios()

export const demoApi = {
  whoami: () => bff.get('/api/v1/demo/whoami').then((r) => r.data),
  providers: () => bff.get('/api/v1/sso/providers').then((r) => r.data),
}
`

  const useCountdownTs = `import { useState, useEffect } from 'react'
import { storage } from '@zayne/login/utils'

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
 * TestPanel — minimal: SSO + MountBFF whoami
 */
import { useState, useCallback } from 'react'
import { globalUserStore } from '@zayne/login/stores/UserStore'
import { storage } from '@zayne/login/utils'
import { useAccessTokenCountdown } from './useCountdown'
import { demoApi } from './demoApi'
import type { UseSubProjectSSOResult } from '@zayne/login/hooks'
import { readSsoSessionCookies } from '@zayne/login/utils/ssoSessionCookie'

export function TestPanel({ sso, onAuthChange }: { sso: UseSubProjectSSOResult; onAuthChange?: () => void }) {
  const { user, refreshToken, logoutLocal, logout } = sso
  const countdown = useAccessTokenCountdown()
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)
  const { sessionId } = readSsoSessionCookies()

  const run = useCallback(async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true)
    setResult('')
    try {
      const data = await fn()
      setResult(\`\${label}\\n\${JSON.stringify(data, null, 2)}\`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setResult(\`\${label} failed: \${msg}\`)
    } finally {
      setBusy(false)
    }
  }, [])

  return (
    <div className="test-panel">
      <section className="panel-section">
        <h2 className="section-title">Session</h2>
        <div className="token-row">
          <span className="token-label">Token：</span>
          <span className={countdown.isExpired ? 'token-missing' : 'token-ok'}>
            {countdown.expiresAt === null ? '无' : countdown.isExpired ? '已过期' : countdown.remainLabel}
          </span>
        </div>
        <div className="token-row">
          <span className="token-label">Cookie：</span>
          <span className={sessionId ? 'token-ok' : 'token-missing'}>{sessionId ? '有' : '无'}</span>
        </div>
        <div className="token-row">
          <span className="token-label">用户：</span>
          <span>{user?.nickname || user?.email || user?.name || '—'}</span>
        </div>
        <div className="token-row">
          <span className="token-label">Token 预览：</span>
          <code className="token-preview">{storage.getSSOAccessToken()?.slice(0, 24) || '—'}…</code>
        </div>
      </section>

      <section className="panel-section">
        <h2 className="section-title">Actions</h2>
        <div className="btn-grid">
          <button className="btn btn-primary" disabled={busy} onClick={() => run('whoami', () => demoApi.whoami())}>
            GET /demo/whoami
          </button>
          <button className="btn btn-api" disabled={busy} onClick={() => run('providers', () => demoApi.providers())}>
            GET /sso/providers
          </button>
          <button className="btn" disabled={busy} onClick={() => run('refresh', () => refreshToken())}>
            续签
          </button>
          <button
            className="btn btn-warning"
            disabled={busy}
            onClick={() => {
              globalUserStore.clearAuthTokensOnly()
              onAuthChange?.()
              setResult('cleared local tokens')
            }}
          >
            清 Token
          </button>
          <button
            className="btn btn-danger"
            disabled={busy}
            onClick={async () => {
              await logoutLocal()
              onAuthChange?.()
            }}
          >
            本地登出
          </button>
          <button className="btn btn-danger" disabled={busy} onClick={() => logout()}>
            全局登出
          </button>
        </div>
        {result && <pre className="api-result">{result}</pre>}
      </section>
    </div>
  )
}
`

  const viteConfig = `import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

const loginWebSrc = path.resolve(__dirname, '../../../Packages/Login/web/src')
const projectRoot = path.resolve(__dirname)

export default defineConfig({
  plugins: [react()],
  server: {
    port: ${c.frontendPort},
    strictPort: true,
    fs: { allow: [projectRoot, loginWebSrc] },
    // Native fs.watch hits EMFILE when aliasing into the monorepo Login tree.
    watch: {
      usePolling: true,
      interval: 400,
      ignored: ['**/node_modules/**', '**/.git/**'],
    },
  },
  resolve: {
    alias: { '@zayne/login': loginWebSrc },
  },
  optimizeDeps: { include: ['mobx', 'mobx-react-lite', 'axios'] },
})
`

  const pnpmWorkspace = `# Isolate this subproject from the parent monorepo pnpm workspace.
packages:
  - '.'
`

  const tsconfigJson = `{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
`

  const tsconfigAppJson = `{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "types": ["vite/client"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
`

  const tsconfigNodeJson = `{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "types": [],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}
`

  const packageJson = JSON.stringify(
    {
      name: pn,
      private: true,
      version: '0.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        server: 'cd server && GOWORK=off go run .',
        build: 'vite build',
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

go 1.26

require (
	github.com/gin-gonic/gin v1.9.1
	unit-auth v0.0.0
)

replace unit-auth => ../../../../Packages/Login/unit-auth
`

  const readme = `# ${c.displayName}

由 admin-web 子项目脚手架生成。BFF 核心：

\`\`\`go
auth := unitauthsdk.New(...)
unitauthsdk.MountBFF(r, auth, unitauthsdk.MountBFFConfig{AppID: cfg.AppID})
r.GET("/api/v1/demo/whoami", mw, ...)
\`\`\`

\`MountBFF\` 已包含 oauth / openid-configuration / sso/providers。

## 启动

\`\`\`bash
# BFF
cd server && GOWORK=off go run .

# 前端（项目自带 pnpm-workspace.yaml，勿用 yarn）
pnpm install && pnpm dev
\`\`\`

- 前端: http://localhost:${c.frontendPort}
- BFF: http://localhost:${c.bffPort}
- 登录中心: ${c.ssoHomeUrl}

参考样板：\`Js/project/unitauthsdk_demo/\`  
详见 Packages/Login/子项目SSO接入指南.md
`

  const root = `Js/project/${pn}`
  return {
    [`${root}/frontend-config.json`]: buildFrontendConfigJson(c),
    [`${root}/.env.example`]: buildEnvExample(c),
    [`${root}/package.json`]: packageJson,
    [`${root}/pnpm-workspace.yaml`]: pnpmWorkspace,
    [`${root}/tsconfig.json`]: tsconfigJson,
    [`${root}/tsconfig.app.json`]: tsconfigAppJson,
    [`${root}/tsconfig.node.json`]: tsconfigNodeJson,
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
