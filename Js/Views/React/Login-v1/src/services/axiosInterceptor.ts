import axios from 'axios'
import { globalUserStore } from '../stores/UserStore'
import tokenRefreshService from './tokenRefreshService'

// 创建axios实例
const apiClient = axios.create({
    baseURL: (import.meta as any).env?.DEV ? "http://localhost:8080" : "https://sparrowui.cn/translate",
    timeout: 10000,
})

// 请求拦截器 - 添加token
apiClient.interceptors.request.use(
    (config) => {
        const token = globalUserStore.token
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// 响应拦截器 - 处理token自动续签
apiClient.interceptors.response.use(
    (response) => {
        // 检查响应头中是否有新token（后端自动续签）
        const newToken = response.headers['x-new-token']
        const tokenExpiresIn = response.headers['x-token-expires-in']
        const tokenType = response.headers['x-token-type']
        const isAutoRefreshed = response.headers['x-token-auto-refreshed']

        if (newToken && isAutoRefreshed === 'true') {
            console.log('检测到后端自动续签的token')
            globalUserStore.updateToken(newToken)

            // 触发token更新事件
            window.dispatchEvent(new CustomEvent('token:auto-refreshed', {
                detail: {
                    newToken,
                    expiresIn: tokenExpiresIn,
                    tokenType
                }
            }))
        }

        return response
    },
    async (error) => {
        const originalRequest = error.config

        // 如果是401错误且不是重试请求，尝试续签token
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true

            try {
                console.log('Token已过期，尝试自动续签')
                const refreshResult = await tokenRefreshService.refreshToken()

                if (refreshResult) {
                    // 使用新token重试原请求
                    originalRequest.headers.Authorization = `Bearer ${refreshResult.access_token}`
                    return apiClient(originalRequest)
                } else {
                    // 续签失败，清除用户信息并跳转到登录页
                    console.log('Token续签失败，清除用户信息')
                    globalUserStore.logout()

                    // 触发登录过期事件
                    window.dispatchEvent(new CustomEvent('auth:expired'))

                    return Promise.reject(error)
                }
            } catch (refreshError) {
                console.error('Token续签过程出错:', refreshError)
                globalUserStore.logout()
                window.dispatchEvent(new CustomEvent('auth:expired'))
                return Promise.reject(error)
            }
        }

        return Promise.reject(error)
    }
)

// 导出配置好的axios实例
export default apiClient

// 导出拦截器配置函数（可选）
export const setupAxiosInterceptors = () => {
    // 这里可以添加额外的拦截器配置
    console.log('Axios拦截器已设置')
}

// 导出清除拦截器函数（可选）
export const clearAxiosInterceptors = () => {
    // 这里可以清除拦截器
    console.log('Axios拦截器已清除')
} 