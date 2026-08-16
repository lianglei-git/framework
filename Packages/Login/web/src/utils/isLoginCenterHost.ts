/** 登录中心：本地 3033，或与 ssoHomeUrl / auth.znewbie.com 同源 */
export function isLoginCenterHost(
    location: Pick<Location, 'origin' | 'port' | 'hostname'> = window.location,
    ssoHomeUrl?: string | null,
): boolean {
    if (location.port === '3033') return true
    if (location.hostname === 'auth.znewbie.com') return true
    if (!ssoHomeUrl) return false
    try {
        return new URL(ssoHomeUrl).origin === location.origin
    } catch {
        return false
    }
}
