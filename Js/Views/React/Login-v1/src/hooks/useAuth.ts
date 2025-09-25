import { useState, useCallback, useMemo, useEffect } from 'react'
import {
    User,
    LoginRequest,
    PhoneLoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    VerificationType,
    UseAuthReturn,
    AuthEventListener,
    PhoneResetPasswordRequest,
    SSOLoginRequest,
    SSOLoginResponse,
    SSOUser,
    SSOSession
} from '../types'
import { authApi, userApi } from '../services/api'
import { storage } from '../utils/storage'
import { oauthLoginAPI } from '../services/api'
import { SSOService, createDefaultSSOConfig } from '../services/sso'

export const useAuth = (): UseAuthReturn => {
    // 状态管理
    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(null)
    const [ssoUser, setSSOUser] = useState<SSOUser | null>(null)
    const [ssoSession, setSSOSession] = useState<SSOSession | null>(null)
    const [ssoService, setSSOService] = useState<SSOService | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // 计算属性
    const isAuthenticated = useMemo(() => !!token && !!user, [token, user])
    const isSSOAuthenticated = useMemo(() => !!ssoUser && !!ssoSession && !!ssoService, [ssoUser, ssoSession, ssoService])
    const isAdmin = useMemo(() => user?.role === 'admin', [user?.role])

    // 初始化认证状态和SSO服务
    useEffect(() => {
        const initAuth = async () => {
            // 初始化传统认证状态
            const authData = storage.getAuth()
            if (authData) {
                setUser(authData.user)
                setToken(authData.token)
            }

            // 初始化SSO服务
            try {
                const ssoConfig = createDefaultSSOConfig()
                const service = new SSOService(ssoConfig)
                await service.initialize()
                setSSOService(service)

                // 检查SSO会话
                const ssoData = storage.getSSOData()
                if (ssoData && !storage.isSSOTokenExpired()) {
                    const session = storage.getSSOSession()
                    if (session) {
                        setSSOUser(await service.getCurrentUser())
                        setSSOSession(session)
                    }
                }
            } catch (error) {
                console.warn('Failed to initialize SSO service:', error)
            }
        }

        initAuth()
    }, [])

    // 认证方法
    const login = useCallback(async (data: LoginRequest) => {
        setIsLoading(true)
        setError(null)

        try {
            const response = await authApi.login(data)

            // 保存认证数据
            const authData = {
                user: response.user,
                token: response.token,
                refresh_token: response.refresh_token,
                remember_me: data.remember_me || false,
                expires_at: Date.now() + response.expires_in * 1000
            }

            storage.saveAuth(authData)
            setUser(response.user)
            setToken(response.token)

            // 触发登录事件
            window.dispatchEvent(new CustomEvent('auth:login', { detail: response }))
        } catch (err: any) {
            setError(err.message || '登录失败')
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [])

    const phoneLogin = useCallback(async (data: PhoneLoginRequest) => {
        setIsLoading(true)
        setError(null)

        try {
            const response = await authApi.phoneLogin(data)

            const authData = {
                user: response.user,
                token: response.token,
                refresh_token: response.refresh_token,
                remember_me: data.remember_me || false,
                expires_at: Date.now() + response.expires_in * 1000
            }

            storage.saveAuth(authData)
            setUser(response.user)
            setToken(response.token)

            window.dispatchEvent(new CustomEvent('auth:login', { detail: response }))
        } catch (err: any) {
            setError(err.message || '登录失败')
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [])

    // 邮箱验证码登录
    const emailCodeLogin = useCallback(async (data: { email: string; code: string }) => {
        setIsLoading(true)
        setError(null)
        try {
            const response = await authApi.emailCodeLogin(data)
            const authData = {
                user: response.user,
                token: response.token,
                refresh_token: response.refresh_token,
                remember_me: true,
                expires_at: Date.now() + response.expires_in * 1000
            }
            storage.saveAuth(authData)
            setUser(response.user)
            setToken(response.token)
            window.dispatchEvent(new CustomEvent('auth:login', { detail: response }))
        } catch (err: any) {
            setError(err.message || '登录失败')
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [])

    // 用户注册 - 注册成功后自动登录
    const register = useCallback(async (data: RegisterRequest) => {
        setIsLoading(true)
        setError(null)

        try {
            // 调用注册API，现在返回LoginResponse
            const loginResponse = await authApi.register(data)

            // 注册成功，自动登录
            setUser(loginResponse.user)
            setToken(loginResponse.token)

            // 保存到本地存储
            const authData = {
                user: loginResponse.user,
                token: loginResponse.token,
                refresh_token: loginResponse.refresh_token,
                remember_me: true,
                expires_at: Date.now() + (loginResponse.expires_in * 1000)
            }

            storage.saveAuth(authData)

            // 触发登录成功事件
            window.dispatchEvent(new CustomEvent('auth:login', { detail: loginResponse }))
        } catch (err: any) {
            setError(err.message || '注册失败')
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [authApi])

    const logout = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            await authApi.logout()
        } catch (err) {
            console.error('Logout API error:', err)
        } finally {
            // 清除本地状态
            storage.clearAuth()
            setUser(null)
            setToken(null)
            setIsLoading(false)

            window.dispatchEvent(new CustomEvent('auth:logout'))
        }
    }, [])

    // 忘记密码 - 发送邮件验证码
    const forgotPassword = useCallback(async (email: string) => {
        setIsLoading(true)
        setError(null)

        try {
            await authApi.forgotPassword(email)
            // 触发忘记密码事件
            window.dispatchEvent(new CustomEvent('auth:forgot-password', { detail: { email } }))
        } catch (err: any) {
            setError(err.response.data.message || '发送重置邮件失败')
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [authApi])

    // 重置密码 - 邮箱方式
    const resetPassword = useCallback(async (data: ResetPasswordRequest) => {
        setIsLoading(true)
        setError(null)

        try {
            await authApi.resetPassword(data)
            // 触发密码重置成功事件
            window.dispatchEvent(new CustomEvent('auth:password-reset', { detail: { email: data.email } }))
        } catch (err: any) {
            setError(err.message || '重置密码失败')
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [authApi])

    // 手机号重置密码
    const phoneResetPassword = useCallback(async (data: PhoneResetPasswordRequest) => {
        setIsLoading(true)
        setError(null)

        try {
            await authApi.phoneResetPassword(data)
            // 触发密码重置成功事件
            window.dispatchEvent(new CustomEvent('auth:password-reset', { detail: { phone: data.phone } }))
        } catch (err: any) {
            setError(err.message || '重置密码失败')
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [authApi])

    // 验证码方法
    const sendEmailCode = useCallback(async (email: string, type: VerificationType) => {
        setError(null)

        try {
            await authApi.sendEmailCode({ email, type })
        } catch (err: any) {
            setError(err.message || '发送验证码失败')
            throw err
        }
    }, [])

    // 发送手机验证码
    const sendPhoneCode = useCallback(async (phone: string, type: VerificationType) => {
        setIsLoading(true)
        setError(null)

        try {
            const response = await authApi.sendPhoneCode({ phone, type })
            return response
        } catch (err: any) {
            setError(err.message || '发送验证码失败')
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [])

    // OAuth 登录（GitHub等）
    const oauthLogin = useCallback(async (provider: string, code: string, state?: string) => {
        setIsLoading(true)
        setError(null)
        try {
            const response = await authApi.oauthLogin(provider, code, state)
            const authData = {
                user: response.user,
                token: response.token,
                refresh_token: response.refresh_token,
                remember_me: true,
                expires_at: Date.now() + response.expires_in * 1000
            }
            storage.saveAuth(authData)
            setUser(response.user)
            setToken(response.token)
            window.dispatchEvent(new CustomEvent('auth:login', { detail: response }))
        } catch (err: any) {
            setError(err.message || 'OAuth登录失败')
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [])

    // SSO登录
    const ssoLogin = useCallback(async (request: SSOLoginRequest) => {
        if (!ssoService) {
            throw new Error('SSO service not initialized')
        }

        setIsLoading(true)
        setError(null)

        try {
            const response = await ssoService.login(request)

            // 保存SSO数据
            await storage.saveSSOData({
                token: response.token,
                expires_at: response.session.expires_at
            })
            await storage.saveSSOSession(response.session)

            // 设置状态
            setSSOUser(response.user)
            setSSOSession(response.session)

            // 如果是本地登录，也更新传统用户状态以保持兼容性
            if (request.login_type === 'local' && response.user.custom_claims?.original_user) {
                const originalUser = response.user.custom_claims.original_user
                setUser(originalUser)
                setToken(response.token.access_token)
            }

            window.dispatchEvent(new CustomEvent('auth:sso:login', { detail: response }))
        } catch (err: any) {
            setError(err.message || 'SSO登录失败')
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [ssoService])

    // SSO登出
    const ssoLogout = useCallback(async () => {
        if (!ssoService) {
            throw new Error('SSO service not initialized')
        }

        setIsLoading(true)
        setError(null)

        try {
            await ssoService.logout()
            setSSOUser(null)
            setSSOSession(null)
            window.dispatchEvent(new CustomEvent('auth:sso:logout'))
        } catch (err: any) {
            setError(err.message || 'SSO登出失败')
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [ssoService])

    // 检查SSO会话
    const checkSSOSession = useCallback(async () => {
        if (!ssoService) return false

        try {
            const result = await ssoService.checkSession()
            if (result.is_authenticated && result.user) {
                setSSOUser(result.user)
                if (result.session) {
                    setSSOSession(result.session)
                    await storage.saveSSOSession(result.session)
                }
            } else {
                setSSOUser(null)
                setSSOSession(null)
            }
            return result.is_authenticated
        } catch (error) {
            console.error('SSO session check failed:', error)
            return false
        }
    }, [ssoService])

    // 获取SSO授权URL
    const getSSOAuthorizationUrl = useCallback((provider: string, options?: any) => {
        if (!ssoService) {
            throw new Error('SSO service not initialized')
        }

        return ssoService.buildAuthorizationUrl(provider, options)
    }, [ssoService])

    // 刷新SSO令牌
    const refreshSSOToken = useCallback(async () => {
        if (!ssoService) {
            throw new Error('SSO service not initialized')
        }

        try {
            const newToken = await ssoService.refreshToken()
            const ssoData = storage.getSSOData()
            if (ssoData) {
                await storage.saveSSOData({
                    ...ssoData,
                    token: newToken
                })
            }
            return newToken
        } catch (error) {
            console.error('SSO token refresh failed:', error)
            throw error
        }
    }, [ssoService])

    // 验证SSO令牌
    const validateSSOToken = useCallback(async (token: string) => {
        if (!ssoService) {
            throw new Error('SSO service not initialized')
        }

        return ssoService.validateAccessToken(token)
    }, [ssoService])

    // 用户信息方法
    const updateProfile = useCallback(async (data: Partial<User>) => {
        setIsLoading(true)
        setError(null)

        try {
            const updatedUser = await userApi.updateProfile(data)
            setUser(updatedUser)

            // 更新存储的用户信息
            const authData = storage.getAuth()
            if (authData) {
                storage.saveAuth({ ...authData, user: updatedUser })
            }

            window.dispatchEvent(new CustomEvent('auth:profile-updated', { detail: updatedUser }))
        } catch (err: any) {
            setError(err.message || '更新个人信息失败')
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [])

    const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
        setIsLoading(true)
        setError(null)

        try {
            await userApi.changePassword(oldPassword, newPassword)
            window.dispatchEvent(new CustomEvent('auth:password-changed'))
        } catch (err: any) {
            setError(err.message || '修改密码失败')
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [])

    const refreshUser = useCallback(async () => {
        if (!token) return

        setIsLoading(true)
        setError(null)

        try {
            const userProfile = await userApi.getProfile()
            setUser(userProfile)

            // 更新存储的用户信息
            const authData = storage.getAuth()
            if (authData) {
                storage.saveAuth({ ...authData, user: userProfile })
            }
        } catch (err: any) {
            setError(err.message || '获取用户信息失败')
            // 如果获取用户信息失败，可能是token过期，清除认证状态
            if (err.message?.includes('401')) {
                storage.clearAuth()
                setUser(null)
                setToken(null)
            }
        } finally {
            setIsLoading(false)
        }
    }, [token])

    // 工具方法
    const clearError = useCallback(() => setError(null), [])

    const hasRole = useCallback((role: string): boolean => {
        return user?.role === role
    }, [user?.role])

    const hasPermission = useCallback((permission: string): boolean => {
        if (!user) return false

        // 管理员拥有所有权限
        if (isAdmin) return true

        // 这里可以根据具体的权限系统进行扩展
        // 例如检查用户的权限列表
        return false
    }, [user, isAdmin])

    return {
        // 传统认证状态
        user,
        token,
        refresh_token: null, // 保持兼容性
        isAuthenticated,
        isLoading,
        error,

        // SSO认证状态
        ssoUser,
        ssoSession,
        ssoService,
        isSSOAuthenticated,

        // 传统认证方法
        login,
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

        // 计算属性
        isAdmin,
        hasRole,
        hasPermission,

        // 新增传统方法
        emailCodeLogin,
        oauthLogin,

        // SSO认证方法
        ssoLogin,
        ssoLogout,
        checkSSOSession,
        getSSOAuthorizationUrl,
        refreshSSOToken,
        validateSSOToken
    }
}

// 辅助Hooks
export const useAuthEvents = (eventType: string, callback: AuthEventListener) => {
    useEffect(() => {
        const handleEvent = (event: CustomEvent) => {
            callback(event.detail)
        }

        window.addEventListener(`auth:${eventType}`, handleEvent as EventListener)

        return () => {
            window.removeEventListener(`auth:${eventType}`, handleEvent as EventListener)
        }
    }, [eventType, callback])
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