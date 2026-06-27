import {
    SSOConfig,
    SSOToken,
    SSOUser,
    SSOSession,
    SSOLoginRequest,
    SSOLoginResponse,
    SSOTokenValidationResult,
    SSOProvider,
    SSOError
} from '../types'
import { SSOTokenManager } from './SSOTokenManager'
import { SSOSessionManager } from './SSOSessionManager'
import { SSOSecurityManager } from './SSOSecurityManager'
import { SSOConfigManager } from './SSOConfig'
import { NetworkUtils } from '../utils/network'
import { StorageUtils } from '../utils/storage'
import { EventEmitter } from '../utils/helpers'

/**
 * SSO SDK主类
 * 提供完整的单点登录功能
 */
class SSOSDK extends EventEmitter {
    private config: SSOConfig
    private tokenManager: SSOTokenManager
    private sessionManager: SSOSessionManager
    private securityManager: SSOSecurityManager
    private configManager: SSOConfigManager
    private networkUtils: NetworkUtils
    private initialized = false

    constructor(config: Partial<SSOConfig>) {
        super()

        // 合并配置
        this.config = this.mergeConfig(config)
        this.configManager = new SSOConfigManager(this.config)

        // 初始化子模块
        this.tokenManager = new SSOTokenManager(this.config)
        this.sessionManager = new SSOSessionManager(this.config)
        this.securityManager = new SSOSecurityManager(this.config)
        this.networkUtils = new NetworkUtils()

        // 绑定事件
        this.setupEventListeners()
    }

    /**
     * 初始化SDK
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return
        }

        try {
            console.log('🚀 初始化SSO SDK...')

            // 验证配置
            await this.validateConfig()

            // 初始化各模块
            await Promise.all([
                this.tokenManager.initialize(),
                this.sessionManager.initialize(),
                this.securityManager.initialize()
            ])

            // 加载配置
            await this.configManager.loadConfig()

            // 检查现有会话
            await this.checkExistingSession()

            this.initialized = true
            this.emit('initialized')

            console.log('✅ SSO SDK初始化完成')
        } catch (error) {
            console.error('❌ SSO SDK初始化失败:', error)
            this.emit('error', error)
            throw error
        }
    }

    /**
     * 合并配置
     */
    private mergeConfig(userConfig: Partial<SSOConfig>): SSOConfig {
        const defaultConfig: SSOConfig = {
            ssoServerUrl: '',
            clientId: '',
            clientSecret: '',
            redirectUri: window.location.origin + '/sso/callback',
            scope: ['openid', 'profile', 'email'],
            responseType: 'code',
            grantType: 'authorization_code',
            sessionTimeout: 3600,
            autoRefresh: true,
            storageType: 'localStorage',
            cookieDomain: '',
            cookiePath: '/',
            cookieSecure: false,
            cookieSameSite: 'lax',
            enableLogging: true,
            debug: false,
            ...userConfig
        }

        return defaultConfig
    }

    /**
     * 验证配置
     */
    private async validateConfig(): Promise<void> {
        if (!this.config.ssoServerUrl) {
            throw new Error('SSO服务器URL不能为空')
        }

        if (!this.config.clientId) {
            throw new Error('客户端ID不能为空')
        }

        try {
            new URL(this.config.ssoServerUrl)
            new URL(this.config.redirectUri)
        } catch (error) {
            throw new Error('无效的URL格式')
        }

        // 验证SSO服务连接
        await this.networkUtils.testConnection(this.config.ssoServerUrl)
    }

    /**
     * 检查现有会话
     */
    private async checkExistingSession(): Promise<void> {
        try {
            const session = await this.sessionManager.getCurrentSession()
            if (session && session.is_active) {
                this.emit('session:restored', session)
            }
        } catch (error) {
            console.warn('检查现有会话失败:', error)
        }
    }

    /**
     * 设置事件监听器
     */
    private setupEventListeners(): void {
        // 监听令牌过期事件
        this.tokenManager.on('token:expired', () => {
            this.emit('token:expired')
        })

        // 监听会话过期事件
        this.sessionManager.on('session:expired', () => {
            this.emit('session:expired')
        })

        // 监听安全事件
        this.securityManager.on('security:event', (event) => {
            this.emit('security:event', event)
        })
    }

    /**
     * 获取授权URL
     */
    getAuthorizationUrl(provider: string, options: any = {}): string {
        if (!this.initialized) {
            throw new Error('SDK未初始化，请先调用initialize()')
        }

        const params = new URLSearchParams({
            client_id: this.config.clientId,
            redirect_uri: this.config.redirectUri,
            response_type: this.config.responseType,
            scope: this.config.scope.join(' '),
            state: this.generateState()
        })

        // 添加可选参数
        Object.entries(options).forEach(([key, value]) => {
            if (value !== undefined) {
                params.append(key, String(value))
            }
        })

        return `${this.config.ssoServerUrl}/oauth/authorize?${params.toString()}`
    }

    /**
     * 生成状态参数
     */
    private generateState(): string {
        return Math.random().toString(36).substring(2) + Date.now().toString(36)
    }

    /**
     * 处理授权回调
     */
    async handleCallback(params: { code?: string; state?: string; error?: string }): Promise<SSOLoginResponse> {
        if (!this.initialized) {
            throw new Error('SDK未初始化，请先调用initialize()')
        }

        if (params.error) {
            throw new SSOError(params.error, params.error)
        }

        if (!params.code) {
            throw new Error('授权码不存在')
        }

        // 验证状态参数
        if (params.state) {
            const storedState = sessionStorage.getItem('sso_state')
            if (params.state !== storedState) {
                throw new Error('状态参数不匹配')
            }
            sessionStorage.removeItem('sso_state')
        }

        // 使用授权码获取令牌
        return this.exchangeCodeForToken(params.code)
    }

    /**
     * 使用授权码交换令牌
     */
    private async exchangeCodeForToken(code: string): Promise<SSOLoginResponse> {
        const response = await this.networkUtils.post(
            `${this.config.ssoServerUrl}/oauth/token`,
            {
                grant_type: 'authorization_code',
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                code: code,
                redirect_uri: this.config.redirectUri
            },
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        )

        // 验证令牌
        const validationResult = await this.tokenManager.validateToken(response)
        if (!validationResult.is_valid) {
            throw new Error(validationResult.error_description || '令牌验证失败')
        }

        // 获取用户信息
        const userInfo = await this.getUserInfo(response.access_token)

        // 创建会话
        const session = await this.sessionManager.createSession({
            user_id: userInfo.sub,
            client_id: this.config.clientId,
            remember_me: false
        })

        const result: SSOLoginResponse = {
            user: userInfo,
            token: response,
            session: session
        }

        this.emit('login:success', result)
        return result
    }

    /**
     * 获取用户信息
     */
    async getUserInfo(accessToken: string): Promise<SSOUser> {
        const response = await this.networkUtils.get(
            `${this.config.ssoServerUrl}/oauth/userinfo`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        )

        return response
    }

    /**
     * 本地登录
     */
    async loginWithCredentials(username: string, password: string): Promise<SSOLoginResponse> {
        if (!this.initialized) {
            throw new Error('SDK未初始化，请先调用initialize()')
        }

        const response = await this.networkUtils.post(
            `${this.config.ssoServerUrl}/oauth/token`,
            {
                grant_type: 'password',
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                username: username,
                password: password,
                scope: this.config.scope.join(' ')
            },
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        )

        const userInfo = await this.getUserInfo(response.access_token)

        const session = await this.sessionManager.createSession({
            user_id: userInfo.sub,
            client_id: this.config.clientId,
            remember_me: false
        })

        const result: SSOLoginResponse = {
            user: userInfo,
            token: response,
            session: session
        }

        this.emit('login:success', result)
        return result
    }

    /**
     * 登出
     */
    async logout(): Promise<void> {
        if (!this.initialized) {
            return
        }

        try {
            await this.sessionManager.destroySession()
            await this.tokenManager.clearTokens()
            this.emit('logout:success')
        } catch (error) {
            console.error('登出失败:', error)
            this.emit('logout:error', error)
            throw error
        }
    }

    /**
     * 检查当前会话
     */
    async checkSession(): Promise<boolean> {
        if (!this.initialized) {
            return false
        }

        try {
            const result = await this.sessionManager.validateSession()
            if (result) {
                this.emit('session:valid')
            } else {
                this.emit('session:invalid')
            }
            return result
        } catch (error) {
            console.error('会话检查失败:', error)
            this.emit('session:error', error)
            return false
        }
    }

    /**
     * 获取当前用户
     */
    async getCurrentUser(): Promise<SSOUser | null> {
        if (!this.initialized) {
            return null
        }

        try {
            const session = await this.sessionManager.getCurrentSession()
            if (!session || !session.is_active) {
                return null
            }

            const token = this.tokenManager.getAccessToken()
            if (!token) {
                return null
            }

            return await this.getUserInfo(token)
        } catch (error) {
            console.error('获取用户信息失败:', error)
            return null
        }
    }

    /**
     * 刷新令牌
     */
    async refreshToken(): Promise<SSOToken | null> {
        if (!this.initialized) {
            return null
        }

        try {
            const refreshToken = this.tokenManager.getRefreshToken()
            if (!refreshToken) {
                throw new Error('没有可用的刷新令牌')
            }

            const response = await this.networkUtils.post(
                `${this.config.ssoServerUrl}/oauth/token`,
                {
                    grant_type: 'refresh_token',
                    client_id: this.config.clientId,
                    client_secret: this.config.clientSecret,
                    refresh_token: refreshToken
                },
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            )

            await this.tokenManager.setToken(response)
            this.emit('token:refreshed', response)
            return response
        } catch (error) {
            console.error('令牌刷新失败:', error)
            this.emit('token:refresh:error', error)
            throw error
        }
    }

    /**
     * 获取支持的提供商列表
     */
    async getProviders(): Promise<SSOProvider[]> {
        if (!this.initialized) {
            return []
        }

        try {
            const response = await this.networkUtils.get(
                `${this.config.ssoServerUrl}/api/v1/sso/providers`
            )
            return response
        } catch (error) {
            console.error('获取提供商列表失败:', error)
            return []
        }
    }

    /**
     * 验证令牌
     */
    async validateToken(token: string): Promise<SSOTokenValidationResult> {
        if (!this.initialized) {
            return {
                is_valid: false,
                error: 'sdk_not_initialized',
                error_description: 'SDK未初始化'
            }
        }

        return this.tokenManager.validateToken({
            access_token: token,
            token_type: 'Bearer'
        })
    }

    /**
     * 更新配置
     */
    updateConfig(newConfig: Partial<SSOConfig>): void {
        this.config = { ...this.config, ...newConfig }
        this.configManager.updateConfig(newConfig)
        this.emit('config:updated', this.config)
    }

    /**
     * 获取配置
     */
    getConfig(): SSOConfig {
        return { ...this.config }
    }

    /**
     * 检查SDK是否已初始化
     */
    isInitialized(): boolean {
        return this.initialized
    }

    /**
     * 销毁SDK实例
     */
    destroy(): void {
        this.removeAllListeners()
        this.tokenManager.destroy()
        this.sessionManager.destroy()
        this.securityManager.destroy()
        this.initialized = false
        this.emit('destroyed')
    }
}

export default SSOSDK
