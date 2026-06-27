import React, { useState } from 'react'
import { globalUserStore } from '../stores/UserStore'
import TestTokenRefresh from './TestTokenRefresh'
import TokenStatus from './TokenStatus'
import SubProjectIntegrationExample from './SubProjectIntegrationExample'
import SubProjectIntegrationDemo from '../examples/SubProjectIntegrationDemo'
import AuthFlowRouter from './AuthFlowRouter'
import AuthDemo from './AuthDemo'
import LoginForm from './LoginForm'
import { formatAuthError } from '../utils/authError'
// 主应用组件
export const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<'demo' | 'login' | 'token-status' | 'test' | 'subproject-integration' | 'integration-demo'>('demo')

    // 简单的登录表单
    const LoginForm: React.FC = () => {
        const [username, setUsername] = useState('')
        const [password, setPassword] = useState('')
        const [isLoading, setIsLoading] = useState(false)
        const [error, setError] = useState<string | null>(null)

        const handleLogin = async (e: React.FormEvent) => {
            e.preventDefault()
            setIsLoading(true)
            setError(null)

            try {
                // 这里应该调用实际的登录API
                // 暂时使用模拟登录
                await new Promise(resolve => setTimeout(resolve, 1000))

                globalUserStore.setUserInfo({
                    id: '1',
                    username: username,
                    email: username,
                    role: 'user',
                    status: 'active',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, 'mock_token_123')

                setCurrentView('token-status')
            } catch (err: any) {
                setError(formatAuthError(err, '登录失败'))
            } finally {
                setIsLoading(false)
            }
        }

        return (
            <div style={{
                maxWidth: '400px',
                margin: '50px auto',
                padding: '30px',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>用户登录</h2>

                {error && (
                    <div style={{
                        padding: '10px',
                        backgroundColor: '#f8d7da',
                        color: '#721c24',
                        border: '1px solid #f5c6cb',
                        borderRadius: '4px',
                        marginBottom: '20px'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                            用户名/邮箱:
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                            密码:
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            fontSize: '16px',
                            opacity: isLoading ? 0.6 : 1
                        }}
                    >
                        {isLoading ? '登录中...' : '登录'}
                    </button>
                </form>
            </div>
        )
    }

    // 导航组件
    const Navigation: React.FC = () => {
        const handleLogout = () => {
            globalUserStore.logout()
            setCurrentView('demo')
        }

        return (
            <nav style={{
                backgroundColor: '#333',
                padding: '15px 20px',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h3 style={{ margin: 0 }}>系统内用户认证演示</h3>
                </div>
                <div>
                    <button
                        onClick={() => setCurrentView('demo')}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: currentView === 'demo' ? '#007bff' : 'transparent',
                            color: 'white',
                            border: '1px solid #007bff',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            marginRight: '10px'
                        }}
                    >
                        演示首页
                    </button>
                    <button
                        onClick={() => setCurrentView('token-status')}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: currentView === 'token-status' ? '#007bff' : 'transparent',
                            color: 'white',
                            border: '1px solid #007bff',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            marginRight: '10px'
                        }}
                    >
                        Token状态
                    </button>
                    <button
                        onClick={() => setCurrentView('test')}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: currentView === 'test' ? '#007bff' : 'transparent',
                            color: 'white',
                            border: '1px solid #007bff',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            marginRight: '10px'
                        }}
                    >
                        完整测试
                    </button>
                    <button
                        onClick={() => setCurrentView('subproject-integration')}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: currentView === 'subproject-integration' ? '#007bff' : 'transparent',
                            color: 'white',
                            border: '1px solid #007bff',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            marginRight: '10px'
                        }}
                    >
                        子项目集成
                    </button>
                    <button
                        onClick={() => setCurrentView('integration-demo')}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: currentView === 'integration-demo' ? '#007bff' : 'transparent',
                            color: 'white',
                            border: '1px solid #007bff',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            marginRight: '10px'
                        }}
                    >
                        集成演示
                    </button>
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        退出登录
                    </button>
                </div>
            </nav>
        )
    }

    // 主内容区域
    const MainContent: React.FC = () => {
        switch (currentView) {
            case 'demo':
                return <AuthDemo />
            // LoginForm={}
            case 'login':
                return (
                    <div style={{ padding: '20px' }}>
                        <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>
                            🏢 中心化用户认证系统
                        </h1>

                        <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                            <h3>🔧 系统架构说明</h3>
                            <ul style={{ lineHeight: '1.8' }}>
                                <li><strong>后端：</strong> unit-auth OAuth 2.1 + OIDC 服务器</li>
                                <li><strong>前端：</strong> 统一认证UI + 子应用分层架构</li>
                                <li><strong>认证方式：</strong> 本地账号 + GitHub + Google + 微信</li>
                                <li><strong>子应用支持：</strong> 按Appid动态配置不同应用</li>
                                <li><strong>安全保障：</strong> PKCE + 标准OAuth流程</li>
                            </ul>
                        </div>

                        <div style={{ marginBottom: '30px' }}>
                            <h3>📱 选择测试应用</h3>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                {[
                                    { id: 'default', name: '默认应用' },
                                    { id: 'user-management', name: '用户管理' },
                                    { id: 'order-management', name: '订单管理' },
                                    { id: 'analytics-dashboard', name: '数据分析' }
                                ].map(app => (
                                    <button
                                        key={app.id}
                                        onClick={() => {
                                            // 更新URL中的appid参数
                                            const url = new URL(window.location.href)
                                            url.searchParams.set('appid', app.id)
                                            window.history.replaceState({}, '', url.toString())
                                            window.location.reload()
                                        }}
                                        style={{
                                            padding: '8px 16px',
                                            backgroundColor: '#007bff',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {app.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <AuthFlowRouter
                            defaultAppId={getAppIdFromURL()}
                            onAuthSuccess={(user, token) => {
                                console.log('✅ 认证成功:', user)
                                globalUserStore.setUserInfo(user, token)
                                setCurrentView('token-status')
                            }}
                            onAuthError={(error) => {
                                console.error('❌ 认证失败:', error)
                                alert(`认证失败: ${error}`)
                            }}
                        />
                    </div>
                )
            case 'token-status':
                return <TokenStatus />
            case 'test':
                return <TestTokenRefresh />
            case 'subproject-integration':
                return <SubProjectIntegrationExample />
            case 'integration-demo':
                return <SubProjectIntegrationDemo />
            default:
                return <LoginForm />
        }
    }

    // 从URL获取Appid
    const getAppIdFromURL = (): string => {
        const urlParams = new URLSearchParams(window.location.search)
        return urlParams.get('appid') || urlParams.get('app_id') || 'default'
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
            {globalUserStore.isLogin ? (
                <>
                    <Navigation />
                    <MainContent />
                </>
            ) : (
                <LoginForm />
            )}
        </div>
    )
}

export default App 