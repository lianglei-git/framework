/**
 * demoApi — BFF only (MountBFF + whoami)
 */
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { storage } from '@zayne/login/utils'
import { refreshOAuthTokenOnce } from '@zayne/login/utils/oauthRefreshOn401'
import { recoverOAuthSessionAfterRefreshFailure } from '@zayne/login/utils/oauthSessionRecovery'

const BFF_URL = import.meta.env.VITE_SSO_SERVER_URL || 'http://localhost:5560'

function createAxios(): AxiosInstance {
  const instance = axios.create({
    baseURL: BFF_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
  })

  instance.interceptors.request.use((config) => {
    const token = storage.getSSOAccessToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  instance.interceptors.response.use(
    (res) => res,
    async (error) => {
      const config = error.config as AxiosRequestConfig & { _retried?: boolean }
      if (axios.isAxiosError(error) && error.response?.status === 401 && !config._retried) {
        config._retried = true
        if (await refreshOAuthTokenOnce()) {
          const newToken = storage.getSSOAccessToken()
          if (newToken && config.headers) config.headers['Authorization'] = `Bearer ${newToken}`
          return instance(config)
        }
        await recoverOAuthSessionAfterRefreshFailure()
      }
      return Promise.reject(error)
    },
  )

  return instance
}

const bff = createAxios()

export const demoApi = {
  whoami: () => bff.get('/api/v1/demo/whoami').then((r) => r.data),
  providers: () => bff.get('/api/v1/sso/providers').then((r) => r.data),
}
