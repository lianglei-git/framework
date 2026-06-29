/**
 * TestPanel.tsx — SSO 完整测试台
 * 四个区域：Token 状态、SSO 操作、BFF Demo API、操作日志
 */
import React, { useState, useCallback } from 'react'
import { SSOService } from '@sparrow/login/sso'
import { globalUserStore } from '@sparrow/login/stores/UserStore'
import { storage } from '@sparrow/login/utils'
import { useAccessTokenCountdown } from './useCountdown'
import { demoApi } from './demoApi'
import type { UseSubProjectSSOResult } from '@sparrow/login/hooks'

interface Props {
    sso: UseSubProjectSSOResult
}

interface LogEntry {
    id: number
    time: string
    ok: boolean
    msg: string
    detail?: string
}

let logIdSeq = 0

export function TestPanel({ sso }: Props) {
    const { user, token, refreshToken, getUserInfoFetch, logout } = sso
    const countdown = useAccessTokenCountdown()
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [apiResult, setApiResult] = useState<string>('')
    const [busy, setBusy] = useState<string>('')  // 当前执行中的操作标识

    const log = useCallback((ok: boolean, msg: string, detail?: string) => {
        const now = new Date()
        const time = now.toTimeString().slice(0, 8)
        setLogs((prev) => {
            const next = [
                { id: ++logIdSeq, time, ok, msg, detail },
                ...prev,
            ].slice(0, 50)
            return next
        })
    }, [])

    const run = useCallback(
        async (label: string, fn: () => Promise<unknown>) => {
            setBusy(label)
            setApiResult('')
            try {
                const result = await fn()
                const detail = result != null ? JSON.stringify(result, null, 2) : undefined
                log(true, `${label} 成功`, detail)
                if (detail) setApiResult(detail)
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err)
                log(false, `${label} 失败：${msg}`)
            } finally {
                setBusy('')
            }
        },
        [log],
    )

    const accessTokenPreview = storage.getSSOAccessToken()?.slice(0, 24) + '...' || '—'
    const hasRefreshToken = !!storage.getSSORefreshToken()

    return (
        <div className="test-panel">
            {/* ── 区域 1：Token 状态 ── */}
            <section className="panel-section">
                <h2 className="section-title">Token 状态</h2>
                <div className="token-row">
                    <span className="token-label">Access Token 剩余：</span>
                    <span className={`token-countdown ${countdown.isExpired ? 'expired' : countdown.remainSec <= 10 ? 'warning' : ''}`}>
                        {countdown.expiresAt === null ? '无 Token' : countdown.isExpired ? '已过期' : countdown.remainLabel}
                    </span>
                </div>
                <div className="token-row">
                    <span className="token-label">Refresh Token：</span>
                    <span className={hasRefreshToken ? 'token-ok' : 'token-missing'}>
                        {hasRefreshToken ? '存在' : '不存在'}
                    </span>
                </div>
                <div className="token-row">
                    <span className="token-label">Token 预览：</span>
                    <code className="token-preview">{accessTokenPreview}</code>
                </div>
                <div className="token-row">
                    <span className="token-label">用户：</span>
                    <span>{user?.nickname || user?.email || user?.name || '—'}</span>
                </div>
                {token?.expires_in && (
                    <div className="token-row">
                        <span className="token-label">expires_at（本地）：</span>
                        <span className="token-time">
                            {countdown.expiresAt ? new Date(countdown.expiresAt).toLocaleTimeString() : '—'}
                        </span>
                    </div>
                )}
            </section>

            {/* ── 区域 2：SSO 操作 ── */}
            <section className="panel-section">
                <h2 className="section-title">SSO 操作</h2>
                <div className="btn-grid">
                    <button
                        className="btn btn-primary"
                        disabled={!!busy}
                        onClick={() => run('手动续签', () => refreshToken())}
                    >
                        {busy === '手动续签' ? '…' : '手动续签'}
                    </button>

                    <button
                        className="btn"
                        disabled={!!busy}
                        onClick={() => run('getUserInfo', () => getUserInfoFetch())}
                    >
                        {busy === 'getUserInfo' ? '…' : 'getUserInfo'}
                    </button>

                    <button
                        className="btn btn-warning"
                        disabled={!!busy}
                        onClick={() => run('清本地 Token（保留 Cookie）', async () => {
                            globalUserStore.clearLocalAuth()
                            return { cleared: true, note: 'session cookie 保留' }
                        })}
                    >
                        清本地 Token
                    </button>

                    <button
                        className="btn"
                        disabled={!!busy}
                        onClick={() => run('Session-Check 恢复', async () => {
                            const svc = SSOService.instance
                            if (!svc) throw new Error('SSOService 未初始化')
                            const ok = await svc.tryRecoverSubProjectSession()
                            return { recovered: ok }
                        })}
                    >
                        Session-Check 恢复
                    </button>

                    <button
                        className="btn"
                        disabled={!!busy}
                        onClick={() => run('静默 Authorize', async () => {
                            const svc = SSOService.instance
                            if (!svc) throw new Error('SSOService 未初始化')
                            if (!svc.hasValidSessionCookie()) {
                                throw new Error('无 IdP session cookie，无法静默 authorize')
                            }
                            await svc.trySilentAuthorize()
                            return { status: 'redirecting…' }
                        })}
                    >
                        静默 Authorize
                    </button>

                    <button
                        className="btn btn-danger"
                        disabled={!!busy}
                        onClick={() => run('本地登出', async () => {
                            await logout()
                            return { logout: 'local' }
                        })}
                    >
                        本地登出
                    </button>

                    <button
                        className="btn btn-danger"
                        disabled={!!busy}
                        title="将跳转到 IdP logout，3033 session 失效"
                        onClick={() => {
                            log(true, '全局登出：即将跳转 IdP logout…')
                            logout()
                        }}
                    >
                        全局登出（IdP）
                    </button>
                </div>
            </section>

            {/* ── 区域 3：BFF Demo API ── */}
            <section className="panel-section">
                <h2 className="section-title">BFF Demo API</h2>
                <div className="btn-grid">
                    <button
                        className="btn btn-api"
                        disabled={!!busy}
                        onClick={() => run('GET /time（公开）', () => demoApi.getTime())}
                    >
                        GET /time（公开）
                    </button>

                    <button
                        className="btn btn-api"
                        disabled={!!busy}
                        onClick={() => run('GET /time-auth（需 token）', () => demoApi.getTimeAuth())}
                    >
                        GET /time-auth（需 token）
                    </button>

                    <button
                        className="btn btn-api"
                        disabled={!!busy}
                        onClick={() => run('GET /whoami', () => demoApi.whoami())}
                    >
                        GET /whoami
                    </button>

                    <button
                        className="btn btn-api"
                        disabled={!!busy}
                        onClick={() => run('POST /add（3+5）', () => demoApi.add(3, 5))}
                    >
                        POST /add（3 + 5）
                    </button>

                    <button
                        className="btn btn-api"
                        disabled={!!busy}
                        onClick={() => run('POST /echo', () => demoApi.echo({ msg: 'hello sso_test_d', ts: Date.now() }))}
                    >
                        POST /echo
                    </button>

                    <button
                        className="btn btn-api btn-warning"
                        disabled={!!busy}
                        title="先清本地 token，再调 /time-auth，触发 401→refresh→recovery 完整链路"
                        onClick={async () => {
                            log(true, '401 自动恢复测试：清本地 token → 调 /time-auth')
                            globalUserStore.clearLocalAuth()
                            await run('401→refresh→recovery（/time-auth）', () => demoApi.getTimeAuth())
                        }}
                    >
                        401 自动恢复测试
                    </button>
                </div>

                {apiResult && (
                    <pre className="api-result">{apiResult}</pre>
                )}
            </section>

            {/* ── 区域 4：操作日志 ── */}
            <section className="panel-section">
                <div className="log-header">
                    <h2 className="section-title" style={{ margin: 0 }}>操作日志</h2>
                    <button className="btn btn-sm" onClick={() => setLogs([])}>清空</button>
                </div>
                <div className="log-list">
                    {logs.length === 0 && <p className="log-empty">暂无记录</p>}
                    {logs.map((entry) => (
                        <div key={entry.id} className={`log-entry ${entry.ok ? 'log-ok' : 'log-fail'}`}>
                            <span className="log-time">[{entry.time}]</span>
                            <span className="log-icon">{entry.ok ? '✓' : '✗'}</span>
                            <span className="log-msg">{entry.msg}</span>
                            {entry.detail && (
                                <details>
                                    <summary>详情</summary>
                                    <pre className="log-detail">{entry.detail}</pre>
                                </details>
                            )}
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
}
