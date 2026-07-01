const PKCE_STATE_KEY = 'pkce_state'
const PKCE_VERIFIER_KEY = 'pkce_code_verifier'
const PKCE_BUNDLE_KEY = 'pkce_oauth_bundle'

export interface PkceBundle {
    state: string
    codeVerifier: string
}

function writeLegacyPkceKeys(state: string, codeVerifier: string): void {
    localStorage.setItem(PKCE_STATE_KEY, state)
    localStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier)
}

/** Commit PKCE only after authorize URL is finalized (not superseded). */
export function commitPkceBundle(state: string, codeVerifier: string): void {
    const bundle: PkceBundle = { state, codeVerifier }
    localStorage.setItem(PKCE_BUNDLE_KEY, JSON.stringify(bundle))
    writeLegacyPkceKeys(state, codeVerifier)
}

export function readPkceBundle(): PkceBundle | null {
    try {
        const raw = localStorage.getItem(PKCE_BUNDLE_KEY)
        if (raw) {
            const parsed = JSON.parse(raw) as PkceBundle
            if (parsed?.state && parsed?.codeVerifier) {
                return parsed
            }
        }
    } catch {
        // fall through to legacy keys
    }

    const state = localStorage.getItem(PKCE_STATE_KEY)
    const codeVerifier = localStorage.getItem(PKCE_VERIFIER_KEY)
    if (state && codeVerifier) {
        return { state, codeVerifier }
    }
    return null
}

export function readPkceState(): string | null {
    return readPkceBundle()?.state ?? null
}

export function readPkceCodeVerifier(): string | null {
    return readPkceBundle()?.codeVerifier ?? null
}

export function clearPkceBundle(): void {
    localStorage.removeItem(PKCE_BUNDLE_KEY)
    localStorage.removeItem(PKCE_STATE_KEY)
    localStorage.removeItem(PKCE_VERIFIER_KEY)
    localStorage.removeItem('sso_state')
}

/**
 * Validate callback state and return the matching code_verifier.
 * Must be called before clearing PKCE storage.
 */
export function validatePkceCallback(urlState: string | undefined | null): string {
    if (!urlState) {
        throw new Error('State parameter is required for security verification')
    }

    const bundle = readPkceBundle()
    if (!bundle?.codeVerifier) {
        throw new Error('PKCE session expired — please log in again')
    }
    if (urlState !== bundle.state) {
        throw new Error('Invalid state parameter - CSRF protection failed')
    }
    return bundle.codeVerifier
}

/** @deprecated use commitPkceBundle */
export function storePkceState(state: string, codeVerifier: string): void {
    commitPkceBundle(state, codeVerifier)
}

/** @deprecated use clearPkceBundle */
export function clearPkceState(): void {
    clearPkceBundle()
}

/** @deprecated use validatePkceCallback */
export function verifyOAuthState(urlState: string | undefined | null): void {
    validatePkceCallback(urlState)
}
