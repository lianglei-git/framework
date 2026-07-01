import React, { useEffect, useMemo, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { globalUserStore } from '../../stores/UserStore'
import { useAuth } from '../../hooks/useAuth'
import { ProfileHeader } from '../../components/account/ProfileHeader'
import { userApi } from '../../core'
import styles from './AccountPage.module.less'

export const ProfilePage: React.FC = observer(() => {
    const auth = useAuth()
    const profile = globalUserStore.detailsUserInfo
    const [username, setUsername] = useState('')
    const [nickname, setNickname] = useState('')
    const [bio, setBio] = useState('')
    const [statusMessage, setStatusMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        void globalUserStore.requestUserDetailsInfo()
    }, [])

    useEffect(() => {
        if (!profile) return
        setUsername(profile.username || '')
        setNickname(profile.nickname || '')
        setBio(profile.meta?.bio || '')
    }, [profile])

    const avatarUrl = useMemo(() => {
        const stored = profile?.meta?.avatar
        return userApi.getAvatarSrc(stored) || globalUserStore.avatarSrc
    }, [profile?.meta?.avatar, globalUserStore.avatarSrc])

    const canSubmit = useMemo(() => {
        return username.trim().length >= 3 && nickname.trim().length >= 2
    }, [username, nickname])

    const onSave = async () => {
        setStatusMessage('')
        setErrorMessage('')
        try {
            await auth.updateProfile({
                username: username.trim(),
                nickname: nickname.trim(),
                meta: {
                    ...(profile?.meta || {}),
                    bio: bio.trim(),
                },
            })
            await globalUserStore.requestUserDetailsInfo()
            setStatusMessage('已保存')
        } catch (error: any) {
            const msg = error?.message || ''
            if (msg.toLowerCase().includes('username already exists')) {
                setErrorMessage('用户名已被占用，请换一个 3-20 位用户名')
            } else {
                setErrorMessage(msg || '保存失败，请稍后重试')
            }
        }
    }

    return (
        <div>
            <ProfileHeader
                avatarUrl={avatarUrl}
                nickname={profile?.nickname || globalUserStore.nickName}
                username={profile?.username || globalUserStore.username}
                email={profile?.email}
                userId={profile?.id || globalUserStore.id}
            />

            <h1 className={styles.title}>个人资料</h1>
            <p className={styles.subtitle}>管理你的用户名、昵称与基础个人信息。</p>
            <div className={styles.form}>
                <label className={styles.field}>
                    <span className={styles.label}>用户名（3-20 位）</span>
                    <input
                        className={styles.input}
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder="请输入用户名"
                    />
                </label>

                <label className={styles.field}>
                    <span className={styles.label}>昵称</span>
                    <input
                        className={styles.input}
                        value={nickname}
                        onChange={(event) => setNickname(event.target.value)}
                        placeholder="请输入昵称"
                    />
                </label>

                <label className={styles.field}>
                    <span className={styles.label}>简介</span>
                    <textarea
                        className={styles.input}
                        value={bio}
                        onChange={(event) => setBio(event.target.value)}
                        placeholder="一句话介绍你自己"
                        rows={3}
                    />
                </label>

                <div className={styles.actions}>
                    <button type="button" className={styles.primary} disabled={!canSubmit || auth.isLoading} onClick={onSave}>
                        保存更改
                    </button>
                    {statusMessage && <span className={styles.success}>{statusMessage}</span>}
                    {errorMessage && <span className={styles.error}>{errorMessage}</span>}
                </div>
            </div>
        </div>
    )
})
