import React, { useState } from 'react'
import { globalUserStore } from '../stores/UserStore'
import TestTokenRefresh from './TestTokenRefresh'
import TokenStatus from './TokenStatus'

// 主应用组件
export const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<'login' | 'token-status' | 'test'>('login')

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
                setError(err.message || '登录失败')
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
            setCurrentView('login')
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
                    <h3 style={{ margin: 0 }}>Token自动续签测试</h3>
                </div>
                <div>
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
            case 'login':
                return <LoginForm />
            case 'token-status':
                return <TokenStatus />
            case 'test':
                return <TestTokenRefresh />
            default:
                return <LoginForm />
        }
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