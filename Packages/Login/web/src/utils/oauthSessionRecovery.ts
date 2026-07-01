import { getSSOConfig } from '../sso/config'
import type { SSOService } from '../sso/SSOService'
import { globalUserStore } from '../stores/UserStore'

export type OAuthRecoveryResult = 'recovered' | 'silent_redirect' | 'relogin' | 'skipped'

let recoveryInFlight: Promise<OAuthRecoveryResult> | null = null

/** 延迟加载，避免 SSOService ↔ httpClient 循环依赖 */
async function loadSSOServiceModule() {
    return import('../sso/SSOService')
}

async function resolveSubProjectService(): Promise<SSOService | null> {
    const { SSOService } = await loadSSOServiceModule()
    const inst = SSOService.instance
    if (inst && typeof inst.isSubProjectApp === 'function') {
        return inst
    }
    return null
}

/** 清除本地 token，保留 IdP session cookie 供静默恢复 */
function clearExpiredOAuthTokens(): void {
    globalUserStore.clearAuthTokensOnly()
}

async function promptRelogin(): Promise<void> {
    globalUserStore.clearLocalAuth()
    const { SSOService } = await loadSSOServiceModule()
    SSOService.clearSessionCookies()
    window.dispatchEvent(new Event('auth:re-authorize-session'))
}

async function doRecoverOAuthSession(): Promise<OAuthRecoveryResult> {
    const cfg = getSSOConfig()
    if (!cfg?.clientId) {
        await promptRelogin()
        return 'relogin'
    }

    const service = await resolveSubProjectService()
    if (!service?.isSubProjectApp()) {
        await promptRelogin()
        return 'relogin'
    }

    if (service.isInCallbackMode()) {
        return 'skipped'
    }

    clearExpiredOAuthTokens()

    const recovered = await service.tryRecoverSubProjectSession()
    if (recovered) {
        return 'recovered'
    }

    if (!globalUserStore.isLogin && !service.hasValidSessionCookie()) {
        return 'relogin'
    }

    if (service.hasValidSessionCookie()) {
        await service.trySilentAuthorize()
        return 'silent_redirect'
    }

    await promptRelogin()
    return 'relogin'
}

/** refresh 失败后统一恢复：session-check → silent authorize → 重新登录 */
export function recoverOAuthSessionAfterRefreshFailure(): Promise<OAuthRecoveryResult> {
    if (!recoveryInFlight) {
        recoveryInFlight = doRecoverOAuthSession().finally(() => {
            recoveryInFlight = null
        })
    }
    return recoveryInFlight
}

/** 供 useSubProjectSSO 等复用 */
export async function recoverFromOAuthUnauthorized(): Promise<
    'redirecting' | 'recovered' | 'failed'
> {
    const result = await recoverOAuthSessionAfterRefreshFailure()
    if (result === 'recovered') return 'recovered'
    if (result === 'silent_redirect') return 'redirecting'
    return 'failed'
}
