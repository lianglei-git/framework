import { AccountType } from '../types'
import type { AccountPreview } from '../types/auth'
import { identifyAccountType } from './validation'

export type CodeChannel = 'email' | 'phone'

export const maskEmail = (email: string): string => {
    const parts = email.split('@')
    if (parts.length !== 2 || !parts[0]) {
        return email
    }
    const prefix = parts[0]
    const masked = prefix.length > 1 ? `${prefix[0]}***` : prefix[0]
    return `${masked}@${parts[1]}`
}

export const maskPhone = (phone: string): string => {
    if (phone.length < 7) {
        return phone
    }
    return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

export const getCodeLoginChannels = (
    preview: AccountPreview | null,
    account: string,
): CodeChannel[] => {
    const channels: CodeChannel[] = []
    if (preview?.email?.trim()) {
        channels.push('email')
    }
    if (preview?.phone?.trim()) {
        channels.push('phone')
    }
    if (channels.length > 0) {
        return channels
    }

    const inputType = identifyAccountType(account.trim())
    if (inputType === AccountType.EMAIL) {
        return ['email']
    }
    if (inputType === AccountType.PHONE) {
        return ['phone']
    }
    return []
}

export const resolveCodeContact = (
    channel: CodeChannel,
    preview: AccountPreview | null,
    account: string,
): string => {
    const trimmed = account.trim()
    if (channel === 'email') {
        return preview?.email?.trim() || (identifyAccountType(trimmed) === AccountType.EMAIL ? trimmed : '')
    }
    return preview?.phone?.trim() || (identifyAccountType(trimmed) === AccountType.PHONE ? trimmed : '')
}

export const formatMaskedContact = (channel: CodeChannel, contact: string): string => {
    if (!contact) {
        return ''
    }
    return channel === 'email' ? maskEmail(contact) : maskPhone(contact)
}

export const formatCodeDeliveryHint = (channel: CodeChannel, contact: string): string => {
    const masked = formatMaskedContact(channel, contact)
    if (!masked) {
        return ''
    }
    return `验证码将发送至 ${masked}`
}
