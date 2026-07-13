import { useState, useEffect } from 'react'
import { storage } from '@zayne/login/utils'

export interface CountdownState {
  remainSec: number
  isExpired: boolean
  expiresAt: number | null
  remainLabel: string
}

function normalizeExpiresAtMs(raw: unknown): number | null {
  if (raw == null) return null
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return null
    return raw > 1e12 ? raw : raw * 1000
  }
  if (typeof raw === 'string') {
    const asNum = Number(raw)
    if (Number.isFinite(asNum)) return asNum > 1e12 ? asNum : asNum * 1000
    const parsed = Date.parse(raw)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

function readExpiresAt(): number | null {
  if (!storage.getSSOAccessToken()) return null
  const ssoData = storage.getSSOData()
  const fromField = normalizeExpiresAtMs(ssoData?.expires_at)
  if (fromField !== null) return fromField
  const token = ssoData?.token as { expires_in?: number; stored_at?: number; expires_at?: unknown } | undefined
  if (token?.stored_at != null && token.expires_in != null) {
    const computed = token.stored_at + token.expires_in * 1000
    if (Number.isFinite(computed)) return computed
  }
  if (token?.expires_in != null) {
    const computed = Date.now() + token.expires_in * 1000
    if (Number.isFinite(computed)) return computed
  }
  const fromTokenField = normalizeExpiresAtMs(token?.expires_at)
  if (fromTokenField !== null) return fromTokenField
  const auth = storage.getAuth() as { expires_at?: unknown } | null
  return normalizeExpiresAtMs(auth?.expires_at)
}

function calc(expiresAt: number | null): CountdownState {
  if (expiresAt === null || !Number.isFinite(expiresAt)) {
    return { remainSec: 0, isExpired: true, expiresAt: null, remainLabel: '—' }
  }
  const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
  const min = Math.floor(diff / 60)
  const sec = diff % 60
  return { remainSec: diff, isExpired: diff === 0, expiresAt, remainLabel: min > 0 ? `${min}m ${sec}s` : `${sec}s` }
}

export function useAccessTokenCountdown(): CountdownState {
  const [state, setState] = useState<CountdownState>(() => calc(readExpiresAt()))
  useEffect(() => {
    const tick = () => setState(calc(readExpiresAt()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return state
}
