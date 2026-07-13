import { useSubProjectSSO } from '@zayne/login/hooks'
import { appConfig } from './sso'

export default function App() {
  const { isAuthenticated, user, login, logout, isLoading, error } = useSubProjectSSO({
    customConfig: appConfig,
  })

  if (isLoading) return <main className="page">加载中…</main>

  if (error) {
    return (
      <main className="page">
        <p className="err">{error.message}</p>
        <button type="button" onClick={() => login({ redirect: true })}>重新登录</button>
      </main>
    )
  }

  return (
    <main className="page">
      <h1>c_sso</h1>
      <p className="hint">最简 SDK · 前端 :5175 · 后端 server :5557</p>
      {isAuthenticated ? (
        <>
          <p>你好，{user?.nickname || user?.name || user?.email}</p>
          <button type="button" onClick={() => logout()}>登出</button>
        </>
      ) : (
        <button type="button" onClick={() => login({ redirect: true })}>SSO 登录</button>
      )}
    </main>
  )
}
