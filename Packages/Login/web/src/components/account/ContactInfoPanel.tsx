import React from 'react'
import { Link } from 'react-router-dom'
import { maskPhone } from '../../utils/profileIdentity'
import styles from './ContactInfoPanel.module.less'

export interface ContactInfoPanelProps {
    email?: string
    phone?: string
    emailVerified?: boolean
    phoneVerified?: boolean
}

export const ContactInfoPanel: React.FC<ContactInfoPanelProps> = ({
    email,
    phone,
    emailVerified,
    phoneVerified,
}) => {
    const hasEmail = !!email?.trim()
    const hasPhone = !!phone?.trim()

    return (
        <section className={styles.panel}>
            <h3 className={styles.title}>联系方式</h3>
            <p className={styles.hint}>换绑与安全验证请在账号安全页管理。</p>

            <div className={styles.row}>
                <div className={styles.main}>
                    <span className={styles.label}>邮箱</span>
                    <span className={styles.value}>{hasEmail ? email : '未绑定'}</span>
                </div>
                <span className={emailVerified ? styles.badgeOk : styles.badgePending}>
                    {hasEmail ? (emailVerified ? '已验证' : '未验证') : '—'}
                </span>
                <Link className={styles.manage} to="/account/security">
                    管理
                </Link>
            </div>

            <div className={styles.row}>
                <div className={styles.main}>
                    <span className={styles.label}>手机</span>
                    <span className={styles.value}>{hasPhone ? maskPhone(phone!) : '未绑定'}</span>
                </div>
                <span className={phoneVerified ? styles.badgeOk : styles.badgePending}>
                    {hasPhone ? (phoneVerified ? '已验证' : '未验证') : '—'}
                </span>
                <Link className={styles.manage} to="/account/security">
                    管理
                </Link>
            </div>
        </section>
    )
}
