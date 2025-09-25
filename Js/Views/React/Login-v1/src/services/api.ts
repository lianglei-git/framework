import {
    BaseResponse,
    LoginRequest,
    PhoneLoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    SendEmailCodeRequest,
    SendPhoneCodeRequest,
    VerificationType,
    LoginResponse,
    User,
    UserListParams,
    UserListResponse,
    UserStats,
    LogListParams,
    LogListResponse,
    BulkAction,
    PhoneResetPasswordRequest,
    SSOConfig,
    SSOToken,
    SSOUser,
    SSOSession,
    SSOLoginRequest,
    SSOLoginResponse
} from '../types'
import axios from 'axios'
import queryString from '../../../../../utils/queryString'
import apiClient from './axiosInterceptor'
import { getGenresType } from '../utils/getGenresType'

// 基础配置 - 对接后端unit-auth服务
const basicUrl = import.meta.env.DEV ? "http://localhost:8080" : "https://sparrowui.cn/translate"

// 获取通用请求头
const getCommonHeaders = (token?: string) => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        // 这就是归属项目的ID，用于区分不同的项目
        'X-Genres-Type': getGenresType() || ''
    }

    if (token) {
        headers.Authorization = `Bearer ${token}`
    }

    return headers
}

// API服务基类
export class ApiService {
    protected baseURL: string
    private defaultHeaders: Record<string, string>

    constructor(baseURL: string = basicUrl) {
        this.baseURL = baseURL
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        }
    }

    private async request<T>(
        url: string,
        options: any = {}
    ): Promise<T> {
        const token = localStorage.getItem('auth_token')
        const headers = {
            ...this.defaultHeaders,
            ...options.headers,
            ...(token && { Authorization: `Bearer ${token}` })
        }

        const config = {
            ...options,
            headers,
            url: url.startsWith('http') ? url : `${this.baseURL}${url}`,
            timeout: 10000 // 10秒超时
        }

        try {
            const response = await axios(config)

            // axios返回的数据结构是 { data: T, status: number, ... }
            return response.data
        } catch (error) {
            console.error('API request error:', error)

            // 处理axios错误
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    // 服务器返回了错误状态码
                    throw new Error(`HTTP error! status: ${error.response.status}, message: ${error.response.data?.message || error.message}`)
                } else if (error.request) {
                    // 请求发送了但没有收到响应
                    throw new Error('Network error: No response received')
                } else {
                    // 其他错误
                    throw new Error(`Request error: ${error.message}`)
                }
            } else {
                // 非axios错误
                throw error
            }
        }
    }

    // 通用请求方法
    async get<T>(url: string, params?: any, options: any = {}): Promise<T> {
        const config = {
            method: 'GET',
            params,
            ...options
        }
        return this.request<T>(url, config)
    }

    async post<T>(url: string, data?: any, options: any = {}): Promise<T> {
        const config = {
            method: 'POST',
            data,
            ...options
        }
        return this.request<T>(url, config)
    }

    async put<T>(url: string, data?: any, options: any = {}): Promise<T> {
        const config = {
            method: 'PUT',
            data,
            ...options
        }
        return this.request<T>(url, config)
    }

    async delete<T>(url: string, options: any = {}): Promise<T> {
        const config = {
            method: 'DELETE',
            ...options
        }
        return this.request<T>(url, config)
    }

    async patch<T>(url: string, data?: any, options: any = {}): Promise<T> {
        const config = {
            method: 'PATCH',
            data,
            ...options
        }
        return this.request<T>(url, config)
    }

    // 文件操作
    async upload<T>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T> {
        const formData = new FormData()
        formData.append('file', file)

        const config = {
            method: 'POST',
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: onProgress ? (progressEvent: any) => {
                if (progressEvent.total && onProgress) {
                    const progress = (progressEvent.loaded / progressEvent.total) * 100
                    onProgress(progress)
                }
            } : undefined
        }

        const token = localStorage.getItem('auth_token')
        if (token) {
            config.headers = {
                ...config.headers,
                Authorization: `Bearer ${token}`
            }
        }

        return this.request<T>(url, config)
    }

    async download(url: string, filename?: string): Promise<void> {
        const token = localStorage.getItem('auth_token')
        const headers: Record<string, string> = {}

        if (token) {
            headers.Authorization = `Bearer ${token}`
        }

        try {
            const response = await axios({
                method: 'GET',
                url: `${this.baseURL}${url}`,
                headers,
                responseType: 'blob'
            })

            const blob = new Blob([response.data])
            const downloadUrl = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = downloadUrl
            link.download = filename || 'download'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(downloadUrl)
        } catch (error) {
            console.error('Download error:', error)
            if (axios.isAxiosError(error)) {
                throw new Error(`Download failed: ${error.response?.status || error.message}`)
            }
            throw error
        }
    }
}

// 认证API服务 - 完全对接后端unit-auth，支持SSO
export class AuthApiService extends ApiService {
    private ssoConfig?: SSOConfig

    constructor(baseURL?: string) {
        super(baseURL)
        this.loadSSOConfig()
    }

    /**
     * 加载SSO配置
     */
    private loadSSOConfig(): void {
        // 从环境变量加载SSO配置
        const ssoServerUrl = import.meta.env.VITE_SSO_SERVER_URL
        if (ssoServerUrl) {
            this.ssoConfig = {
                ssoServerUrl,
                clientId: import.meta.env.VITE_SSO_CLIENT_ID || '',
                clientSecret: import.meta.env.VITE_SSO_CLIENT_SECRET || '',
                redirectUri: import.meta.env.VITE_SSO_REDIRECT_URI || window.location.origin + '/auth/callback',
                scope: (import.meta.env.VITE_SSO_SCOPE || 'openid profile email').split(' '),
                responseType: (import.meta.env.VITE_SSO_RESPONSE_TYPE as 'code' | 'token' | 'id_token') || 'code',
                grantType: (import.meta.env.VITE_SSO_GRANT_TYPE as 'authorization_code' | 'implicit' | 'client_credentials') || 'authorization_code',
                sessionTimeout: parseInt(import.meta.env.VITE_SSO_SESSION_TIMEOUT || '3600'),
                autoRefresh: import.meta.env.VITE_SSO_AUTO_REFRESH !== 'false',
                storageType: (import.meta.env.VITE_SSO_STORAGE_TYPE as 'localStorage' | 'sessionStorage') || 'localStorage'
            }
        }
    }

    /**
     * 统一登录接口 - 支持邮箱/用户名/手机号登录
     * 兼容原有API和SSO模式
     */
    async unifiedLogin(data: { account: string, password: string }): Promise<any> {
        // 如果启用了SSO，使用SSO登录
        if (this.ssoConfig) {
            return this.ssoLogin({
                username: data.account,
                password: data.password,
                login_type: 'local'
            })
        }

        // 否则使用原有API
        const response = await axios.post(`${this.baseURL}/api/v1/auth/login`, data, {
            headers: getCommonHeaders()
        })

        if (response.data.code === 200) {
            return {
                user: response.data.data.user,
                token: response.data.data.token,
                refresh_token: '', // 后端暂时没有refresh_token
                expires_in: 3600
            }
        } else {
            throw new Error(response.data.message || '登录失败')
        }
    }

    /**
     * SSO登录
     */
    async ssoLogin(request: SSOLoginRequest): Promise<SSOLoginResponse> {
        if (!this.ssoConfig) {
            throw new Error('SSO configuration not found')
        }

        // 如果是本地登录，调用原有API
        if (request.login_type === 'local' && request.username && request.password) {
            return this.localSSOLogin(request.username, request.password)
        }

        // 如果有授权码，使用授权码流程
        if (request.code) {
            return this.ssoCodeLogin(request)
        }

        // 其他情况抛出错误
        throw new Error('Invalid SSO login request')
    }

    /**
     * 本地SSO登录（兼容原有登录方式）
     */
    private async localSSOLogin(username: string, password: string): Promise<SSOLoginResponse> {
        const tokenData = {
            grant_type: 'password',
            client_id: this.ssoConfig!.clientId,
            client_secret: this.ssoConfig!.clientSecret,
            username: username,
            password: password,
            scope: this.ssoConfig!.scope?.join(' ')
        }

        const response = await this.post<SSOToken>(`${this.ssoConfig!.ssoServerUrl}/oauth/token`, tokenData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })

        if (response.error) {
            throw new Error(response.error_description || response.error)
        }

        // 获取用户信息
        const userInfo = await this.getSSOUserInfo(response.access_token)

        // 创建SSO会话
        const session: SSOSession = {
            session_id: `sso_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            user_id: userInfo.sub,
            client_id: this.ssoConfig!.clientId,
            authenticated_at: Date.now(),
            expires_at: Date.now() + (response.expires_in * 1000),
            last_activity: Date.now(),
            is_active: true,
            remember_me: false
        }

        return {
            user: userInfo,
            token: response,
            session: session
        }
    }

    /**
     * SSO授权码登录
     */
    private async ssoCodeLogin(request: SSOLoginRequest): Promise<SSOLoginResponse> {
        if (!this.ssoConfig) {
            throw new Error('SSO configuration not found')
        }

        const tokenData = {
            grant_type: 'authorization_code',
            client_id: this.ssoConfig.clientId,
            client_secret: this.ssoConfig.clientSecret,
            code: request.code,
            redirect_uri: request.redirect_uri || this.ssoConfig.redirectUri,
            state: request.state
        }

        const response = await this.post<SSOToken>(`${this.ssoConfig.ssoServerUrl}/oauth/token`, tokenData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })

        if (response.error) {
            throw new Error(response.error_description || response.error)
        }

        // 获取用户信息
        const userInfo = await this.getSSOUserInfo(response.access_token)

        // 创建SSO会话
        const session: SSOSession = {
            session_id: `sso_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            user_id: userInfo.sub,
            client_id: this.ssoConfig.clientId,
            authenticated_at: Date.now(),
            expires_at: Date.now() + (response.expires_in * 1000),
            last_activity: Date.now(),
            is_active: true,
            remember_me: request.remember_me || false
        }

        return {
            user: userInfo,
            token: response,
            session: session
        }
    }

    /**
     * 获取SSO用户信息
     */
    private async getSSOUserInfo(accessToken: string): Promise<SSOUser> {
        if (!this.ssoConfig) {
            throw new Error('SSO configuration not found')
        }

        return this.get<SSOUser>(`${this.ssoConfig.ssoServerUrl}/oauth/userinfo`, undefined, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        })
    }

    // 传统邮箱登录
    async login(data: LoginRequest): Promise<LoginResponse> {
        const response = await this.post<{ code: number, data: { user: User, token: string }, message?: string }>(`${this.baseURL}/api/v1/auth/login`, {
            account: data.account,
            password: data.password
        }, {
            headers: getCommonHeaders()
        })

        if (response.code === 200) {
            return {
                user: response.data.user,
                token: response.data.token,
                refresh_token: '',
                expires_in: 3600
            }
        } else {
            throw new Error(response.message || '登录失败')
        }
    }

    // 手机验证码登录
    async phoneLogin(data: PhoneLoginRequest): Promise<LoginResponse> {
        const response = await this.post<{ code: number, data: { user: User, token: string }, message?: string }>(`${this.baseURL}/api/v1/auth/phone-login`, data, {
            headers: getCommonHeaders()
        })

        if (response.code === 200) {
            return {
                user: response.data.user,
                token: response.data.token,
                refresh_token: '',
                expires_in: 3600
            }
        } else {
            throw new Error(response.message || '登录失败')
        }
    }

    // 邮箱验证码登录
    async emailCodeLogin(data: { email: string, code: string }): Promise<LoginResponse> {
        const response = await this.post<{ code: number, data: { user: User, token: string }, message?: string }>(`${this.baseURL}/api/v1/auth/email-login`, data, {
            headers: getCommonHeaders()
        })
        if (response.code === 200) {
            return {
                user: response.data.user,
                token: response.data.token,
                refresh_token: '',
                expires_in: 3600
            }
        } else {
            throw new Error(response.message || '登录失败')
        }
    }

    // 获取OAuth授权URL（GitHub等）
    async getOAuthURL(provider: string, state?: string): Promise<string> {
        const response = await this.get<{ code: number, data: { auth_url: string }, message?: string }>(`${this.baseURL}/api/v1/auth/oauth/${provider}/url`, { state }, {
            headers: getCommonHeaders()
        })
        if (response.code === 200) {
            return response.data.auth_url
        }
        throw new Error(response.message || '获取授权链接失败')
    }

    // OAuth登录（code + state）
    async oauthLogin(provider: string, code: string, state?: string): Promise<LoginResponse> {
        const response = await this.post<{ code: number, data: { user: User, token: string }, message?: string }>(`${this.baseURL}/api/v1/auth/oauth-login`, { provider, code, state }, {
            headers: getCommonHeaders()
        })
        if (response.code === 200) {
            return {
                user: response.data.user,
                token: response.data.token,
                refresh_token: '',
                expires_in: 3600
            }
        }
        throw new Error(response.message || 'OAuth登录失败')
    }

    // 用户注册 - 支持201状态码，注册成功后返回登录信息
    async register(data: RegisterRequest): Promise<LoginResponse> {
        const response = await this.post<{ code: number, data?: any, message?: string }>(`${this.baseURL}/api/v1/auth/register`, {
            email: data.email,
            username: data.username,
            nickname: data.username,
            password: data.password,
            code: data.verification_code
        }, {
            headers: getCommonHeaders()
        })

        // 支持200和201状态码
        if (response.code === 200 || response.code === 201) {
            return response.data
        } else {
            throw new Error(response.message || '注册失败')
        }
    }

    // 发送邮箱验证码
    async sendEmailCode(data: SendEmailCodeRequest): Promise<void> {
        const response = await this.post<{ code: number, message?: string }>(`${this.baseURL}/api/v1/auth/send-email-code`, {
            email: data.email,
            type: data.type
        }, {
            headers: getCommonHeaders()
        })

        if (response.code !== 200) {
            throw new Error(response.message || '发送验证码失败')
        }
    }

    // 发送手机验证码
    async sendPhoneCode(data: SendPhoneCodeRequest): Promise<void> {
        const response = await this.post<{ code: number, message?: string }>(`${this.baseURL}/api/v1/auth/send-sms-code`, {
            phone: data.phone,
            type: data.type
        }, {
            headers: getCommonHeaders()
        })

        if (response.code !== 200) {
            throw new Error(response.message || '发送验证码失败')
        }
    }

    // 邮箱重置密码
    async emailResetPassword(data: ResetPasswordRequest): Promise<void> {
        const response = await this.post<{ code: number, message?: string }>(`${this.baseURL}/api/v1/auth/reset-password`, {
            email: data.email,
            code: data.code,
            password: data.password
        }, {
            headers: getCommonHeaders()
        })

        if (response.code !== 200) {
            throw new Error(response.message || '重置密码失败')
        }
    }

    // 手机重置密码
    async phoneResetPassword(data: PhoneResetPasswordRequest): Promise<void> {
        const response = await this.post<{ code: number, message?: string }>(`${this.baseURL}/api/v1/auth/phone-reset-password`, {
            phone: data.phone,
            code: data.code,
            password: data.password
        }, {
            headers: getCommonHeaders()
        })

        if (response.code !== 200) {
            throw new Error(response.message || '重置密码失败')
        }
    }
    // 重置密码 - 邮箱方式
    async resetPassword(data: ResetPasswordRequest): Promise<void> {
        const response = await this.post<{ code: number, message?: string }>(`${this.baseURL}/api/v1/auth/reset-password`, data)
        if (response.code !== 200) {
            throw new Error(response.message || '重置密码失败')
        }
    }

    // 忘记密码
    async forgotPassword(email: string): Promise<void> {
        const response = await this.post<{ code: number, message?: string }>(`${this.baseURL}/api/v1/auth/forgot-password`, {
            email: email
        }, {
            headers: getCommonHeaders()
        })

        if (response.code !== 200) {
            throw new Error(response.message || '发送重置邮件失败')
        }
    }

    // 登出
    async logout(): Promise<void> {
        // 后端暂时没有logout接口，前端清除token即可
        localStorage.removeItem('auth_token')
    }

    // 微信登录相关
    async getWechatQRCode(): Promise<any> {
        const response = await this.get<{ code: number, data: { qr_url: string, state: string, expires_at: string }, message?: string }>(`${this.baseURL}/api/v1/auth/wechat/qr-code`, undefined, {
            headers: getCommonHeaders()
        })

        if (response.code === 200) {
            return {
                qrCodeUrl: response.data.qr_url,
                qrCodeId: response.data.state,
                expiresAt: response.data.expires_at
            }
        } else {
            throw new Error(response.message || '获取二维码失败')
        }
    }

    async checkWechatLoginStatus(state: string): Promise<any> {
        const response = await this.get<{ code: number, data: { status: string, scanned: boolean, used: boolean, user: any, token: string }, message?: string }>(`${this.baseURL}/api/v1/auth/wechat/status/${state}`, undefined, {
            headers: getCommonHeaders()
        })

        if (response.code === 200) {
            return {
                status: response.data.status,
                scanned: response.data.scanned,
                used: response.data.used,
                user: response.data.user,
                token: response.data.token
            }
        } else {
            throw new Error(response.message || '检查登录状态失败')
        }
    }

    // 兼容原有API的方法
    async loginV1(params: { username: string, password: string }): Promise<any> {
        return this.unifiedLogin({
            account: params.username,
            password: params.password
        })
    }
}

// 用户API服务 - 完全对接后端unit-auth
export class UserApiService extends ApiService {
    async getProfile(): Promise<User> {
        const response = await this.get<{ code: number, data: User, message?: string }>(`${this.baseURL}/api/v1/user/profile`, undefined, {
            headers: getCommonHeaders(localStorage.getItem('auth_token') || undefined)
        })

        if (response.code === 200) {
            return response.data
        } else {
            throw new Error(response.message || '获取用户信息失败')
        }
    }

    async updateProfile(data: Partial<User>): Promise<User> {
        const response = await this.put<{ code: number, data: User, message?: string }>(`${this.baseURL}/api/v1/user/profile`, data, {
            headers: getCommonHeaders(localStorage.getItem('auth_token') || undefined)
        })

        if (response.code === 200) {
            return response.data
        } else {
            throw new Error(response.message || '更新用户信息失败')
        }
    }

    async changePassword(oldPassword: string, newPassword: string): Promise<void> {
        const response = await this.post<{ code: number, message?: string }>(`${this.baseURL}/api/v1/user/change-password`, {
            old_password: oldPassword,
            new_password: newPassword
        }, {
            headers: getCommonHeaders(localStorage.getItem('auth_token') || undefined)
        })

        if (response.code !== 200) {
            throw new Error(response.message || '修改密码失败')
        }
    }

    async uploadAvatar(file: File): Promise<{ avatar_url: string }> {
        const formData = new FormData()
        formData.append('file', file)

        const response = await this.upload<{ code: number, data: { avatar_url: string }, message?: string }>(`${this.baseURL}/api/v1/user/avatar`, file)

        if (response.code === 200) {
            return { avatar_url: response.data.avatar_url }
        } else {
            throw new Error(response.message || '上传头像失败')
        }
    }

    async deleteAccount(password: string): Promise<void> {
        const response = await this.post<{ code: number, message?: string }>(`${this.baseURL}/api/v1/user/delete-account`, {
            password: password
        }, {
            headers: getCommonHeaders(localStorage.getItem('auth_token') || undefined)
        })

        if (response.code !== 200) {
            throw new Error(response.message || '删除账户失败')
        }
    }

    // 获取头像URL
    getAvatarSrc(avatar: string | undefined): string | undefined {
        if (!avatar) return undefined
        return `${this.baseURL}/api/v1/user/avatar/${avatar}`
    }
}

// 管理员API服务
export class AdminApiService extends ApiService {
    async getUsers(params?: UserListParams): Promise<UserListResponse> {
        const response = await this.get<{ code: number, data: UserListResponse, message?: string }>(`${this.baseURL}/api/v1/admin/users`, params, {
            headers: getCommonHeaders(localStorage.getItem('auth_token') || undefined)
        })

        if (response.code === 200) {
            return response.data
        } else {
            throw new Error(response.message || '获取用户列表失败')
        }
    }

    async getUser(id: string): Promise<User> {
        const response = await this.get<{ code: number, data: User, message?: string }>(`${this.baseURL}/api/v1/admin/users/${id}`, undefined, {
            headers: getCommonHeaders(localStorage.getItem('auth_token') || undefined)
        })

        if (response.code === 200) {
            return response.data
        } else {
            throw new Error(response.message || '获取用户信息失败')
        }
    }

    async updateUser(id: string, data: Partial<User>): Promise<User> {
        const response = await this.put<{ code: number, data: User, message?: string }>(`${this.baseURL}/api/v1/admin/users/${id}`, data, {
            headers: getCommonHeaders(localStorage.getItem('auth_token') || undefined)
        })

        if (response.code === 200) {
            return response.data
        } else {
            throw new Error(response.message || '更新用户信息失败')
        }
    }

    async deleteUser(id: string): Promise<void> {
        const response = await this.delete<{ code: number, message?: string }>(`${this.baseURL}/api/v1/admin/users/${id}`, {
            headers: getCommonHeaders(localStorage.getItem('auth_token') || undefined)
        })

        if (response.code !== 200) {
            throw new Error(response.message || '删除用户失败')
        }
    }

    async bulkUpdateUsers(userIds: string[], action: BulkAction): Promise<void> {
        const response = await this.post<{ code: number, message?: string }>(`${this.baseURL}/api/v1/admin/users/bulk-update`, {
            user_ids: userIds,
            action: action
        }, {
            headers: getCommonHeaders(localStorage.getItem('auth_token') || undefined)
        })

        if (response.code !== 200) {
            throw new Error(response.message || '批量更新用户失败')
        }
    }

    async getUserStats(): Promise<UserStats> {
        const response = await this.get<{ code: number, data: UserStats, message?: string }>(`${this.baseURL}/api/v1/admin/stats/users`, undefined, {
            headers: getCommonHeaders(localStorage.getItem('auth_token') || undefined)
        })

        if (response.code === 200) {
            return response.data
        } else {
            throw new Error(response.message || '获取用户统计失败')
        }
    }

    async getLoginLogs(params?: LogListParams): Promise<LogListResponse> {
        const response = await this.get<{ code: number, data: LogListResponse, message?: string }>(`${this.baseURL}/api/v1/admin/stats/login-logs`, params, {
            headers: getCommonHeaders(localStorage.getItem('auth_token') || undefined)
        })

        if (response.code === 200) {
            return response.data
        } else {
            throw new Error(response.message || '获取登录日志失败')
        }
    }
}

// 创建API服务实例
export const authApi = new AuthApiService()
export const userApi = new UserApiService()
export const adminApi = new AdminApiService()

// 导出兼容现有代码的API函数
export const loginAPIv1 = authApi.loginV1.bind(authApi)
export const registerAPI = authApi.register.bind(authApi)
export const updateUserInfoAPI = userApi.updateProfile.bind(userApi)
export const getDefatilsUserInfoAPI = userApi.getProfile.bind(userApi)
export const getAvatarSrc = userApi.getAvatarSrc.bind(userApi)
export const wechatLoginAPI = authApi.checkWechatLoginStatus.bind(authApi)
export const getWechatQRCodeAPI = authApi.getWechatQRCode.bind(authApi)
export const checkWechatLoginStatusAPI = authApi.checkWechatLoginStatus.bind(authApi)
export const emailRegisterAPI = authApi.register.bind(authApi)
export const sendEmailCodeAPI = authApi.sendEmailCode.bind(authApi)
export const emailCodeLoginAPI = authApi.emailCodeLogin.bind(authApi)
export const getOAuthURLAPI = authApi.getOAuthURL.bind(authApi)
export const oauthLoginAPI = authApi.oauthLogin.bind(authApi) 