import React, { useState, useEffect } from 'react'
import { SSOService, createDefaultSSOConfig } from '../services/sso'
import { SSOProvider, SSOLoginRequest } from '../types'
import { AuthApiService } from '../services/api'
import { getOAuthURLAPI, oauthLoginAPI } from '../services/api'
import { formatAuthError } from '../utils/authError'

interface SystemAuthUIProps {
    appId?: string
    onAuthSuccess?: (user: any, token: string) => void
    onAuthError?: (error: string) => void
    className?: string
}

interface AuthProvider {
    id: string
    name: string
    displayName: string
    icon: React.ReactNode
    enabled: boolean
    type: 'local' | 'social'
}

const SystemAuthUI: React.FC<SystemAuthUIProps> = ({
    appId = 'default',
    onAuthSuccess,
    onAuthError,
    className = ''
}) => {
    const [ssoService, setSSOService] = useState<SSOService | null>(null)
    const [providers, setProviders] = useState<SSOProvider[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [authMode, setAuthMode] = useState<'local' | 'social' | 'loading'>('loading')
    const [selectedProvider, setSelectedProvider] = useState<string>('')
    const [localAuthData, setLocalAuthData] = useState({
        account: '',
        password: '',
        rememberMe: false
    })
    const [error, setError] = useState<string>('')

    // 初始化SSO服务和加载providers
    useEffect(() => {
        initializeSSO()
    }, [appId])

    const initializeSSO = async () => {
        try {
            setIsLoading(true)

            // 创建SSO配置（根据appId动态配置）
            const ssoConfig = createDefaultSSOConfig()
            ssoConfig.ssoServerUrl = import.meta.env.VITE_SSO_SERVER_URL || 'http://localhost:8080'
            ssoConfig.clientId = import.meta.env[`VITE_SSO_CLIENT_ID_${appId.toUpperCase()}`] || `app-${appId}-client`
            ssoConfig.redirectUri = `${window.location.origin}/auth/callback?appid=${appId}`

            const service = new SSOService(ssoConfig)
            await service.initialize()
            setSSOService(service)

            // 加载可用的providers
            await loadProviders(service)
        } catch (error: any) {
            console.error('初始化SSO失败:', error)
            setError('系统初始化失败，请刷新页面重试')
        } finally {
            setIsLoading(false)
        }
    }

    const loadProviders = async (service: SSOService) => {
        try {
            const availableProviders = service.getProviders()

            // 添加本地认证provider
            const localProvider: SSOProvider = {
                id: 'local',
                name: 'local',
                displayName: '本地账号',
                authorizationUrl: '',
                enabled: true,
                config: {
                    client_id: service.getConfig().clientId,
                    redirect_uri: service.getConfig().redirectUri
                }
            }

            setProviders([localProvider, ...availableProviders])
            setAuthMode('local')
        } catch (error: any) {
            console.error('加载providers失败:', error)
            setError('加载认证方式失败')
        }
    }

    const handleLocalLogin = async () => {
        if (!localAuthData.account || !localAuthData.password) {
            setError('请输入账号和密码')
            return
        }

        if (!ssoService) {
            setError('系统未初始化完成')
            return
        }

        setIsLoading(true)
        setError('')

        try {
            const loginRequest: SSOLoginRequest = {
                login_type: 'local',
                username: localAuthData.account,
                password: localAuthData.password,
                remember_me: localAuthData.rememberMe
            }

            const result = await ssoService.login(loginRequest)

            if (result && result.user && result.token) {
                onAuthSuccess?.(result.user, result.token.access_token)
            } else {
                throw new Error('登录响应格式错误')
            }
        } catch (error: any) {
            console.error('本地登录失败:', error)
            const msg = formatAuthError(error, '登录失败，请检查账号密码')
            setError(msg)
            onAuthError?.(msg)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSocialLogin = async (providerId: string) => {
        if (!ssoService) {
            setError('系统未初始化完成')
            return
        }

        setIsLoading(true)
        setError('')

        try {
            // 检查是否是回调模式
            if (ssoService.isInCallbackMode()) {
                // 处理OAuth回调
                const callbackResult = await ssoService.handleCallback()
                if (callbackResult && callbackResult.user && callbackResult.token) {
                    onAuthSuccess?.(callbackResult.user, callbackResult.token.access_token)
                    return
                }
            }

            // 构建授权URL
            const authUrl = ssoService.buildAuthorizationUrl(providerId, {
                redirect_uri: ssoService.getConfig().redirectUri,
                scope: ['openid', 'profile', 'email'],
                response_type: 'code'
            })

            // 重定向到授权端点
            window.location.href = authUrl
        } catch (error: any) {
            console.error('社交登录失败:', error)
            const msg = formatAuthError(error, '登录失败')
            setError(msg)
            onAuthError?.(msg)
        } finally {
            setIsLoading(false)
        }
    }

    const handleProviderClick = (providerId: string) => {
        if (providerId === 'local') {
            setAuthMode('local')
        } else {
            setSelectedProvider(providerId)
            setAuthMode('social')
            handleSocialLogin(providerId)
        }
    }

    const renderProviderButtons = () => {
        return providers.map((provider) => (
            <button
                key={provider.id}
                onClick={() => handleProviderClick(provider.id)}
                disabled={isLoading}
                className={`auth-provider-btn ${provider.id}-btn`}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px 24px',
                    margin: '8px 0',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.6 : 1,
                    width: '100%'
                }}
            >
                <span className="provider-icon" style={{ marginRight: '12px' }}>
                    {provider.id === 'github' && '🐙'}
                    {provider.id === 'google' && '🔍'}
                    {provider.id === 'wechat' && '💬'}
                    {provider.id === 'local' && '👤'}
                </span>
                <span>使用 {provider.displayName} 登录</span>
            </button>
        ))
    }

    const renderLocalAuthForm = () => {
        return (
            <div className="local-auth-form" style={{ padding: '20px' }}>
                <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>系统内登录</h3>

                <div style={{ marginBottom: '16px' }}>
                    <input
                        type="text"
                        placeholder="账号（邮箱/用户名/手机号）"
                        value={localAuthData.account}
                        onChange={(e) => setLocalAuthData(prev => ({ ...prev, account: e.target.value }))}
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '16px'
                        }}
                    />
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <input
                        type="password"
                        placeholder="密码"
                        value={localAuthData.password}
                        onChange={(e) => setLocalAuthData(prev => ({ ...prev, password: e.target.value }))}
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '16px'
                        }}
                    />
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                            type="checkbox"
                            checked={localAuthData.rememberMe}
                            onChange={(e) => setLocalAuthData(prev => ({ ...prev, rememberMe: e.target.checked }))}
                            disabled={isLoading}
                            style={{ marginRight: '8px' }}
                        />
                        记住我
                    </label>
                </div>

                {error && (
                    <div style={{
                        color: 'red',
                        marginBottom: '16px',
                        padding: '8px',
                        backgroundColor: '#fee',
                        borderRadius: '4px',
                        fontSize: '14px'
                    }}>
                        {error}
                    </div>
                )}

                <button
                    onClick={handleLocalLogin}
                    disabled={isLoading || !localAuthData.account || !localAuthData.password}
                    style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: isLoading || !localAuthData.account || !localAuthData.password ? '#ccc' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '16px',
                        cursor: isLoading || !localAuthData.account || !localAuthData.password ? 'not-allowed' : 'pointer',
                        marginBottom: '16px'
                    }}
                >
                    {isLoading ? '登录中...' : '登录'}
                </button>

                <div style={{ textAlign: 'center' }}>
                    <button
                        onClick={() => setAuthMode('social')}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#007bff',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                        }}
                    >
                        返回第三方登录
                    </button>
                </div>
            </div>
        )
    }

    if (isLoading && authMode === 'loading') {
        return (
            <div style={{ textAlign: 'center', padding: '40px' }}>
                <div>系统初始化中...</div>
            </div>
        )
    }

    return (
        <div className={`system-auth-ui ${className}`} style={{
            maxWidth: '400px',
            margin: '0 auto',
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                <h2 style={{ margin: '0 0 10px 0' }}>欢迎登录</h2>
                <div style={{ color: '#666', fontSize: '14px' }}>
                    应用: {appId} | 支持多认证方式
                </div>
            </div>

            {authMode === 'local' && renderLocalAuthForm()}

            {authMode === 'social' && (
                <div className="social-auth-section">
                    <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>选择登录方式</h3>
                    {renderProviderButtons()}
                </div>
            )}

            {error && authMode === 'social' && (
                <div style={{
                    color: 'red',
                    marginTop: '16px',
                    padding: '8px',
                    backgroundColor: '#fee',
                    borderRadius: '4px',
                    fontSize: '14px',
                    textAlign: 'center'
                }}>
                    {error}
                </div>
            )}
        </div>
    )
}

export default SystemAuthUI
