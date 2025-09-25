/**
 * SSO集成示例
 * 展示如何在现有项目中集成SSO功能
 */

// 1. 导入必要的SSO模块
import { SSOService, createDefaultSSOConfig } from './src/services/sso'
import { getCrossDomainSSO } from './src/services/crossDomainSSO'
import { ssoConfigManager } from './src/services/ssoConfig'
import { SSOSecurityManager } from './src/services/ssoSecurity'
import { useAuth } from './src/hooks/useAuth'

// 2. 初始化SSO服务
export async function initializeSSO() {
    try {
        console.log('🚀 初始化SSO服务...')

        // 加载SSO配置
        const ssoConfig = await ssoConfigManager.loadConfig()

        // 创建SSO服务实例
        const ssoService = new SSOService(ssoConfig)
        await ssoService.initialize()

        // 创建安全管理器
        const securityManager = new SSOSecurityManager(ssoConfig)

        // 初始化跨域SSO
        const crossDomainSSO = getCrossDomainSSO(ssoConfig)

        // 设置全局SSO服务
        window.ssoService = ssoService
        window.ssoSecurity = securityManager
        window.crossDomainSSO = crossDomainSSO

        console.log('✅ SSO服务初始化完成')

        return {
            ssoService,
            securityManager,
            crossDomainSSO
        }
    } catch (error) {
        console.error('❌ SSO服务初始化失败:', error)
        throw error
    }
}

// 3. SSO登录组件示例
export function SSOLoginButton({ provider, children, ...props }) {
    const auth = useAuth()

    const handleLogin = async () => {
        try {
            const authUrl = auth.getSSOAuthorizationUrl?.(provider, {
                scope: ['openid', 'profile', 'email'],
                state: Math.random().toString(36).substring(2)
            })

            if (authUrl) {
                // 存储当前页面URL，用于登录后返回
                sessionStorage.setItem('sso_return_url', window.location.pathname)
                window.location.href = authUrl
            }
        } catch (error) {
            console.error('SSO登录失败:', error)
            // 显示错误消息
        }
    }

    return (
        <button onClick={handleLogin} {...props}>
            {children}
        </button>
    )
}

// 4. SSO回调页面示例
export function SSOCallbackPage() {
    const auth = useAuth()
    const [status, setStatus] = React.useState('loading')

    React.useEffect(() => {
        const handleCallback = async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search)
                const code = urlParams.get('code')
                const state = urlParams.get('state')
                const error = urlParams.get('error')

                if (error) {
                    setStatus('error')
                    return
                }

                if (code) {
                    await auth.ssoLogin?.({
                        provider: 'github', // 根据实际提供商调整
                        code,
                        state,
                        login_type: 'sso'
                    })

                    setStatus('success')

                    // 获取返回URL并跳转
                    const returnUrl = sessionStorage.getItem('sso_return_url') || '/'
                    setTimeout(() => {
                        window.location.href = returnUrl
                    }, 1000)
                }
            } catch (error) {
                console.error('SSO回调处理失败:', error)
                setStatus('error')
            }
        }

        handleCallback()
    }, [])

    if (status === 'loading') {
        return <div>正在处理登录...</div>
    }

    if (status === 'error') {
        return <div>登录失败，请重试</div>
    }

    return <div>登录成功，正在跳转...</div>
}

// 5. 受保护的路由组件示例
export function ProtectedRoute({ children }) {
    const auth = useAuth()
    const [isChecking, setIsChecking] = React.useState(true)

    React.useEffect(() => {
        const checkAuth = async () => {
            try {
                // 检查传统认证
                if (auth.isAuthenticated) {
                    setIsChecking(false)
                    return
                }

                // 检查SSO会话
                const isSSOAuthenticated = await auth.checkSSOSession?.()
                if (isSSOAuthenticated) {
                    setIsChecking(false)
                    return
                }

                // 都没有认证，跳转到登录页
                const currentPath = window.location.pathname
                window.location.href = `/login?returnUrl=${encodeURIComponent(currentPath)}`
            } catch (error) {
                console.error('认证检查失败:', error)
                window.location.href = '/login'
            }
        }

        checkAuth()
    }, [auth])

    if (isChecking) {
        return <div>检查登录状态...</div>
    }

    return <>{children}</>
}

// 6. 全局SSO状态监听
export function setupSSOEventListeners() {
    // 监听SSO登录事件
    window.addEventListener('auth:sso:login', (event) => {
        console.log('SSO登录成功:', event.detail)
        // 更新UI状态
        // 刷新用户数据
    })

    // 监听SSO登出事件
    window.addEventListener('auth:sso:logout', (event) => {
        console.log('SSO登出:', event.detail)
        // 清除本地状态
        // 重定向到登录页
    })

    // 监听跨域SSO消息
    window.addEventListener('message', (event) => {
        if (event.data.type === 'SSO_SESSION_SYNC') {
            console.log('收到跨域SSO会话同步:', event.data)
            // 同步会话状态
        }
    })
}

// 7. 工具函数
export const ssoUtils = {
    // 检查是否启用了SSO
    isSSOEnabled: () => {
        return !!import.meta.env.VITE_SSO_SERVER_URL
    },

    // 获取登录URL
    getLoginUrl: (returnUrl = '/') => {
        const params = new URLSearchParams()
        if (returnUrl) {
            params.append('returnUrl', returnUrl)
        }
        return `/login?${params.toString()}`
    },

    // 获取登出URL
    getLogoutUrl: () => {
        return '/logout'
    },

    // 格式化用户显示名称
    formatUserDisplayName: (user) => {
        if (user?.name) return user.name
        if (user?.preferred_username) return user.preferred_username
        if (user?.email) return user.email
        return '用户'
    },

    // 检查权限
    hasPermission: (user, permission) => {
        // 实现权限检查逻辑
        return user?.custom_claims?.permissions?.includes(permission) || false
    }
}

// 8. React Hook示例
export function useSSO() {
    const auth = useAuth()
    const [isSSOLoading, setIsSSOLoading] = React.useState(false)

    const ssoLogin = React.useCallback(async (provider) => {
        setIsSSOLoading(true)
        try {
            const authUrl = auth.getSSOAuthorizationUrl?.(provider)
            if (authUrl) {
                window.location.href = authUrl
            }
        } catch (error) {
            console.error('SSO登录失败:', error)
            throw error
        } finally {
            setIsSSOLoading(false)
        }
    }, [auth])

    const ssoLogout = React.useCallback(async () => {
        setIsSSOLoading(true)
        try {
            await auth.ssoLogout?.()
        } catch (error) {
            console.error('SSO登出失败:', error)
            throw error
        } finally {
            setIsSSOLoading(false)
        }
    }, [auth])

    return {
        // 状态
        isSSOAuthenticated: auth.isSSOAuthenticated,
        ssoUser: auth.ssoUser,
        ssoSession: auth.ssoSession,
        isLoading: isSSOLoading || auth.isLoading,

        // 方法
        ssoLogin,
        ssoLogout,
        checkSSOSession: auth.checkSSOSession,
        refreshSSOToken: auth.refreshSSOToken,

        // 工具
        utils: ssoUtils
    }
}

// 使用示例
export function ExampleComponent() {
    const { ssoLogin, ssoLogout, isSSOAuthenticated, ssoUser } = useSSO()

    if (isSSOAuthenticated) {
        return (
            <div>
                <p>欢迎, {ssoUtils.formatUserDisplayName(ssoUser)}</p>
                <button onClick={ssoLogout}>登出</button>
            </div>
        )
    }

    return (
        <div>
            <SSOLoginButton provider="github" onClick={() => ssoLogin('github')}>
                使用GitHub登录
            </SSOLoginButton>
            <SSOLoginButton provider="google" onClick={() => ssoLogin('google')}>
                使用Google登录
            </SSOLoginButton>
        </div>
    )
}
