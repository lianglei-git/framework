import React, { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { globalUserStore } from './src/stores/UserStore'
import { AuthLogin, AuthRegister, TermsOfService, PrivacyPolicy } from './src'
import './Login.less'
import { ForgotPassword } from './src/components/ForgotPassword'
import { ThirdPartyLogin } from './src'
import { useAuth } from './src'

const urlParams = new URLSearchParams(window.location.search);
const githubAccessCode = urlParams.get('code');
const githubState = urlParams.get('state');
let githubAccess = window.sessionStorage.getItem('github_access')

let isGithubAccess = !!(githubAccessCode && githubAccess)


const Login: React.FC = observer(() => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot-password'>('login')
  const [wechatVisible, setWechatVisible] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const auth = useAuth()

  useEffect(() => {
    if (isGithubAccess && githubAccessCode) {
      console.log("githubAccessCode ----->>> ", githubAccessCode);
      (async () => {
        try {
          await auth.oauthLogin?.('github', githubAccessCode, githubState || undefined)
        } catch (e) {
          console.error('GitHub OAuth login failed:', e)
        } finally {
          window.sessionStorage.removeItem('github_access')
          // 清理URL中的code/state
          const url = new URL(window.location.href)
          url.searchParams.delete('code')
          url.searchParams.delete('state')
          isGithubAccess = false;
          window.history.replaceState({}, document.title, url.toString())
        }
      })()
    }
  }, [])

  // 加载组件（GitHub授权中）
  if (isGithubAccess) {
    return <div className="login-container">
      <div className="login-card">
        <div className="success-state github-access">
          <span className="social-icon" style={{ fontSize: 60 }}><i class="ri-github-fill"></i></span>
          <h2>授权中...</h2>
        </div>
      </div>
    </div>
  }

  // 已登录
  if (globalUserStore.isLogin) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="success-state">
            <div className="success-icon">✓</div>
            <h2>已登录</h2>
            <p>欢迎回来，<b style={{ color: '#000' }}>{globalUserStore.nickName}</b></p>
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

  return (
    <div className="login-container">
      <div className="login-card">
        <main>
          <h1 className="title">{mode === 'login' ? 'Sign in to your account' : '创建新账户'}</h1>

          <div className={["core", mode].join(' ')}>
            {mode === 'login' ? (
              <AuthLogin
                onSwitchToRegister={() => setMode('register')}
                onForgotPassword={() => setMode('forgot-password')}
                onOpenThirdparty={() => setWechatVisible(true)}
              />
            ) : (
              <AuthRegister onSwitchToLogin={() => setMode('login')} />
            )}
          </div>

          <div className="footer-links">
            <button className="footer-link" onClick={() => setShowTerms(true)}>使用条款</button>
            <span className="separator">·</span>
            <button className="footer-link" onClick={() => setShowPrivacy(true)}>隐私政策</button>
          </div>
        </main>
      </div>

      <ThirdPartyLogin visible={wechatVisible} onClose={() => setWechatVisible(false)} />
      <TermsOfService visible={showTerms} onClose={() => setShowTerms(false)} />
      <PrivacyPolicy visible={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </div>
  )
})

export { Login }