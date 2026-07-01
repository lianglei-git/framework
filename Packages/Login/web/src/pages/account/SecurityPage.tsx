import React, { useEffect, useMemo } from 'react'
import { observer } from 'mobx-react-lite'
import { globalUserStore } from '../../stores/UserStore'
import { useAuth } from '../../hooks/useAuth'
import { ChangePasswordForm, providerLabels } from '../../components/account'
import styles from './AccountPage.module.less'

export const SecurityPage: React.FC = observer(() => {
    const auth = useAuth()
    const profile = globalUserStore.detailsUserInfo

    useEffect(() => {
        void globalUserStore.requestUserDetailsInfo()
    }, [])

    const emailVerified = !!profile?.email_verified
    const phoneVerified = !!profile?.phone_verified
    const linkedAccounts = profile?.linked_accounts || []

    const hasOAuthOnly = useMemo(() => {
        const anyLinked = linkedAccounts.some((item) => item.linked)
        return anyLinked && !profile?.email
    }, [linkedAccounts, profile?.email])

    return (
        <div>
            <h1 className={styles.title}>账号安全</h1>
            <p className={styles.subtitle}>查看验证状态并管理登录密码。</p>

            <div className={styles.statusGrid}>
                <article className={styles.statusCard}>
                    <h3>邮箱验证</h3>
                    <p>{profile?.email || '未绑定邮箱'}</p>
                    <span className={`${styles.badge} ${emailVerified ? styles.ok : styles.pending}`}>
                        {emailVerified ? '已验证' : '未验证'}
                    </span>
                </article>
                <article className={styles.statusCard}>
                    <h3>手机验证</h3>
                    <p>{profile?.phone || '未绑定手机号'}</p>
                    <span className={`${styles.badge} ${phoneVerified ? styles.ok : styles.pending}`}>
                        {phoneVerified ? '已验证' : '未验证'}
                    </span>
                </article>
            </div>

            {linkedAccounts.length > 0 && (
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>第三方绑定</h3>
                    <div className={styles.linkGrid}>
                        {linkedAccounts.map((item) => (
                            <div key={item.provider} className={styles.linkItem}>
                                <span>{providerLabels[item.provider] || item.provider}</span>
                                <span className={`${styles.badge} ${item.linked ? styles.ok : styles.pending}`}>
                                    {item.linked ? '已绑定' : '未绑定'}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section className={styles.section}>
                <h3 className={styles.sectionTitle}>修改密码</h3>
                {hasOAuthOnly && (
                    <p className={styles.hint}>
                        你当前使用第三方登录。设置密码为可选项，用于备用登录方式，不设置也不影响回跳子应用。
                    </p>
                )}
                <ChangePasswordForm
                    loading={auth.isLoading}
                    onSubmit={(oldPassword, newPassword) => auth.changePassword(oldPassword, newPassword)}
                />
            </section>
        </div>
    )
})
