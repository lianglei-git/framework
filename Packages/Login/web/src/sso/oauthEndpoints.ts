import type { SSOConfig, SSODiscoveryDocument } from '../types'

export function discoveryEndpointAllowed(
    url: string | undefined,
    ssoServerUrl: string,
    isSubProjectApp: boolean,
): boolean {
    if (!url) return false
    if (!isSubProjectApp) return true
    try {
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
        config.tokenEndpoint = discovery.token_endpoint
    }
    if (discovery.userinfo_endpoint && allowed(discovery.userinfo_endpoint)) {
        config.userInfoEndpoint = discovery.userinfo_endpoint
    }
    if (discovery.end_session_endpoint && allowed(discovery.end_session_endpoint)) {
        config.logoutEndpoint = discovery.end_session_endpoint
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
    let ep = pathOrUrl || fallback
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
