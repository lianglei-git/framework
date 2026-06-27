import axios, { type AxiosInstance } from 'axios'
import { formatAuthError } from '../utils/authError'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
const TOKEN_KEY = 'admin_access_token'

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAdminToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAdminToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem('admin_user')
}

function createAxiosInstance(): AxiosInstance {
  const instance = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
  })

  instance.interceptors.request.use((config) => {
    const token = getAdminToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  instance.interceptors.response.use(
    (res) => res,
    (error) => {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          clearAdminToken()
          window.location.href = '/login'
        }
      }
      return Promise.reject(error)
    }
  )

  return instance
}

const axiosInstance = createAxiosInstance()

export class HttpClient {
  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    try {
      const res = await axiosInstance.get<T>(url, { params })
      return res.data
    } catch (error) {
      throw new Error(formatAuthError(error))
    }
  }

  async post<T>(url: string, data?: unknown): Promise<T> {
    try {
      const res = await axiosInstance.post<T>(url, data)
      return res.data
    } catch (error) {
      throw new Error(formatAuthError(error))
    }
  }

  async put<T>(url: string, data?: unknown): Promise<T> {
    try {
      const res = await axiosInstance.put<T>(url, data)
      return res.data
    } catch (error) {
      throw new Error(formatAuthError(error))
    }
  }

  async delete<T>(url: string): Promise<T> {
    try {
      const res = await axiosInstance.delete<T>(url)
      return res.data
    } catch (error) {
      throw new Error(formatAuthError(error))
    }
  }
}

export const httpClient = new HttpClient()
