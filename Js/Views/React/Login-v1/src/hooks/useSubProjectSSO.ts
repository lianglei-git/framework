import { useState, useEffect, useCallback } from 'react'
import { SSOService } from '../services/sso'
import { getSubProjectConfig, SubProjectConfig } from '../config/subproject-integration'
import type { SSOToken, SSOUser, SSOSession } from '../types'

export interface UseSubProjectSSOOptions {
    subProjectId?: string
    customConfig?: Partial<SubProjectConfig>
    onSuccess?: (user: SSOUser, token: SSOToken, session: SSOSession) => void
    onError?: (error: Error) => void
    onLogout?: () => void
    autoInit?: boolean
}

export interface UseSubProjectSSOResult {
    // 状态
    isInitialized: boolean
    isLoading: boolean
    isAuthenticated: boolean
    error: Error | null

    // 数据
    user: SSOUser | null
    token: SSOToken | null
    session: SSOSession | null
    config: SubProjectConfig | null

    // 方法
    initialize: () => Promise<void>
    login: (options?: { redirect?: boolean; provider?: string }) => Promise<void>
    logout: () => Promise<void>
    refreshToken: () => Promise<void>
    getLoginUrl: (provider?: string) => string
    handleCallback: () => Promise<void>

    // 工具方法
    isInCallback: () => boolean
    getSubProjectInfo: () => SubProjectConfig | null
    updateConfig: (config: Partial<SubProjectConfig>) => void
}

/**
 * 子项目SSO Hook
 * 提供完整的子项目SSO集成能力
 */
export const useSubProjectSSO = (options: UseSubProjectSSOOptions = {}): UseSubProjectSSOResult => {
    const {
        subProjectId,
        customConfig,
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
    const [config, setConfig] = useState<SubProjectConfig | null>(null)

    // 初始化SSO服务
    const initialize = useCallback(async () => {
        try {
            setIsLoading(true)
            setError(null)

            // 获取子项目配置
            let subProjectConfig = null
            if (subProjectId) {
                subProjectConfig = getSubProjectConfig(subProjectId)
            }

            if (!subProjectConfig && !customConfig) {
                throw new Error('必须提供子项目ID或自定义配置')
            }

            // 合并配置
            const finalConfig = {
                ...subProjectConfig,
                ...customConfig
            } as SubProjectConfig

            // 创建SSO服务实例
            const service = new SSOService(finalConfig)
            await service.initialize()

            setSsoService(service)
            setConfig(finalConfig)
            setIsInitialized(true)

            console.log('子项目SSO服务初始化完成', { subProjectId, config: finalConfig })

        } catch (err: any) {
            const error = new Error(err.message || 'SSO服务初始化失败')
            setError(error)
            onError?.(error)
            console.error('子项目SSO服务初始化失败:', err)
        } finally {
            setIsLoading(false)
        }
    }, [subProjectId, customConfig, onError])

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
                const loginUrl = ssoService.getLoginUrl(options.provider)
                window.location.href = loginUrl
            } else {
                // 直接调用登录API
                const result = await ssoService.login({
                    provider: options.provider || 'local',
                    login_type: 'sso'
                })

                if (result.success && result.user && result.token && result.session) {
                    setUser(result.user)
                    setToken(result.token)
                    setSession(result.session)
                    setIsAuthenticated(true)
                    onSuccess?.(result.user, result.token, result.session)
                }
            }
        } catch (err: any) {
            const error = new Error(err.message || '登录失败')
            setError(error)
            onError?.(error)
            console.error('登录失败:', err)
        } finally {
            setIsLoading(false)
        }
    }, [ssoService, onSuccess, onError])

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
        if (!ssoService) {
            throw new Error('SSO服务未初始化')
        }

        try {
            setIsLoading(true)
            setError(null)

            const result = await ssoService.refreshToken()

            if (result.success && result.token) {
                setToken(result.token)
                console.log('令牌刷新成功')
            }
        } catch (err: any) {
            const error = new Error(err.message || '令牌刷新失败')
            setError(error)
            onError?.(error)
            console.error('令牌刷新失败:', err)
        } finally {
            setIsLoading(false)
        }
    }, [ssoService, onError])

    // 获取登录URL
    const getLoginUrl = useCallback((provider?: string) => {
        if (!ssoService) {
            throw new Error('SSO服务未初始化')
        }
        return ssoService.getLoginUrl(provider)
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
                onSuccess?.(result.user, result.token, result.session)
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

    // 获取子项目信息
    const getSubProjectInfo = useCallback(() => {
        return config
    }, [config])

    // 更新配置
    const updateConfig = useCallback((newConfig: Partial<SubProjectConfig>) => {
        if (config) {
            const updatedConfig = { ...config, ...newConfig }
            setConfig(updatedConfig)
        }
    }, [config])

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
        config,

        // 方法
        initialize,
        login,
        logout,
        refreshToken,
        getLoginUrl,
        handleCallback,

        // 工具方法
        isInCallback,
        getSubProjectInfo,
        updateConfig
    }
}

export default useSubProjectSSO
