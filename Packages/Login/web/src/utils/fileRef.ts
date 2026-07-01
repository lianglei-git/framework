export type StoredFileScheme = 'local' | 'oss' | 'external'

export interface StoredFileRef {
    scheme: StoredFileScheme
    path: string
}

export function parseStoredRef(raw: string | undefined | null): StoredFileRef | null {
    const value = raw?.trim()
    if (!value) return null

    if (value.startsWith('http://') || value.startsWith('https://')) {
        return { scheme: 'external', path: value }
    }
    if (value.startsWith('local:')) {
        return { scheme: 'local', path: value.slice(6) }
    }
    if (value.startsWith('oss:')) {
        return { scheme: 'oss', path: value.slice(4) }
    }

    return { scheme: 'local', path: value }
}

export function formatStoredRef(scheme: StoredFileScheme, path: string): string {
    const trimmedPath = path.trim()
    if (scheme === 'external') {
        return trimmedPath
    }
    return `${scheme}:${trimmedPath}`
}

function fileCdnBase(): string {
    const base = import.meta.env.VITE_FILE_CDN_BASE || import.meta.env.VITE_AVATAR_CDN_BASE || ''
    return base.replace(/\/$/, '')
}

export function resolveFileUrl(stored: string | undefined, apiBase: string): string | undefined {
    const ref = parseStoredRef(stored)
    if (!ref) return undefined

    if (ref.scheme === 'external') {
        return ref.path
    }

    if (ref.scheme === 'oss') {
        const cdnBase = fileCdnBase()
        return cdnBase ? `${cdnBase}/${ref.path}` : stored
    }

    const base = apiBase.replace(/\/$/, '')
    return `${base}/api/v1/user/avatar/${encodeURIComponent(ref.path)}`
}
