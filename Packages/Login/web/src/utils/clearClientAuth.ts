import { StorageType } from '../types'
import { getLocalStorage } from './browserStorage'
import { clearOAuthLoadingInfo } from './oauthLoading'
import { clearPkceBundle } from '../sso/oauthState'
import { clearSubAppRedirectContext } from './ssoOriginRedirect'
import { clearAuthorizeRedirectContext } from './oauthRedirectUri'
import { clearSsoSessionCookies } from './ssoSessionCookie'
import { storageManager } from './storage'

export type ClearClientAuthOptions = {
    /** true：只清本应用 token，保留 sso_session_id 供静默恢复 */
    keepIdpCookies?: boolean
}

const AUTH_KEYS = ['auth_data', 'sso_data', 'sso_session'] as const
const LEGACY_LOCAL_KEYS = ['auth_token', 't_remeberInfo', 'loading_infos', 'is_login'] as const

let logoutInProgress = false

export function markLogoutInProgress(): void {
    logoutInProgress = true
}

export function isLogoutInProgress(): boolean {
    return logoutInProgress
}

/** 单测复位；业务代码不要调 */
export function resetLogoutGuardForTests(): void {
    logoutInProgress = false
}

function idTokenFromUnknown(token: unknown): string | null {
    if (!token || typeof token !== 'object') return null
    const id = (token as { id_token?: unknown }).id_token
    return typeof id === 'string' && id ? id : null
}

/** 清仓前先取出 id_token，避免清完再找不到 hint */
export function peekIdToken(): string | null {
    const fromAuth = idTokenFromUnknown(storageManager.getAuthData()?.token)
    if (fromAuth) return fromAuth

    for (const type of [StorageType.LOCAL, StorageType.SESSION]) {
        const data = storageManager.get<{ token?: unknown }>('sso_data', type)
        const id = idTokenFromUnknown(data?.token)
        if (id) return id
    }
    return null
}

export function clearClientAuthStorage(): void {
    for (const key of AUTH_KEYS) {
        storageManager.removeFromBoth(key)
    }
    clearPkceBundle()
    clearOAuthLoadingInfo()
    clearSubAppRedirectContext()
    clearAuthorizeRedirectContext()

    const local = getLocalStorage()
    if (local) {
        for (const key of LEGACY_LOCAL_KEYS) {
            local.removeItem(key)
        }
    }
}

/**
 * 清掉本应用全部认证痕迹。
 * keepIdpCookies=false（默认）时同时清 host cookie，并挡住本页静默恢复。
 */
export function clearClientAuth(options: ClearClientAuthOptions = {}): void {
    if (!options.keepIdpCookies) {
        markLogoutInProgress()
    }
    clearClientAuthStorage()
    if (!options.keepIdpCookies) {
        clearSsoSessionCookies()
    }
}
