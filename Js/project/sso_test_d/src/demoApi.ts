/**
 * demoApi.ts — 测试台专用 axios 实例
 * - 自动注入 SSO access_token
 * - 遇到 401 先 refresh，refresh 失败则触发 session recovery
 */
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { storage } from '@zayne/login/utils'
import { refreshOAuthTokenOnce } from '@zayne/login/utils/oauthRefreshOn401'
import { recoverOAuthSessionAfterRefreshFailure } from '@zayne/login/utils/oauthSessionRecovery'

const BFF_URL = import.meta.env.VITE_SSO_SERVER_URL || 'http://localhost:5558'

function createDemoAxios(): AxiosInstance {
    const instance = axios.create({
        baseURL: BFF_URL,
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
    })

    instance.interceptors.request.use((config) => {
        const token = storage.getSSOAccessToken()
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    })

    instance.interceptors.response.use(
        (res) => res,
        async (error) => {
            const config = error.config as AxiosRequestConfig & { _retried?: boolean }
            if (
                axios.isAxiosError(error) &&
                error.response?.status === 401 &&
                !config._retried
            ) {
                config._retried = true
                const refreshed = await refreshOAuthTokenOnce()
                if (refreshed) {
                    const newToken = storage.getSSOAccessToken()
                    if (newToken && config.headers) {
                        config.headers['Authorization'] = `Bearer ${newToken}`
                    }
                    return instance(config)
                }
                await recoverOAuthSessionAfterRefreshFailure()
            }
            return Promise.reject(error)
        }
    )

    return instance
}

const demoAxios = createDemoAxios()

export interface TimeResponse {
    server_time: string
    timestamp: number
    uptime_sec: number
    user_id?: string
    email?: string
}

export interface WhoamiResponse {
    active: boolean
    user_id: string
    email: string
    role: string
    token_type: string
    exp: number
    expires_at: string
}

export interface AddResponse {
    a: number
    b: number
    sum: number
    user_id: string
}

export interface EchoResponse {
    echo: unknown
    user_id: string
}

export const demoApi = {
    /** 公开 — 服务器时间 */
    getTime(): Promise<TimeResponse> {
        return demoAxios.get<TimeResponse>('/api/v1/demo/time').then((r) => r.data)
    },

    /** 需 token — 服务器时间 + 用户 ID（用于 401→refresh 测试） */
    getTimeAuth(): Promise<TimeResponse> {
        return demoAxios.get<TimeResponse>('/api/v1/demo/time-auth').then((r) => r.data)
    },

    /** 需 token — 返回当前用户 claims */
    whoami(): Promise<WhoamiResponse> {
        return demoAxios.get<WhoamiResponse>('/api/v1/demo/whoami').then((r) => r.data)
    },

    /** 需 token — 计算 a + b */
    add(a: number, b: number): Promise<AddResponse> {
        return demoAxios.post<AddResponse>('/api/v1/demo/add', { a, b }).then((r) => r.data)
    },

    /** 需 token — 回显 body */
    echo(body: Record<string, unknown>): Promise<EchoResponse> {
        return demoAxios.post<EchoResponse>('/api/v1/demo/echo', body).then((r) => r.data)
    },
}
