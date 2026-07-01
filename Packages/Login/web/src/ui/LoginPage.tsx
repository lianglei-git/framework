import React, { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { RiGithubFill, RiGoogleFill } from 'react-icons/ri'
import { AuthLogin } from '../components/auth/AuthLogin'
import { AuthRegister } from '../components/auth/AuthRegister'
import { TermsOfService } from '../components/legal/TermsOfService'
import { PrivacyPolicy } from '../components/legal/PrivacyPolicy'
import { ForgotPassword } from '../components/ForgotPassword'
import { useAuth } from '../hooks/useAuth'
import { readSsoSessionCookies } from '../utils/ssoSessionCookie'
import { hasSubAppRedirectInUrl } from '../utils/ssoOriginRedirect'
import { consumeSsoErrorFromUrl } from '../utils/ssoErrorHint'
import type { LoginEntryMode } from '../routes/loginEntry'
import './LoginPage.less'

interface LoginPageProps {
    entryMode?: LoginEntryMode
    sessionRevokedHint?: string | null
}

export const LoginPage: React.FC<LoginPageProps> = observer(({ entryMode = 'direct', sessionRevokedHint = null }) => {
    const [mode, setMode] = useState<'login' | 'register' | 'forgot-password'>('login')
    const [showTerms, setShowTerms] = useState(false)
    const [showPrivacy, setShowPrivacy] = useState(false)
    const [ssoErrorHint, setSsoErrorHint] = useState<string | null>(null)
    const auth = useAuth()

    useEffect(() => {
        const message = consumeSsoErrorFromUrl()
        if (message) {
            setSsoErrorHint(message)
        }
    }, [])

    useEffect(() => {
        if (sessionRevokedHint) {
            setSsoErrorHint(sessionRevokedHint)
        }
    }, [sessionRevokedHint])

    useEffect(() => {
        if (entryMode !== 'subapp_redirect') return
        const params = new URLSearchParams(window.location.search)
        if (!params.get('app_origin')) return
        const { sessionId } = readSsoSessionCookies()
        if (!sessionId && auth.isAuthenticated && !auth.isLoading) {
            const timer = window.setTimeout(() => {
                const { sessionId: sid } = readSsoSessionCookies()
                if (!sid && auth.isAuthenticated) {
                    auth.logout()
                }
            }, 800)
            return () => window.clearTimeout(timer)
        }
    }, [auth.isAuthenticated, auth.isLoading, entryMode])

    if (auth.loadingInfos?.status === 'loading') {
        const provider = auth.loadingInfos.provider
        return (
            <div className="login-container">
                <div className="login-card">
                    <div className="success-state github-access">
                        <span className="social-icon" style={{ fontSize: 60 }}>
                            {provider === 'google' ? <RiGoogleFill /> : <RiGithubFill />}
                        </span>
                        <h2>{auth.loadingInfos.message || '授权中...'}</h2>
                        <p style={{ color: '#6b7280', marginTop: 8 }}>正在完成第三方登录，请稍候</p>
                        <button
                            type="button"
                            className="link-btn"
                            style={{ marginTop: 20 }}
                            onClick={() => auth.resetOAuthLoading()}
                        >
                            返回登录
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (mode === 'forgot-password') {
        return (
            <div className="login-container">
                <div className="login-card">
                    <ForgotPassword onBack={() => setMode('login')} onSuccess={() => setMode('login')} />
                </div>
            </div>
        )
    }

    const handleSSOLogin = async (provider: string) => {
        auth.oauthLogin(provider)
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <main>
                    <h1 className="title">{mode === 'login' ? 'Sign in to your account' : '创建新账户'}</h1>
                    {ssoErrorHint && (
                        <p className="sso-error-hint" role="status">
                            {ssoErrorHint}
                        </p>
                    )}
                    {entryMode === 'subapp_redirect' && hasSubAppRedirectInUrl(window.location.search) && (
                        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>
                            登录后将返回来源应用
                        </p>
                    )}
                    <div className={['core', mode].join(' ')}>
                        {mode === 'login' ? (
                            <AuthLogin
                                onSwitchToRegister={() => setMode('register')}
                                onForgotPassword={() => setMode('forgot-password')}
                                ssoService={auth.ssoService}
                                ssoProviders={auth.ssoProviders ?? []}
                                onSSOLogin={handleSSOLogin}
                            />
                        ) : (
                            <AuthRegister onSwitchToLogin={() => setMode('login')} />
                        )}
                    </div>
                    <div className="footer-links">
                        <button type="button" className="footer-link" onClick={() => setShowTerms(true)}>使用条款</button>
                        <span className="separator">·</span>
                        <button type="button" className="footer-link" onClick={() => setShowPrivacy(true)}>隐私政策</button>
                    </div>
                </main>
            </div>
            <TermsOfService visible={showTerms} onClose={() => setShowTerms(false)} />
            <PrivacyPolicy visible={showPrivacy} onClose={() => setShowPrivacy(false)} />
        </div>
    )
})

export { LoginPage as Login }
