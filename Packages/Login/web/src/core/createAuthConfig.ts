import { createDefaultSSOConfig, setSSOConfig, getSSOConfig } from '../sso/config'
import type { SSOConfig } from '../types'
import type { SubProjectConfig } from '../config/subproject-integration'

export type AuthConfigInput = Partial<SSOConfig> & Partial<SubProjectConfig>

/**
 * 合并环境变量、默认 SSO 配置与运行时 override（URL 参数优先级更高）
 */
export function createAuthConfig(overrides: AuthConfigInput = {}): SSOConfig {
    const defaults = createDefaultSSOConfig()
    const previous = getSSOConfig()
    // 保留子项目 sso.ts 等已写入的全局配置，避免 useAuth 二次 createAuthConfig() 冲掉
    const merged: SSOConfig = {
        ...defaults,
        ...(previous?.ssoServerUrl ? previous : {}),
        ...overrides,
    }

    if (overrides.allowedScopes?.length) {
        merged.scope = overrides.allowedScopes
    }
    if (overrides.id) {
        const c = merged as SSOConfig & { id?: string; appId?: string }
        if (!c.appId) c.appId = overrides.id
        if (!c.id) c.id = overrides.id
    }
    if (overrides.tokenUrl && !merged.tokenEndpoint) {
        merged.tokenEndpoint = overrides.tokenUrl
    }
    if (overrides.authorizationUrl && !merged.authorizationUrl) {
        merged.authorizationUrl = overrides.authorizationUrl
    }
    if (overrides.userInfoUrl && !merged.userInfoEndpoint) {
        merged.userInfoEndpoint = overrides.userInfoUrl
    }
    if (overrides.logoutUrl && !merged.logoutEndpoint) {
        merged.logoutEndpoint = overrides.logoutUrl
    }
    if (overrides.clientId && overrides.id && overrides.id !== 'centralized') {
        if (!overrides.tokenEndpoint && !overrides.tokenUrl) {
            merged.tokenEndpoint = '/api/v1/auth/oauth/token'
        }
        if (!overrides.authorizationUrl) {
            merged.authorizationUrl = '/api/v1/auth/oauth/authorize'
        }
    }
    if (overrides.features?.autoRefresh !== undefined) {
        merged.autoRefresh = overrides.features.autoRefresh
    }
    if (overrides.autoRefresh !== undefined) {
        merged.autoRefresh = overrides.autoRefresh
    }

    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        const fromUrl: Record<string, string> = {}
        for (const key of ['client_id', 'redirect_uri', 'response_type', 'scope', 'app_id']) {
            const v = params.get(key)
            if (v) fromUrl[key === 'client_id' ? 'clientId' : key === 'redirect_uri' ? 'redirectUri' : key] = v
        }
        if (fromUrl.clientId) merged.clientId = fromUrl.clientId
        if (fromUrl.redirectUri) merged.redirectUri = fromUrl.redirectUri
        if (fromUrl.scope) merged.scope = String(fromUrl.scope).split(' ')
        const appId = params.get('app_id')
        if (appId) merged.id = appId
    }

    setSSOConfig(merged)
    return merged
}

export { getSSOConfig, setSSOConfig }
