import { useState, useCallback, useEffect, useRef } from 'react'
import {
    type User,
    type PhoneLoginRequest,
    type RegisterRequest,
    type ResetPasswordRequest,
    type VerificationType,
    type AuthEventListener,
    type PhoneResetPasswordRequest,
    type unifiedNormalLocalLoginRequest,
} from '../types'
import { authApi, userApi, createAuthConfig } from '../core'
import { storage } from '../utils/storage'
import { clearOriginAppUri } from '../utils/ssoOriginRedirect'
import { formatAuthError, isUnauthorizedError } from '../utils/authError'
import {
    cleanOAuthParamsFromUrl,
    clearOAuthLoadingInfo,
    hasOAuthCallbackParams,
    readOAuthLoadingInfo,
    stripLogoutParamFromUrl,
    writeOAuthLoadingInfo,
    type OAuthLoadingInfo,
} from '../utils/oauthLoading'
import { globalUserStore } from '../stores/UserStore'
import { SSOService } from '../sso'
import { getSSOConfig } from '../sso/config'


export const storageKeys = {
    "loading_infos": "loading_infos",
    "is_login": "is_login",
}

const useSSOService = () => {
    const [ssoService, setSSOService]: [SSOService, (k: any) => void] = useState(null)
    const [ssoProviders, setSSOProviders] = useState<any>([])

    useEffect(() => {
        const init = async () => {
            try {
                const ssoConfig = createAuthConfig()
                const service = await SSOService.getInstance(ssoConfig)
                const providers = service.getProviders()
                setSSOProviders(providers)
                setSSOService(service)
            } catch (err) {
                console.error('SSO 服务初始化失败:', err)
                setSSOProviders([])
            }
        }
        init()
    }, [])

    return {
        ssoService,
        ssoProviders
    }
}


type LoadingInfos = OAuthLoadingInfo

let gloadingInfos: LoadingInfos = readOAuthLoadingInfo()

export const useAuth = () => {
    const store = globalUserStore
    const [loadingInfos, _setLoadingInfos] = useState<LoadingInfos>(gloadingInfos)
    const {
        ssoService,
        ssoProviders
    } = useSSOService()

    const setLoadingInfos = (status: 'stop' | 'loading', msg = '', provider = '') => {
        const gb: LoadingInfos = { status, message: msg, provider, time: Date.now() }
        _setLoadingInfos(gb)
        writeOAuthLoadingInfo(gb)
    }

    const resetOAuthLoading = useCallback(() => {
        const cleared = clearOAuthLoadingInfo()
        _setLoadingInfos(cleared)
        cleanOAuthParamsFromUrl()
    }, [])

    const clearLocalAuth = () => {
        store.clearLocalAuth()
        SSOService.clearSessionCookies()
        clearOriginAppUri()
        document.cookie = 'sso_session_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
    }

    const failWith = (err: unknown, fallback: string): never => {
        const message = formatAuthError(err, fallback)
        store.setError(message)
        throw new Error(message)
    }

    useEffect(() => {
        const url = new URL(window.location.href)

        if (url.searchParams.get('logout') === 'true') {
            clearLocalAuth()
            resetOAuthLoading()
            stripLogoutParamFromUrl(url)
        }

        const oauthError = url.searchParams.get('error')
        if (oauthError) {
            resetOAuthLoading()
            store.setError(formatAuthError({
                error: oauthError,
                error_description: url.searchParams.get('error_description'),
            }, '第三方登录已取消'))
            cleanOAuthParamsFromUrl(url)
        } else if (!url.searchParams.has('code')) {
            resetOAuthLoading()
        }

        store.syncFromStorage()

        const onPageShow = (event: PageTransitionEvent) => {
            if (!event.persisted) return
            if (!hasOAuthCallbackParams()) {
                resetOAuthLoading()
            }
        }
        window.addEventListener('pageshow', onPageShow)
        return () => window.removeEventListener('pageshow', onPageShow)
    }, [resetOAuthLoading])

    useAuthEvents('login', () => {
        setLoadingInfos('stop')
        stripLogoutParamFromUrl()
        store.syncFromStorage()
    })

    useAuthEvents('oauth-failed', () => {
        resetOAuthLoading()
    })

    const login = () => { }

    const oauthLogin = async (provider: string) => {
        if (!ssoService) {
            console.error('SSO 服务未初始化，无法发起第三方登录')
            store.setError('登录服务尚未就绪，请刷新页面后重试')
            return
        }
        try {
            const authUrl = await ssoService.buildAuthorizationUrl(provider)
            setLoadingInfos('loading', '授权中...', provider)
            window.location.href = authUrl
        } catch (error) {
            console.error('SSO login failed:', error)
            store.setError(formatAuthError(error, '第三方登录失败，请稍后重试'))
        }
    }

    const unifiedNormalLocalLogin = async (data: unifiedNormalLocalLoginRequest) => {
        store.isLoading = true
        store.error = null
        try {
            const response = await authApi.unifiedNormalLocalLogin(data)
            return ssoService.unifiedSaveLoginInfos(response)
        } catch (err: any) {
            failWith(err, '登录失败')
        } finally {
            store.isLoading = false
        }
    }

    const phoneLogin = useCallback(async (data: PhoneLoginRequest) => {
        store.isLoading = true
        store.error = null
        try {
            const response = await authApi.phoneLogin(data)
            const payload = { ...response, remember_me: data.remember_me }
            store.setAuthFromResponse(payload, { notify: true })
        } catch (err: any) {
            failWith(err, '登录失败')
        } finally {
            store.isLoading = false
        }
    }, [])

    const emailCodeLogin = () => []

    const register = async (data: RegisterRequest) => {
        store.isLoading = true
        store.error = null
        try {
            const loginResponse = await authApi.register(data)
            return ssoService.unifiedSaveLoginInfos(loginResponse)
        } catch (err: any) {
            failWith(err, '注册失败')
        } finally {
            store.isLoading = false
        }
    }

    const logout = () => store.logout()

    const buildLogoutRedirectUri = (override?: string) => {
        const base =
            override ||
            getSSOConfig().redirectUri ||
            `${window.location.origin}${window.location.pathname}`
        return base.includes('logout=')
            ? base
            : `${base}${base.includes('?') ? '&' : '?'}logout=true`
    }

    const ssoLogout = async (params: Record<string, any> = {}) => {
        store.isLoading = true
        store.error = null

        const logoutRedirect = buildLogoutRedirectUri(params.post_logout_redirect_uri)
        const idToken = store.tokenPayload?.id_token

        const finishLocalLogout = () => {
            clearLocalAuth()
            resetOAuthLoading()
            window.dispatchEvent(new CustomEvent('auth:logout'))
            store.isLoading = false
        }

        if (!idToken || !ssoService) {
            finishLocalLogout()
            window.location.href = logoutRedirect
            return
        }

        try {
            await ssoService.ssoLogout({
                id_token_hint: idToken,
                post_logout_redirect_uri: logoutRedirect,
                state: params.state,
            })
        } catch (err) {
            console.error('Logout API error:', err)
            finishLocalLogout()
            window.location.href = logoutRedirect
        }
    }

    const forgotPassword = useCallback(async (email: string) => {
        store.isLoading = true
        store.error = null
        try {
            await authApi.forgotPassword(email)
            window.dispatchEvent(new CustomEvent('auth:forgot-password', { detail: { email } }))
        } catch (err: any) {
            failWith(err, '发送重置邮件失败')
        } finally {
            store.isLoading = false
        }
    }, [])

    const resetPassword = useCallback(async (data: ResetPasswordRequest) => {
        store.isLoading = true
        store.error = null
        try {
            await authApi.resetPassword(data)
            window.dispatchEvent(new CustomEvent('auth:password-reset', { detail: { email: data.email } }))
        } catch (err: any) {
            failWith(err, '重置密码失败')
        } finally {
            store.isLoading = false
        }
    }, [])

    const phoneResetPassword = useCallback(async (data: PhoneResetPasswordRequest) => {
        store.isLoading = true
        store.error = null
        try {
            await authApi.phoneResetPassword(data)
            window.dispatchEvent(new CustomEvent('auth:password-reset', { detail: { phone: data.phone } }))
        } catch (err: any) {
            failWith(err, '重置密码失败')
        } finally {
            store.isLoading = false
        }
    }, [])

    const sendEmailCode = useCallback(async (email: string, type: VerificationType) => {
        store.error = null
        try {
            await authApi.sendEmailCode({ email, type })
        } catch (err: any) {
            failWith(err, '发送验证码失败')
        }
    }, [])

    const sendPhoneCode = useCallback(async (phone: string, type: VerificationType) => {
        store.isLoading = true
        store.error = null
        try {
            return await authApi.sendPhoneCode({ phone, type })
        } catch (err: any) {
            failWith(err, '发送验证码失败')
        } finally {
            store.isLoading = false
        }
    }, [])

    const ssoLogin = () => {}

    const checkSSOSession = useCallback(async () => {
        if (!ssoService) return false
        try {
            const result = await ssoService.checkSession()
            if (result.is_authenticated && result.user) {
                store.ssoUser = result.user
                if (result.session) {
                    store.ssoSession = result.session
                    await storage.saveSSOSession(result.session)
                }
            } else {
                store.ssoUser = null
                store.ssoSession = null
            }
            return result.is_authenticated
        } catch (error) {
            console.error('SSO session check failed:', error)
            return false
        }
    }, [ssoService])

    const getSSOAuthorizationUrl = useCallback((provider: string, options?: any) => {
        if (!ssoService) throw new Error('SSO service not initialized')
        return ssoService.buildAuthorizationUrl(provider, options)
    }, [ssoService])

    const refreshSSOToken = useCallback(async () => {
        if (!ssoService) throw new Error('SSO service not initialized')
        const newToken = await ssoService.refreshToken()
        const ssoData = storage.getSSOData()
        if (ssoData) {
            const expiresIn = newToken.expires_in ?? 3600
            await storage.saveSSOData({
                ...ssoData,
                token: newToken,
                expires_at: Date.now() + expiresIn * 1000,
            })
        }
        return newToken
    }, [ssoService])

    const validateSSOToken = useCallback(async (token: string) => {
        if (!ssoService) throw new Error('SSO service not initialized')
        return ssoService.validateAccessToken(token)
    }, [ssoService])

    const updateProfile = useCallback(async (data: Partial<User>) => {
        store.isLoading = true
        store.error = null
        try {
            const updatedUser = await userApi.updateProfile(data)
            const authData = storage.getAuth()
            if (authData) {
                storage.saveAuth({ ...authData, user: updatedUser })
            }
            store.setUserInfo(updatedUser, store.tokenPayload)
            window.dispatchEvent(new CustomEvent('auth:profile-updated', { detail: updatedUser }))
        } catch (err: any) {
            failWith(err, '更新个人信息失败')
        } finally {
            store.isLoading = false
        }
    }, [])

    const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
        store.isLoading = true
        store.error = null
        try {
            await userApi.changePassword(oldPassword, newPassword)
            window.dispatchEvent(new CustomEvent('auth:password-changed'))
        } catch (err: any) {
            failWith(err, '修改密码失败')
        } finally {
            store.isLoading = false
        }
    }, [])

    const refreshUser = useCallback(async () => {
        if (!store.token) return
        store.isLoading = true
        store.error = null
        try {
            const userProfile = await userApi.getProfile()
            const authData = storage.getAuth()
            if (authData) {
                storage.saveAuth({ ...authData, user: userProfile })
            }
            store.setUserInfo(userProfile, store.tokenPayload)
        } catch (err: any) {
            store.setError(formatAuthError(err, '获取用户信息失败'))
            if (isUnauthorizedError(err)) {
                clearLocalAuth()
            }
        } finally {
            store.isLoading = false
        }
    }, [])

    const clearError = useCallback(() => store.clearError(), [])

    const hasRole = useCallback((role: string): boolean => {
        return store.hasRole(role)
    }, [store.user])

    const hasPermission = useCallback((_permission: string): boolean => {
        if (!store.user) return false
        return store.isAdmin
    }, [store.user, store.isAdmin])

    return {
        authInfo: store.authInfo,
        user: store.user,
        token: store.tokenPayload,
        refresh_token: null,
        isAuthenticated: store.isAuthenticated,
        isLoading: store.isLoading,
        error: store.error,
        ssoUser: store.ssoUser,
        ssoSession: store.ssoSession,
        ssoService,
        isSSOAuthenticated: store.isSSOAuthenticated,
        login,
        oauthLogin,
        phoneLogin,
        register,
        logout,
        resetPassword,
        phoneResetPassword,
        sendEmailCode,
        sendPhoneCode,
        forgotPassword,
        updateProfile,
        changePassword,
        refreshUser,
        clearError,
        loadingInfos,
        resetOAuthLoading,
        isAdmin: store.isAdmin,
        hasRole,
        hasPermission,
        emailCodeLogin,
        ssoProviders,
        ssoLogin,
        ssoLogout,
        checkSSOSession,
        getSSOAuthorizationUrl,
        refreshSSOToken,
        validateSSOToken,
        unifiedNormalLocalLogin,
    }
}


// 辅助Hooks
export const useAuthEvents = (eventType: string, callback: AuthEventListener) => {
    const callbackRef = useRef(callback)
    callbackRef.current = callback

    useEffect(() => {
        const handleEvent = (event: CustomEvent) => {
            callbackRef.current(event.detail)
        }

        window.addEventListener(`auth:${eventType}`, handleEvent as EventListener)

        return () => {
            window.removeEventListener(`auth:${eventType}`, handleEvent as EventListener)
        }
    }, [eventType])
}

export const useAuthState = () => {
    const auth = useAuth()
    return {
        isAuthenticated: auth.isAuthenticated,
        isLoading: auth.isLoading,
        error: auth.error
    }
}

export const useUser = () => {
    const auth = useAuth()
    return auth.user
}

export const useRequireAuth = (redirectTo?: string) => {
    const auth = useAuth()

    useEffect(() => {
        if (!auth.isAuthenticated && !auth.isLoading) {
            if (redirectTo) {
                window.location.href = redirectTo
            }
        }
    }, [auth.isAuthenticated, auth.isLoading, redirectTo])

    return auth
}

export const useRequireRole = (requiredRole: string, redirectTo?: string) => {
    const auth = useAuth()

    useEffect(() => {
        if (auth.isAuthenticated && !auth.isLoading) {
            if (!auth.hasRole(requiredRole)) {
                if (redirectTo) {
                    window.location.href = redirectTo
                }
            }
        }
    }, [auth.isAuthenticated, auth.isLoading, auth.hasRole, requiredRole, redirectTo])

    return auth
} 