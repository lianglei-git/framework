import { globalUserStore } from '../stores/UserStore'

export const SESSION_REVOKED_EVENT = 'auth:session-revoked'

/** 强制退出：其他设备登录或 IdP session 被撤销 */
export function handleForcedLogout(reason?: string): void {
    globalUserStore.clearLocalAuth()
    window.dispatchEvent(
        new CustomEvent(SESSION_REVOKED_EVENT, {
            detail: { reason: reason || '您已在其他设备登录，请重新登录' },
        }),
    )
}

export function isSessionRevokedError(payload: unknown): boolean {
    if (!payload || typeof payload !== 'object') return false
    const err = payload as Record<string, unknown>
    const code = err.error_code || err.errorCode
    return code === 'SESSION_REVOKED'
}
