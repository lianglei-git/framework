import { useState, useEffect, useCallback } from 'react'
import { SSOService, SSOToken, SSOUser, SSOSession, SSOLoginResponse } from '../services/ssoService'
import { SSOConfig, createSSOConfig } from '../config/sso'

export interface UseSSOOptions {
    config?: Partial<SSOConfig>
    onSuccess?: (user: SSOUser, token: SSOToken, session: SSOSession) => void
    onError?: (error: Error) => void
    onLogout?: () => void
    autoInit?: boolean
}

export interface UseSSOResult {
    // 状态
    isInitialized: boolean
    isLoading: boolean
    isAuthenticated: boolean
    error: Error | null

    // 数据
    user: SSOUser | null
    token: SSOToken | null
    session: SSOSession | null

    // 方法
    initialize: () => Promise<void>
    login: (options?: { redirect?: boolean; provider?: string }) => Promise<void>
    logout: () => Promise<void>
    refreshToken: () => Promise<void>
    getLoginUrl: (provider?: string) => string
    handleCallback: () => Promise<void>

    // 工具方法
    isInCallback: () => boolean
    clearError: () => void
}

/**
 * SSO React Hook
 * 提供完整的SSO认证功能封装
 */
export const useSSO = (options: UseSSOOptions = {}): UseSSOResult => {
    const {
        config: customConfig,
        onSuccess,
        onError,
        onLogout,
        autoInit = true
    } = options

    // 状态
    const [isInitialized, setIsInitialized] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    // 数据
    const [ssoService, setSsoService] = useState<SSOService | null>(null)
    const [user, setUser] = useState<SSOUser | null>(null)
    const [token, setToken] = useState<SSOToken | null>(null)
    const [session, setSession] = useState<SSOSession | null>(null)

    // 初始化SSO服务
    const initialize = useCallback(async () => {
        try {
            setIsLoading(true)
            setError(null)

            // 创建配置
            const finalConfig = createSSOConfig(customConfig)

            // 创建SSO服务实例
            const service = new SSOService(finalConfig)
            setSsoService(service)

            // 检查是否有已存储的认证状态
            const storedAuth = service.getStoredAuthState()
            if (storedAuth) {
                setUser(storedAuth.user)
                setToken(storedAuth.token)
                setSession(storedAuth.session)
                setIsAuthenticated(true)
                onSuccess?.(storedAuth.user, storedAuth.token, storedAuth.session)
            }

            setIsInitialized(true)
            console.log('SSO服务初始化完成')

        } catch (err: any) {
            const error = new Error(err.message || 'SSO服务初始化失败')
            setError(error)
            onError?.(error)
            console.error('SSO服务初始化失败:', err)
        } finally {
            setIsLoading(false)
        }
    }, [customConfig, onSuccess, onError])

    // 登录
    const login = useCallback(async (options: { redirect?: boolean; provider?: string } = {}) => {
        if (!ssoService) {
            throw new Error('SSO服务未初始化')
        }

        try {
            setIsLoading(true)
            setError(null)

            if (options.redirect) {
                // 重定向到SSO登录页面
                const loginUrl = ssoService.buildAuthorizationUrl(options.provider)
                window.location.href = loginUrl
            } else {
                // 直接调用登录API（如果有的话）
                console.log('直接登录模式需要后端支持')
            }
        } catch (err: any) {
            const error = new Error(err.message || '登录失败')
            setError(error)
            onError?.(error)
            console.error('登录失败:', err)
        } finally {
            setIsLoading(false)
        }
    }, [ssoService, onError])

    // 登出
    const logout = useCallback(async () => {
        if (!ssoService) {
            throw new Error('SSO服务未初始化')
        }

        try {
            setIsLoading(true)

            await ssoService.logout()

            setUser(null)
            setToken(null)
            setSession(null)
            setIsAuthenticated(false)
            ssoService.clearAuthState()
            onLogout?.()

            console.log('用户已登出')
        } catch (err: any) {
            const error = new Error(err.message || '登出失败')
            setError(error)
            onError?.(error)
            console.error('登出失败:', err)
        } finally {
            setIsLoading(false)
        }
    }, [ssoService, onError, onLogout])

    // 刷新令牌
    const refreshToken = useCallback(async () => {
        if (!ssoService || !token?.refresh_token) {
            throw new Error('SSO服务未初始化或没有刷新令牌')
        }

        try {
            setIsLoading(true)
            setError(null)

            const result = await ssoService.refreshToken(token.refresh_token)

            if (result.success && result.token) {
                setToken(result.token)
                console.log('令牌刷新成功')
            } else {
                throw new Error(result.error || '令牌刷新失败')
            }
        } catch (err: any) {
            const error = new Error(err.message || '令牌刷新失败')
            setError(error)
            onError?.(error)
            console.error('令牌刷新失败:', err)
        } finally {
            setIsLoading(false)
        }
    }, [ssoService, token, onError])

    // 获取登录URL
    const getLoginUrl = useCallback((provider?: string) => {
        if (!ssoService) {
            throw new Error('SSO服务未初始化')
        }
        return ssoService.buildAuthorizationUrl(provider)
    }, [ssoService])

    // 处理回调
    const handleCallback = useCallback(async () => {
        if (!ssoService) {
            throw new Error('SSO服务未初始化')
        }

        try {
            setIsLoading(true)
            setError(null)

            const result = await ssoService.handleCallback()

            if (result.success && result.user && result.token && result.session) {
                setUser(result.user)
                setToken(result.token)
                setSession(result.session)
                setIsAuthenticated(true)
                ssoService.storeAuthState(result.user, result.token, result.session)
                onSuccess?.(result.user, result.token, result.session)
            } else {
                throw new Error(result.error || '回调处理失败')
            }
        } catch (err: any) {
            const error = new Error(err.message || '回调处理失败')
            setError(error)
            onError?.(error)
            console.error('回调处理失败:', err)
        } finally {
            setIsLoading(false)
        }
    }, [ssoService, onSuccess, onError])

    // 检查是否在回调模式
    const isInCallback = useCallback(() => {
        if (!ssoService) return false
        return ssoService.isInCallbackMode()
    }, [ssoService])

    // 清除错误
    const clearError = useCallback(() => {
        setError(null)
    }, [])

    // 自动初始化
    useEffect(() => {
        if (autoInit && !isInitialized && !isLoading) {
            initialize()
        }
    }, [autoInit, isInitialized, isLoading, initialize])

    // 自动处理回调
    useEffect(() => {
        if (isInitialized && ssoService && isInCallback()) {
            handleCallback()
        }
    }, [isInitialized, ssoService, isInCallback, handleCallback])

    // 自动刷新令牌
    useEffect(() => {
        if (isAuthenticated && token && ssoService) {
            const refreshTimer = setInterval(() => {
                // 检查令牌是否即将过期
                const expiresAt = token.expires_at || 0
                const now = Math.floor(Date.now() / 1000)
                const timeUntilExpiry = expiresAt - now

                // 如果令牌将在5分钟内过期，自动刷新
                if (timeUntilExpiry < 300 && token.refresh_token) {
                    console.log('令牌即将过期，自动刷新...')
                    refreshToken().catch(err => {
                        console.warn('自动刷新令牌失败:', err)
                    })
                }
            }, 60000) // 每分钟检查一次

            return () => clearInterval(refreshTimer)
        }
    }, [isAuthenticated, token, ssoService, refreshToken])

    return {
        // 状态
        isInitialized,
        isLoading,
        isAuthenticated,
        error,

        // 数据
        user,
        token,
        session,

        // 方法
        initialize,
        login,
        logout,
        refreshToken,
        getLoginUrl,
        handleCallback,

        // 工具方法
        isInCallback,
        clearError
    }
}

export default useSSO
