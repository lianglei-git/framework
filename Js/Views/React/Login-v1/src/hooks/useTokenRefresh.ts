import { useEffect, useCallback, useState } from 'react'
import { globalUserStore } from '../stores/UserStore'
import tokenRefreshService from '../services/tokenRefreshService'

// Token状态类型
export interface TokenStatus {
    is_valid: boolean
    expires_at: string
    remaining_hours: number
    remaining_minutes: number
    is_expiring_soon: boolean
    token_type: string
}

// Hook返回类型
export interface UseTokenRefreshReturn {
    // 状态
    isMonitoring: boolean
    tokenStatus: TokenStatus | null
    isLoading: boolean
    error: string | null

    // 方法
    startMonitoring: () => void
    stopMonitoring: () => void
    checkTokenStatus: () => Promise<TokenStatus | null>
    refreshToken: () => Promise<boolean>
    loginWithRememberMe: (account: string, password: string) => Promise<boolean>

    // 事件监听
    onTokenRefreshed: (callback: (newToken: string) => void) => void
    onAuthExpired: (callback: () => void) => void
}

/**
 * Token自动续签Hook
 * 提供完整的token管理功能
 */
export function useTokenRefresh(): UseTokenRefreshReturn {
    const [isMonitoring, setIsMonitoring] = useState(false)
    const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // 检查token状态
    const checkTokenStatus = useCallback(async (): Promise<TokenStatus | null> => {
        try {
            setIsLoading(true)
            setError(null)

            const status = await tokenRefreshService.checkTokenStatus()
            setTokenStatus(status)
            return status
        } catch (err: any) {
            setError(err.message || '检查token状态失败')
            return null
        } finally {
            setIsLoading(false)
        }
    }, [])

    // 手动续签token
    const refreshToken = useCallback(async (): Promise<boolean> => {
        try {
            setIsLoading(true)
            setError(null)

            const result = await tokenRefreshService.refreshToken()
            if (result) {
                // 更新token状态
                await checkTokenStatus()
                return true
            }
            return false
        } catch (err: any) {
            setError(err.message || '续签token失败')
            return false
        } finally {
            setIsLoading(false)
        }
    }, [checkTokenStatus])

    // 记住我登录
    const loginWithRememberMe = useCallback(async (account: string, password: string): Promise<boolean> => {
        try {
            setIsLoading(true)
            setError(null)

            const result = await tokenRefreshService.loginWithRememberMe(account, password)
            if (result) {
                // 更新token状态
                await checkTokenStatus()
                return true
            }
            return false
        } catch (err: any) {
            setError(err.message || '记住我登录失败')
            return false
        } finally {
            setIsLoading(false)
        }
    }, [checkTokenStatus])

    // 启动监控
    const startMonitoring = useCallback(() => {
        if (!isMonitoring) {
            tokenRefreshService.startTokenMonitoring()
            setIsMonitoring(true)
        }
    }, [isMonitoring])

    // 停止监控
    const stopMonitoring = useCallback(() => {
        if (isMonitoring) {
            tokenRefreshService.stopTokenMonitoring()
            setIsMonitoring(false)
        }
    }, [isMonitoring])

    // 事件监听器
    const onTokenRefreshed = useCallback((callback: (newToken: string) => void) => {
        const handleTokenRefreshed = (event: CustomEvent) => {
            callback(event.detail.newToken)
        }

        window.addEventListener('token:refreshed', handleTokenRefreshed as EventListener)
        window.addEventListener('token:auto-refreshed', handleTokenRefreshed as EventListener)

        // 返回清理函数
        return () => {
            window.removeEventListener('token:refreshed', handleTokenRefreshed as EventListener)
            window.removeEventListener('token:auto-refreshed', handleTokenRefreshed as EventListener)
        }
    }, [])

    const onAuthExpired = useCallback((callback: () => void) => {
        const handleAuthExpired = () => {
            callback()
        }

        window.addEventListener('auth:expired', handleAuthExpired)

        // 返回清理函数
        return () => {
            window.removeEventListener('auth:expired', handleAuthExpired)
        }
    }, [])

    // 初始化效果
    useEffect(() => {
        // 如果用户已登录，启动监控
        if (globalUserStore.isLogin) {
            startMonitoring()
        }

        // 监听登录状态变化
        const loginListener = () => {
            if (globalUserStore.isLogin) {
                startMonitoring()
                checkTokenStatus()
            } else {
                stopMonitoring()
                setTokenStatus(null)
            }
        }

        globalUserStore.addLoginListener(loginListener)

        // 清理函数
        return () => {
            globalUserStore.removeLoginListener(loginListener)
            stopMonitoring()
        }
    }, [startMonitoring, stopMonitoring, checkTokenStatus])

    // 定期检查token状态
    useEffect(() => {
        if (isMonitoring) {
            const interval = setInterval(() => {
                checkTokenStatus()
            }, 5 * 60 * 1000) // 5分钟检查一次

            return () => clearInterval(interval)
        }
    }, [isMonitoring, checkTokenStatus])

    return {
        // 状态
        isMonitoring,
        tokenStatus,
        isLoading,
        error,

        // 方法
        startMonitoring,
        stopMonitoring,
        checkTokenStatus,
        refreshToken,
        loginWithRememberMe,

        // 事件监听
        onTokenRefreshed,
        onAuthExpired,
    }
}

// 导出Hook
export default useTokenRefresh 