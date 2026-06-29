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
    // 登出回跳会在末尾追加 &logout=true
    const logoutIdx = raw.indexOf('&logout=')
    if (logoutIdx !== -1) {
        raw = raw.slice(0, logoutIdx)
    }
    return raw || null
}

/** 从当前 URL 解析并保存子应用回跳的 authorize URL */
export function saveOriginAppUriFromUrl(search = window.location.search): void {
    const params = new URLSearchParams(search)
    if (!params.get('app_origin')) return

    // 优先 slice：登出回跳等场景 redirect_uri 未编码时 URLSearchParams 会截断
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

export function getOriginAppUri(): string | null {
    let origin = localStorage.getItem(ORIGIN_KEY)
    if (!origin) {
        saveOriginAppUriFromUrl()
        origin = localStorage.getItem(ORIGIN_KEY)
    }
    if (!origin) return null

    try {
        origin = decodeURIComponent(origin)
    } catch {
        // keep
    }

    return isValidAuthorizeUrl(origin) ? origin : null
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
