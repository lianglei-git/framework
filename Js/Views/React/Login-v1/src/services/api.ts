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
    PhoneResetPasswordRequest
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
        options: RequestInit = {}
    ): Promise<T> {
        const token = localStorage.getItem('auth_token')
        const headers = {
            ...this.defaultHeaders,
            ...options.headers,
            ...(token && { Authorization: `Bearer ${token}` })
        }

        const config: RequestInit = {
            ...options,
            headers
        }

        try {
            const response = await fetch(`${this.baseURL}${url}`, config)

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data = await response.json()
            return data
        } catch (error) {
            console.error('API request error:', error)
            throw error
        }
    }

    // 通用请求方法
    async get<T>(url: string, params?: any): Promise<T> {
        const queryString = params ? `?${new URLSearchParams(params).toString()}` : ''
        return this.request<T>(`${url}${queryString}`, { method: 'GET' })
    }

    async post<T>(url: string, data?: any): Promise<T> {
        return this.request<T>(url, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined
        })
    }

    async put<T>(url: string, data?: any): Promise<T> {
        return this.request<T>(url, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined
        })
    }

    async delete<T>(url: string): Promise<T> {
        return this.request<T>(url, { method: 'DELETE' })
    }

    async patch<T>(url: string, data?: any): Promise<T> {
        return this.request<T>(url, {
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined
        })
    }

    // 文件操作
    async upload<T>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T> {
        const formData = new FormData()
        formData.append('file', file)

        const xhr = new XMLHttpRequest()

        return new Promise((resolve, reject) => {
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable && onProgress) {
                    const progress = (event.loaded / event.total) * 100
                    onProgress(progress)
                }
            })

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const data = JSON.parse(xhr.responseText)
                        resolve(data)
                    } catch (error) {
                        reject(new Error('Invalid JSON response'))
                    }
                } else {
                    reject(new Error(`HTTP error! status: ${xhr.status}`))
                }
            })

            xhr.addEventListener('error', () => {
                reject(new Error('Network error'))
            })

            xhr.open('POST', `${this.baseURL}${url}`)
            const token = localStorage.getItem('auth_token')
            if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`)
            }
            xhr.send(formData)
        })
    }

    async download(url: string, filename?: string): Promise<void> {
        const response = await fetch(`${this.baseURL}${url}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('auth_token')}`
            }
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = filename || 'download'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(downloadUrl)
    }
}

// 认证API服务 - 完全对接后端unit-auth
export class AuthApiService extends ApiService {
    // 统一登录接口 - 支持邮箱/用户名/手机号登录
    async unifiedLogin(data: { account: string, password: string }): Promise<any> {
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

    // 传统邮箱登录
    async login(data: LoginRequest): Promise<LoginResponse> {
        const response = await axios.post(`${this.baseURL}/api/v1/auth/login`, {
            account: data.account,
            password: data.password
        }, {
            headers: getCommonHeaders()
        })

        if (response.data.code === 200) {
            return {
                user: response.data.data.user,
                token: response.data.data.token,
                refresh_token: '',
                expires_in: 3600
            }
        } else {
            throw new Error(response.data.message || '登录失败')
        }
    }

    // 手机验证码登录
    async phoneLogin(data: PhoneLoginRequest): Promise<LoginResponse> {
        const response = await axios.post(`${this.baseURL}/api/v1/auth/phone-login`, data, {
            headers: getCommonHeaders()
        })

        if (response.data.code === 200) {
            return {
                user: response.data.data.user,
                token: response.data.data.token,
                refresh_token: '',
                expires_in: 3600
            }
        } else {
            throw new Error(response.data.message || '登录失败')
        }
    }

    // 邮箱验证码登录
    async emailCodeLogin(data: { email: string, code: string }): Promise<LoginResponse> {
        const response = await axios.post(`${this.baseURL}/api/v1/auth/email-login`, data, {
            headers: getCommonHeaders()
        })
        if (response.data.code === 200) {
            return {
                user: response.data.data.user,
                token: response.data.data.token,
                refresh_token: '',
                expires_in: 3600
            }
        } else {
            throw new Error(response.data.message || '登录失败')
        }
    }

    // 获取OAuth授权URL（GitHub等）
    async getOAuthURL(provider: string, state?: string): Promise<string> {
        const response = await axios.get(`${this.baseURL}/api/v1/auth/oauth/${provider}/url`, {
            params: { state },
            headers: getCommonHeaders()
        })
        if (response.data.code === 200) {
            return response.data.data.auth_url
        }
        throw new Error(response.data.message || '获取授权链接失败')
    }

    // OAuth登录（code + state）
    async oauthLogin(provider: string, code: string, state?: string): Promise<LoginResponse> {
        const response = await axios.post(`${this.baseURL}/api/v1/auth/oauth-login`, { provider, code, state }, {
            headers: getCommonHeaders()
        })
        if (response.data.code === 200) {
            return {
                user: response.data.data.user,
                token: response.data.data.token,
                refresh_token: '',
                expires_in: 3600
            }
        }
        throw new Error(response.data.message || 'OAuth登录失败')
    }

    // 用户注册 - 支持201状态码，注册成功后返回登录信息
    async register(data: RegisterRequest): Promise<LoginResponse> {
        const response = await axios.post(`${this.baseURL}/api/v1/auth/register`, {
            email: data.email,
            username: data.username,
            nickname: data.username,
            password: data.password,
            code: data.verification_code
        }, {
            headers: getCommonHeaders()
        })

        // 支持200和201状态码
        if (response.data.code === 200 || response.data.code === 201) {
            return response.data
        } else {
            throw new Error(response.data.message || '注册失败')
        }
    }

    // 发送邮箱验证码
    async sendEmailCode(data: SendEmailCodeRequest): Promise<void> {
        const response = await axios.post(`${this.baseURL}/api/v1/auth/send-email-code`, {
            email: data.email,
            type: data.type
        }, {
            headers: getCommonHeaders()
        })

        if (response.data.code !== 200) {
            throw new Error(response.data.message || '发送验证码失败')
        }
    }

    // 发送手机验证码
    async sendPhoneCode(data: SendPhoneCodeRequest): Promise<void> {
        const response = await axios.post(`${this.baseURL}/api/v1/auth/send-sms-code`, {
            phone: data.phone,
            type: data.type
        }, {
            headers: getCommonHeaders()
        })

        if (response.data.code !== 200) {
            throw new Error(response.data.message || '发送验证码失败')
        }
    }

    // 邮箱重置密码
    async emailResetPassword(data: ResetPasswordRequest): Promise<void> {
        const response = await axios.post(`${this.baseURL}/api/v1/auth/reset-password`, {
            email: data.email,
            code: data.code,
            password: data.password
        }, {
            headers: getCommonHeaders()
        })

        if (response.data.code !== 200) {
            throw new Error(response.data.message || '重置密码失败')
        }
    }

    // 手机重置密码
    async phoneResetPassword(data: PhoneResetPasswordRequest): Promise<void> {
        const response = await axios.post(`${this.baseURL}/api/v1/auth/phone-reset-password`, {
            phone: data.phone,
            code: data.code,
            password: data.password
        }, {
            headers: getCommonHeaders()
        })

        if (response.data.code !== 200) {
            throw new Error(response.data.message || '重置密码失败')
        }
    }
    // 重置密码 - 邮箱方式
    async resetPassword(data: ResetPasswordRequest): Promise<void> {
        const response = await axios.post(`${this.baseURL}/api/v1/auth/reset-password`, data)
        if (response.data.code !== 200) {
            throw new Error(response.data.message || '重置密码失败')
        }
    }

    // 忘记密码
    async forgotPassword(email: string): Promise<void> {
        const response = await axios.post(`${this.baseURL}/api/v1/auth/forgot-password`, {
            email: email
        }, {
            headers: getCommonHeaders()
        })

        if (response.data.code !== 200) {
            throw new Error(response.data.message || '发送重置邮件失败')
        }
    }

    // 登出
    async logout(): Promise<void> {
        // 后端暂时没有logout接口，前端清除token即可
        localStorage.removeItem('auth_token')
    }

    // 微信登录相关
    async getWechatQRCode(): Promise<any> {
        const response = await axios.get(`${this.baseURL}/api/v1/auth/wechat/qr-code`, {
            headers: getCommonHeaders()
        })

        if (response.data.code === 200) {
            return {
                qrCodeUrl: response.data.data.qr_url,
                qrCodeId: response.data.data.state,
                expiresAt: response.data.data.expires_at
            }
        } else {
            throw new Error(response.data.message || '获取二维码失败')
        }
    }

    async checkWechatLoginStatus(state: string): Promise<any> {
        const response = await axios.get(`${this.baseURL}/api/v1/auth/wechat/status/${state}`, {
            headers: getCommonHeaders()
        })

        if (response.data.code === 200) {
            return {
                status: response.data.data.status,
                scanned: response.data.data.scanned,
                used: response.data.data.used,
                user: response.data.data.user,
                token: response.data.data.token
            }
        } else {
            throw new Error(response.data.message || '检查登录状态失败')
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
        const response = await axios.get(`${this.baseURL}/api/v1/user/profile`, {
            headers: getCommonHeaders(localStorage.getItem('auth_token') || undefined)
        })

        if (response.data.code === 200) {
            return response.data.data
        } else {
            throw new Error(response.data.message || '获取用户信息失败')
        }
    }

    async updateProfile(data: Partial<User>): Promise<User> {
        const response = await axios.put(`${this.baseURL}/api/v1/user/profile`, data, {
            headers: getCommonHeaders(localStorage.getItem('auth_token') || undefined)
        })

        if (response.data.code === 200) {
            return response.data.data
        } else {
            throw new Error(response.data.message || '更新用户信息失败')
        }
    }

    async changePassword(oldPassword: string, newPassword: string): Promise<void> {
        const response = await axios.post(`${this.baseURL}/api/v1/user/change-password`, {
            old_password: oldPassword,
            new_password: newPassword
        }, {
            headers: getCommonHeaders(localStorage.getItem('auth_token') || undefined)
        })

        if (response.data.code !== 200) {
            throw new Error(response.data.message || '修改密码失败')
        }
    }

    async uploadAvatar(file: File): Promise<{ avatar_url: string }> {
        const formData = new FormData()
        formData.append('file', file)

        const response = await axios.post(`${this.baseURL}/api/v1/user/avatar`, formData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                'Content-Type': 'multipart/form-data'
            }
        })

        if (response.data.code === 200) {
            return { avatar_url: response.data.data.avatar_url }
        } else {
            throw new Error(response.data.message || '上传头像失败')
        }
    }

    async deleteAccount(password: string): Promise<void> {
        const response = await axios.post(`${this.baseURL}/api/v1/user/delete-account`, {
            password: password
        }, {
            headers: getCommonHeaders(localStorage.getItem('auth_token') || undefined)
        })

        if (response.data.code !== 200) {
            throw new Error(response.data.message || '删除账户失败')
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
        const response = await axios.get(`${this.baseURL}/api/v1/admin/users`, {
            params: params,
            headers: getCommonHeaders(localStorage.getItem('auth_token') || undefined)
        })

        if (response.data.code === 200) {
            return response.data.data
        } else {
            throw new Error(response.data.message || '获取用户列表失败')
        }
    }

    async getUser(id: string): Promise<User> {
        const response = await axios.get(`${this.baseURL}/api/v1/admin/users/${id}`, {
            headers: getCommonHeaders(localStorage.getItem('auth_token') || undefined)
        })

        if (response.data.code === 200) {
            return response.data.data
        } else {
            throw new Error(response.data.message || '获取用户信息失败')
        }
    }

    async updateUser(id: string, data: Partial<User>): Promise<User> {
        const response = await axios.put(`${this.baseURL}/api/v1/admin/users/${id}`, data, {
            headers: getCommonHeaders(localStorage.getItem('auth_token') || undefined)
        })

        if (response.data.code === 200) {
            return response.data.data
        } else {
            throw new Error(response.data.message || '更新用户信息失败')
        }
    }

    async deleteUser(id: string): Promise<void> {
        const response = await axios.delete(`${this.baseURL}/api/v1/admin/users/${id}`, {
            headers: getCommonHeaders(localStorage.getItem('auth_token') || undefined)
        })

        if (response.data.code !== 200) {
            throw new Error(response.data.message || '删除用户失败')
        }
    }

    async bulkUpdateUsers(userIds: string[], action: BulkAction): Promise<void> {
        const response = await axios.post(`${this.baseURL}/api/v1/admin/users/bulk-update`, {
            user_ids: userIds,
            action: action
        }, {
            headers: getCommonHeaders(localStorage.getItem('auth_token') || undefined)
        })

        if (response.data.code !== 200) {
            throw new Error(response.data.message || '批量更新用户失败')
        }
    }

    async getUserStats(): Promise<UserStats> {
        const response = await axios.get(`${this.baseURL}/api/v1/admin/stats/users`, {
            headers: getCommonHeaders(localStorage.getItem('auth_token') || undefined)
        })

        if (response.data.code === 200) {
            return response.data.data
        } else {
            throw new Error(response.data.message || '获取用户统计失败')
        }
    }

    async getLoginLogs(params?: LogListParams): Promise<LogListResponse> {
        const response = await axios.get(`${this.baseURL}/api/v1/admin/stats/login-logs`, {
            params: params,
            headers: getCommonHeaders(localStorage.getItem('auth_token') || undefined)
        })

        if (response.data.code === 200) {
            return response.data.data
        } else {
            throw new Error(response.data.message || '获取登录日志失败')
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