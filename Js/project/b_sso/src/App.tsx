import './App.css'
import { useEffect } from 'react'
import { useSubProjectSSO, useTokenRefresh } from '@sparrow/login/hooks'
import { subProjectConfig } from './subprojectConfig'

function formatTokenStatus(status: {
  is_valid?: boolean
  isValid?: boolean
  remaining_seconds?: number
  remaining_minutes?: number
} | null): string {
  if (!status) return '未知'
  const valid = status.is_valid ?? status.isValid
  if (!valid) return '无效'
  const sec = status.remaining_seconds
  if (sec != null) return `有效（约 ${sec} 秒后过期）`
  if (status.remaining_minutes != null) return `有效（约 ${status.remaining_minutes} 分钟后过期）`
  return '有效'
}

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
      console.log('[b_sso] 认证成功', { user: u, token: t?.access_token?.slice(0, 12) })
    },
  })

  const { startMonitoring, stopMonitoring, tokenStatus, isRefreshing, checkTokenStatus } = useTokenRefresh()

  useEffect(() => {
    if (isAuthenticated && subProjectConfig.features.autoRefresh) {
      startMonitoring()
      checkTokenStatus()
      return () => stopMonitoring()
    }
  }, [isAuthenticated, startMonitoring, stopMonitoring, checkTokenStatus])

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
      <h1>APP B (b_sso :5174)</h1>
      {isAuthenticated ? (
        <div>
          <p>欢迎, {user?.name || user?.nickname || user?.email}!</p>
          <p>Token 前缀: {token?.access_token?.slice(0, 20)}…</p>
          <p>续签状态: {isRefreshing ? '刷新中…' : formatTokenStatus(tokenStatus as any)}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => logout()}>登出</button>
            <button type="button" onClick={() => refreshToken()}>手动刷新令牌</button>
            <button type="button" onClick={() => checkTokenStatus()}>检查 Token 状态</button>
            <button
              type="button"
              onClick={() => getUserInfoFetch().catch((e: Error) => alert(e.message))}
            >
              获取用户信息
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => login({ redirect: true })}>SSO 登录</button>
      )}
    </div>
  )
}

export default App
