import React, { useEffect, useState } from 'react'
import { globalUserStore } from '../stores/UserStore'
import tokenRefreshService from '../services/tokenRefreshService'

// Token状态组件
export const TokenStatus: React.FC = () => {
    const [tokenStatus, setTokenStatus] = useState<any>(null)
    const [isMonitoring, setIsMonitoring] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // 检查token状态
    const checkTokenStatus = async () => {
        if (!globalUserStore.isLogin) return

        try {
            setIsLoading(true)
            setError(null)

            const status = await tokenRefreshService.checkTokenStatus()
            setTokenStatus(status)
        } catch (err: any) {
            setError(err.message || '检查token状态失败')
        } finally {
            setIsLoading(false)
        }
    }

    // 手动续签token
    const handleRefreshToken = async () => {
        try {
            setIsLoading(true)
            setError(null)

            const result = await tokenRefreshService.refreshToken()
            if (result) {
                await checkTokenStatus()
                alert('Token续签成功！')
            } else {
                setError('Token续签失败')
            }
        } catch (err: any) {
            setError(err.message || '续签token失败')
        } finally {
            setIsLoading(false)
        }
    }

    // 启动/停止监控
    const toggleMonitoring = () => {
        if (isMonitoring) {
            tokenRefreshService.stopTokenMonitoring()
            setIsMonitoring(false)
        } else {
            tokenRefreshService.startTokenMonitoring()
            setIsMonitoring(true)
        }
    }

    // 初始化
    useEffect(() => {
        if (globalUserStore.isLogin) {
            checkTokenStatus()
        }

        // 监听token更新事件
        const handleTokenRefreshed = (event: CustomEvent) => {
            console.log('Token已更新:', event.detail.newToken.substring(0, 20) + '...')
            checkTokenStatus()
        }

        const handleAuthExpired = () => {
            setTokenStatus(null)
            setIsMonitoring(false)
            alert('用户认证已过期，请重新登录')
        }

        window.addEventListener('token:refreshed', handleTokenRefreshed as EventListener)
        window.addEventListener('token:auto-refreshed', handleTokenRefreshed as EventListener)
        window.addEventListener('auth:expired', handleAuthExpired)

        return () => {
            window.removeEventListener('token:refreshed', handleTokenRefreshed as EventListener)
            window.removeEventListener('token:auto-refreshed', handleTokenRefreshed as EventListener)
            window.removeEventListener('auth:expired', handleAuthExpired)
        }
    }, [])

    if (!globalUserStore.isLogin) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <p>请先登录以查看Token状态</p>
            </div>
        )
    }

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
            <h2>Token状态监控</h2>

            {/* 监控控制 */}
            <div style={{ marginBottom: '20px' }}>
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
                    onClick={checkTokenStatus}
                    disabled={isLoading}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1
                    }}
                >
                    {isLoading ? '检查中...' : '检查状态'}
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
                    {isLoading ? '续签中...' : '手动续签'}
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
                    borderRadius: '6px'
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

                    {/* 进度条 */}
                    <div style={{ marginTop: '20px' }}>
                        <strong>Token有效期进度:</strong>
                        <div style={{
                            width: '100%',
                            height: '20px',
                            backgroundColor: '#e9ecef',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            marginTop: '5px'
                        }}>
                            <div style={{
                                width: `${Math.max(0, Math.min(100, (tokenStatus.remaining_hours / 168) * 100))}%`,
                                height: '100%',
                                backgroundColor: tokenStatus.is_expiring_soon ? '#ffc107' : '#28a745',
                                transition: 'width 0.3s ease'
                            }}></div>
                        </div>
                        <small style={{ color: '#6c757d' }}>
                            总有效期: 168小时 (7天)
                        </small>
                    </div>
                </div>
            )}

            {/* 监控状态 */}
            <div style={{ marginTop: '20px' }}>
                <h3>监控状态</h3>
                <p>
                    <strong>监控状态:</strong> {isMonitoring ? '运行中' : '已停止'}
                </p>
                <p>
                    <strong>检查间隔:</strong> 5分钟
                </p>
                <p>
                    <strong>续签阈值:</strong> 提前24小时
                </p>
            </div>

            {/* 使用说明 */}
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '6px' }}>
                <h3>使用说明</h3>
                <ul style={{ margin: '0', paddingLeft: '20px' }}>
                    <li><strong>自动监控:</strong> 启动后每5分钟检查一次token状态</li>
                    <li><strong>自动续签:</strong> 当token剩余时间少于24小时时自动续签</li>
                    <li><strong>手动续签:</strong> 可以随时手动续签token</li>
                    <li><strong>状态检查:</strong> 实时查看token的详细状态信息</li>
                    <li><strong>事件监听:</strong> 自动处理token更新和认证过期事件</li>
                </ul>
            </div>
        </div>
    )
}

export default TokenStatus 