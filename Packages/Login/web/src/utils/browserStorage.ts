/** 浏览器存储适配。禁止在业务代码里直接写 localStorage / sessionStorage（SSR 会 ReferenceError）。 */

export function isBrowser(): boolean {
    return typeof window !== 'undefined'
}

function readStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
    if (!isBrowser()) return null
    try {
        return window[kind]
    } catch {
        return null
    }
}

export function getLocalStorage(): Storage | null {
    return readStorage('localStorage')
}

export function getSessionStorage(): Storage | null {
    return readStorage('sessionStorage')
}

export function getWebStorage(kind: 'local' | 'session' = 'local'): Storage | null {
    return kind === 'session' ? getSessionStorage() : getLocalStorage()
}

export function readLegacyAuthToken(): string | undefined {
    return getLocalStorage()?.getItem('auth_token') || undefined
}
