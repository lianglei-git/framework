import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    clearProfileNudgePending,
    consumeProfileNudgePending,
    dismissProfileNudge,
} from '../../utils/profileIdentity'
import styles from './ProfileLoginNudge.module.less'

export const ProfileLoginNudge: React.FC = () => {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        setVisible(consumeProfileNudgePending())
    }, [])

    if (!visible) return null

    const onDismiss = () => {
        dismissProfileNudge()
        setVisible(false)
    }

    const onNavigate = () => {
        clearProfileNudgePending()
        setVisible(false)
    }

    return (
        <div className={styles.banner} role="status">
            <p className={styles.message}>
                完善资料：
                <Link className={styles.link} to="/account" onClick={onNavigate}>
                    设置你的用户ID和头像
                </Link>
            </p>
            <button type="button" className={styles.dismiss} onClick={onDismiss} aria-label="关闭">
                ×
            </button>
        </div>
    )
}
