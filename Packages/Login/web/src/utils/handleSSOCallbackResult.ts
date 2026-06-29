import { cleanOAuthParamsFromUrl } from "./oauthLoading"
import { getSSOConfig } from "../sso/config"
import { globalUserStore } from "../stores/UserStore"
import { readSsoSessionCookies } from "./ssoSessionCookie"
import {
    consumeOriginAppUri,
    getOriginAppUri,
    isValidAuthorizeUrl,
    redirectToOriginAppUriIfPresent,
    saveOriginAppUriFromUrl,
} from "./ssoOriginRedirect"

export { saveOriginAppUriFromUrl, getOriginAppUri, redirectToOriginAppUriIfPresent, isValidAuthorizeUrl }

export type SSOCallbackOptions = {
    /** 仅在一次成功的本地/注册登录后设为 true，才允许登录中心跳 authorize */
    afterLogin?: boolean
}

const REDIRECT_GUARD_KEY = 'sso_authorize_redirect_guard'
const REDIRECT_GUARD_MS = 12_000

function isLoginCenterPage(): boolean {
    if (typeof window === 'undefined') return false
    return window.location.port === '3033'
}

function shouldBlockRedirectLoop(authorizeUrl: string): boolean {
    try {
        const raw = sessionStorage.getItem(REDIRECT_GUARD_KEY)
        if (!raw) return false
        const { url, at } = JSON.parse(raw) as { url: string; at: number }
        return url === authorizeUrl && Date.now() - at < REDIRECT_GUARD_MS
    } catch {
        return false
    }
}

function markRedirectAttempt(authorizeUrl: string): void {
    sessionStorage.setItem(
        REDIRECT_GUARD_KEY,
        JSON.stringify({ url: authorizeUrl, at: Date.now() }),
    )
}

function clearRedirectGuard(): void {
    sessionStorage.removeItem(REDIRECT_GUARD_KEY)
}

/** 登录中心：须显式 afterLogin，或已有 IdP session cookie + 本地登录态 */
function canRedirectToOriginAuthorize(opts?: SSOCallbackOptions): boolean {
    if (opts?.afterLogin === true) return true
    if (!isLoginCenterPage()) return true

    const { sessionId } = readSsoSessionCookies()
    if (!sessionId) return false
    return globalUserStore.isLogin
}

// 处理SSO回调结果
export const handleSSOCallbackResult = async (opts?: SSOCallbackOptions) => {
    // 子应用已在 redirect_uri 落地并带 code：本地换 token，勿再跳 authorize
    try {
        const cfg = getSSOConfig()
        const redirectUri = cfg?.redirectUri
        if (redirectUri) {
            const url = new URL(window.location.href)
            if (
                new URL(redirectUri).origin === window.location.origin &&
                url.searchParams.has('code')
            ) {
                cleanOAuthParamsFromUrl(url)
                return false
            }
        }
    } catch {
        // ignore
    }

    saveOriginAppUriFromUrl()

    const origin_app_uri = getOriginAppUri()
    console.log("origin_app_uri::", origin_app_uri)

    if (!origin_app_uri) {
        cleanOAuthParamsFromUrl()
        return false
    }

    if (!isValidAuthorizeUrl(origin_app_uri)) {
        console.warn('⚠️ origin_app_uri 缺少 OAuth 参数，取消回跳:', origin_app_uri)
        cleanOAuthParamsFromUrl()
        return false
    }

    if (shouldBlockRedirectLoop(origin_app_uri)) {
        console.warn('⚠️ 检测到 authorize 回跳循环，已暂停自动跳转，请重新登录')
        return false
    }

    if (!canRedirectToOriginAuthorize(opts)) {
        console.log('登录中心：等待用户登录后再回跳 authorize')
        return false
    }

    if (opts?.afterLogin === true) {
        clearRedirectGuard()
    } else {
        markRedirectAttempt(origin_app_uri)
    }

    consumeOriginAppUri()
    window.location.href = origin_app_uri
    return true
}
