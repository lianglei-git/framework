import { createContext } from 'react'
import type { UserInfo } from '../types'
import { setAdminToken, clearAdminToken } from '../core/httpClient'
import { adminLogin } from '../core/adminApi'
import { formatAuthError } from '../utils/authError'

const USER_KEY = 'admin_user'

export interface AdminAuthState {
  user: UserInfo | null
  token: string | null
  loading: boolean
  error: string | null
}

export interface AdminAuthActions {
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  clearError: () => void
}

export type AdminAuthContextValue = AdminAuthState & AdminAuthActions

export function loadStoredAuth(): { user: UserInfo | null; token: string | null } {
  try {
    const token = localStorage.getItem('admin_access_token')
    const userJson = localStorage.getItem(USER_KEY)
    if (token && userJson) {
      const user = JSON.parse(userJson) as UserInfo
      return { token, user }
    }
  } catch {
    // ignore
  }
  return { user: null, token: null }
}

export function storeAuth(token: string, user: UserInfo): void {
  setAdminToken(token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearStoredAuth(): void {
  clearAdminToken()
  localStorage.removeItem(USER_KEY)
}

export async function performLogin(
  username: string,
  password: string
): Promise<{ token: string; user: UserInfo }> {
  const res = await adminLogin({ provider: 'local', username, password })
  const user = res.user as UserInfo
  if (user.role !== 'admin') {
    throw new Error('FORBIDDEN_ROLE')
  }
  return { token: res.access_token, user }
}

export function wrapLoginError(error: unknown): string {
  if (error instanceof Error && error.message === 'FORBIDDEN_ROLE') {
    return '该账号没有管理员权限，请使用 admin 角色账号登录'
  }
  return formatAuthError(error, '登录失败，请检查账号和密码')
}

export const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)
