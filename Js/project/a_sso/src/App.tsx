import './App.css'
import { useEffect } from 'react'
import { useSubProjectSSO, useTokenRefresh } from '@sparrow/login/hooks'
import { subProjectConfig } from './subprojectConfig'

function App() {
  const {
    isAuthenticated,
    user,
    token,
    login,
    logout,
    isLoading,
    refreshToken,
    error,
    getUserInfoFetch,
  } = useSubProjectSSO({
    customConfig: subProjectConfig,
    subProjectId: subProjectConfig.id,
    onSuccess: (u, t) => {
      console.log('[a_sso] 认证成功', { user: u, token: t?.access_token?.slice(0, 12) })
    },
  })

  const { startMonitoring, stopMonitoring, tokenStatus, isRefreshing } = useTokenRefresh()

  useEffect(() => {
    if (isAuthenticated && subProjectConfig.features.autoRefresh) {
      startMonitoring()
      return () => stopMonitoring()
    }
  }, [isAuthenticated, startMonitoring, stopMonitoring])

  if (isLoading) {
    return <div className="app"><p>加载中...</p></div>
  }

  if (error) {
    return (
      <div className="app">
        <p>错误: {error.message}</p>
        <button type="button" onClick={() => login({ redirect: true })}>重新登录</button>
      </div>
    )
  }

  return (
    <div className="app">
      <h1>APP A (a_sso :5173)</h1>
      {isAuthenticated ? (
        <div>
          <p>欢迎, {user?.name || user?.nickname || user?.email}!</p>
          <p>Token 前缀: {token?.access_token?.slice(0, 20)}…</p>
          {tokenStatus && (
            <p>续签状态: {isRefreshing ? '刷新中' : tokenStatus.isValid ? '有效' : '无效'}</p>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => logout()}>登出</button>
            <button type="button" onClick={() => refreshToken()}>手动刷新令牌</button>
            <button type="button" onClick={() => getUserInfoFetch()}>获取用户信息</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => login({ redirect: true })}>SSO 登录</button>
      )}
    </div>
  )
}

export default App
