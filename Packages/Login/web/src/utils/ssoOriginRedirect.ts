const ORIGIN_KEY = 'origin_app_uri'

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

/** 从原始 search 截取完整 redirect_uri（避免 URLSearchParams 截断嵌套 &） */
function parseRedirectUriFromSearch(search: string): string | null {
    const idx = search.indexOf('redirect_uri=')
    if (idx === -1) return null

    let raw = search.slice(idx + 'redirect_uri='.length)
    const logoutIdx = raw.indexOf('&logout=')
    if (logoutIdx !== -1) {
        raw = raw.slice(0, logoutIdx)
    }
    return raw || null
}

/** 子应用回跳 URL 是否出现在当前地址栏 query 中 */
export function hasSubAppRedirectInUrl(search: string): boolean {
    if (!search || search === '?') return false
    if (search.includes('app_origin') && search.includes('redirect_uri=')) {
        return true
    }
    const params = new URLSearchParams(search)
    return !!(params.get('app_origin') && (params.get('redirect_uri') || search.includes('redirect_uri=')))
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

/** 从当前 URL 解析并保存子应用回跳的 authorize URL */
export function saveOriginAppUriFromUrl(search = window.location.search): void {
    if (!hasSubAppRedirectInUrl(search)) return

    const params = new URLSearchParams(search)
    if (!params.get('app_origin')) return

    let origin = parseRedirectUriFromSearch(search) || params.get('redirect_uri')
    if (!origin) return

    try {
        origin = decodeURIComponent(origin)
    } catch {
        // keep raw value
    }

    if (!isValidAuthorizeUrl(origin)) {
        console.warn('⚠️ 忽略不完整的 origin_app_uri:', origin)
        return
    }

    localStorage.setItem(ORIGIN_KEY, origin)
}

export function clearOriginAppUri(): void {
    localStorage.removeItem(ORIGIN_KEY)
}

/** 登录中心回跳 authorize 前清理 URL，避免 bounce-back 时从 query 再次写入 origin */
export function stripSubAppRedirectParamsFromUrl(): void {
    if (typeof window === 'undefined') return
    const search = window.location.search
    if (!search.includes('app_origin') && !search.includes('redirect_uri=')) {
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
    const stored = getStoredOriginAppUri()
    if (stored) return stored

    if (hasSubAppRedirectInUrl(window.location.search)) {
        saveOriginAppUriFromUrl()
        return getStoredOriginAppUri()
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
