import type { NavigateFunction } from 'react-router-dom'
import { handleSSOCallbackResult } from '../utils/handleSSOCallbackResult'
import {
    clearOriginAppUri,
    getOriginAppUri,
    getStoredOriginAppUri,
    hasSubAppRedirectInUrl,
    saveOriginAppUriFromUrl,
} from '../utils/ssoOriginRedirect'

/** 登录中心入口模式 */
export type LoginEntryMode = 'direct' | 'subapp_redirect'

/**
 * 判定规则（产品准则）：
 * - URL 无任何 query 参数 → direct：登录后进 /account
 * - URL 含子应用回跳参数（app_origin + redirect_uri 等）→ subapp_redirect：登录后回子应用
 */
export function getLoginEntryMode(search = typeof window !== 'undefined' ? window.location.search : ''): LoginEntryMode {
    if (!search || search === '?') {
        return 'direct'
    }
    return hasSubAppRedirectInUrl(search) ? 'subapp_redirect' : 'direct'
}

/** 当前是否处于「需要回跳子应用」上下文（URL 或已持久化的 origin） */
export function hasSubAppRedirectContext(search = typeof window !== 'undefined' ? window.location.search : ''): boolean {
    if (hasSubAppRedirectInUrl(search)) {
        return true
    }
    return !!getStoredOriginAppUri()
}

/** 应用启动 / 进入登录页时同步入口上下文 */
export function syncLoginEntryContext(search = typeof window !== 'undefined' ? window.location.search : ''): LoginEntryMode {
    const mode = getLoginEntryMode(search)
    if (mode === 'direct') {
        clearOriginAppUri()
    } else {
        saveOriginAppUriFromUrl(search)
    }
    return mode
}

/** 登录成功后的统一路由决策 */
export function routeAfterLogin(navigate: NavigateFunction): void {
    if (hasSubAppRedirectContext()) {
        void handleSSOCallbackResult({ afterLogin: true })
        return
    }
    navigate('/account', { replace: true })
}

/** 已登录用户访问 / 时的统一处理 */
export function routeAuthenticatedEntry(navigate: NavigateFunction): void {
    if (hasSubAppRedirectContext()) {
        void handleSSOCallbackResult({ afterLogin: true })
        return
    }
    navigate('/account', { replace: true })
}

export function getPendingSubAppRedirectUri(): string | null {
    return getOriginAppUri()
}
