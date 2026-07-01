const ORIGIN_KEY = 'origin_app_uri'
const PENDING_AUTHORIZE_SESSION_KEY = 'subapp_pending_authorize_url'

/** 登录中心 URL 上携带「登录后回跳的 IdP authorize 地址」的参数名（非 OAuth redirect_uri） */
export const LOGIN_CENTER_AUTHORIZE_PARAM = 'authorize_url'

/** @deprecated 旧参数名，与 OAuth redirect_uri 易混淆；读取时仍兼容 */
const LEGACY_LOGIN_CENTER_RETURN_PARAM = 'redirect_uri'

/** authorize URL 须包含 OIDC 必要参数 */
export function isValidAuthorizeUrl(url: string): boolean {
    try {
        const u = new URL(url)
        if (!u.pathname.includes('/oauth/authorize')) {
            return false
        }
        const q = u.searchParams
        return !!(q.get('client_id') && q.get('redirect_uri') && q.get('response_type'))
    } catch {
        return false
    }
}

/** 从 search 中截取指定 query 参数值（支持值内嵌套 &，用于完整 authorize URL） */
function parseQueryValueFromSearch(search: string, paramName: string): string | null {
    const needle = `${paramName}=`
    const idx = search.indexOf(needle)
    if (idx === -1) return null

    let raw = search.slice(idx + needle.length)
    const logoutIdx = raw.indexOf('&logout=')
    if (logoutIdx !== -1) {
        raw = raw.slice(0, logoutIdx)
    }
    return raw || null
}

/**
 * 从登录中心 URL 解析 IdP authorize 完整地址。
 * 优先 authorize_url；兼容旧版 app_origin + redirect_uri。
 */
export function parseLoginCenterAuthorizeUrlFromSearch(search: string): string | null {
    const fromAuthorizeUrl = parseQueryValueFromSearch(search, LOGIN_CENTER_AUTHORIZE_PARAM)
    if (fromAuthorizeUrl) {
        return fromAuthorizeUrl
    }

    if (search.includes('app_origin') && search.includes(`${LEGACY_LOGIN_CENTER_RETURN_PARAM}=`)) {
        return parseQueryValueFromSearch(search, LEGACY_LOGIN_CENTER_RETURN_PARAM)
    }

    return null
}

/** 子应用回跳上下文是否出现在当前地址栏 query 中 */
export function hasSubAppRedirectInUrl(search: string): boolean {
    if (!search || search === '?') return false
    if (!search.includes('app_origin')) return false
    return (
        search.includes(`${LOGIN_CENTER_AUTHORIZE_PARAM}=`) ||
        search.includes(`${LEGACY_LOGIN_CENTER_RETURN_PARAM}=`)
    )
}

/** 仅从 localStorage 读取，不回填 URL（避免 direct 模式误判） */
export function getStoredOriginAppUri(): string | null {
    const origin = localStorage.getItem(ORIGIN_KEY)
    if (!origin) return null
    try {
        const decoded = decodeURIComponent(origin)
        return isValidAuthorizeUrl(decoded) ? decoded : null
    } catch {
        return isValidAuthorizeUrl(origin) ? origin : null
    }
}

function decodeAuthorizeUrlParam(raw: string): string {
    try {
        return decodeURIComponent(raw)
    } catch {
        return raw
    }
}

/** 从当前 URL 解析并保存子应用回跳的 authorize URL */
export function saveOriginAppUriFromUrl(search = window.location.search): void {
    if (!hasSubAppRedirectInUrl(search)) return

    const params = new URLSearchParams(search)
    if (!params.get('app_origin')) return

    let origin =
        parseLoginCenterAuthorizeUrlFromSearch(search) ||
        params.get(LOGIN_CENTER_AUTHORIZE_PARAM) ||
        null

    if (!origin) return

    origin = decodeAuthorizeUrlParam(origin)

    if (!isValidAuthorizeUrl(origin)) {
        console.warn('⚠️ 忽略不完整的 origin_app_uri:', origin)
        return
    }

    localStorage.setItem(ORIGIN_KEY, origin)
    sessionStorage.setItem(PENDING_AUTHORIZE_SESSION_KEY, origin)
}

/** 记住子应用 authorize URL，供回跳与重新登录后复用 */
export function rememberSubAppAuthorizeUrl(url: string): void {
    if (!isValidAuthorizeUrl(url)) return
    localStorage.setItem(ORIGIN_KEY, url)
    sessionStorage.setItem(PENDING_AUTHORIZE_SESSION_KEY, url)
}

/** 构建登录中心回跳 URL（登录成功后继续 IdP authorize） */
export function buildLoginCenterReturnUrl(
    loginWebOrigin: string,
    authorizeUrl: string,
    options?: { ssoError?: string },
): string {
    const base = loginWebOrigin.replace(/\/$/, '')
    const params = new URLSearchParams()
    params.set('app_origin', 'true')
    params.set(LOGIN_CENTER_AUTHORIZE_PARAM, authorizeUrl)
    if (options?.ssoError) {
        params.set('sso_error', options.ssoError)
    }
    return `${base}/?${params.toString()}`
}

export function clearPendingAuthorizeUrl(): void {
    sessionStorage.removeItem(PENDING_AUTHORIZE_SESSION_KEY)
}

export function clearOriginAppUri(): void {
    localStorage.removeItem(ORIGIN_KEY)
}

/** 清除登录中心保存的子应用回跳上下文（localStorage + sessionStorage） */
export function clearSubAppRedirectContext(): void {
    clearOriginAppUri()
    clearPendingAuthorizeUrl()
}

/** 登录中心回跳 authorize 前清理 URL，避免 bounce-back 时从 query 再次写入 origin */
export function stripSubAppRedirectParamsFromUrl(): void {
    if (typeof window === 'undefined') return
    const search = window.location.search
    if (
        !search.includes('app_origin') &&
        !search.includes(`${LOGIN_CENTER_AUTHORIZE_PARAM}=`) &&
        !search.includes(`${LEGACY_LOGIN_CENTER_RETURN_PARAM}=`)
    ) {
        return
    }
    const { pathname, hash } = window.location
    window.history.replaceState({}, '', `${pathname}${hash}`)
}

/**
 * 用户通过局域网 IP 打开登录中心时，将 authorize URL 中的 localhost 替换为当前 host，
 * 以便与 sso_session_id cookie（按页面 host 写入）同源。
 */
export function resolveAuthorizeUrlForBrowser(authorizeUrl: string): string {
    try {
        const url = new URL(authorizeUrl)
        const pageHost = window.location.hostname
        const localHosts = new Set(['localhost', '127.0.0.1'])
        if (localHosts.has(url.hostname) && !localHosts.has(pageHost)) {
            url.hostname = pageHost
            return url.toString()
        }
    } catch {
        // keep original
    }
    return authorizeUrl
}

export function getOriginAppUri(): string | null {
    return getSubAppAuthorizeUrl()
}

/** 从 localStorage、当前 URL 或 session 备份读取子应用 authorize URL */
export function getSubAppAuthorizeUrl(): string | null {
    if (hasSubAppRedirectInUrl(window.location.search)) {
        saveOriginAppUriFromUrl()
        const fromUrl = getStoredOriginAppUri()
        if (fromUrl) return fromUrl
    }

    const stored = getStoredOriginAppUri()
    if (stored) return stored

    try {
        const pending = sessionStorage.getItem(PENDING_AUTHORIZE_SESSION_KEY)
        if (pending && isValidAuthorizeUrl(pending)) {
            return pending
        }
    } catch {
        // ignore
    }

    return null
}

export function consumeOriginAppUri(): string | null {
    const origin = getOriginAppUri()
    if (!origin) {
        clearOriginAppUri()
        return null
    }
    clearOriginAppUri()
    return origin
}

export function redirectToOriginAppUriIfPresent(): boolean {
    const origin = consumeOriginAppUri()
    if (!origin) return false
    window.location.href = origin
    return true
}
