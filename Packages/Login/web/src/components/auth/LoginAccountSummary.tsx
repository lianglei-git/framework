import React from 'react'
import { resolveAvatarUrl } from '../../utils/avatarUrl'
import { formatMaskedContact } from '../../utils/codeLoginContact'
import type { CodeChannel } from '../../utils/codeLoginContact'
import { basicUrl } from '../../core/httpClient'
import type { AccountPreview } from '../../types/auth'

export interface LoginAccountSummaryProps {
    account: string
    preview: AccountPreview | null
    loading?: boolean
    codeDeliveryHint?: string
    mode?: 'default' | 'otp_signin'
    otpChannel?: CodeChannel
    onSwitchAccount: () => void
}

export const LoginAccountSummary: React.FC<LoginAccountSummaryProps> = ({
    account,
    preview,
    loading,
    codeDeliveryHint,
    mode = 'default',
    otpChannel,
    onSwitchAccount,
}) => {
    const isOtpSignin = mode === 'otp_signin' && !preview
    const maskedAccount = otpChannel ? formatMaskedContact(otpChannel, account) : account
    const displayName = isOtpSignin
        ? maskedAccount
        : (preview?.display_name || preview?.nickname || preview?.username || account)
    const otpSubtitle = otpChannel === 'phone'
        ? '验证手机号后即可登录，无需单独注册'
        : '验证邮箱后即可登录，无需单独注册'
    const subtitle = codeDeliveryHint
        || (isOtpSignin ? otpSubtitle : null)
        || preview?.subtitle
        || preview?.email
        || preview?.phone
        || account
    const avatarUrl = resolveAvatarUrl(preview?.avatar, basicUrl)
    const fallbackInitial = (displayName || account || 'U').charAt(0).toUpperCase()

    return (
        <div className="user-info">
            <div className="user-avatar">
                {avatarUrl ? (
                    <img className="user-avatarImg" src={avatarUrl} alt="" />
                ) : (
                    fallbackInitial
                )}
            </div>
            <div className="user-details">
                <div className="user-name">{loading ? '加载中...' : displayName}</div>
                <div className="user-email">{loading ? account : subtitle}</div>
            </div>
            <button type="button" className="back-btn" onClick={onSwitchAccount}>
                切换账号
            </button>
        </div>
    )
}
