const LOADING_STORAGE_KEY = 'loading_infos'
const OAUTH_QUERY_KEYS = ['code', 'state', 'error', 'error_description', 'error_uri'] as const

export type OAuthLoadingStatus = 'stop' | 'loading'

export interface OAuthLoadingInfo {
    status: OAuthLoadingStatus
    message: string
    provider: string
    time?: number
}

export function cleanOAuthParamsFromUrl(url = new URL(window.location.href)): void {
    OAUTH_QUERY_KEYS.forEach((key) => url.searchParams.delete(key))
    const search = url.searchParams.toString()
    const next = `${url.pathname}${search ? `?${search}` : ''}${url.hash}`
    window.history.replaceState({}, document.title, next)
}

export function hasOAuthCallbackParams(url = new URL(window.location.href)): boolean {
    return url.searchParams.has('code') || url.searchParams.has('error')
}

/** 仅在 OAuth 回调进行中才恢复 loading，避免用户中断授权后卡在「授权中」 */
export function readOAuthLoadingInfo(): OAuthLoadingInfo {
    const empty: OAuthLoadingInfo = { status: 'stop', message: '', provider: '' }
    const url = new URL(window.location.href)

    if (!url.searchParams.has('code')) {
        localStorage.removeItem(LOADING_STORAGE_KEY)
        return empty
    }

    try {
        const raw = localStorage.getItem(LOADING_STORAGE_KEY)
        if (!raw) return { ...empty, status: 'loading', message: '授权中...' }

        const parsed = JSON.parse(raw) as OAuthLoadingInfo
        if (parsed.time && Date.now() - parsed.time > 2 * 60 * 1000) {
            localStorage.removeItem(LOADING_STORAGE_KEY)
            return empty
        }
        return parsed.status === 'loading' ? parsed : empty
    } catch {
        localStorage.removeItem(LOADING_STORAGE_KEY)
        return empty
    }
}

export function writeOAuthLoadingInfo(info: OAuthLoadingInfo): void {
    if (info.status === 'stop') {
        localStorage.removeItem(LOADING_STORAGE_KEY)
        return
    }
    localStorage.setItem(LOADING_STORAGE_KEY, JSON.stringify({ ...info, time: Date.now() }))
}

export function clearOAuthLoadingInfo(): OAuthLoadingInfo {
    localStorage.removeItem(LOADING_STORAGE_KEY)
    return { status: 'stop', message: '', provider: '' }
}
