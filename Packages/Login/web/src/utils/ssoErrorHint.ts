import { clearSsoSessionCookies } from './ssoSessionCookie'

const SSO_ERROR_MESSAGES: Record<string, string> = {
    session_not_found: '登录状态已失效，请重新登录',
    user_not_found: '账号状态异常，请重新登录',
}

export function getSsoErrorMessage(code: string | null | undefined): string | null {
    if (!code) return null
    return SSO_ERROR_MESSAGES[code] ?? '登录状态已失效，请重新登录'
}

/** 读取并消费 URL 中的 sso_error，清 cookie，并从地址栏移除该参数 */
export function consumeSsoErrorFromUrl(): string | null {
    if (typeof window === 'undefined') return null

    const params = new URLSearchParams(window.location.search)
    const code = params.get('sso_error')
    if (!code) return null

    clearSsoSessionCookies()

    params.delete('sso_error')
    const search = params.toString()
    const next = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`
    window.history.replaceState({}, '', next)

    return getSsoErrorMessage(code)
}
