/**
 * Token刷新功能使用示例
 *
 * 本文件展示了如何在React组件中使用Token刷新功能
 * 适用于其他项目的集成使用
 */

import React, { useEffect, useState } from 'react'
import {
    useSSOTokenRefresh,        // 推荐用于外部项目
    useTokenRefresh,           // 完整功能
    useTokenRefreshEvents,     // 事件监听
    useTokenStatus,            // 状态检查
    useTokenPairLogin,         // 双Token登录
    type TokenRefreshResult,
    type TokenStatus
} from './useTokenRefresh'

// ==========================================
// 示例1: 基础集成（推荐用于新项目）
// ==========================================

export const BasicIntegrationExample: React.FC = () => {
    const tokenRefresh = useSSOTokenRefresh()
    const [credentials, setCredentials] = useState({ account: '', password: '' })
    const [userInfo, setUserInfo] = useState<any>(null)

    // 登录处理
    const handleLogin = async () => {
        try {
            const result: TokenRefreshResult | null = await tokenRefresh.loginWithTokenPair(
                credentials.account,
                credentials.password
            )

            if (result) {
                console.log('登录成功:', result.user)
                setUserInfo(result.user)
            }
        } catch (error) {
            console.error('登录失败:', error)
        }
    }

    // 手动刷新Token
    const handleRefresh = async () => {
        try {
            const result = await tokenRefresh.refreshToken()
            if (result) {
                console.log('Token刷新成功:', result.access_token)
            }
        } catch (error) {
            console.error('Token刷新失败:', error)
        }
    }

    // 启动Token监控
    useEffect(() => {
        tokenRefresh.startMonitoring()

        // 监听Token刷新事件
        const unsubscribe = tokenRefresh.onTokenRefreshed((newToken: string) => {
            console.log('Token已刷新:', newToken)
            // 这里可以更新你的应用状态
            // updateAppToken(newToken)
        })

        return () => {
            tokenRefresh.stopMonitoring()
            unsubscribe()
        }
    }, [])

    return (
        <div className="basic-integration">
            <h2>基础集成示例</h2>

            {!userInfo ? (
                <div>
                    <input
                        type="text"
                        placeholder="账号"
                        value={credentials.account}
                        onChange={(e) => setCredentials(prev => ({ ...prev, account: e.target.value }))}
                    />
                    <input
                        type="password"
                        placeholder="密码"
                        value={credentials.password}
                        onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                    />
                    <button onClick={handleLogin}>登录</button>
                </div>
            ) : (
                <div>
                    <p>欢迎, {userInfo.nickname || userInfo.username}!</p>
                    <p>角色: {userInfo.role}</p>
                    <button onClick={handleRefresh}>刷新Token</button>
                    <p>监控状态: {tokenRefresh.isMonitoring ? '运行中' : '已停止'}</p>
                    <p>刷新状态: {tokenRefresh.isRefreshing ? '刷新中' : '空闲'}</p>
                </div>
            )}
        </div>
    )
}

// ==========================================
// 示例2: 高级集成（完整功能使用）
// ==========================================

export const AdvancedIntegrationExample: React.FC = () => {
    const tokenRefresh = useTokenRefresh()
    const { status, isValid, isExpiringSoon, remainingHours } = useTokenStatus()
    const [lastActivity, setLastActivity] = useState<string>('')

    // 双Token续签
    const handleDoubleTokenRefresh = async () => {
        const result: TokenRefreshResult | null = await tokenRefresh.refreshTokenWithRefreshToken()
        if (result) {
            console.log('双Token续签成功')
            console.log('新Access Token:', result.access_token)
            console.log('用户信息:', result.user)
            setLastActivity(`Token续签成功 - ${new Date().toLocaleTimeString()}`)
        }
    }

    // 简单Token续签（fallback）
    const handleSimpleRefresh = async () => {
        const success = await tokenRefresh.refreshToken()
        if (success) {
            setLastActivity(`简单续签成功 - ${new Date().toLocaleTimeString()}`)
        }
    }

    // 检查Token状态
    const checkStatus = async () => {
        const status = await tokenRefresh.checkTokenStatus()
        console.log('Token状态:', status)
    }

    // 事件监听
    useEffect(() => {
        const unsubscribeRefresh = tokenRefresh.onTokenRefreshed((token: string) => {
            console.log('Token刷新成功:', token)
            setLastActivity(`自动刷新成功 - ${new Date().toLocaleTimeString()}`)
        })

        const unsubscribeExpired = tokenRefresh.onTokenExpired(() => {
            console.log('Token已过期')
            setLastActivity(`Token过期 - ${new Date().toLocaleTimeString()}`)
        })

        const unsubscribeError = tokenRefresh.onRefreshError((error: Error) => {
            console.error('Token刷新失败:', error)
            setLastActivity(`刷新失败 - ${new Date().toLocaleTimeString()}`)
        })

        return () => {
            unsubscribeRefresh()
            unsubscribeExpired()
            unsubscribeError()
        }
    }, [])

    return (
        <div className="advanced-integration">
            <h2>高级集成示例</h2>

            <div className="status-panel">
                <h3>Token状态</h3>
                {status && (
                    <div>
                        <p>Token有效: <strong>{isValid ? '是' : '否'}</strong></p>
                        <p>即将过期: <strong>{isExpiringSoon ? '是' : '否'}</strong></p>
                        <p>剩余小时: <strong>{remainingHours}</strong></p>
                        <p>过期时间: <strong>{status.expires_at}</strong></p>
                        <p>Token类型: <strong>{status.token_type}</strong></p>
                    </div>
                )}
                <button onClick={checkStatus}>检查状态</button>
            </div>

            <div className="control-panel">
                <h3>操作控制</h3>
                <button onClick={handleDoubleTokenRefresh} disabled={tokenRefresh.isRefreshing}>
                    {tokenRefresh.isRefreshing ? '刷新中...' : '双Token续签'}
                </button>
                <button onClick={handleSimpleRefresh} disabled={tokenRefresh.isRefreshing}>
                    简单续签
                </button>
                <button onClick={tokenRefresh.startMonitoring} disabled={tokenRefresh.isMonitoring}>
                    启动监控
                </button>
                <button onClick={tokenRefresh.stopMonitoring} disabled={!tokenRefresh.isMonitoring}>
                    停止监控
                </button>
            </div>

            <div className="activity-panel">
                <h3>活动记录</h3>
                <p>监控状态: <strong>{tokenRefresh.isMonitoring ? '运行中' : '已停止'}</strong></p>
                <p>刷新状态: <strong>{tokenRefresh.isRefreshing ? '刷新中' : '空闲'}</strong></p>
                <p>最后刷新: <strong>{tokenRefresh.lastRefreshTime ? new Date(tokenRefresh.lastRefreshTime).toLocaleString() : '从未'}</strong></p>
                <p>下次刷新: <strong>{tokenRefresh.nextRefreshTime ? new Date(tokenRefresh.nextRefreshTime).toLocaleString() : '未设置'}</strong></p>
                <p>最后活动: <strong>{lastActivity || '无'}</strong></p>
            </div>
        </div>
    )
}

// ==========================================
// 示例3: 事件驱动集成
// ==========================================

export const EventDrivenExample: React.FC = () => {
    const { lastRefresh, refreshError, clearError } = useTokenRefreshEvents()
    const [activityLog, setActivityLog] = useState<string[]>([])

    // 记录Token事件
    useEffect(() => {
        if (lastRefresh) {
            const message = `✅ Token刷新成功 - ${new Date(lastRefresh).toLocaleTimeString()}`
            console.log(message)
            setActivityLog(prev => [message, ...prev.slice(0, 9)]) // 保留最近10条记录
        }
    }, [lastRefresh])

    useEffect(() => {
        if (refreshError) {
            const message = `❌ Token刷新失败 - ${refreshError.message} - ${new Date().toLocaleTimeString()}`
            console.error(message)
            setActivityLog(prev => [message, ...prev.slice(0, 9)])
        }
    }, [refreshError])

    return (
        <div className="event-driven">
            <h2>事件驱动示例</h2>

            <div className="activity-log">
                <h3>活动日志</h3>
                {activityLog.length === 0 ? (
                    <p>暂无活动记录</p>
                ) : (
                    <ul>
                        {activityLog.map((activity, index) => (
                            <li key={index}>{activity}</li>
                        ))}
                    </ul>
                )}
            </div>

            {refreshError && (
                <div className="error-panel">
                    <h3>错误信息</h3>
                    <p>{refreshError.message}</p>
                    <button onClick={clearError}>清除错误</button>
                </div>
            )}
        </div>
    )
}

// ==========================================
// 示例4: 双Token登录专用组件
// ==========================================

export const TokenPairLoginExample: React.FC = () => {
    const { login, isLoading, error, clearError } = useTokenPairLogin()
    const [credentials, setCredentials] = useState({ account: '', password: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!credentials.account || !credentials.password) {
            alert('请输入账号和密码')
            return
        }

        try {
            const result = await login(credentials.account, credentials.password)
            console.log('登录成功:', result)
            alert('登录成功！')
        } catch (error) {
            console.error('登录失败:', error)
            alert('登录失败，请检查账号密码')
        }
    }

    return (
        <div className="token-pair-login">
            <h2>双Token登录示例</h2>

            <form onSubmit={handleSubmit}>
                <div>
                    <label>账号:</label>
                    <input
                        type="text"
                        value={credentials.account}
                        onChange={(e) => setCredentials(prev => ({ ...prev, account: e.target.value }))}
                        placeholder="请输入账号"
                        required
                    />
                </div>

                <div>
                    <label>密码:</label>
                    <input
                        type="password"
                        value={credentials.password}
                        onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="请输入密码"
                        required
                    />
                </div>

                <button type="submit" disabled={isLoading}>
                    {isLoading ? '登录中...' : '登录'}
                </button>
            </form>

            {error && (
                <div className="error-message">
                    <p>错误: {error}</p>
                    <button onClick={clearError}>清除错误</button>
                </div>
            )}
        </div>
    )
}

// ==========================================
// 示例5: 完整应用集成
// ==========================================

export const CompleteIntegrationExample: React.FC = () => {
    const [currentView, setCurrentView] = useState<'login' | 'main' | 'settings'>('login')

    // 使用多个hooks
    const tokenRefresh = useTokenRefresh()
    const { isValid } = useTokenStatus()
    const { lastRefresh, refreshError } = useTokenRefreshEvents()

    // 根据Token状态决定显示哪个组件
    const shouldShowLogin = !isValid

    return (
        <div className="complete-integration">
            <header>
                <h1>完整集成示例</h1>
                <nav>
                    <button onClick={() => setCurrentView('login')} disabled={shouldShowLogin}>
                        登录
                    </button>
                    <button onClick={() => setCurrentView('main')} disabled={shouldShowLogin}>
                        首页
                    </button>
                    <button onClick={() => setCurrentView('settings')} disabled={shouldShowLogin}>
                        设置
                    </button>
                </nav>
            </header>

            <main>
                {currentView === 'login' && <BasicIntegrationExample />}
                {currentView === 'main' && <AdvancedIntegrationExample />}
                {currentView === 'settings' && <EventDrivenExample />}
            </main>

            <footer>
                <div className="status-bar">
                    <span>Token状态: {isValid ? '✅ 有效' : '❌ 无效'}</span>
                    {lastRefresh && (
                        <span>最后刷新: {new Date(lastRefresh).toLocaleTimeString()}</span>
                    )}
                    {refreshError && (
                        <span className="error">错误: {refreshError.message}</span>
                    )}
                </div>
            </footer>
        </div>
    )
}
