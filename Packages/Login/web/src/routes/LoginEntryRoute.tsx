import React, { useEffect, useMemo, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useNavigate } from 'react-router-dom'
import { LoginPage } from '../ui/LoginPage'
import { useAuth } from '../hooks/useAuth'
import { handleSSOCallbackResult } from '../utils/handleSSOCallbackResult'
import {
    getLoginEntryMode,
    hasSubAppRedirectContext,
    routeAuthenticatedEntry,
    syncLoginEntryContext,
} from './loginEntry'
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

    useEffect(() => {
        if (!auth.isAuthenticated) return
        routeAuthenticatedEntry(navigate)
    }, [auth.isAuthenticated, navigate])

    if (auth.loadingInfos?.status === 'loading') {
        return <LoginPage />
    }

    if (auth.isAuthenticated && entryMode === 'subapp_redirect' && hasSubAppRedirectContext()) {
        return (
            <div className={styles.pending}>
                <div className={styles.card}>
                    <h2>登录成功</h2>
                    <p>正在返回子应用，若未自动跳转请点击下方按钮。</p>
                    <button
                        type="button"
                        className={styles.primary}
                        onClick={async () => {
                            const ok = await handleSSOCallbackResult({ afterLogin: true })
                            if (!ok) setRedirectBlocked(true)
                        }}
                    >
                        返回应用
                    </button>
                    {redirectBlocked && (
                        <p className={styles.warn}>自动回跳已暂停，请稍后重试或联系管理员检查 SSO 配置。</p>
                    )}
                </div>
            </div>
        )
    }

    if (auth.isAuthenticated) {
        return null
    }

    return <LoginPage entryMode={entryMode} />
})
