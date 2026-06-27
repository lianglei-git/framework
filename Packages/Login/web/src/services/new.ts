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

// 基础配置 - 对接后端unit-auth服务
const basicUrl = import.meta.env.DEV ? "http://localhost:8080" : "https://sparrowui.cn/translate"

// 获取通用请求头
const getCommonHeaders = (token?: string) => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    }

    if (token) {
        headers.Authorization = `Bearer ${token}`
    }

    return headers
}

// API服务基类
export class ApiService {
    private baseURL: string
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

// 认证API服务
export class AuthApiService extends ApiService {
    // 统一登录
    async unifiedLogin(data: LoginRequest): Promise<LoginResponse> {
        const response = await this.post<BaseResponse<LoginResponse>>('/api/v1/auth/login', data)
        return response.data
    }

    // 登录（兼容方法）
    async login(data: LoginRequest): Promise<LoginResponse> {
        return this.unifiedLogin(data)
    }

    // 手机号登录
    async phoneLogin(data: PhoneLoginRequest): Promise<LoginResponse> {
        const response = await this.post<BaseResponse<LoginResponse>>('/api/v1/auth/phone-login', data)
        return response.data
    }

    // 用户注册
    async register(data: RegisterRequest): Promise<LoginResponse> {
        const response = await this.post<BaseResponse<LoginResponse>>('/api/v1/auth/register', data)

        // 如果后端只返回用户信息，尝试自动登录
        if (response.data && response.data.user && !response.data.token) {
            // 自动调用登录API获取token
            const loginResponse = await this.unifiedLogin({
                account: data.email,
                password: data.password
            })
            return loginResponse
        }

        return response.data
    }

    // 忘记密码 - 发送邮件验证码
    async forgotPassword(email: string): Promise<void> {
        await this.post<BaseResponse<void>>('/api/v1/auth/forgot-password', { email })
    }

    // 重置密码 - 邮箱方式
    async resetPassword(data: ResetPasswordRequest): Promise<void> {
        await this.post<BaseResponse<void>>('/api/v1/auth/reset-password', data)
    }

    // 手机号重置密码
    async phoneResetPassword(data: PhoneResetPasswordRequest): Promise<void> {
        await this.post<BaseResponse<void>>('/api/v1/auth/phone-reset-password', data)
    }

    // 发送邮件验证码
    async sendEmailCode(data: SendEmailCodeRequest): Promise<void> {
        await this.post<BaseResponse<void>>('/api/v1/auth/send-email-code', data)
    }

    // 发送手机验证码
    async sendPhoneCode(data: SendPhoneCodeRequest): Promise<void> {
        await this.post<BaseResponse<void>>('/api/v1/auth/send-sms-code', data)
    }

    // 登出（前端处理）
    async logout(): Promise<void> {
        // 后端没有登出接口，前端清除本地存储
        localStorage.removeItem('auth_data')
        sessionStorage.removeItem('auth_data')
    }

    // 获取微信二维码
    async getWechatQRCode(): Promise<{ qrCodeUrl: string; state: string }> {
        const response = await this.post<BaseResponse<{ qrCodeUrl: string; state: string }>>('/api/v1/auth/wechat/qr-code', {})
        return response.data
    }

    // 检查微信登录状态
    async checkWechatLoginStatus(state: string): Promise<{ status: string; user?: User; token?: string }> {
        const response = await this.get<BaseResponse<{ status: string; user?: User; token?: string }>>(`/api/v1/auth/wechat/status/${state}`)
        return response.data
    }

    // 兼容方法
    async loginV1(data: LoginRequest): Promise<LoginResponse> {
        return this.unifiedLogin(data)
    }
}

// 用户API服务
export class UserApiService extends ApiService {
    async getProfile(): Promise<User> {
        const response = await this.get<BaseResponse<User>>('/api/v1/user/profile')
        return response.data
    }

    async updateProfile(data: Partial<User>): Promise<User> {
        const response = await this.put<BaseResponse<User>>('/api/v1/user/profile', data)
        return response.data
    }

    async changePassword(oldPassword: string, newPassword: string): Promise<void> {
        await this.post<BaseResponse<void>>('/api/v1/user/change-password', {
            old_password: oldPassword,
            new_password: newPassword
        })
    }

    async uploadAvatar(file: File): Promise<{ avatar_url: string }> {
        const formData = new FormData()
        formData.append('file', file)

        const response = await this.post<BaseResponse<{ avatar_url: string }>>('/api/v1/user/avatar', formData)
        return response.data
    }

    async deleteAccount(password: string): Promise<void> {
        await this.post<BaseResponse<void>>('/api/v1/user/delete-account', { password })
    }

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