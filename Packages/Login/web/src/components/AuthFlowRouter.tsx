import React, { useState, useEffect } from 'react'
import SystemAuthUI from './SystemAuthUI'
import { appLayerManager, getCurrentAppId, getAppBranding, isFeatureEnabled } from '../services/appLayerManager'
import { SSOService, createDefaultSSOConfig } from '../services/sso'
import { ThirdPartyAuthHandler, createThirdPartyAuthHandler } from '../services/thirdPartyAuth'
import { AuthApiService } from '../services/api'

interface AuthFlowRouterProps {
    onAuthSuccess?: (user: any, token: string) => void
    onAuthError?: (error: string) => void
    defaultAppId?: string
    className?: string
}

type AuthMode = 'loading' | 'system-auth' | 'third-party-callback' | 'error'

const AuthFlowRouter: React.FC<AuthFlowRouterProps> = ({
    onAuthSuccess,
    onAuthError,
    defaultAppId,
    className = ''
}) => {
    const [authMode, setAuthMode] = useState<AuthMode>('loading')
    const [currentAppId, setCurrentAppId] = useState<string>('default')
    const [ssoService, setSSOService] = useState<SSOService | null>(null)
    const [thirdPartyAuth, setThirdPartyAuth] = useState<ThirdPartyAuthHandler | null>(null)
    const [authApiService, setAuthApiService] = useState<AuthApiService | null>(null)
    const [error, setError] = useState<string>('')

    // 初始化认证流程
    useEffect(() => {
        initializeAuthFlow()
    }, [defaultAppId])

    const initializeAuthFlow = async () => {
        try {
            setAuthMode('loading')

            // 检测当前应用ID
            const appId = defaultAppId || appLayerManager.extractAppIdFromURL()
            setCurrentAppId(appId)

            console.log(`🔄 初始化认证流程，应用ID: ${appId}`)

            // 创建API服务实例
            const apiService = new AuthApiService()
            setAuthApiService(apiService)

            // 创建SSO配置
            const ssoConfig = createDefaultSSOConfig()
            ssoConfig.ssoServerUrl = import.meta.env.VITE_SSO_SERVER_URL || 'http://localhost:8080'
            ssoConfig.clientId = import.meta.env[`VITE_SSO_CLIENT_ID_${appId.toUpperCase()}`] || `app-${appId}-client`
            ssoConfig.redirectUri = `${window.location.origin}/auth/callback?appid=${appId}`
            ssoConfig.appId = appId

            // 创建SSO服务
            const service = new SSOService(ssoConfig)
            await service.initialize()
            setSSOService(service)

            // 创建第三方认证处理器
            const thirdPartyHandler = createThirdPartyAuthHandler(service, apiService)
            setThirdPartyAuth(thirdPartyHandler)

            // 检查是否是第三方登录回调
            if (service.isInCallbackMode()) {
                setAuthMode('third-party-callback')
            } else {
                setAuthMode('system-auth')
            }

        } catch (error: any) {
            console.error('初始化认证流程失败:', error)
            setError(error.message || '初始化失败')
            setAuthMode('error')
        }
    }

    const handleAuthSuccess = (user: any, token: string) => {
        console.log('✅ 认证成功:', user)
        onAuthSuccess?.(user, token)
    }

    const handleAuthError = (error: string) => {
        console.error('❌ 认证失败:', error)
        setError(error)
        onAuthError?.(error)
    }

    const handleThirdPartyCallback = async () => {
        if (!thirdPartyAuth) {
            setError('第三方认证处理器未初始化')
            return
        }

        try {
            // 从URL参数中获取provider
            const urlParams = new URLSearchParams(window.location.search)
            const provider = urlParams.get('provider') || 'github'

            console.log(`🔄 处理 ${provider} 回调...`)

            const result = await thirdPartyAuth.handleCallback(provider)

            if (result.success) {
                handleAuthSuccess(result.user, result.token!)
            } else {
                handleAuthError(result.error || '回调处理失败')
            }
        } catch (error: any) {
            handleAuthError(error.message || '回调处理异常')
        }
    }

    const renderLoading = () => (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '400px',
            flexDirection: 'column'
        }}>
            <div style={{ marginBottom: '20px' }}>🔄</div>
            <div>系统初始化中...</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                应用: {currentAppId}
            </div>
        </div>
    )

    const renderError = () => (
        <div style={{
            textAlign: 'center',
            padding: '40px',
            backgroundColor: '#fee',
            borderRadius: '8px',
            margin: '20px 0'
        }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
            <h3>认证系统初始化失败</h3>
            <p style={{ color: '#666', margin: '16px 0' }}>{error}</p>
            <button
                onClick={initializeAuthFlow}
                style={{
                    padding: '8px 16px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}
            >
                重新初始化
            </button>
        </div>
    )

    const renderThirdPartyCallback = () => (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '400px',
            flexDirection: 'column'
        }}>
            <div style={{ marginBottom: '20px' }}>🔄</div>
            <div>处理第三方登录回调...</div>
            <button
                onClick={handleThirdPartyCallback}
                style={{
                    marginTop: '20px',
                    padding: '8px 16px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}
            >
                继续处理
            </button>
        </div>
    )

    const renderSystemAuth = () => {
        if (!ssoService || !authApiService) {
            return renderError()
        }

        return (
            <SystemAuthUI
                appId={currentAppId}
                ssoService={ssoService}
                onAuthSuccess={handleAuthSuccess}
                onAuthError={handleAuthError}
                className={className}
            />
        )
    }

    // 根据认证模式渲染不同内容
    switch (authMode) {
        case 'loading':
            return renderLoading()

        case 'error':
            return renderError()

        case 'third-party-callback':
            return renderThirdPartyCallback()

        case 'system-auth':
        default:
            return renderSystemAuth()
    }
}

export default AuthFlowRouter
