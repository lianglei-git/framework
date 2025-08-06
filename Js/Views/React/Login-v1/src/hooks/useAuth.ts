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
    PhoneResetPasswordRequest
} from '../types'
import { authApi, userApi } from '../services/api'
import { storage } from '../utils/storage'

export const useAuth = (): UseAuthReturn => {
    // 状态管理
    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // 计算属性
    const isAuthenticated = useMemo(() => !!token && !!user, [token, user])
    const isAdmin = useMemo(() => user?.role === 'admin', [user?.role])

    // 初始化认证状态
    useEffect(() => {
        const initAuth = () => {
            const authData = storage.getAuth()
            if (authData) {
                setUser(authData.user)
                setToken(authData.token)
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
        // 状态
        user,
        token,
        isAuthenticated,
        isLoading,
        error,
        // 方法
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
        hasPermission
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