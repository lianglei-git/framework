import React, { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { globalUserStore } from './src/stores/UserStore'
import { AuthLogin, AuthRegister, TermsOfService, PrivacyPolicy } from './src'
import './Login.less'
import { ForgotPassword } from './src/components/ForgotPassword'
import { ThirdPartyLogin } from './src'
import { useAuth } from './src'
import { SSOService, createDefaultSSOConfig } from './src/services/sso'

const urlParams = new URLSearchParams(window.location.search);
const githubAccessCode = urlParams.get('code');
const githubState = urlParams.get('state');
let githubAccess = window.sessionStorage.getItem('github_access')

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
      console.error('❌ 获取session cookies失败:', error)
      return { sessionId: null, appId: null }
  }
}

// 设置子应用信息到sessionStorage
const setSubAppInfoForSessionStorage = () => {
  const subUrlParams = new URLSearchParams(window.location.search)
  const appid = subUrlParams.get('app_id');
  const app_redirect_uri = subUrlParams.get('redirect_uri');
  const { sessionId, appId } = getSessionFromCookies();
  if(!sessionId) {
    sessionStorage.setItem("origin_url", window.location.search)
    return
  }
  if (appid && app_redirect_uri) {
    sessionStorage.setItem('appid', appid)
    sessionStorage.setItem('redirect_uri', app_redirect_uri)
  } else {
    console.warn('⚠️ appid or app_redirect_uri is not set')
  }
}
const getSubAppInfoForSessionStorage = () => {
  const appid = sessionStorage.getItem('app_id') || 'centeral_auth';
  const origin_url = sessionStorage.getItem('origin_url');
  const app_redirect_uri = sessionStorage.getItem('redirect_uri');
  return { appid, app_redirect_uri, origin_url }
}

const Login: React.FC = observer(() => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot-password'>('login')
  const [wechatVisible, setWechatVisible] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [ssoService, setSSOService]: [SSOService | null, (service: SSOService | null) => void] = useState<SSOService | null>(null)
  const [ssoProviders, setSSOProviders] = useState<any[]>([])
  const auth = useAuth()

  useEffect(() => {

    // 对于子应用的首次进入的存储子应用的id
    setSubAppInfoForSessionStorage()


    // 初始化SSO服务
    const initSSO = async () => {
      try {
        const ssoConfig = createDefaultSSOConfig()
        const service = new SSOService(ssoConfig)
        console.log("ssoConfig ----->>> ", service);
        await service.initialize()
        setSSOService(service)

        // 加载SSO提供商
        const providers = service.getProviders()
        setSSOProviders(providers)

        // 处理SSO回调（如果有）
        if (service.isInCallbackMode()) {
          console.log('检测到SSO回调，自动处理...')
          try {
            const result = await service.handleAutomaticSSO()
        

            if (result) {
              console.log('SSO回调处理成功:', result)
              handleSSOCallbackResult(result, service)
            }
          } catch (error) {
            console.error('SSO回调处理失败:', error)
            alert(`登录失败: ${error.message}`)
          }
        }
      } catch (error) {
        console.warn('Failed to initialize SSO service:', error)
      }
    }

    initSSO()

    // 处理GitHub OAuth回调
    // if (isGithubAccess && githubAccessCode) {
    //   console.log("githubAccessCode ----->>> ", githubAccessCode);
    //   (async () => {
    //     try {
    //       await auth.oauthLogin?.('github', githubAccessCode, githubState || undefined)
    //     } catch (e) {
    //       console.error('GitHub OAuth login failed:', e)
    //     } finally {
    //       window.sessionStorage.removeItem('github_access')
    //       // 清理URL中的code/state
    //       const url = new URL(window.location.href)
    //       url.searchParams.delete('code')
    //       isGithubAccess = false;
    //       window.history.replaceState({}, document.title, url.toString())
    //     }
    //   })()
    // }
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

  // SSO登录处理
  const handleSSOLogin = async (provider: string) => {
    if (!ssoService) return

    try {
      const authUrl = await ssoService.buildAuthorizationUrl(provider)
      window.location.href = authUrl
      console.log("authUrl::", authUrl)
    } catch (error) {
      console.error('SSO login failed:', error)
      // 可以在这里显示错误消息
    }
  }
  // 处理SSO回调结果
  const handleSSOCallbackResult = async (result: any, service: SSOService) => {
    console.log('SSO登录成功:', result)




    const { app_redirect_uri, appid, origin_url } = getSubAppInfoForSessionStorage()

        // 
        const {sessionId} = getSessionFromCookies();
        // 需要使用sessionId从cookie中发送替代token模式
       const res = await ssoService?.get('/api/v1/auth/oauth/authorize'+origin_url,null, {
          headers: {
            'Authorization': `Bearer ${globalUserStore.token}`
        }
        })
        console.log(res,"resres")
        return;
        
    // window.location.href = 'http://localhost:8080/api/v1/auth/oauth/authorize'+origin_url
    // return;

    // 从URL参数中获取重定向URI
    // const urlParams = new URLSearchParams(window.location.search)
    // const redirectUri = urlParams.get('redirect_uri') || urlParams.get('return_url') || app_redirect_uri
    const redirectUri = app_redirect_uri

    if (!redirectUri) {
      console.warn('⚠️ redirectUri is not set')
      window.location.reload()
      return
    }
    console.log('检测到重定向URI:', redirectUri)

    // 清理当前URL中的SSO参数
    const cleanUrl = new URL(window.location.href)
    cleanUrl.searchParams.delete('code')
    cleanUrl.searchParams.delete('state')
    cleanUrl.searchParams.delete('error')
    cleanUrl.searchParams.delete('error_description')
    cleanUrl.searchParams.delete('redirect_uri')
    cleanUrl.searchParams.delete('return_url')

    // 更新URL而不触发页面重载
    window.history.replaceState({}, document.title, cleanUrl.toString())

    // 构建最终重定向URL，添加认证成功信息
    const finalRedirectUrl = new URL(redirectUri)
    finalRedirectUrl.searchParams.set('user', encodeURIComponent(result.user?.name || result.user?.email || 'User'))

    console.log('重定向到:', finalRedirectUrl.toString())
    window.location.href = finalRedirectUrl.toString()

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
                // 传递SSO相关props
                ssoService={ssoService}
                ssoProviders={ssoProviders}
                onSSOLogin={handleSSOLogin}
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