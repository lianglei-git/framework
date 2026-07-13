import { useEffect, useState } from 'react'
import { useSubProjectSSO } from '@zayne/login/hooks'
import { readSsoSessionCookies } from '@zayne/login/utils/ssoSessionCookie'
import { appConfig } from './sso'
import { TestPanel } from './TestPanel'

function detectSessionCookie(): boolean {
  return !!readSsoSessionCookies().sessionId
}

export default function App() {
  const sso = useSubProjectSSO({ customConfig: appConfig })
  const { isAuthenticated, login, isLoading, error } = sso
  const [hasSessionCookie, setHasSessionCookie] = useState(false)

  useEffect(() => {
    const check = () => setHasSessionCookie(detectSessionCookie())
    check()
    const id = setInterval(check, 1000)
    return () => clearInterval(id)
  }, [isAuthenticated])

  const showTestPanel = isAuthenticated || hasSessionCookie

  if (isLoading) {
    return (
      <div className="page-center">
        <div className="spinner" />
        <p>初始化中…</p>
      </div>
    )
  }

  if (!showTestPanel) {
    return (
      <div className="page-center">
        <h1 className="app-title">My SSO App</h1>
        <p className="hint">unitauthsdk 脚手架 · 前端 :5176 · BFF :5558</p>
        {error && <p className="err">{error.message}</p>}
        <button type="button" className="btn btn-primary btn-lg" onClick={() => login({ redirect: true })}>
          SSO 登录
        </button>
      </div>
    )
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <span className="app-title">My SSO App</span>
        <span className="hint">FE :5176 · BFF :5558 · IdP :8080</span>
      </header>
      {!isAuthenticated && hasSessionCookie && (
        <p className="session-hint">本地 token 已清空，IdP session cookie 仍在。</p>
      )}
      <TestPanel sso={sso} onAuthChange={() => setHasSessionCookie(detectSessionCookie())} />
    </div>
  )
}
