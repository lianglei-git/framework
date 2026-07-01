import React, { useRef, useState } from 'react'
import { userApi } from '../../core'
import styles from './AvatarUpload.module.less'

export interface AvatarUploadProps {
    onUploaded?: () => void
    onError?: (message: string) => void
    disabled?: boolean
    children?: React.ReactNode
}

const ACCEPT = 'image/jpeg,image/png,image/webp'
const MAX_BYTES = 2 * 1024 * 1024

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
    onUploaded,
    onError,
    disabled,
    children,
}) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)

    const openPicker = () => {
        if (disabled || uploading) return
        inputRef.current?.click()
    }

    const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return

        if (file.size > MAX_BYTES) {
            onError?.('头像不能超过 2MB')
            return
        }

        setUploading(true)
        try {
            await userApi.uploadAvatar(file)
            onUploaded?.()
        } catch (error: any) {
            onError?.(error?.message || '上传头像失败')
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className={styles.wrap}>
            <button
                type="button"
                className={styles.trigger}
                onClick={openPicker}
                disabled={disabled || uploading}
                aria-label="更换头像"
            >
                {children}
                <span className={styles.overlay} aria-hidden>
                    {uploading ? '上传中…' : '更换'}
                </span>
            </button>
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className={styles.hiddenInput}
                onChange={handleChange}
            />
        </div>
    )
}
