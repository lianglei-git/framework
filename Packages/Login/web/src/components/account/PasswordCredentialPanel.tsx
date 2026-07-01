import React from 'react'
import { RiLock2Line } from 'react-icons/ri'
import styles from './PasswordCredentialPanel.module.less'

export interface PasswordCredentialPanelProps {
    hasPassword: boolean
    description: string
    children: React.ReactNode
}

export const PasswordCredentialPanel: React.FC<PasswordCredentialPanelProps> = ({
    hasPassword,
    description,
    children,
}) => {
    return (
        <article
            className={`${styles.panel} ${hasPassword ? styles.panelActive : styles.panelUnset}`}
            aria-labelledby="password-credential-title"
        >
            <div className={styles.accent} aria-hidden />
            <header className={styles.header}>
                <div className={styles.iconWrap}>
                    <RiLock2Line className={styles.icon} />
                </div>
                <div className={styles.headerText}>
                    <span className={styles.eyebrow}>登录凭证</span>
                    <h3 id="password-credential-title" className={styles.title}>
                        登录密码
                    </h3>
                    <p className={styles.description}>{description}</p>
                </div>
                <span
                    className={`${styles.status} ${hasPassword ? styles.statusOn : styles.statusOff}`}
                >
                    {hasPassword ? '已启用' : '未设置'}
                </span>
            </header>
            <div className={styles.body}>{children}</div>
        </article>
    )
}
