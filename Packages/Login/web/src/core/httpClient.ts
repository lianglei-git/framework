import axios from 'axios'
import { storage } from '../utils/storage'
import { getGenresType } from '../utils/getGenresType'
import { throwAuthError } from '../utils/authError'
import {
    refreshOAuthTokenOnce,
    shouldAttemptOAuthRefreshOn401,
} from '../utils/oauthRefreshOn401'
import { recoverOAuthSessionAfterRefreshFailure } from '../utils/oauthSessionRecovery'

export const basicUrl = import.meta.env.DEV ? "http://localhost:8080" : "https://sparrowui.cn/translate"

export const getCommonHeaders = (token?: string) => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Genres-Type': getGenresType() || ''
    }
    if (token) {
        headers.Authorization = `Bearer ${token}`
    }
    return headers
}

export class ApiService {
    protected baseURL: string
    private defaultHeaders: Record<string, string>

    constructor(baseURL: string = basicUrl) {
        this.baseURL = baseURL
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        }
    }

    private resolveAccessToken(): string | undefined {
        const fromSso = storage.getSSOAccessToken()
        if (fromSso) return fromSso
        const auth = storage.getAuth()
        if (!auth?.token) return undefined
        if (typeof auth.token === 'string') return auth.token
        return auth.token.access_token
    }

    private async request<T>(
        url: string,
        options: any = {}
    ): Promise<T> {
        const access_token = this.resolveAccessToken()
        const headers = {
            ...this.defaultHeaders,
            ...options.headers,
            ...(access_token && { Authorization: `Bearer ${access_token}` })
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
            if (
                axios.isAxiosError(error) &&
                error.response?.status === 401 &&
                !options._oauthRetried &&
                shouldAttemptOAuthRefreshOn401(config.url)
            ) {
                const refreshed = await refreshOAuthTokenOnce()
                if (refreshed) {
                    return this.request<T>(url, { ...options, _oauthRetried: true })
                }
                const recovery = await recoverOAuthSessionAfterRefreshFailure()
                if (recovery === 'recovered') {
                    return this.request<T>(url, { ...options, _oauthRetried: true })
                }
            }
            console.error('API request error:', error)
            throwAuthError(error)
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
