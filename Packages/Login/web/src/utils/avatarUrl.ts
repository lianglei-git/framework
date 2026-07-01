export function resolveAvatarUrl(stored: string | undefined, apiBase: string): string | undefined {
    if (!stored) return undefined

    if (stored.startsWith('http://') || stored.startsWith('https://')) {
        return stored
    }

    if (stored.startsWith('oss:')) {
        const cdnBase = (import.meta.env.VITE_AVATAR_CDN_BASE || '').replace(/\/$/, '')
        const key = stored.slice(4)
        return cdnBase ? `${cdnBase}/${key}` : stored
    }

    if (stored.startsWith('local:')) {
        const key = stored.slice(6)
        return `${apiBase}/api/v1/user/avatar/${encodeURIComponent(key)}`
    }

    return `${apiBase}/api/v1/user/avatar/${encodeURIComponent(stored)}`
}
