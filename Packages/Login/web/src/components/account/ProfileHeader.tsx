import React from 'react'
import { AvatarUpload } from './AvatarUpload'
import styles from './ProfileHeader.module.less'

export interface ProfileHeaderProps {
    avatarUrl?: string
    nickname: string
    username: string
    email?: string
    phone?: string
    emailVerified?: boolean
    phoneVerified?: boolean
    onAvatarUploaded?: () => void
    onAvatarError?: (message: string) => void
}

const providerLabels: Record<string, string> = {
    google: 'Google',
    github: 'GitHub',
    wechat: '微信',
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
    avatarUrl,
    nickname,
    username,
    email,
    phone,
    emailVerified,
    phoneVerified,
    onAvatarUploaded,
    onAvatarError,
}) => {
    const initials = (nickname || username || '?').slice(0, 1).toUpperCase()

    const avatarNode = avatarUrl ? (
        <img className={styles.avatar} src={avatarUrl} alt="" />
    ) : (
        <div className={styles.avatarFallback}>{initials}</div>
    )

    return (
        <header className={styles.header}>
            <div className={styles.avatarWrap}>
                {onAvatarUploaded ? (
                    <AvatarUpload onUploaded={onAvatarUploaded} onError={onAvatarError}>
                        {avatarNode}
                    </AvatarUpload>
                ) : (
                    avatarNode
                )}
            </div>
            <div className={styles.meta}>
                <h2 className={styles.displayName}>{nickname || username}</h2>
                <p className={styles.handle}>@{username}</p>
                <div className={styles.badges}>
                    {email && (
                        <span className={emailVerified ? styles.badgeOk : styles.badgePending}>
                            邮箱{emailVerified ? '已验证' : '未验证'}
                        </span>
                    )}
                    {phone && (
                        <span className={phoneVerified ? styles.badgeOk : styles.badgePending}>
                            手机{phoneVerified ? '已验证' : '未验证'}
                        </span>
                    )}
                </div>
            </div>
        </header>
    )
}

export { providerLabels }
