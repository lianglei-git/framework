import type { SSOConfig, SSODiscoveryDocument } from '../types'

function normalizeLegacyOAuthEndpoint(urlOrPath: string, ssoServerUrl: string): string {
    if (!urlOrPath) return urlOrPath
    const remapPath = (pathname: string): string => {
        switch (pathname) {
            case '/oauth/token':
                return '/api/v1/auth/oauth/token'
            case '/oauth/userinfo':
                return '/api/v1/auth/oauth/userinfo'
            case '/oauth/logout':
                return '/api/v1/auth/oauth/logout'
            case '/oauth/revoke':
                return '/api/v1/auth/oauth/revoke'
            case '/oauth/authorize':
                return '/api/v1/auth/oauth/authorize'
            default:
                return pathname
        }
    }
    if (!/^https?:\/\//i.test(urlOrPath)) {
        return remapPath(urlOrPath)
    }
    try {
        const parsed = new URL(urlOrPath)
        const sso = new URL(ssoServerUrl)
        if (parsed.origin !== sso.origin) return urlOrPath
        const mapped = remapPath(parsed.pathname)
        if (mapped === parsed.pathname) return urlOrPath
        parsed.pathname = mapped
        return parsed.toString()
    } catch {
        return urlOrPath
    }
}

export function discoveryEndpointAllowed(
    url: string | undefined,
    ssoServerUrl: string,
    isSubProjectApp: boolean,
): boolean {
    if (!url) return false
    try {
        // 对登录中心和子项目统一做安全约束：
        // 仅信任与 ssoServerUrl 同源（同协议/域名/端口）的发现文档地址。
        // 避免 discovery 返回 http 地址导致 HTTPS 页面 mixed-content。
        return new URL(url).origin === new URL(ssoServerUrl).origin
    } catch {
        return false
    }
}

export function applyDiscoveryEndpoints(
    config: SSOConfig,
    discovery: SSODiscoveryDocument,
    isSubProjectApp: boolean,
): void {
    const allowed = (url?: string) => discoveryEndpointAllowed(url, config.ssoServerUrl, isSubProjectApp)
    if (discovery.token_endpoint && allowed(discovery.token_endpoint)) {
        config.tokenEndpoint = normalizeLegacyOAuthEndpoint(discovery.token_endpoint, config.ssoServerUrl)
    }
    if (discovery.userinfo_endpoint && allowed(discovery.userinfo_endpoint)) {
        config.userInfoEndpoint = normalizeLegacyOAuthEndpoint(discovery.userinfo_endpoint, config.ssoServerUrl)
    }
    if (discovery.end_session_endpoint && allowed(discovery.end_session_endpoint)) {
        config.logoutEndpoint = normalizeLegacyOAuthEndpoint(discovery.end_session_endpoint, config.ssoServerUrl)
    }
    if (discovery.check_session_iframe && allowed(discovery.check_session_iframe)) {
        config.checkSessionEndpoint = discovery.check_session_iframe
    }
}

export function resolveOAuthEndpoint(
    ssoServerUrl: string,
    pathOrUrl: string | undefined,
    isSubProjectApp: boolean,
    fallback = '/api/v1/auth/oauth/token',
): string {
    let ep = normalizeLegacyOAuthEndpoint(pathOrUrl || fallback, ssoServerUrl)
    if (isSubProjectApp && /^https?:\/\//i.test(ep)) {
        try {
            if (new URL(ep).origin !== new URL(ssoServerUrl).origin) {
                ep = fallback
            }
        } catch {
            ep = fallback
        }
    }
    if (/^https?:\/\//i.test(ep)) {
        return ep
    }
    const base = (ssoServerUrl || '').replace(/\/$/, '')
    const path = ep.startsWith('/') ? ep : `/${ep}`
    return `${base}${path}`
}
