import { getLocalStorage, getSessionStorage } from './browserStorage'
import { validatePhone } from './validation'
import type { User } from '../types'

const DEFAULT_PHONE_NICKNAME = '手机用户'

/** 是否为系统默认用户ID（手机号作 ID 或默认昵称） */
export function hasDefaultUserId(profile: Pick<User, 'username' | 'nickname'> | null | undefined): boolean {
    if (!profile?.username) return false
    if (validatePhone(profile.username)) return true
    if (profile.nickname === DEFAULT_PHONE_NICKNAME) return true
    return false
}

/** 是否为邮箱前缀作默认用户ID（邮箱首登场景） */
export function hasEmailPrefixUserId(
    profile: Pick<User, 'username' | 'email' | 'nickname'> | null | undefined,
): boolean {
    if (!profile?.username || !profile.email) return false
    const prefix = profile.email.split('@')[0]
    if (profile.username !== prefix) return false
    return profile.nickname === prefix || profile.nickname === profile.username
}

export function shouldShowDefaultUserIdBanner(
    profile: Pick<User, 'username' | 'email' | 'nickname'> | null | undefined,
): boolean {
    if (!profile) return false
    if (hasDefaultUserId(profile)) return true
    return hasEmailPrefixUserId(profile)
}

export function maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 7) return phone
    return `${digits.slice(0, 3)}****${digits.slice(-4)}`
}

export function formatAccountDateTime(iso?: string): string {
    if (!iso) return '暂无记录'
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return '暂无记录'
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const DEFAULT_ID_BANNER_DISMISS_KEY = 'default_user_id_banner_dismissed'
const PROFILE_NUDGE_DISMISS_KEY = 'profile_nudge_dismissed'
const PROFILE_NUDGE_PENDING_KEY = 'profile_nudge_pending'

export function dismissDefaultUserIdBanner(username: string) {
    getSessionStorage()?.setItem(`${DEFAULT_ID_BANNER_DISMISS_KEY}:${username}`, '1')
}

export function isDefaultUserIdBannerDismissed(username: string): boolean {
    return getSessionStorage()?.getItem(`${DEFAULT_ID_BANNER_DISMISS_KEY}:${username}`) === '1'
}

export function scheduleProfileNudgeIfNeeded(profile: User | null | undefined) {
    if (!profile || getLocalStorage()?.getItem(PROFILE_NUDGE_DISMISS_KEY)) return
    if (!hasDefaultUserId(profile)) return
    getSessionStorage()?.setItem(PROFILE_NUDGE_PENDING_KEY, '1')
}

export function consumeProfileNudgePending(): boolean {
    if (getLocalStorage()?.getItem(PROFILE_NUDGE_DISMISS_KEY)) return false
    const pending = getSessionStorage()?.getItem(PROFILE_NUDGE_PENDING_KEY)
    if (!pending) return false
    return true
}

export function dismissProfileNudge() {
    getLocalStorage()?.setItem(PROFILE_NUDGE_DISMISS_KEY, '1')
    getSessionStorage()?.removeItem(PROFILE_NUDGE_PENDING_KEY)
}

export function clearProfileNudgePending() {
    getSessionStorage()?.removeItem(PROFILE_NUDGE_PENDING_KEY)
}
