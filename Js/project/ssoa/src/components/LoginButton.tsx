import React from 'react'
import { useSSO } from '../hooks/useSSO'
import './LoginButton.css'

export interface LoginButtonProps {
    provider?: string
    children?: React.ReactNode
    className?: string
    disabled?: boolean
    onSuccess?: (user: any, token: any, session: any) => void
    onError?: (error: Error) => void
    style?: React.CSSProperties
}

/**
 * SSO登录按钮组件
 * 提供一键式SSO登录功能
 */
export const LoginButton: React.FC<LoginButtonProps> = ({
    provider = 'local',
    children,
    className = '',
    disabled = false,
    onSuccess,
    onError,
    style = {}
}) => {
    const {
        isLoading,
        isAuthenticated,
        user,
        login,
        logout,
        error,
        clearError
    } = useSSO({
        onSuccess,
        onError,
        config: {
            redirectUri: "http://localhost:5173",
            app_id: 'temp1'
        }
    })

    const handleLogin = async () => {
        try {
            await login({ redirect: true, provider })
        } catch (error) {
            console.error('登录失败:', error)
        }
    }

    const handleLogout = async () => {
        try {
            await logout()
        } catch (error) {
            console.error('登出失败:', error)
        }
    }

    // 如果已认证，显示用户信息和登出按钮
    if (isAuthenticated && user) {
        return (
            <div className={`sso-authenticated ${className}`} style={style}>
                <div className="sso-user-info">
                    <img
                        src={user.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                        alt="用户头像"
                        className="sso-avatar"
                    />
                    <span className="sso-username">{user.name || user.email}</span>
                </div>
                <button
                    onClick={handleLogout}
                    disabled={isLoading || disabled}
                    className="sso-logout-button"
                >
                    {isLoading ? '处理中...' : '登出'}
                </button>
            </div>
        )
    }

    // 显示登录按钮
    return (
        <div className="sso-login-container">
            {error && (
                <div className="sso-error-message" style={{ marginBottom: '10px' }}>
                    <span>{error.message}</span>
                    <button onClick={clearError} className="sso-error-close">
                        ✕
                    </button>
                </div>
            )}

            <button
                onClick={handleLogin}
                disabled={isLoading || disabled}
                className={`sso-login-button ${className}`}
                style={style}
                data-provider={provider}
            >
                {isLoading ? (
                    <>
                        <span className="sso-loading-spinner"></span>
                        登录中...
                    </>
                ) : (
                    <>
                        <span className="sso-button-icon">
                            {getProviderIcon(provider)}
                        </span>
                        {children || `使用 ${getProviderName(provider)} 登录`}
                    </>
                )}
            </button>
        </div>
    )
}

/**
 * 获取提供商图标
 */
function getProviderIcon(provider: string): string {
    const icons: Record<string, string> = {
        local: '🔐',
        github: '🐙',
        google: '🌐',
        wechat: '💬',
        default: '🔑'
    }
    return icons[provider] || icons.default
}

/**
 * 获取提供商名称
 */
function getProviderName(provider: string): string {
    const names: Record<string, string> = {
        local: 'SSO',
        github: 'GitHub',
        google: 'Google',
        wechat: '微信',
        default: 'SSO'
    }
    return names[provider] || names.default
}

export default LoginButton
