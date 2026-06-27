import { useEffect, useCallback, useState } from 'react'
import { SSOService, createDefaultSSOConfig } from '../services/sso'
import type { SSOLoginResponse, SSOAuthRequest, SSOCallbackContext } from '../types'

/**
 * SSO URL处理Hook
 * 专门处理通过URL跳转进入的SSO场景
 * 支持OAuth 2.1和OpenID Connect协议
 */
export const useSSOUrlHandler = () => {
    const [ssoService, setSsoService] = useState<SSOService | null>(null)
    const [isInitialized, setIsInitialized] = useState(false)
    const [isCallbackMode, setIsCallbackMode] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // 初始化SSO服务
    useEffect(() => {
        const initializeSSO = async () => {
            try {
                setIsLoading(true)

                // 创建SSO服务实例（会自动从URL参数提取配置）
                const service = new SSOService(createDefaultSSOConfig())

                // 初始化服务
                await service.initialize()
                setSsoService(service)

                // 检查是否处于回调模式
                const callbackMode = service.isInCallbackMode()
                setIsCallbackMode(callbackMode)

                console.log('SSO服务初始化完成', { callbackMode })
                setIsInitialized(true)
            } catch (err: any) {
                console.error('SSO服务初始化失败:', err)
                setError(err.message || 'SSO服务初始化失败')
            } finally {
                setIsLoading(false)
            }
        }

        initializeSSO()
    }, [])

    // 自动处理SSO流程
    const handleAutomaticSSO = useCallback(async () => {
        if (!ssoService || !isInitialized) {
            console.warn('SSO服务未初始化')
            return
        }

        try {
            setIsLoading(true)
            setError(null)

            const result = await ssoService.handleAutomaticSSO()

            if (result) {
                console.log('SSO流程自动处理成功:', result)
                return result
            }
        } catch (err: any) {
            console.error('SSO流程自动处理失败:', err)
            setError(err.message || 'SSO流程处理失败')
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [ssoService, isInitialized])

    // 手动处理回调
    const handleCallback = useCallback(async (context?: Partial<SSOCallbackContext>) => {
        if (!ssoService) {
            throw new Error('SSO服务未初始化')
        }

        try {
            setIsLoading(true)
            setError(null)

            const result = await ssoService.handleCallback(context)
            console.log('SSO回调处理成功:', result)
            return result
        } catch (err: any) {
            console.error('SSO回调处理失败:', err)
            setError(err.message || 'SSO回调处理失败')
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [ssoService])

    // 构建授权URL
    const buildAuthorizationUrl = useCallback((providerId: string, options?: Partial<SSOAuthRequest>) => {
        if (!ssoService) {
            throw new Error('SSO服务未初始化')
        }

        return ssoService.buildAuthorizationUrl(providerId, options)
    }, [ssoService])

    // 构建隐式流程URL
    const buildImplicitFlowUrl = useCallback((providerId: string, options?: Partial<SSOAuthRequest>) => {
        if (!ssoService) {
            throw new Error('SSO服务未初始化')
        }

        return ssoService.buildImplicitFlowUrl(providerId, options)
    }, [ssoService])

    // 构建混合流程URL
    const buildHybridFlowUrl = useCallback((providerId: string, options?: Partial<SSOAuthRequest>) => {
        if (!ssoService) {
            throw new Error('SSO服务未初始化')
        }

        return ssoService.buildHybridFlowUrl(providerId, options)
    }, [ssoService])

    // 获取URL参数
    const getURLParams = useCallback(() => {
        if (!ssoService) {
            return new URLSearchParams()
        }

        return ssoService.getURLParams()
    }, [ssoService])

    // 检查是否有授权请求
    const hasAuthorizationRequest = useCallback(() => {
        const params = getURLParams()
        return params.has('client_id') || params.has('response_type') || params.has('scope')
    }, [getURLParams])

    // 获取SSO配置
    const getSSOConfig = useCallback(() => {
        if (!ssoService) {
            return null
        }

        return ssoService.getConfig()
    }, [ssoService])

    // 清除错误
    const clearError = useCallback(() => {
        setError(null)
    }, [])

    return {
        // 状态
        ssoService,
        isInitialized,
        isCallbackMode,
        isLoading,
        error,

        // 方法
        handleAutomaticSSO,
        handleCallback,
        buildAuthorizationUrl,
        buildImplicitFlowUrl,
        buildHybridFlowUrl,
        getURLParams,
        hasAuthorizationRequest,
        getSSOConfig,
        clearError
    }
}

/**
 * 外部应用SSO集成Hook
 * 专门用于处理其他应用通过URL跳转进入的场景
 */
export const useExternalSSOIntegration = () => {
    const ssoHandler = useSSOUrlHandler()
    const [authResult, setAuthResult] = useState<SSOLoginResponse | null>(null)
    const [userInfo, setUserInfo] = useState<any>(null)

    // 自动处理SSO流程
    useEffect(() => {
        const handleSSO = async () => {
            if (!ssoHandler.isInitialized) {
                return
            }

            try {
                // 检查是否有授权请求参数
                if (ssoHandler.hasAuthorizationRequest()) {
                    console.log('检测到外部SSO请求，启动授权流程...')

                    // 如果有授权请求参数，构建授权URL并重定向
                    const authUrl = ssoHandler.buildAuthorizationUrl('local')
                    console.log('重定向到授权URL:', authUrl)
                    window.location.href = authUrl
                    return
                }

                // 检查是否是回调模式
                if (ssoHandler.isCallbackMode) {
                    console.log('检测到SSO回调，自动处理...')

                    const result = await ssoHandler.handleAutomaticSSO()
                    if (result) {
                        setAuthResult(result)
                        setUserInfo(result.user)
                        console.log('SSO认证成功:', result.user)
                    }
                }
            } catch (error) {
                console.error('外部SSO集成处理失败:', error)
            }
        }

        handleSSO()
    }, [ssoHandler.isInitialized, ssoHandler.hasAuthorizationRequest(), ssoHandler.isCallbackMode])

    // 发起授权请求
    const initiateAuthorization = useCallback(async (options?: Partial<SSOAuthRequest>) => {
        if (!ssoHandler.ssoService) {
            throw new Error('SSO服务未初始化')
        }

        try {
            const authUrl = ssoHandler.buildAuthorizationUrl('local', options)
            console.log('发起授权请求:', authUrl)
            window.location.href = authUrl
        } catch (error) {
            console.error('发起授权请求失败:', error)
            throw error
        }
    }, [ssoHandler.ssoService])

    // 检查认证状态
    const checkAuthStatus = useCallback(async () => {
        if (!ssoHandler.ssoService) {
            return { isAuthenticated: false }
        }

        try {
            const sessionCheck = await ssoHandler.ssoService.checkSession()
            return sessionCheck
        } catch (error) {
            console.error('检查认证状态失败:', error)
            return { isAuthenticated: false, error: error instanceof Error ? error.message : '检查失败' }
        }
    }, [ssoHandler.ssoService])

    // 登出
    const logout = useCallback(async () => {
        if (!ssoHandler.ssoService) {
            return
        }

        try {
            await ssoHandler.ssoService.logout()
            setAuthResult(null)
            setUserInfo(null)
            console.log('SSO登出成功')
        } catch (error) {
            console.error('SSO登出失败:', error)
            throw error
        }
    }, [ssoHandler.ssoService])

    return {
        // 状态
        authResult,
        userInfo,
        isLoading: ssoHandler.isLoading,
        error: ssoHandler.error,
        isInitialized: ssoHandler.isInitialized,

        // 方法
        initiateAuthorization,
        checkAuthStatus,
        logout,
        clearError: ssoHandler.clearError,

        // 原始服务实例（用于高级操作）
        ssoService: ssoHandler.ssoService
    }
}

/**
 * OpenID Connect集成Hook
 * 专门处理OpenID Connect协议的集成
 */
export const useOpenIDConnect = () => {
    const ssoHandler = useSSOUrlHandler()
    const [idToken, setIdToken] = useState<string | null>(null)
    const [userClaims, setUserClaims] = useState<any>(null)

    // 处理ID Token
    const handleIDToken = useCallback(async (token: string) => {
        if (!ssoHandler.ssoService) {
            throw new Error('SSO服务未初始化')
        }

        try {
            const user = await ssoHandler.ssoService.handleIDToken(token)
            setIdToken(token)
            setUserClaims(user)
            console.log('ID Token处理成功:', user)
            return user
        } catch (error) {
            console.error('ID Token处理失败:', error)
            throw error
        }
    }, [ssoHandler.ssoService])

    // 验证ID Token
    const validateIDToken = useCallback(async (token: string) => {
        if (!ssoHandler.ssoService) {
            throw new Error('SSO服务未初始化')
        }

        try {
            const validation = await ssoHandler.ssoService.validateAccessToken(token)
            console.log('ID Token验证结果:', validation)
            return validation
        } catch (error) {
            console.error('ID Token验证失败:', error)
            throw error
        }
    }, [ssoHandler.ssoService])

    // 构建登出URL
    const buildLogoutUrl = useCallback((options?: { postLogoutRedirectUri?: string; state?: string }) => {
        if (!ssoHandler.ssoService) {
            throw new Error('SSO服务未初始化')
        }

        const logoutOptions = {
            ...options,
            id_token_hint: idToken || undefined
        }

        return ssoHandler.ssoService.buildLogoutUrl(logoutOptions)
    }, [ssoHandler.ssoService, idToken])

    return {
        // 状态
        idToken,
        userClaims,
        isLoading: ssoHandler.isLoading,
        error: ssoHandler.error,

        // 方法
        handleIDToken,
        validateIDToken,
        buildLogoutUrl,
        clearError: ssoHandler.clearError
    }
}
