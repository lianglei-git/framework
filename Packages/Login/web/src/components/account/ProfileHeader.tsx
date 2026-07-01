import React from 'react'
import styles from './ProfileHeader.module.less'

export interface ProfileHeaderProps {
    avatarUrl?: string
    nickname: string
    username: string
    email?: string
    userId?: string
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
    userId,
}) => {
    const initials = (nickname || username || '?').slice(0, 1).toUpperCase()

    return (
        <header className={styles.header}>
            <div className={styles.avatarWrap}>
                {avatarUrl ? (
                    <img className={styles.avatar} src={avatarUrl} alt="" />
                ) : (
                    <div className={styles.avatarFallback}>{initials}</div>
                )}
            </div>
            <div className={styles.meta}>
                <h2 className={styles.displayName}>{nickname || username}</h2>
                <p className={styles.handle}>@{username}</p>
                {email && <p className={styles.email}>{email}</p>}
                {userId && <p className={styles.userId}>ID: {userId}</p>}
            </div>
        </header>
    )
}

export { providerLabels }
