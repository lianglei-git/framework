import type { SSOConfig } from '../types'
import { StorageType } from '../types'

function pickUrlOverrides(params: URLSearchParams): Partial<SSOConfig> {
    const out: Partial<SSOConfig> = {}

    if (params.get('app_origin') === 'true') {
        out.additionalParams = Object.fromEntries(params.entries())
        return out
    }

    const issuer = params.get('issuer')
    if (issuer) out.ssoServerUrl = issuer

    const clientId = params.get('client_id')
    if (clientId) out.clientId = clientId

    const appId = params.get('app_id')
    if (appId) out.appId = appId

    const redirectUri = params.get('redirect_uri')
    if (redirectUri) out.redirectUri = redirectUri

    const responseType = params.get('response_type')
    if (responseType) {
        out.responseType = responseType as SSOConfig['responseType']
    }

    const scopeParam = params.get('scope')
    if (scopeParam) {
        out.scope = scopeParam.split(' ').filter((s) => s.trim())
    }

    const state = params.get('state')
    if (state) out.state = state

    out.additionalParams = Object.fromEntries(params.entries())
    return out
}

/** 从 URL 查询参数提取 SSO 配置（仅合并非空字段，避免冲掉 env 默认值） */
export function extractConfigFromURL(): Partial<SSOConfig> {
    const urlParams = new URLSearchParams(window.location.search)
    const picked = pickUrlOverrides(urlParams)

    return {
        ...picked,
        grantType: picked.grantType ?? 'authorization_code',
        sessionTimeout: picked.sessionTimeout ?? 3600,
        autoRefresh: picked.autoRefresh ?? true,
        storageType: picked.storageType ?? StorageType.LOCAL,
        cookieSameSite: picked.cookieSameSite ?? 'lax',
    }
}
