import React, { useEffect, useMemo, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useNavigate } from 'react-router-dom'
import { LoginPage } from '../ui/LoginPage'
import { useAuth } from '../hooks/useAuth'
import { clearAuthorizeRedirectGuard, handleSSOCallbackResult } from '../utils/handleSSOCallbackResult'
import {
    getLoginEntryMode,
    hasSubAppRedirectContext,
    routeAuthenticatedEntry,
    syncLoginEntryContext,
} from './loginEntry'
import { getSubAppAuthorizeUrl, rememberSubAppAuthorizeUrl } from '../utils/ssoOriginRedirect'
import { isLoginCenterHost } from '../utils/isLoginCenterHost'
import { clearSsoSessionCookies, readSsoSessionCookies } from '../utils/ssoSessionCookie'
import { SESSION_REVOKED_EVENT } from '../utils/forcedLogout'
import { globalUserStore } from '../stores/UserStore'
import styles from './LoginEntryRoute.module.less'

/**
 * 登录中心入口路由：
 * - 无 URL 参数（direct）→ 已登录则 /account
 * - 含回跳参数（subapp_redirect）→ 已登录则回子应用 authorize
 */
export const LoginEntryRoute: React.FC = observer(() => {
    const auth = useAuth()
    const navigate = useNavigate()
    const entryMode = useMemo(() => syncLoginEntryContext(), [])
    const [redirectBlocked, setRedirectBlocked] = useState(false)
    const [sessionRevokedMsg, setSessionRevokedMsg] = useState<string | null>(null)

    useEffect(() => {
        const onRevoked = (event: Event) => {
            const detail = (event as CustomEvent<{ reason?: string }>).detail
            setSessionRevokedMsg(detail?.reason || '您已在其他设备登录，请重新登录')
        }
        window.addEventListener(SESSION_REVOKED_EVENT, onRevoked)
        return () => window.removeEventListener(SESSION_REVOKED_EVENT, onRevoked)
    }, [])

    useEffect(() => {
        if (!auth.isAuthenticated) return
        if (!isLoginCenterHost()) return
        const { sessionId } = readSsoSessionCookies()
        if (!sessionId) {
            globalUserStore.clearLocalAuth()
        }
    }, [auth.isAuthenticated])

    useEffect(() => {
        if (!auth.isAuthenticated) return
        routeAuthenticatedEntry(navigate)
    }, [auth.isAuthenticated, navigate])

    const handleReturnToApp = async () => {
        clearAuthorizeRedirectGuard()
        const ok = await handleSSOCallbackResult({ afterLogin: true })
        if (!ok) setRedirectBlocked(true)
    }

    const handleRelogin = () => {
        const origin = getSubAppAuthorizeUrl()
        clearAuthorizeRedirectGuard()
        clearSsoSessionCookies()
        globalUserStore.clearAuthTokensOnly()
        if (origin) {
            rememberSubAppAuthorizeUrl(origin)
        }
        setRedirectBlocked(false)
    }

    if (auth.loadingInfos?.status === 'loading') {
        return <LoginPage />
    }

    if (auth.isAuthenticated && entryMode === 'subapp_redirect' && hasSubAppRedirectContext()) {
        return (
            <div className={styles.pending}>
                <div className={styles.card}>
                    <h2>登录成功</h2>
                    <p>正在返回子应用，若未自动跳转请点击下方按钮。</p>
                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.primary}
                            onClick={() => void handleReturnToApp()}
                        >
                            返回应用
                        </button>
                        <button
                            type="button"
                            className={styles.secondary}
                            onClick={handleRelogin}
                        >
                            重新登录
                        </button>
                    </div>
                    {redirectBlocked && (
                        <p className={styles.warn}>
                            未能自动返回子应用，请重试「返回应用」或点击「重新登录」后再次输入账号密码。
                        </p>
                    )}
                </div>
            </div>
        )
    }

    if (auth.isAuthenticated) {
        return null
    }

    return <LoginPage entryMode={entryMode} sessionRevokedHint={sessionRevokedMsg} />
})
