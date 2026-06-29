/**
 * Host-level SSO session cookies (shared across localhost ports for cross-app SSO).
 */

export function getSsoCookieDomain(): string | undefined {
    if (typeof window === 'undefined') return undefined
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') {
        return undefined
    }
    const parts = host.split('.')
    if (parts.length >= 2) {
        return '.' + parts.slice(-2).join('.')
    }
    return undefined
}

function cookieBaseAttrs(): string {
    const domain = getSsoCookieDomain()
    const domainPart = domain ? `; domain=${domain}` : ''
    const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
    return `path=/; SameSite=Lax${secure}${domainPart}`
}

export function writeSsoSessionCookies(sessionId: string, appId: string): void {
    if (!sessionId) return
    const maxAge = 30 * 24 * 60 * 60
    const base = cookieBaseAttrs()
    document.cookie = `sso_session_id=${encodeURIComponent(sessionId)}; max-age=${maxAge}; ${base}`
    if (appId) {
        document.cookie = `sso_app_id=${encodeURIComponent(appId)}; max-age=${maxAge}; ${base}`
    }
}

export function readSsoSessionCookies(): { sessionId: string | null; appId: string | null } {
    try {
        let sessionId: string | null = null
        let appId: string | null = null
        document.cookie.split(';').map(c => c.trim()).forEach(cookie => {
            if (cookie.startsWith('sso_session_id=')) {
                sessionId = decodeURIComponent(cookie.substring('sso_session_id='.length))
            }
            if (cookie.startsWith('sso_app_id=')) {
                appId = decodeURIComponent(cookie.substring('sso_app_id='.length))
            }
        })
        return { sessionId, appId }
    } catch {
        return { sessionId: null, appId: null }
    }
}

export function clearSsoSessionCookies(): void {
    const domain = getSsoCookieDomain()
    const domainPart = domain ? `; domain=${domain}` : ''
    const expires = 'expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = `sso_session_id=; path=/; ${expires}${domainPart}`
    document.cookie = `sso_app_id=; path=/; ${expires}${domainPart}`
}
