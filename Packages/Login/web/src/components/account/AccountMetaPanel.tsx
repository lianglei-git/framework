import React, { useState } from 'react'
import { formatAccountDateTime } from '../../utils/profileIdentity'
import styles from './AccountMetaPanel.module.less'

export interface AccountMetaPanelProps {
    accountId?: string
    createdAt?: string
    lastLoginAt?: string
}

export const AccountMetaPanel: React.FC<AccountMetaPanelProps> = ({
    accountId,
    createdAt,
    lastLoginAt,
}) => {
    const [copied, setCopied] = useState(false)

    const onCopy = async () => {
        if (!accountId) return
        try {
            await navigator.clipboard.writeText(accountId)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 2000)
        } catch {
            setCopied(false)
        }
    }

    return (
        <section className={styles.panel}>
            <h3 className={styles.title}>账号信息</h3>

            <div className={styles.row}>
                <span className={styles.label}>账号 ID</span>
                <div className={styles.valueRow}>
                    <code className={styles.code}>{accountId || '—'}</code>
                    {accountId && (
                        <button type="button" className={styles.copyBtn} onClick={onCopy}>
                            {copied ? '已复制' : '复制'}
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.row}>
                <span className={styles.label}>注册于</span>
                <span className={styles.value}>{formatAccountDateTime(createdAt)}</span>
            </div>

            <div className={styles.row}>
                <span className={styles.label}>上次登录</span>
                <span className={styles.value}>{formatAccountDateTime(lastLoginAt)}</span>
            </div>
        </section>
    )
}
