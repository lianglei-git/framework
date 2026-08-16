/** 拼 IdP RP-Initiated Logout 地址。无 id_token 也要打，靠 IdP session cookie 撤会话。 */

export function buildOAuthLogoutHref(options: {
    ssoServerUrl: string
    logoutPath?: string
    idTokenHint?: string | null
    postLogoutRedirectUri: string
    state?: string
}): string {
    const path = options.logoutPath || '/api/v1/auth/oauth/logout'
    const base = (options.ssoServerUrl || '').replace(/\/$/, '')
    const endpoint = path.startsWith('http')
        ? path
        : `${base}${path.startsWith('/') ? path : `/${path}`}`

    const query = new URLSearchParams()
    if (options.idTokenHint) {
        query.set('id_token_hint', options.idTokenHint)
    }
    query.set('post_logout_redirect_uri', options.postLogoutRedirectUri)
    if (options.state) {
        query.set('state', options.state)
    }
    return `${endpoint}?${query.toString()}`
}

export function withLogoutQuery(url: string): string {
    if (!url) return url
    if (url.includes('logout=')) return url
    return `${url}${url.includes('?') ? '&' : '?'}logout=true`
}
