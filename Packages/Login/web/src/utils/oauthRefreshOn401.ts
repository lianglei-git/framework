import axios from 'axios'
import { getSSOConfig } from '../sso/config'
import { globalUserStore } from '../stores/UserStore'
import { storage } from './storage'

let refreshInFlight: Promise<boolean> | null = null

/** 子项目 OAuth：用 refresh_token 换一对新 token（并发 401 共用一个请求） */
export function refreshOAuthTokenOnce(): Promise<boolean> {
    if (!refreshInFlight) {
        refreshInFlight = doRefreshOAuthToken().finally(() => {
            refreshInFlight = null
        })
    }
    return refreshInFlight
}

async function doRefreshOAuthToken(): Promise<boolean> {
    const cfg = getSSOConfig()
    if (!cfg?.clientId || !cfg?.ssoServerUrl) {
        return false
    }

    const refreshToken =
        storage.getSSORefreshToken() ||
        (typeof storage.getAuth()?.token === 'object'
            ? storage.getAuth()?.token?.refresh_token
            : null)

    if (!refreshToken) {
        return false
    }

    try {
        const { data } = await axios.post(
            `${cfg.ssoServerUrl}/api/v1/auth/oauth/refresh`,
            {
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000,
            }
        )

        if (!data?.access_token) {
            return false
        }

        const auth = storage.getAuth()
        if (auth) {
            auth.token = data
            storage.saveAuth(auth)
        }
        storage.saveSSOData({
            token: data,
            expires_at: Date.now() + (data.expires_in || 3600) * 1000,
        })
        globalUserStore.syncFromStorage({ notify: false })
        return true
    } catch (error) {
        console.warn('OAuth refresh on 401 failed:', error)
        return false
    }
}

export function shouldAttemptOAuthRefreshOn401(url: string): boolean {
    const cfg = getSSOConfig()
    if (!cfg?.clientId || !cfg?.ssoServerUrl) {
        return false
    }
    const lower = url.toLowerCase()
    if (
        lower.includes('/oauth/refresh') ||
        lower.includes('/oauth/token') ||
        lower.includes('/oauth-login') ||
        lower.includes('/oauth/authorize')
    ) {
        return false
    }
    return true
}
