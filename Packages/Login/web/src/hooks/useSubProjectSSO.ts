import { useState, useEffect, useCallback, useRef } from 'react'
import { setSSOConfig, SSOService } from '../services/sso'
import { getSubProjectConfig, SubProjectConfig } from '../config/subproject-integration'
import { type SSOToken, type SSOUser, type SSOSession, StorageType } from '../types'
import {useAuth, useAuthEvents} from "./useAuth"
import { globalUserStore } from '../stores/UserStore'
import { storage } from '../utils'
import { formatAuthError, isUnauthorizedError } from '../utils/authError'
export {
    setSSOConfig
}





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
    getUserInfoFetch: () => Promise<SSOUser>

    // 工具方法
    isInCallback: () => boolean
    getSubProjectInfo: () => SubProjectConfig | null
    updateConfig: (config: Partial<SubProjectConfig>) => void
}

const _storage = {}



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


    // 获取子项目配置
    let subProjectConfig = null
    if (subProjectId) {
        subProjectConfig = getSubProjectConfig(subProjectId)
    }

    if (!subProjectConfig && !customConfig) {
        console.log('必须提供子项目ID或自定义配置')
    }

    // 合并配置
    const finalConfig = {
        ...subProjectConfig,
        ...customConfig
    } as SubProjectConfig

    const {authInfo, ssoService, user, token, isAuthenticated, ssoLogout} = useAuth();
    

    // 状态
    const [isInitialized, setIsInitialized] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    // 数据
    const [session, setSession] = useState<SSOSession | null>(null)
    const [config, setConfig] = useState<SubProjectConfig | null>(finalConfig)

    // 初始化SSO服务
    const initialize = useCallback(async () => {
        try {
            setIsLoading(true)
            setError(null)

            // // 获取子项目配置
            // let subProjectConfig = null
            // if (subProjectId) {
            //     subProjectConfig = getSubProjectConfig(subProjectId)
            // }

            // if (!subProjectConfig && !customConfig) {
            //     throw new Error('必须提供子项目ID或自定义配置')
            // }

            // // 合并配置
            // const finalConfig = {
            //     ...subProjectConfig,
            //     ...customConfig
            // } as SubProjectConfig

            // 创建SSO服务实例
            // await service.initialize()
            // ssoService.setCurrentProvider('local')

            // setSsoService(service)
            // setConfig(finalConfig)
            setIsInitialized(true)

            console.log('子项目SSO服务初始化完成', { subProjectId, config: finalConfig })

        } catch (err: any) {
            const error = new Error(formatAuthError(err, 'SSO服务初始化失败'))
            setError(error)
            onError?.(error)
            console.error('子项目SSO服务初始化失败:', err)
        } finally {
            setIsLoading(false)
        }
    }, [])

    const _buildLoginUrl = async () => {
        const cfg = config || finalConfig
        const loginUrl = await ssoService.buildAuthorizationUrl('sub_job', {
            client_id: cfg.clientId,
            app_id: cfg.id,
            grant_type: 'authorization_code',
            redirect_uri: (cfg as any).redirectUri || cfg.redirectUris?.[0],
            response_type: "code",
            scope: (cfg.allowedScopes || []).join(' '),
        });
        return loginUrl
    }

    // 登录
    const login = useCallback(async (options: { redirect?: boolean; provider?: string } = {}) => {
        if (!ssoService) {
            throw new Error('SSO服务未初始化')
        }

        try {
            setIsLoading(true)
            setError(null)

            // if(!options.redirect) {
            //     throw Error("请传入回调URL")
            // }

            if (options.redirect) {
                // 重定向到SSO登录页面
                const loginUrl = await _buildLoginUrl()
                window.location.href = loginUrl
            } else {
                // 直接调用登录API
                console.log("⚠️ 无法执行：没有 options.redirect 参数")
                // const result = await ssoService.login({
                //     provider: options.provider || 'local',
                //     login_type: 'sso'
                // })

                // if (result.success && result.user && result.token && result.session) {
                //     setUser(result.user)
                //     setToken(result.token)
                //     setSession(result.session)
                //     setIsAuthenticated(true)
                //     onSuccess?.(result.user, result.token, result.session)
                // }
            }
        } catch (err: any) {
            const error = new Error(formatAuthError(err, '登录失败'))
            setError(error)
            onError?.(error)
            console.error('登录失败:', err)
        } finally {
            setIsLoading(false)
        }
    }, [ssoService, onSuccess, onError])

    /** A 应用登出后 B 的 token 会失效：先续签，再尝试静默 authorize，最后清本地态 */
    const recoverFromUnauthorized = useCallback(async (): Promise<'refreshed' | 'redirecting' | 'failed'> => {
        if (!ssoService) return 'failed'

        try {
            const result = await ssoService.refreshToken()
            if (result?.access_token) {
                globalUserStore.syncFromStorage({ notify: false })
                return 'refreshed'
            }
        } catch (err) {
            console.warn('续签失败，尝试其他恢复方式:', err)
        }

        if (ssoService.hasValidSessionCookie()) {
            await ssoService.trySilentAuthorize()
            return 'redirecting'
        }

        globalUserStore.clearLocalAuth()
        SSOService.clearSessionCookies()
        window.dispatchEvent(new CustomEvent('auth:logout'))
        const sessionError = new Error('登录已失效（可能已在其他应用退出），请重新登录')
        setError(sessionError)
        onError?.(sessionError)
        return 'failed'
    }, [ssoService, onError])

    // 登出
    const logout = async () => {
        const cfg = config || finalConfig
        const loginUrl = await _buildLoginUrl()
        const home = (cfg as any).ssoHomeUrl || 'http://localhost:3033'
        const postLogout = `${home}?app_origin=true&redirect_uri=${encodeURIComponent(loginUrl)}`

        ssoLogout({
            post_logout_redirect_uri: postLogout,
        })
        if (!ssoService) {
            throw new Error('SSO服务未初始化')
        }
        console.log(authInfo,"authInfo")
        return 

        try {
            setIsLoading(true)
            // 跳转到认证中心

            await ssoService.logout({
                id_token_hint: authInfo
            })

            setSession(null)
            onLogout?.()

            console.log('用户已登出')
        } catch (err: any) {
            const error = new Error(formatAuthError(err, '登出失败'))
            setError(error)
            onError?.(error)
            console.error('登出失败:', err)
        } finally {
            setIsLoading(false)
        }
    }

    // 登出前回调
    useAuthEvents('beforeLogout', (details) => {
        logout()
    })
    useAuthEvents('re-authorize-session', (details) => {
        login({redirect: true})
    })

    // 刷新令牌
    const refreshToken = useCallback(async () => {
        if (!ssoService) {
            throw new Error('SSO服务未初始化')
        }

        try {
            setIsLoading(true)
            setError(null)

            const result = await ssoService.refreshToken()

            if (result?.access_token) {
                globalUserStore.syncFromStorage({ notify: false })
                console.log('令牌刷新成功')
            } else {
                throw new Error('令牌刷新失败')
            }
        } catch (err: any) {
            if (isUnauthorizedError(err)) {
                const recovered = await recoverFromUnauthorized()
                if (recovered === 'refreshed') {
                    console.log('令牌已通过续签恢复')
                    return
                }
                if (recovered === 'redirecting') return
            }
            const error = new Error(formatAuthError(err, '令牌刷新失败'))
            setError(error)
            onError?.(error)
            console.error('令牌刷新失败:', err)
        } finally {
            setIsLoading(false)
        }
    }, [ssoService, onError, recoverFromUnauthorized])

    // 获取登录URL
    const getLoginUrl = useCallback((provider?: string) => {
        if (!ssoService) {
            throw new Error('SSO服务未初始化')
        }
        return ssoService.getLoginUrl(provider)
    }, [ssoService])


   
    useAuthEvents('login', (details) => {
        onSuccess?.(details.user, details.token, null)
    })

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

    // W-92 跨应用免登（session-check → silent authorize）
    useEffect(() => {
        if (!autoInit || !isInitialized || !ssoService || isLoading) {
            return
        }
        if (isInCallback()) {
            return
        }

        let cancelled = false
        const runCrossAppSso = async () => {
            try {
                if (isAuthenticated) return
                const recovered = await ssoService.tryRecoverSubProjectSession()
                if (cancelled || recovered) return
                if (ssoService.hasValidSessionCookie()) {
                    await ssoService.trySilentAuthorize()
                }
            } catch (err) {
                console.warn('跨应用 SSO 恢复失败:', err)
            }
        }
        runCrossAppSso()
        return () => { cancelled = true }
    }, [autoInit, isInitialized, ssoService, isLoading, isAuthenticated, isInCallback])

    const getUserInfoFetch = async () => {
        const accessToken = storage.getSSOAccessToken() || token?.access_token
        if (!accessToken) {
            throw new Error('未登录，请先登录')
        }

        const fetchOnce = async (t: string) => ssoService.getUserInfo(t)

        try {
            const userInfo = await fetchOnce(accessToken)
            console.log(userInfo, 'userInfo')
            return userInfo
        } catch (err) {
            if (!isUnauthorizedError(err)) {
                throw new Error(formatAuthError(err, '获取用户信息失败'))
            }

            console.warn('用户信息 401，尝试续签或静默重新登录')
            const recovered = await recoverFromUnauthorized()
            if (recovered === 'refreshed') {
                const newToken = storage.getSSOAccessToken()
                    || (typeof globalUserStore.token === 'string'
                        ? globalUserStore.token
                        : (globalUserStore.token as any)?.access_token)
                if (newToken) {
                    const userInfo = await fetchOnce(newToken)
                    console.log(userInfo, 'userInfo (after refresh)')
                    return userInfo
                }
            }
            if (recovered === 'redirecting') {
                return undefined
            }
            throw new Error('登录已失效（可能已在其他应用退出），请重新登录')
        }
    }

   
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
        getUserInfoFetch,

        // 工具方法
        isInCallback,
        getSubProjectInfo,
        updateConfig
    }
}

export default useSubProjectSSO
