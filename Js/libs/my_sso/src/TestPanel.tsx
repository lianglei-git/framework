/**
 * TestPanel — minimal: SSO + MountBFF whoami
 */
import { useState, useCallback } from 'react'
import { globalUserStore } from '@zayne/login/stores/UserStore'
import { storage } from '@zayne/login/utils'
import { useAccessTokenCountdown } from './useCountdown'
import { demoApi } from './demoApi'
import type { UseSubProjectSSOResult } from '@zayne/login/hooks'
import { readSsoSessionCookies } from '@zayne/login/utils/ssoSessionCookie'

export function TestPanel({ sso, onAuthChange }: { sso: UseSubProjectSSOResult; onAuthChange?: () => void }) {
  const { user, refreshToken, logoutLocal, logout } = sso
  const countdown = useAccessTokenCountdown()
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)
  const { sessionId } = readSsoSessionCookies()

  const run = useCallback(async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true)
    setResult('')
    try {
      const data = await fn()
      setResult(`${label}\n${JSON.stringify(data, null, 2)}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setResult(`${label} failed: ${msg}`)
    } finally {
      setBusy(false)
    }
  }, [])

  return (
    <div className="test-panel">
      <section className="panel-section">
        <h2 className="section-title">Session</h2>
        <div className="token-row">
          <span className="token-label">Token：</span>
          <span className={countdown.isExpired ? 'token-missing' : 'token-ok'}>
            {countdown.expiresAt === null ? '无' : countdown.isExpired ? '已过期' : countdown.remainLabel}
          </span>
        </div>
        <div className="token-row">
          <span className="token-label">Cookie：</span>
          <span className={sessionId ? 'token-ok' : 'token-missing'}>{sessionId ? '有' : '无'}</span>
        </div>
        <div className="token-row">
          <span className="token-label">用户：</span>
          <span>{user?.nickname || user?.email || user?.name || '—'}</span>
        </div>
        <div className="token-row">
          <span className="token-label">Token 预览：</span>
          <code className="token-preview">{storage.getSSOAccessToken()?.slice(0, 24) || '—'}…</code>
        </div>
      </section>

      <section className="panel-section">
        <h2 className="section-title">Actions</h2>
        <div className="btn-grid">
          <button className="btn btn-primary" disabled={busy} onClick={() => run('whoami', () => demoApi.whoami())}>
            GET /demo/whoami
          </button>
          <button className="btn btn-api" disabled={busy} onClick={() => run('providers', () => demoApi.providers())}>
            GET /sso/providers
          </button>
          <button className="btn" disabled={busy} onClick={() => run('refresh', () => refreshToken())}>
            续签
          </button>
          <button
            className="btn btn-warning"
            disabled={busy}
            onClick={() => {
              globalUserStore.clearAuthTokensOnly()
              onAuthChange?.()
              setResult('cleared local tokens')
            }}
          >
            清 Token
          </button>
          <button
            className="btn btn-danger"
            disabled={busy}
            onClick={async () => {
              await logoutLocal()
              onAuthChange?.()
            }}
          >
            本地登出
          </button>
          <button className="btn btn-danger" disabled={busy} onClick={() => logout()}>
            全局登出
          </button>
        </div>
        {result && <pre className="api-result">{result}</pre>}
      </section>
    </div>
  )
}
