import React, { useEffect, useState } from 'react'
import { globalUserStore } from '../stores/UserStore'
import tokenRefreshService from '../services/tokenRefreshService'
import apiClient from '../services/axiosInterceptor'

// Token状态类型
interface TokenStatus {
    is_valid: boolean
    expires_at: string
    remaining_hours: number
    remaining_minutes: number
    is_expiring_soon: boolean
    token_type: string
}

// 测试Token刷新组件
export const TestTokenRefresh: React.FC = () => {
    const [username, setUsername] = useState('test@example.com')
    const [password, setPassword] = useState('password123')
    const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null)
    const [isMonitoring, setIsMonitoring] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [operationLog, setOperationLog] = useState<string[]>([])
    const [eventLog, setEventLog] = useState<string[]>([])

    // 日志函数
    const log = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
        const timestamp = new Date().toLocaleTimeString()
        const logMessage = `[${timestamp}] ${message}`
        setOperationLog(prev => [...prev, logMessage])

        if (type === 'error') {
            setError(message)
        } else {
            setError(null)
        }
    }

    // 更新事件日志
    const updateEventLog = (eventType: string, data: any) => {
        const timestamp = new Date().toLocaleTimeString()
        const eventMessage = `[${timestamp}] ${eventType}: ${JSON.stringify(data, null, 2)}`
        setEventLog(prev => [...prev, eventMessage])
    }

    // 检查token状态
    const checkTokenStatus = async () => {
        try {
            setIsLoading(true)
            log('检查Token状态...', 'info')

            const status = await tokenRefreshService.checkTokenStatus()
            setTokenStatus(status)

            if (status) {
                log('Token状态检查完成', 'success')
            } else {
                log('Token状态检查失败', 'error')
            }
        } catch (err: any) {
            log(`Token状态检查错误: ${err.message}`, 'error')
        } finally {
            setIsLoading(false)
        }
    }

    // 手动续签token
    const handleRefreshToken = async () => {
        try {
            setIsLoading(true)
            log('手动续签Token...', 'info')

            const result = await tokenRefreshService.refreshToken()
            if (result) {
                await checkTokenStatus()
                log('Token手动续签成功', 'success')
            } else {
                log('Token手动续签失败', 'error')
            }
        } catch (err: any) {
            log(`Token手动续签错误: ${err.message}`, 'error')
        } finally {
            setIsLoading(false)
        }
    }

    // 测试登录
    const testLogin = async () => {
        try {
            log('开始登录...', 'info')

            const response = await apiClient.post('/api/v1/auth/login', {
                account: username,
                password: password
            })

            if (response.data.code === 200) {
                globalUserStore.setUserInfo(response.data.data.user, response.data.data.token)
                log('登录成功', 'success')
            } else {
                log(`登录失败: ${response.data.message}`, 'error')
            }
        } catch (error: any) {
            log(`登录错误: ${error.message}`, 'error')
        }
    }

    // 测试记住我登录
    const testLoginWithRemember = async () => {
        try {
            log('开始记住我登录...', 'info')

            const result = await tokenRefreshService.loginWithRememberMe(username, password)

            if (result) {
                log('记住我登录成功', 'success')
            } else {
                log('记住我登录失败', 'error')
            }
        } catch (error: any) {
            log(`记住我登录错误: ${error.message}`, 'error')
        }
    }

    // 启动/停止监控
    const toggleMonitoring = () => {
        if (isMonitoring) {
            tokenRefreshService.stopTokenMonitoring()
            setIsMonitoring(false)
            log('Token监控已停止', 'success')
        } else {
            tokenRefreshService.startTokenMonitoring()
            setIsMonitoring(true)
            log('Token监控已启动', 'success')
        }
    }

    // 测试API调用
    const testApiCall = async () => {
        try {
            log('测试API调用...', 'info')

            const response = await apiClient.get('/api/v1/user/profile')

            if (response.data.code === 200) {
                log('API调用成功', 'success')
            } else {
                log(`API调用失败: ${response.data.message}`, 'error')
            }
        } catch (error: any) {
            log(`API调用错误: ${error.message}`, 'error')
        }
    }

    // 清除日志
    const clearLogs = () => {
        setOperationLog([])
        setEventLog([])
        setError(null)
    }

    // 初始化事件监听
    useEffect(() => {
        // Token自动续签事件
        const handleTokenAutoRefreshed = (event: CustomEvent) => {
            log(`Token自动续签成功: ${event.detail.newToken.substring(0, 20)}...`, 'success')
            updateEventLog('token:auto-refreshed', event.detail)
            checkTokenStatus()
        }

        // Token手动续签事件
        const handleTokenRefreshed = (event: CustomEvent) => {
            log(`Token手动续签成功: ${event.detail.newToken.substring(0, 20)}...`, 'success')
            updateEventLog('token:refreshed', event.detail)
            checkTokenStatus()
        }

        // 认证过期事件
        const handleAuthExpired = () => {
            log('用户认证已过期，请重新登录', 'error')
            updateEventLog('auth:expired', {})
            setTokenStatus(null)
            setIsMonitoring(false)
        }

        // 登录事件
        const handleAuthLogin = () => {
            log('用户登录成功', 'success')
            updateEventLog('auth:login', {})
        }

        window.addEventListener('token:auto-refreshed', handleTokenAutoRefreshed as EventListener)
        window.addEventListener('token:refreshed', handleTokenRefreshed as EventListener)
        window.addEventListener('auth:expired', handleAuthExpired)
        window.addEventListener('auth:login', handleAuthLogin)

        // 初始化日志
        log('Token自动续签测试页面已加载', 'info')

        return () => {
            window.removeEventListener('token:auto-refreshed', handleTokenAutoRefreshed as EventListener)
            window.removeEventListener('token:refreshed', handleTokenRefreshed as EventListener)
            window.removeEventListener('auth:expired', handleAuthExpired)
            window.removeEventListener('auth:login', handleAuthLogin)
        }
    }, [])

    return (
        <div style={{
            fontFamily: 'Arial, sans-serif',
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '20px',
            backgroundColor: '#f5f5f5',
            minHeight: '100vh'
        }}>
            <div style={{
                background: 'white',
                padding: '30px',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}>
                <h1 style={{ textAlign: 'center', color: '#333', marginBottom: '30px' }}>
                    Token自动续签功能测试
                </h1>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* 左侧：操作面板 */}
                    <div>
                        {/* 登录测试 */}
                        <div style={{
                            marginBottom: '30px',
                            padding: '20px',
                            border: '1px solid #e0e0e0',
                            borderRadius: '6px',
                            backgroundColor: '#f8f9fa'
                        }}>
                            <h3 style={{ marginTop: '0', color: '#333' }}>1. 登录测试</h3>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    用户名/邮箱:
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    密码:
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            <div>
                                <button
                                    onClick={testLogin}
                                    disabled={isLoading}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: '#007bff',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: isLoading ? 'not-allowed' : 'pointer',
                                        marginRight: '10px',
                                        opacity: isLoading ? 0.6 : 1
                                    }}
                                >
                                    登录
                                </button>
                                <button
                                    onClick={testLoginWithRemember}
                                    disabled={isLoading}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: isLoading ? 'not-allowed' : 'pointer',
                                        opacity: isLoading ? 0.6 : 1
                                    }}
                                >
                                    记住我登录
                                </button>
                            </div>
                        </div>

                        {/* Token状态检查 */}
                        <div style={{
                            marginBottom: '30px',
                            padding: '20px',
                            border: '1px solid #e0e0e0',
                            borderRadius: '6px',
                            backgroundColor: '#f8f9fa'
                        }}>
                            <h3 style={{ marginTop: '0', color: '#333' }}>2. Token状态检查</h3>
                            <button
                                onClick={checkTokenStatus}
                                disabled={isLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: isLoading ? 'not-allowed' : 'pointer',
                                    marginRight: '10px',
                                    opacity: isLoading ? 0.6 : 1
                                }}
                            >
                                {isLoading ? '检查中...' : '检查Token状态'}
                            </button>
                            <button
                                onClick={handleRefreshToken}
                                disabled={isLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#ffc107',
                                    color: 'black',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: isLoading ? 'not-allowed' : 'pointer',
                                    opacity: isLoading ? 0.6 : 1
                                }}
                            >
                                {isLoading ? '续签中...' : '手动续签Token'}
                            </button>
                        </div>

                        {/* 自动续签监控 */}
                        <div style={{
                            marginBottom: '30px',
                            padding: '20px',
                            border: '1px solid #e0e0e0',
                            borderRadius: '6px',
                            backgroundColor: '#f8f9fa'
                        }}>
                            <h3 style={{ marginTop: '0', color: '#333' }}>3. 自动续签监控</h3>
                            <button
                                onClick={toggleMonitoring}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: isMonitoring ? '#dc3545' : '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    marginRight: '10px'
                                }}
                            >
                                {isMonitoring ? '停止监控' : '启动监控'}
                            </button>
                            <button
                                onClick={testApiCall}
                                disabled={isLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#17a2b8',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: isLoading ? 'not-allowed' : 'pointer',
                                    opacity: isLoading ? 0.6 : 1
                                }}
                            >
                                测试API调用
                            </button>
                        </div>

                        {/* 错误显示 */}
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

                        {/* Token状态显示 */}
                        {tokenStatus && (
                            <div style={{
                                padding: '20px',
                                backgroundColor: '#f8f9fa',
                                border: '1px solid #e9ecef',
                                borderRadius: '6px',
                                marginBottom: '20px'
                            }}>
                                <h3>Token状态信息</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <strong>状态:</strong>
                                        <span style={{
                                            color: tokenStatus.is_valid ? '#28a745' : '#dc3545',
                                            marginLeft: '10px'
                                        }}>
                                            {tokenStatus.is_valid ? '有效' : '无效'}
                                        </span>
                                    </div>
                                    <div>
                                        <strong>类型:</strong> {tokenStatus.token_type}
                                    </div>
                                    <div>
                                        <strong>过期时间:</strong> {tokenStatus.expires_at}
                                    </div>
                                    <div>
                                        <strong>剩余时间:</strong> {tokenStatus.remaining_hours}小时{tokenStatus.remaining_minutes}分钟
                                    </div>
                                    <div>
                                        <strong>即将过期:</strong>
                                        <span style={{
                                            color: tokenStatus.is_expiring_soon ? '#ffc107' : '#28a745',
                                            marginLeft: '10px'
                                        }}>
                                            {tokenStatus.is_expiring_soon ? '是' : '否'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 右侧：日志面板 */}
                    <div>
                        {/* 事件监听 */}
                        <div style={{
                            marginBottom: '30px',
                            padding: '20px',
                            border: '1px solid #e0e0e0',
                            borderRadius: '6px',
                            backgroundColor: '#f8f9fa'
                        }}>
                            <h3 style={{ marginTop: '0', color: '#333' }}>4. 事件监听</h3>
                            <div style={{
                                background: '#f8f9fa',
                                border: '1px solid #e9ecef',
                                padding: '15px',
                                borderRadius: '4px',
                                maxHeight: '300px',
                                overflowY: 'auto',
                                fontFamily: 'monospace',
                                fontSize: '12px'
                            }}>
                                {eventLog.map((log, index) => (
                                    <div key={index} style={{ marginBottom: '5px' }}>
                                        {log}
                                    </div>
                                ))}
                                {eventLog.length === 0 && (
                                    <div style={{ color: '#6c757d' }}>暂无事件日志</div>
                                )}
                            </div>
                        </div>

                        {/* 操作日志 */}
                        <div style={{
                            marginBottom: '30px',
                            padding: '20px',
                            border: '1px solid #e0e0e0',
                            borderRadius: '6px',
                            backgroundColor: '#f8f9fa'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <h3 style={{ margin: '0', color: '#333' }}>5. 操作日志</h3>
                                <button
                                    onClick={clearLogs}
                                    style={{
                                        padding: '5px 10px',
                                        backgroundColor: '#6c757d',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                    }}
                                >
                                    清除日志
                                </button>
                            </div>
                            <div style={{
                                background: '#f8f9fa',
                                border: '1px solid #e9ecef',
                                padding: '15px',
                                borderRadius: '4px',
                                maxHeight: '400px',
                                overflowY: 'auto',
                                fontFamily: 'monospace',
                                fontSize: '12px'
                            }}>
                                {operationLog.map((log, index) => (
                                    <div key={index} style={{ marginBottom: '5px' }}>
                                        {log}
                                    </div>
                                ))}
                                {operationLog.length === 0 && (
                                    <div style={{ color: '#6c757d' }}>暂无操作日志</div>
                                )}
                            </div>
                        </div>

                        {/* 监控状态 */}
                        <div style={{
                            padding: '20px',
                            border: '1px solid #e0e0e0',
                            borderRadius: '6px',
                            backgroundColor: '#f8f9fa'
                        }}>
                            <h3 style={{ marginTop: '0', color: '#333' }}>监控状态</h3>
                            <p><strong>监控状态:</strong> {isMonitoring ? '运行中' : '已停止'}</p>
                            <p><strong>检查间隔:</strong> 5分钟</p>
                            <p><strong>续签阈值:</strong> 提前24小时</p>
                            <p><strong>登录状态:</strong> {globalUserStore.isLogin ? '已登录' : '未登录'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TestTokenRefresh 