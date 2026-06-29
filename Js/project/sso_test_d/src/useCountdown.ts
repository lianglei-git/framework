import { useState, useEffect } from 'react'
import { storage } from '@sparrow/login/utils'

export interface CountdownState {
    /** 剩余秒数，过期后为 0 */
    remainSec: number
    /** access token 是否已过期 */
    isExpired: boolean
    /** 过期时间戳（ms），null 表示无 token */
    expiresAt: number | null
    /** 剩余时间格式化字符串，如 "1m 23s" */
    remainLabel: string
}

function calc(expiresAt: number | null): CountdownState {
    if (expiresAt === null) {
        return { remainSec: 0, isExpired: true, expiresAt: null, remainLabel: '—' }
    }
    const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
    const isExpired = diff === 0
    const min = Math.floor(diff / 60)
    const sec = diff % 60
    const remainLabel = min > 0 ? `${min}m ${sec}s` : `${sec}s`
    return { remainSec: diff, isExpired, expiresAt, remainLabel }
}

function readExpiresAt(): number | null {
    return storage.getSSOData()?.expires_at ?? null
}

export function useAccessTokenCountdown(): CountdownState {
    const [state, setState] = useState<CountdownState>(() => calc(readExpiresAt()))

    useEffect(() => {
        setState(calc(readExpiresAt()))
        const id = setInterval(() => {
            setState(calc(readExpiresAt()))
        }, 1000)
        return () => clearInterval(id)
    }, [])

    return state
}
