import { useEffect, useCallback, useState, useRef } from 'react'
import { globalUserStore } from '../stores/UserStore'
import tokenRefreshService from '../services/tokenRefreshService'
import type { UseTokenRefreshReturn, TokenRefreshResult, TokenStatus } from '../types'

// Hook返回类型
export interface UseTokenRefreshReturn {
    // 状态
    isMonitoring: boolean
    tokenStatus: TokenStatus | null
    isLoading: boolean
    error: string | null
    isRefreshing: boolean
    lastRefreshTime: number | null
    nextRefreshTime: number | null

    // 双Token方法
    refreshTokenWithRefreshToken: (refreshToken?: string) => Promise<TokenRefreshResult | null>
    loginWithTokenPair: (account: string, password: string) => Promise<TokenRefreshResult | null>

    // 传统方法
    refreshToken: () => Promise<boolean>
    loginWithRememberMe: (account: string, password: string) => Promise<boolean>

    // Token管理
    startMonitoring: () => void
    stopMonitoring: () => void
    checkTokenStatus: () => Promise<TokenStatus | null>
    getTokenExpirationTime: () => Promise<number | null>
    scheduleTokenRefresh: (expiresInSeconds: number) => void

    // 事件监听
    onTokenRefreshed: (callback: (token: string) => void) => () => void
    onTokenExpired: (callback: () => void) => () => void
    onRefreshError: (callback: (error: Error) => void) => () => void
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
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null)
    const [nextRefreshTime, setNextRefreshTime] = useState<number | null>(null)

    const refreshListeners = useRef<Set<(token: string) => void>>(new Set())
    const expireListeners = useRef<Set<() => void>>(new Set())
    const errorListeners = useRef<Set<(error: Error) => void>>(new Set())

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

    // 双Token登录
    const loginWithTokenPair = useCallback(async (account: string, password: string): Promise<TokenRefreshResult | null> => {
        try {
            setIsLoading(true)
            setError(null)

            const result = await tokenRefreshService.loginWithTokenPair(account, password)
            if (result) {
                setLastRefreshTime(Date.now())
                // 触发登录事件
                window.dispatchEvent(new CustomEvent('auth:token-pair-login', {
                    detail: result
                }))
                // 更新token状态
                await checkTokenStatus()
            }
            return result
        } catch (err: any) {
            setError(err.message || '双Token登录失败')
            errorListeners.current.forEach(callback => callback(err))
            return null
        } finally {
            setIsLoading(false)
        }
    }, [checkTokenStatus])

    // 双Token续签
    const refreshTokenWithRefreshToken = useCallback(async (refreshToken?: string): Promise<TokenRefreshResult | null> => {
        try {
            setIsRefreshing(true)
            setError(null)

            const result = await tokenRefreshService.refreshTokenWithRefreshToken(refreshToken)
            if (result) {
                setLastRefreshTime(Date.now())
                // 触发续签事件
                window.dispatchEvent(new CustomEvent('token:refreshed', {
                    detail: { newToken: result.access_token }
                }))
                // 更新token状态
                await checkTokenStatus()
            }
            return result
        } catch (err: any) {
            setError(err.message || '双Token续签失败')
            errorListeners.current.forEach(callback => callback(err))
            return null
        } finally {
            setIsRefreshing(false)
        }
    }, [checkTokenStatus])

    // 获取token过期时间
    const getTokenExpirationTime = useCallback(async (): Promise<number | null> => {
        return tokenRefreshService.getTokenExpirationTime()
    }, [])

    // 定时刷新
    const scheduleTokenRefresh = useCallback((expiresInSeconds: number): void => {
        tokenRefreshService.scheduleTokenRefresh(expiresInSeconds)
        setNextRefreshTime(Date.now() + expiresInSeconds * 1000)
    }, [])

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

    // 监听全局token事件
    useEffect(() => {
        const handleTokenRefreshed = (event: CustomEvent) => {
            setLastRefreshTime(Date.now())
            refreshListeners.current.forEach(callback => callback(event.detail.newToken))
        }

        const handleTokenExpired = () => {
            expireListeners.current.forEach(callback => callback())
        }

        const handleRefreshError = (event: CustomEvent) => {
            errorListeners.current.forEach(callback => callback(event.detail.error))
        }

        window.addEventListener('token:refreshed', handleTokenRefreshed as EventListener)
        window.addEventListener('token:expired', handleTokenExpired as EventListener)
        window.addEventListener('token:refresh-error', handleRefreshError as EventListener)

        return () => {
            window.removeEventListener('token:refreshed', handleTokenRefreshed as EventListener)
            window.removeEventListener('token:expired', handleTokenExpired as EventListener)
            window.removeEventListener('token:refresh-error', handleRefreshError as EventListener)
        }
    }, [])

    // 事件监听器
    const onTokenRefreshed = useCallback((callback: (token: string) => void) => {
        refreshListeners.current.add(callback)
        return () => {
            refreshListeners.current.delete(callback)
        }
    }, [])

    const onTokenExpired = useCallback((callback: () => void) => {
        expireListeners.current.add(callback)
        return () => {
            expireListeners.current.delete(callback)
        }
    }, [])

    const onRefreshError = useCallback((callback: (error: Error) => void) => {
        errorListeners.current.add(callback)
        return () => {
            errorListeners.current.delete(callback)
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
        isRefreshing,
        lastRefreshTime,
        nextRefreshTime,

        // 双Token方法
        refreshTokenWithRefreshToken,
        loginWithTokenPair,

        // 传统方法
        refreshToken,
        loginWithRememberMe,

        // Token管理
        startMonitoring,
        stopMonitoring,
        checkTokenStatus,
        getTokenExpirationTime,
        scheduleTokenRefresh,

        // 事件监听
        onTokenRefreshed,
        onTokenExpired,
        onRefreshError,
    }
}

// 导出Hook
export default useTokenRefresh

// 辅助hooks - 供其他项目集成使用

/**
 * Token刷新事件监听Hook
 * 提供简化的Token刷新事件监听功能
 */
export const useTokenRefreshEvents = () => {
    const [lastRefresh, setLastRefresh] = useState<number | null>(null)
    const [refreshError, setRefreshError] = useState<Error | null>(null)

    useEffect(() => {
        const handleRefresh = (event: CustomEvent) => {
            setLastRefresh(Date.now())
        }

        const handleError = (event: CustomEvent) => {
            setRefreshError(event.detail.error)
        }

        window.addEventListener('token:refreshed', handleRefresh as EventListener)
        window.addEventListener('token:refresh-error', handleError as EventListener)

        return () => {
            window.removeEventListener('token:refreshed', handleRefresh as EventListener)
            window.removeEventListener('token:refresh-error', handleError as EventListener)
        }
    }, [])

    return {
        lastRefresh,
        refreshError,
        clearError: () => setRefreshError(null)
    }
}

/**
 * 便捷的Token状态检查Hook
 * 提供简化的Token状态检查功能
 */
export const useTokenStatus = () => {
    const [status, setStatus] = useState<TokenStatus | null>(null)
    const [loading, setLoading] = useState(false)

    const checkStatus = useCallback(async () => {
        setLoading(true)
        try {
            const result = await tokenRefreshService.checkTokenStatus()
            setStatus(result)
            return result
        } catch (error) {
            console.error('检查Token状态失败:', error)
            return null
        } finally {
            setLoading(false)
        }
    }, [])

    return {
        status,
        loading,
        checkStatus,
        isValid: status?.is_valid || false,
        isExpiringSoon: status?.is_expiring_soon || false,
        remainingHours: status?.remaining_hours || 0
    }
}

/**
 * 用于外部项目集成的简化接口
 * 提供最简洁的Token刷新功能
 */
export const useSSOTokenRefresh = () => {
    const tokenRefresh = useTokenRefresh()

    return {
        // 核心刷新功能
        refreshToken: tokenRefresh.refreshTokenWithRefreshToken,
        loginWithTokenPair: tokenRefresh.loginWithTokenPair,

        // 状态管理
        checkTokenStatus: tokenRefresh.checkTokenStatus,
        startMonitoring: tokenRefresh.startMonitoring,
        stopMonitoring: tokenRefresh.stopMonitoring,

        // 状态
        isMonitoring: tokenRefresh.isMonitoring,
        isRefreshing: tokenRefresh.isRefreshing,

        // 事件监听
        onTokenRefreshed: tokenRefresh.onTokenRefreshed,
        onTokenExpired: tokenRefresh.onTokenExpired,
        onRefreshError: tokenRefresh.onRefreshError,

        // 便捷方法
        isTokenValid: async () => {
            const status = await tokenRefresh.checkTokenStatus()
            return status?.is_valid || false
        },

        // 获取用户信息（如果需要）
        getUserInfo: () => globalUserStore.user
    }
}

/**
 * 双Token登录Hook
 * 专门用于处理双Token登录流程
 */
export const useTokenPairLogin = () => {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const login = useCallback(async (account: string, password: string): Promise<TokenRefreshResult> => {
        setIsLoading(true)
        setError(null)

        try {
            const result = await tokenRefreshService.loginWithTokenPair(account, password)
            if (result) {
                return result
            } else {
                throw new Error('登录失败')
            }
        } catch (err: any) {
            const errorMessage = err.message || '登录失败'
            setError(errorMessage)
            throw new Error(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }, [])

    return {
        login,
        isLoading,
        error,
        clearError: () => setError(null)
    }
} 