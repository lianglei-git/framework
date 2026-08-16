import { useState, useEffect, useCallback, useRef } from 'react'
import { setSSOConfig } from '../sso/config'
import { createAuthConfig } from '../core/createAuthConfig'
import { getSubProjectConfig, SubProjectConfig } from '../config/subproject-integration'
import { type SSOToken, type SSOUser, type SSOSession } from '../types'
import {useAuth, useAuthEvents} from "./useAuth"
import { globalUserStore } from '../stores/UserStore'
import { storage } from '../utils'
import { formatAuthError, isUnauthorizedError } from '../utils/authError'
import { recoverFromOAuthUnauthorized } from '../utils/oauthSessionRecovery'
import { isLogoutInProgress } from '../utils/clearClientAuth'
import {
    applyReturnTo,
    consumeReturnTo,
    currentPageRedirectUri,
    toCleanOrigin,
} from '../utils/oauthRedirectUri'
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

    const oauthRedirectOrigin = () => {
        const cfg = config || finalConfig
        return toCleanOrigin((cfg as { redirectUri?: string }).redirectUri)
            || toCleanOrigin(cfg.redirectUris?.[0])
            || toCleanOrigin(currentPageRedirectUri())
            || ''
    }

    const landingPage = () => currentPageRedirectUri() || oauthRedirectOrigin()

    const _buildLoginUrl = async () => {
        const cfg = config || finalConfig
        const redirectUri = oauthRedirectOrigin()
        return ssoService.buildAuthorizationUrl('sub_job', {
            client_id: cfg.clientId,
            app_id: cfg.id,
            grant_type: 'authorization_code',
            response_type: 'code',
            redirect_uri: redirectUri,
            redirectUri,
            scope: (cfg.allowedScopes || []).join(' '),
        })
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
    /** 全局登出：清全部本地态并跳转 IdP logout */
    const logout = useCallback(async () => {
        try {
            await ssoLogout({
                post_logout_redirect_uri: landingPage(),
            })
        } catch (err: any) {
            const error = new Error(formatAuthError(err, '登出失败'))
            setError(error)
            onError?.(error)
            console.error('登出失败:', err)
        } finally {
            setIsLoading(false)
        }
    }, [config, finalConfig, ssoLogout, onLogout, onError])

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

   

   
    useAuthEvents('login', (details) => {
        onSuccess?.(details.user, details.token, null)
    })

    // 检查是否在回调模式（以地址栏为准，不能等 ssoService，否则会先吃掉 returnTo）
    const isInCallback = useCallback(() => {
        if (typeof window !== 'undefined') {
            const q = new URLSearchParams(window.location.search)
            if (q.has('code') || q.has('error')) return true
        }
        return !!ssoService?.isInCallbackMode()
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

    // 只有换票成功后才回跳；带着 code 时绝不能先 consume returnTo
    useEffect(() => {
        if (!isInitialized || isLoading || isInCallback()) return
        if (!isAuthenticated) return
        applyReturnTo(consumeReturnTo())
    }, [isInitialized, isLoading, isAuthenticated])

    // W-92 跨应用免登（session-check → silent authorize）
    useEffect(() => {
        if (!autoInit || !isInitialized || !ssoService || isLoading) {
            return
        }
        if (isLogoutInProgress() || isInCallback()) {
            return
        }
        if (typeof window !== 'undefined' && new URL(window.location.href).searchParams.get('logout') === 'true') {
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
        getUserInfoFetch,

        // 工具方法
        isInCallback,
        getSubProjectInfo,
        updateConfig
    }
}

export default useSubProjectSSO
