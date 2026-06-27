import React, { useState, useCallback, type ReactNode } from 'react'
import type { UserInfo } from '../types'
import {
  AdminAuthContext,
  loadStoredAuth,
  storeAuth,
  clearStoredAuth,
  performLogin,
  wrapLoginError,
} from './AdminAuthStore'

interface Props {
  children: ReactNode
}

export function AdminAuthProvider({ children }: Props) {
  const stored = loadStoredAuth()
  const [user, setUser] = useState<UserInfo | null>(stored.user)
  const [token, setToken] = useState<string | null>(stored.token)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const { token: newToken, user: newUser } = await performLogin(username, password)
      storeAuth(newToken, newUser)
      setToken(newToken)
      setUser(newUser)
    } catch (err) {
      const msg = wrapLoginError(err)
      setError(msg)
      throw new Error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    clearStoredAuth()
    setToken(null)
    setUser(null)
    window.location.href = '/login'
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return (
    <AdminAuthContext.Provider value={{ user, token, loading, error, login, logout, clearError }}>
      {children}
    </AdminAuthContext.Provider>
  )
}
