import { useState } from 'react'
import { useSSO } from './hooks/useSSO'
import LoginButton from './components/LoginButton'
import './App.css'

function App() {
  const [showDetails, setShowDetails] = useState(false)

  const {
    isAuthenticated,
    user,
    token,
    session,
    error,
    clearError
  } = useSSO({
    onSuccess: (user, token, session) => {
      console.log('SSO登录成功:', { user, token, session })
    },
    onError: (error) => {
      console.error('SSO登录失败:', error)
    },
    onLogout: () => {
      console.log('用户已登出')
    }
  })

  return (
    <div className="app">
      <header className="app-header">
        <h1>SSOA - Sparrow SSO 演示</h1>
        <p>单点登录集成演示</p>
      </header>

      <main className="app-main">
        <div className="sso-demo-container">
          <div className="sso-demo-header">
            <h2>🔐 SSO登录演示</h2>
            <p>体验Sparrow SSO系统的强大功能</p>
          </div>

          <div className="sso-demo-content">
            {/* 错误显示 */}
            {error && (
              <div className="error-banner">
                <span>⚠️ {error.message}</span>
                <button onClick={clearError} className="close-error">✕</button>
              </div>
            )}

            {/* 认证状态卡片 */}
            <div className="status-card">
              <div className="status-indicator">
                <div className={`status-dot ${isAuthenticated ? 'authenticated' : 'unauthenticated'}`}></div>
                <span className="status-text">
                  {isAuthenticated ? '已认证' : '未认证'}
                </span>
              </div>

              {isAuthenticated && user && (
                <div className="user-card">
                  <div className="user-avatar">
                    <img
                      src={user.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                      alt="用户头像"
                    />
                  </div>
                  <div className="user-info">
                    <h3>{user.name || '用户'}</h3>
                    <p>{user.email}</p>
                    <small>用户ID: {user.sub}</small>
                  </div>
                </div>
              )}
            </div>

            {/* 登录按钮组 */}
            <div className="login-buttons">
              <LoginButton
                provider="local"
                onSuccess={(user, token, session) => {
                  console.log('本地登录成功:', user)
                }}
              >
                🔐 使用 SSO 登录
              </LoginButton>

              <LoginButton
                provider="github"
                onSuccess={(user, token, session) => {
                  console.log('GitHub登录成功:', user)
                }}
              >
                🐙 使用 GitHub 登录
              </LoginButton>

              <LoginButton
                provider="google"
                onSuccess={(user, token, session) => {
                  console.log('Google登录成功:', user)
                }}
              >
                🌐 使用 Google 登录
              </LoginButton>

              <LoginButton
                provider="wechat"
                onSuccess={(user, token, session) => {
                  console.log('微信登录成功:', user)
                }}
              >
                💬 使用 微信 登录
              </LoginButton>
            </div>

            {/* 详细信息切换 */}
            <div className="details-toggle">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="toggle-button"
              >
                {showDetails ? '隐藏' : '显示'}详细信息
              </button>
            </div>

            {/* 详细信息 */}
            {showDetails && (
              <div className="details-panel">
                {isAuthenticated && token && session && (
                  <div className="details-grid">
                    <div className="detail-section">
                      <h4>🔑 令牌信息</h4>
                      <div className="detail-item">
                        <span className="detail-label">令牌类型:</span>
                        <span className="detail-value">{token.token_type}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">访问令牌:</span>
                        <span className="detail-value token-value">
                          {token.access_token.substring(0, 50)}...
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">过期时间:</span>
                        <span className="detail-value">
                          {new Date((token.expires_at || 0) * 1000).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="detail-section">
                      <h4>👤 会话信息</h4>
                      <div className="detail-item">
                        <span className="detail-label">会话ID:</span>
                        <span className="detail-value">{session.session_id}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">最后活动:</span>
                        <span className="detail-value">
                          {new Date((session.last_activity || 0) * 1000).toLocaleString()}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">客户端ID:</span>
                        <span className="detail-value">{session.client_id}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="usage-info">
                  <h4>📖 使用说明</h4>
                  <ul>
                    <li>点击任意登录按钮进行SSO认证</li>
                    <li>认证成功后会显示用户信息</li>
                    <li>点击"显示详细信息"查看令牌和会话信息</li>
                    <li>点击用户头像旁边的"登出"按钮退出登录</li>
                    <li>系统会自动处理令牌刷新，无需手动干预</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p>SSOA - Sparrow SSO 演示应用</p>
        <p>基于 React + TypeScript + Vite 构建</p>
      </footer>
    </div>
  )
}

export default App
