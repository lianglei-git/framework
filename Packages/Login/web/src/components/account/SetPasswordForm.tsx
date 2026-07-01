import React, { useState } from 'react'
import styles from './SetPasswordForm.module.less'

export interface SetPasswordFormProps {
    onSubmit: (newPassword: string) => Promise<void>
    loading?: boolean
}

export const SetPasswordForm: React.FC<SetPasswordFormProps> = ({ onSubmit, loading }) => {
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setError('')
        setSuccess('')

        if (newPassword.length < 6) {
            setError('密码至少 6 位')
            return
        }
        if (newPassword !== confirmPassword) {
            setError('两次输入的密码不一致')
            return
        }

        try {
            await onSubmit(newPassword)
            setNewPassword('')
            setConfirmPassword('')
            setSuccess('密码已设置，下次可使用密码登录')
        } catch (err: any) {
            setError(err?.message || '设置密码失败')
        }
    }

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
                <span className={styles.label}>新密码</span>
                <input
                    type="password"
                    className={styles.input}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="至少 6 位"
                    autoComplete="new-password"
                    required
                />
            </label>
            <label className={styles.field}>
                <span className={styles.label}>确认密码</span>
                <input
                    type="password"
                    className={styles.input}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入密码"
                    autoComplete="new-password"
                    required
                />
            </label>
            <div className={styles.actions}>
                <button type="submit" className={styles.primary} disabled={loading}>
                    设置密码
                </button>
                {success && <span className={styles.success} role="status">{success}</span>}
                {error && <span className={styles.error} role="alert">{error}</span>}
            </div>
        </form>
    )
}
