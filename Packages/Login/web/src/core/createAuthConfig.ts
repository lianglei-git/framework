import { createDefaultSSOConfig, setSSOConfig, getSSOConfig } from '../sso/config'
import type { SSOConfig } from '../types'
import type { SubProjectConfig } from '../config/subproject-integration'

export type AuthConfigInput = Partial<SSOConfig> & Partial<SubProjectConfig>

/**
 * 合并环境变量、默认 SSO 配置与运行时 override（URL 参数优先级更高）
 */
export function createAuthConfig(overrides: AuthConfigInput = {}): SSOConfig {
    const base = createDefaultSSOConfig()
    const merged: SSOConfig = { ...base, ...overrides }

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
