import { useState, useEffect, useCallback, useRef } from 'react'
import { setSSOConfig, SSOService } from '../sso'
import { createAuthConfig } from '../core'
import { getSubProjectConfig, SubProjectConfig } from '../config/subproject-integration'
import { type SSOToken, type SSOUser, type SSOSession, StorageType } from '../types'
import {useAuth, useAuthEvents} from "./useAuth"
import { globalUserStore } from '../stores/UserStore'
import { storage } from '../utils'
import { formatAuthError, isUnauthorizedError } from '../utils/authError'
import { recoverFromOAuthUnauthorized } from '../utils/oauthSessionRecovery'
import { buildLoginCenterReturnUrl } from '../utils/ssoOriginRedirect'
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
    /** 仅清子项目本地 token，保留 IdP session，不跳转 */
    logoutLocal: () => Promise<void>
    /** 全局登出：清本地态并跳转 IdP logout */
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

            if (subProjectId || customConfig) {
                createAuthConfig(finalConfig as any)
            }

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
                try {
                    const loginUrl = await _buildLoginUrl()
                    window.location.href = loginUrl
                } catch (err: any) {
                    if (err?.message === 'OAuth authorize superseded') {
                        return
                    }
                    throw err
                }
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

    /** refresh 仍 401：SDK 统一 session-check → silent authorize → 重新登录 */
    const recoverFromUnauthorized = useCallback(async (): Promise<
        'redirecting' | 'recovered' | 'failed'
    > => {
        if (!ssoService) return 'failed'

        const result = await recoverFromOAuthUnauthorized()
        if (result === 'failed') {
            const sessionError = new Error('登录已失效（可能已在其他应用退出），请重新登录')
            setError(sessionError)
            onError?.(sessionError)
        }
        return result
    }, [ssoService, onError])

    /** 本地登出：仅清子项目 token，保留 sso_session_id，不跳转 IdP */
    const logoutLocal = useCallback(async () => {
        try {
            setIsLoading(true)
            globalUserStore.clearAuthTokensOnly()
            setSession(null)
            onLogout?.()
            console.log('本地登出完成（IdP session 保留）')
        } catch (err: any) {
            const error = new Error(formatAuthError(err, '本地登出失败'))
            setError(error)
            onError?.(error)
            console.error('本地登出失败:', err)
        } finally {
            setIsLoading(false)
        }
    }, [onLogout, onError])

    /** 全局登出：跳转 IdP logout，3033 session 失效 */
    const logout = useCallback(async () => {
        const cfg = config || finalConfig
        const loginUrl = await _buildLoginUrl()
        const home = (cfg as any).ssoHomeUrl || 'http://localhost:3033'
        const postLogout = buildLoginCenterReturnUrl(home, loginUrl)

        ssoLogout({
            post_logout_redirect_uri: postLogout,
        })
    }, [config, finalConfig, ssoLogout])

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
            const error = new Error(formatAuthError(err, '令牌刷新失败'))
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
                if (!ssoService.hasValidSessionCookie()) return
                // 延迟静默免登，避免与用户点击「登录」并发覆盖 pkce_state
                await new Promise((r) => setTimeout(r, 800))
                if (cancelled || isAuthenticated) return
                await ssoService.trySilentAuthorize()
            } catch (err) {
                console.warn('跨应用 SSO 恢复失败:', err)
            }
        }
        runCrossAppSso()
        return () => { cancelled = true }
    }, [autoInit, isInitialized, ssoService, isLoading, isAuthenticated, isInCallback])

    const getUserInfoFetch = useCallback(async () => {
        const accessToken = storage.getSSOAccessToken() || token?.access_token
        if (!accessToken) {
            throw new Error('未登录，请先登录')
        }

        try {
            const userInfo = await ssoService.getUserInfo(accessToken)
            console.log(userInfo, 'userInfo')
            return userInfo
        } catch (err) {
            if (isUnauthorizedError(err)) {
                const recovered = await recoverFromUnauthorized()
                if (recovered === 'redirecting') {
                    return undefined
                }
                if (recovered === 'recovered') {
                    const newToken = storage.getSSOAccessToken() || token?.access_token
                    if (newToken) {
                        return await ssoService.getUserInfo(newToken)
                    }
                }
                throw new Error('登录已失效（可能已在其他应用退出），请重新登录')
            }
            throw new Error(formatAuthError(err, '获取用户信息失败'))
        }
    }, [ssoService, token?.access_token, recoverFromUnauthorized])

   
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
        logoutLocal,
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
