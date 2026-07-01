import React, { useEffect, useMemo } from 'react'
import { observer } from 'mobx-react-lite'
import { RiMailLine, RiSmartphoneLine } from 'react-icons/ri'
import { globalUserStore } from '../../stores/UserStore'
import { useAuth } from '../../hooks/useAuth'
import {
    ChangePasswordForm,
    PasswordCredentialPanel,
    SetPasswordForm,
    providerLabels,
} from '../../components/account'
import styles from './AccountPage.module.less'

function resolvePasswordDescription(profile: {
    email_verified?: boolean
    phone_verified?: boolean
    email?: string
    phone?: string
    linked_accounts?: { provider: string; linked: boolean }[]
} | null, hasPassword: boolean): string {
    if (hasPassword) {
        return '密码已启用。你可以随时更新，或继续使用验证码与第三方登录。'
    }

    const linked = profile?.linked_accounts?.some((item) => item.linked)
    if (linked && !profile?.email && !profile?.phone) {
        return '设置密码后，可用用户ID或邮箱作为备用登录方式。不设置也不影响当前登录。'
    }
    if (profile?.phone_verified && profile?.phone) {
        return '你通过手机号验证码登录。设置密码后，下次可直接输入密码，无需等待验证码。'
    }
    if (profile?.email_verified && profile?.email) {
        return '你通过邮箱验证码登录。设置密码后，下次可直接输入密码，无需等待验证码。'
    }
    return '设置密码后，可使用密码登录，作为验证码之外的备用方式。'
}

export const SecurityPage: React.FC = observer(() => {
    const auth = useAuth()
    const profile = globalUserStore.detailsUserInfo

    useEffect(() => {
        void globalUserStore.requestUserDetailsInfo()
    }, [])

    const emailVerified = !!profile?.email_verified
    const phoneVerified = !!profile?.phone_verified
    const linkedAccounts = profile?.linked_accounts || []
    const hasPassword = !!profile?.has_password

    const passwordDescription = useMemo(
        () => resolvePasswordDescription(profile, hasPassword),
        [profile, hasPassword],
    )

    const handleSetPassword = async (newPassword: string) => {
        await auth.setPassword(newPassword)
    }

    return (
        <div className={styles.securityPage}>
            <header className={styles.pageHeader}>
                <h1 className={styles.title}>账号安全</h1>
                <p className={styles.subtitle}>管理登录凭证与验证方式，让账户既安全又顺手。</p>
            </header>

            <section className={styles.section} aria-labelledby="verification-heading">
                <h2 id="verification-heading" className={styles.sectionEyebrow}>验证方式</h2>
                <div className={styles.statusGrid}>
                    <article className={styles.statusCard}>
                        <div className={styles.statusIcon} aria-hidden>
                            <RiMailLine />
                        </div>
                        <div className={styles.statusBody}>
                            <h3 className={styles.statusLabel}>邮箱</h3>
                            <p className={styles.statusValue}>{profile?.email || '未绑定'}</p>
                        </div>
                        <span className={`${styles.badge} ${emailVerified ? styles.ok : styles.pending}`}>
                            {emailVerified ? '已验证' : '未验证'}
                        </span>
                    </article>
                    <article className={styles.statusCard}>
                        <div className={styles.statusIcon} aria-hidden>
                            <RiSmartphoneLine />
                        </div>
                        <div className={styles.statusBody}>
                            <h3 className={styles.statusLabel}>手机号</h3>
                            <p className={styles.statusValue}>{profile?.phone || '未绑定'}</p>
                        </div>
                        <span className={`${styles.badge} ${phoneVerified ? styles.ok : styles.pending}`}>
                            {phoneVerified ? '已验证' : '未验证'}
                        </span>
                    </article>
                </div>
            </section>

            <section className={styles.section}>
                <PasswordCredentialPanel
                    hasPassword={hasPassword}
                    description={passwordDescription}
                >
                    {hasPassword ? (
                        <ChangePasswordForm
                            loading={auth.isLoading}
                            onSubmit={(oldPassword, newPassword) => auth.changePassword(oldPassword, newPassword)}
                        />
                    ) : (
                        <SetPasswordForm
                            loading={auth.isLoading}
                            onSubmit={handleSetPassword}
                        />
                    )}
                </PasswordCredentialPanel>
            </section>

            {linkedAccounts.length > 0 && (
                <section className={styles.section} aria-labelledby="linked-heading">
                    <h2 id="linked-heading" className={styles.sectionEyebrow}>第三方绑定</h2>
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
        </div>
    )
})
