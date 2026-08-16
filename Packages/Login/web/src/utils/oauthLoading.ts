import { getLocalStorage, isBrowser } from './browserStorage'

const LOADING_STORAGE_KEY = 'loading_infos'
const OAUTH_QUERY_KEYS = ['code', 'state', 'error', 'error_description', 'error_uri'] as const

export type OAuthLoadingStatus = 'stop' | 'loading'

export interface OAuthLoadingInfo {
    status: OAuthLoadingStatus
    message: string
    provider: string
    time?: number
}

function currentUrl(): URL | null {
    if (!isBrowser()) return null
    return new URL(window.location.href)
}

export function replaceUrlWithoutParams(
    url: URL,
    keys: readonly string[]
): void {
    if (!isBrowser()) return
    keys.forEach((key) => url.searchParams.delete(key))
    const search = url.searchParams.toString()
    const next = `${url.pathname}${search ? `?${search}` : ''}${url.hash}`
    window.history.replaceState({}, document.title, next)
}

export function cleanOAuthParamsFromUrl(url = currentUrl()): void {
    if (!url) return
    replaceUrlWithoutParams(url, OAUTH_QUERY_KEYS)
}

/** 登出回调后移除 logout 参数，避免刷新时反复清空登录态 */
export function stripLogoutParamFromUrl(url = currentUrl()): void {
    if (!url || !url.searchParams.has('logout')) return
    replaceUrlWithoutParams(url, ['logout'])
}

export function hasOAuthCallbackParams(url = currentUrl()): boolean {
    if (!url) return false
    return url.searchParams.has('code') || url.searchParams.has('error')
}

/** 仅在 OAuth 回调进行中才恢复 loading，避免用户中断授权后卡在「授权中」 */
export function readOAuthLoadingInfo(): OAuthLoadingInfo {
    const empty: OAuthLoadingInfo = { status: 'stop', message: '', provider: '' }
    const store = getLocalStorage()
    const url = currentUrl()
    if (!store || !url) return empty

    if (!url.searchParams.has('code')) {
        store.removeItem(LOADING_STORAGE_KEY)
        return empty
    }

    try {
        const raw = store.getItem(LOADING_STORAGE_KEY)
        if (!raw) return { ...empty, status: 'loading', message: '授权中...' }

        const parsed = JSON.parse(raw) as OAuthLoadingInfo
        if (parsed.time && Date.now() - parsed.time > 2 * 60 * 1000) {
            store.removeItem(LOADING_STORAGE_KEY)
            return empty
        }
        return parsed.status === 'loading' ? parsed : empty
    } catch {
        store.removeItem(LOADING_STORAGE_KEY)
        return empty
    }
}

export function writeOAuthLoadingInfo(info: OAuthLoadingInfo): void {
    const store = getLocalStorage()
    if (!store) return
    if (info.status === 'stop') {
        store.removeItem(LOADING_STORAGE_KEY)
        return
    }
    store.setItem(LOADING_STORAGE_KEY, JSON.stringify({ ...info, time: Date.now() }))
}

export function clearOAuthLoadingInfo(): OAuthLoadingInfo {
    getLocalStorage()?.removeItem(LOADING_STORAGE_KEY)
    return { status: 'stop', message: '', provider: '' }
}
