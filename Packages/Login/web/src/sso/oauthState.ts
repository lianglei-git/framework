const PKCE_STATE_KEY = 'pkce_state'
const PKCE_VERIFIER_KEY = 'pkce_code_verifier'

export function storePkceState(state: string, codeVerifier: string): void {
    localStorage.setItem(PKCE_STATE_KEY, state)
    localStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier)
}

export function readPkceState(): string | null {
    return localStorage.getItem(PKCE_STATE_KEY)
}

export function clearPkceState(): void {
    localStorage.removeItem(PKCE_STATE_KEY)
    localStorage.removeItem('sso_state')
}

/** Compare URL state with stored value as raw strings (no JSON parse). */
export function verifyOAuthState(urlState: string | undefined | null): void {
    const stored = readPkceState()
    if (!stored || !urlState) {
        return
    }
    if (urlState !== stored) {
        throw new Error('Invalid state parameter - CSRF protection failed')
    }
}
