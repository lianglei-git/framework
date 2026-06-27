import React, { useEffect, useState } from 'react'
import { useAuth } from '../../'
import { Loading } from '../common/Loading'

interface SSOCallbackProps {
    provider: string
    onSuccess?: () => void
    onError?: (error: string) => void
}

const SSOCallback: React.FC<SSOCallbackProps> = ({ provider, onSuccess, onError }) => {
    const auth = useAuth()
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        const handleSSOCallback = async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search)
                const code = urlParams.get('code')
                const state = urlParams.get('state')
                const error = urlParams.get('error')
                const errorDescription = urlParams.get('error_description')

                if (error) {
                    const message = errorDescription || error
                    setErrorMessage(message)
                    setStatus('error')
                    onError?.(message)
                    return
                }

                if (!code) {
                    const message = 'Authorization code not found'
                    setErrorMessage(message)
                    setStatus('error')
                    onError?.(message)
                    return
                }

                // 使用SSO登录
                await auth.ssoLogin?.({
                    provider,
                    code,
                    state: state || undefined,
                    login_type: 'sso'
                })

                setStatus('success')
                onSuccess?.()

            } catch (error: any) {
                const message = error.message || 'SSO login failed'
                setErrorMessage(message)
                setStatus('error')
                onError?.(message)
            }
        }

        handleSSOCallback()
    }, [provider, auth, onSuccess, onError])

    if (status === 'loading') {
        return (
            <div className="sso-callback">
                <Loading type="spinner" size="large" text="正在处理SSO登录..." />
            </div>
        )
    }

    if (status === 'error') {
        return (
            <div className="sso-callback">
                <div className="error-state">
                    <div className="error-icon">✗</div>
                    <h2>登录失败</h2>
                    <p>{errorMessage}</p>
                    <button
                        className="retry-button"
                        onClick={() => window.location.href = '/login'}
                    >
                        返回登录页
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="sso-callback">
            <div className="success-state">
                <div className="success-icon">✓</div>
                <h2>登录成功</h2>
                <p>正在跳转...</p>
            </div>
        </div>
    )
}

export { SSOCallback }
