import { resolveFileUrl } from './fileRef'

/** @deprecated 使用 resolveFileUrl；保留兼容导出名 */
export function resolveAvatarUrl(stored: string | undefined, apiBase: string): string | undefined {
    return resolveFileUrl(stored, apiBase)
}

export { parseStoredRef, formatStoredRef, resolveFileUrl } from './fileRef'
export type { StoredFileRef, StoredFileScheme } from './fileRef'
