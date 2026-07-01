import React, { useEffect, useMemo, useRef, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { globalUserStore } from '../../stores/UserStore'
import { useAuth } from '../../hooks/useAuth'
import {
    ProfileHeader,
    ContactInfoPanel,
    AccountMetaPanel,
    DefaultUserIdBanner,
} from '../../components/account'
import { userApi } from '../../core'
import {
    USER_ID_LABEL,
    USER_ID_HINT,
    NICKNAME_HINT,
} from '../../constants/userIdentity'
import {
    dismissDefaultUserIdBanner,
    hasDefaultUserId,
    isDefaultUserIdBannerDismissed,
    shouldShowDefaultUserIdBanner,
} from '../../utils/profileIdentity'
import { validateUsername } from '../../utils/validation'
import styles from './AccountPage.module.less'

type UsernameCheckState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export const ProfilePage: React.FC = observer(() => {
    const auth = useAuth()
    const profile = globalUserStore.detailsUserInfo
    const [username, setUsername] = useState('')
    const [nickname, setNickname] = useState('')
    const [bio, setBio] = useState('')
    const [statusMessage, setStatusMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const [avatarError, setAvatarError] = useState('')
    const [bannerDismissed, setBannerDismissed] = useState(false)
    const [usernameCheck, setUsernameCheck] = useState<UsernameCheckState>('idle')
    const usernameInputRef = useRef<HTMLInputElement>(null)
    const checkTimerRef = useRef<number>()

    useEffect(() => {
        void globalUserStore.requestUserDetailsInfo()
    }, [])

    useEffect(() => {
        if (!profile) return
        setUsername(profile.username || '')
        setNickname(profile.nickname || '')
        setBio(profile.meta?.bio || '')
        setBannerDismissed(isDefaultUserIdBannerDismissed(profile.username || ''))
        setUsernameCheck('idle')
    }, [profile])

    useEffect(() => {
        if (!profile || bannerDismissed) return
        if (!shouldShowDefaultUserIdBanner(profile)) return
        if (!hasDefaultUserId(profile)) return
        usernameInputRef.current?.focus()
    }, [profile, bannerDismissed])

    const avatarUrl = useMemo(() => {
        const stored = profile?.meta?.avatar || profile?.avatar
        return userApi.getAvatarSrc(stored) || globalUserStore.avatarSrc
    }, [profile?.meta?.avatar, profile?.avatar, globalUserStore.avatarSrc])

    const canSubmit = useMemo(() => {
        return username.trim().length >= 3 && nickname.trim().length >= 2
    }, [username, nickname])

    const showDefaultBanner = useMemo(() => {
        if (!profile || bannerDismissed) return false
        return shouldShowDefaultUserIdBanner(profile)
    }, [profile, bannerDismissed])

    const onAvatarUploaded = async () => {
        setAvatarError('')
        await globalUserStore.requestUserDetailsInfo()
        setStatusMessage('头像已更新')
    }

    const runUsernameCheck = async (value: string) => {
        const trimmed = value.trim()
        if (!trimmed || trimmed === profile?.username) {
            setUsernameCheck('idle')
            return
        }
        if (!validateUsername(trimmed)) {
            setUsernameCheck('invalid')
            return
        }
        setUsernameCheck('checking')
        try {
            const available = await userApi.checkUsername(trimmed)
            setUsernameCheck(available ? 'available' : 'taken')
        } catch {
            setUsernameCheck('idle')
        }
    }

    const onUsernameBlur = () => {
        void runUsernameCheck(username)
    }

    const onUsernameChange = (value: string) => {
        setUsername(value)
        setUsernameCheck('idle')
        if (checkTimerRef.current) {
            window.clearTimeout(checkTimerRef.current)
        }
        checkTimerRef.current = window.setTimeout(() => {
            void runUsernameCheck(value)
        }, 400)
    }

    const onDismissBanner = () => {
        if (profile?.username) {
            dismissDefaultUserIdBanner(profile.username)
        }
        setBannerDismissed(true)
    }

    const scrollToUserIdField = () => {
        usernameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        usernameInputRef.current?.focus()
    }

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
                setErrorMessage('用户ID已被占用，请换一个 3-20 位用户ID')
            } else {
                setErrorMessage(msg || '保存失败，请稍后重试')
            }
        }
    }

    const usernameCheckMessage = (() => {
        switch (usernameCheck) {
            case 'checking':
                return <span className={styles.checking}>检查中…</span>
            case 'available':
                return <span className={styles.checkOk}>可以使用</span>
            case 'taken':
                return <span className={styles.checkBad}>已被占用</span>
            case 'invalid':
                return <span className={styles.checkBad}>格式不正确</span>
            default:
                return null
        }
    })()

    return (
        <div>
            <ProfileHeader
                avatarUrl={avatarUrl}
                nickname={profile?.nickname || globalUserStore.nickName}
                username={profile?.username || globalUserStore.username}
                email={profile?.email}
                phone={profile?.phone}
                emailVerified={profile?.email_verified}
                phoneVerified={profile?.phone_verified}
                onAvatarUploaded={onAvatarUploaded}
                onAvatarError={setAvatarError}
            />
            {avatarError && <p className={styles.error}>{avatarError}</p>}

            <h1 className={styles.title}>个人资料</h1>
            <p className={styles.subtitle}>管理你的用户ID、昵称与基础个人信息。</p>

            {showDefaultBanner && profile && (
                <DefaultUserIdBanner
                    username={profile.username}
                    onDismiss={onDismissBanner}
                    onSetUserId={scrollToUserIdField}
                    showSetUserIdCta={hasDefaultUserId(profile)}
                />
            )}

            <div className={styles.form}>
                <label className={styles.field}>
                    <span className={styles.label}>{USER_ID_LABEL}（3-20 位）</span>
                    <input
                        ref={usernameInputRef}
                        className={styles.input}
                        value={username}
                        onChange={(event) => onUsernameChange(event.target.value)}
                        onBlur={onUsernameBlur}
                        placeholder={`请输入${USER_ID_LABEL}`}
                    />
                    <span className={styles.helper}>{USER_ID_HINT}</span>
                    <span className={styles.helper}>你的 @handle：@{username.trim() || '…'}</span>
                    {usernameCheckMessage}
                </label>

                <label className={styles.field}>
                    <span className={styles.label}>昵称</span>
                    <input
                        className={styles.input}
                        value={nickname}
                        onChange={(event) => setNickname(event.target.value)}
                        placeholder="请输入昵称"
                    />
                    <span className={styles.helper}>{NICKNAME_HINT}</span>
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

            <ContactInfoPanel
                email={profile?.email}
                phone={profile?.phone}
                emailVerified={profile?.email_verified}
                phoneVerified={profile?.phone_verified}
            />

            <AccountMetaPanel
                accountId={profile?.id || globalUserStore.id}
                createdAt={profile?.created_at}
                lastLoginAt={profile?.last_login_at}
            />
        </div>
    )
})
