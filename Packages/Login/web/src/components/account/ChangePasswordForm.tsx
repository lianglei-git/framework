import React, { useState } from 'react'
import styles from './ChangePasswordForm.module.less'

export interface ChangePasswordFormProps {
    onSubmit: (oldPassword: string, newPassword: string) => Promise<void>
    loading?: boolean
}

export const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({ onSubmit, loading }) => {
    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setError('')
        setSuccess('')

        if (newPassword.length < 6) {
            setError('新密码至少 6 位')
            return
        }
        if (newPassword !== confirmPassword) {
            setError('两次输入的新密码不一致')
            return
        }

        try {
            await onSubmit(oldPassword, newPassword)
            setOldPassword('')
            setNewPassword('')
            setConfirmPassword('')
            setSuccess('密码已更新')
        } catch (err: any) {
            setError(err?.message || '修改密码失败')
        }
    }

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
                <span className={styles.label}>当前密码</span>
                <input
                    type="password"
                    className={styles.input}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                />
            </label>
            <label className={styles.field}>
                <span className={styles.label}>新密码</span>
                <input
                    type="password"
                    className={styles.input}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                />
            </label>
            <label className={styles.field}>
                <span className={styles.label}>确认新密码</span>
                <input
                    type="password"
                    className={styles.input}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                />
            </label>
            <div className={styles.actions}>
                <button type="submit" className={styles.primary} disabled={loading}>
                    保存密码
                </button>
                {success && <span className={styles.success}>{success}</span>}
                {error && <span className={styles.error}>{error}</span>}
            </div>
        </form>
    )
}
