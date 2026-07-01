/**
 * Prevents concurrent OAuth authorize builds (silent auto-login vs manual login)
 * from overwriting pkce_state and causing CSRF state mismatch on callback.
 */

let authorizeEpoch = 0

export function beginAuthorizeAttempt(): number {
    return ++authorizeEpoch
}

export function getAuthorizeEpoch(): number {
    return authorizeEpoch
}

/** True when a newer authorize attempt started after `epoch` was issued. */
export function isAuthorizeAttemptStale(epoch: number): boolean {
    return epoch !== authorizeEpoch
}
