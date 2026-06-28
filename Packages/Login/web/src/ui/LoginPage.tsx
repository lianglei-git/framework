import React, { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { RiGithubFill, RiGoogleFill } from 'react-icons/ri'
import { globalUserStore } from '../stores/UserStore'
import { AuthLogin } from '../components/auth/AuthLogin'
import { AuthRegister } from '../components/auth/AuthRegister'
import { TermsOfService } from '../components/legal/TermsOfService'
import { PrivacyPolicy } from '../components/legal/PrivacyPolicy'
import { ForgotPassword } from '../components/ForgotPassword'
import { useAuth } from '../hooks/useAuth'
import { handleSSOCallbackResult } from '../utils/handleSSOCallbackResult'
import './LoginPage.less'

const urlParams = new URLSearchParams(window.location.search)
const githubAccessCode = urlParams.get('code')
const githubState = urlParams.get('state')
let githubAccess = window.localStorage.getItem('github_access')
let isGithubAccess = !!(githubAccessCode && githubAccess)

const getSessionFromCookies = (): { sessionId: string | null; appId: string | null } => {
    try {
        const cookies = document.cookie.split(';').map(cookie => cookie.trim())
        let sessionId: string | null = null
        let appId: string | null = null
        cookies.forEach(cookie => {
            if (cookie.startsWith('sso_session_id=')) {
                sessionId = cookie.substring('sso_session_id='.length)
            }
            if (cookie.startsWith('sso_app_id=')) {
                appId = cookie.substring('sso_app_id='.length)
            }
        })
        return { sessionId, appId }
    } catch (error) {
        console.error('获取 session cookies 失败:', error)
        return { sessionId: null, appId: null }
    }
}

const setSubAppInfoForSessionStorage = () => {
    const subUrlParams = new URLSearchParams(window.location.search)
    const appid = subUrlParams.get('app_id')
    const app_redirect_uri = subUrlParams.get('redirect_uri')
    const app_origin = subUrlParams.get('app_origin')
    if (app_origin) {
        const fixedLen = 'redirect_uri='.length
        const index = window.location.search.indexOf('redirect_uri=')
        if (index !== -1) {
            localStorage.setItem('origin_app_uri', window.location.search.slice(index + fixedLen))
        }
    } else if (appid && app_redirect_uri) {
        localStorage.setItem('appid', appid)
        localStorage.setItem('redirect_uri', app_redirect_uri)
    }
}

export const LoginPage: React.FC = observer(() => {
    const [mode, setMode] = useState<'login' | 'register' | 'forgot-password'>('login')
    const [showTerms, setShowTerms] = useState(false)
    const [showPrivacy, setShowPrivacy] = useState(false)
    const auth = useAuth()

    useEffect(() => {
        setSubAppInfoForSessionStorage()
    }, [])

    // 子项目 SSO：已登录用户带 app_origin 时自动回跳 authorize
    useEffect(() => {
        if (!auth.isAuthenticated) return
        const origin = localStorage.getItem('origin_app_uri')
        if (origin) {
            handleSSOCallbackResult({ user: globalUserStore.info })
        }
    }, [auth.isAuthenticated])

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

    if (auth.isAuthenticated) {
        return (
            <div className="login-container">
                <div className="login-card">
                    <div className="success-state">
                        <div className="success-icon">✓</div>
                        <h2>已登录</h2>
                        <p>欢迎回来，<b style={{ color: '#000' }}>{globalUserStore.nickName}</b></p>
                        <button type="button" onClick={() => auth.ssoLogout()}>退出登录</button>
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
                    <div className={['core', mode].join(' ')}>
                        {mode === 'login' ? (
                            <AuthLogin
                                onSwitchToRegister={() => setMode('register')}
                                onForgotPassword={() => setMode('forgot-password')}
                                onOpenThirdparty={() => {}}
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
