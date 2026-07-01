import React from 'react'
import styles from './DefaultUserIdBanner.module.less'

export interface DefaultUserIdBannerProps {
    username: string
    onDismiss: () => void
    onSetUserId?: () => void
    showSetUserIdCta?: boolean
}

export const DefaultUserIdBanner: React.FC<DefaultUserIdBannerProps> = ({
    username,
    onDismiss,
    onSetUserId,
    showSetUserIdCta,
}) => {
    return (
        <div className={styles.banner} role="status">
            <div className={styles.content}>
                <p className={styles.message}>
                    你正在使用系统默认用户ID（<strong>{username}</strong>）。建议设置一个便于记忆的用户ID。
                </p>
                {showSetUserIdCta && onSetUserId && (
                    <button type="button" className={styles.cta} onClick={onSetUserId}>
                        去设置用户ID
                    </button>
                )}
            </div>
            <button type="button" className={styles.dismiss} onClick={onDismiss} aria-label="关闭提示">
                ×
            </button>
        </div>
    )
}
