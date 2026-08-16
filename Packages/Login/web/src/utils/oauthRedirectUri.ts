import { getLocalStorage, isBrowser } from './browserStorage'

const RETURN_TO_KEY = 'sso_return_to'
const AUTHORIZE_REDIRECT_KEY = 'sso_authorize_redirect_uri'
const OAUTH_QUERY_KEYS = ['code', 'state', 'error', 'error_description', 'error_uri'] as const

/** 当前页（去掉 OAuth 回调参数），作为登录后回跳 */
export function currentPageRedirectUri(): string | null {
    if (!isBrowser()) return null
    const url = new URL(window.location.href)
    for (const key of OAUTH_QUERY_KEYS) {
        url.searchParams.delete(key)
    }
    const search = url.searchParams.toString()
    return `${url.origin}${url.pathname}${search ? `?${search}` : ''}${url.hash}`
}

export function sameOriginUrl(a: string, b: string): boolean {
    try {
        return new URL(a).origin === new URL(b).origin
    } catch {
        return false
    }
}

/** OAuth redirect_uri 只允许干净 origin，路径一律剥掉 */
export function toCleanOrigin(url: string | null | undefined): string {
    if (!url) return ''
    try {
        return new URL(url).origin
    } catch {
        return ''
    }
}

export function resolveAuthorizeRedirectUri(options: {
    override?: string | null
    configured?: string | null
} = {}): { redirectUri: string; returnTo: string | null } {
    const current = currentPageRedirectUri()
    const redirectUri =
        toCleanOrigin(options.override)
        || toCleanOrigin(options.configured)
        || toCleanOrigin(current)
        || ''

    const returnTo =
        current && redirectUri && current !== redirectUri && sameOriginUrl(current, redirectUri)
            ? current
            : null

    return { redirectUri, returnTo }
}

export function saveAuthorizeRedirectContext(redirectUri: string, returnTo: string | null): void {
    const store = getLocalStorage()
    if (!store) return
    const clean = toCleanOrigin(redirectUri)
    if (clean) store.setItem(AUTHORIZE_REDIRECT_KEY, clean)
    else store.removeItem(AUTHORIZE_REDIRECT_KEY)
    if (returnTo) store.setItem(RETURN_TO_KEY, returnTo)
    else store.removeItem(RETURN_TO_KEY)
}

export function readAuthorizeRedirectUri(): string | null {
    return toCleanOrigin(getLocalStorage()?.getItem(AUTHORIZE_REDIRECT_KEY)) || null
}

export function consumeReturnTo(): string | null {
    const store = getLocalStorage()
    if (!store) return null
    const value = store.getItem(RETURN_TO_KEY)
    store.removeItem(RETURN_TO_KEY)
    return value
}

export function clearAuthorizeRedirectContext(): void {
    const store = getLocalStorage()
    if (!store) return
    store.removeItem(AUTHORIZE_REDIRECT_KEY)
    store.removeItem(RETURN_TO_KEY)
}

/** 登录成功后回到发起页；跨域地址丢弃 */
export function applyReturnTo(returnTo?: string | null): boolean {
    if (!returnTo || !isBrowser()) return false
    if (!sameOriginUrl(returnTo, window.location.href)) return false
    const here = currentPageRedirectUri()
    if (here === returnTo) return false
    window.location.replace(returnTo)
    return true
}
