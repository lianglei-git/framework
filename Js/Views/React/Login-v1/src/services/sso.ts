import {
    SSOConfig,
    SSOToken,
    SSOProvider,
    SSOAuthRequest,
    SSOAuthResponse,
    SSOLoginRequest,
    SSOLoginResponse,
    SSOLogoutRequest,
    SSOLogoutResponse,
    SSOUser,
    SSOSession,
    SSOSessionCheckResponse,
    SSOError,
    SSOCallbackContext,
    SSOTokenValidationResult,
    SSOIntrospectionRequest,
    SSOIntrospectionResponse,
    SSORefreshTokenRequest,
    SSORefreshTokenResponse,
    SSODiscoveryDocument,
    SSOProviderConfig,
    StorageType
} from '../types'
import { ApiService } from './api'
import { storageManager } from '../utils/storage'

/**
 * SSO 认证服务类
 * 实现完整的SSO认证流程，支持OAuth 2.0/OpenID Connect协议
 * 支持URL参数驱动的动态配置，用于处理外部应用的授权请求
 */
export class SSOService extends ApiService {
    private config: SSOConfig
    private tokenManager: SSOTokenManager
    private sessionManager: SSOSessionManager
    private providers: Map<string, SSOProvider> = new Map()
    private urlParams: URLSearchParams
    private isCallbackMode: boolean = false
    private currentProviderId: string = 'local'

    constructor(config: SSOConfig) {
        // 如果没有提供配置，尝试从URL参数中获取
        const finalConfig = config.ssoServerUrl ? config : SSOService.extractConfigFromURL()

        super(finalConfig.ssoServerUrl)
        this.config = finalConfig
        this.tokenManager = new SSOTokenManager(finalConfig)
        this.sessionManager = new SSOSessionManager(finalConfig)
        this.urlParams = new URLSearchParams(window.location.search)

        // 检查是否是回调模式（有code或error参数）
        this.isCallbackMode = this.urlParams.has('code') || this.urlParams.has('error')

        // 检测并设置当前应用ID
        this.detectCurrentAppId()

        // 初始化时加载支持的SSO提供商
        this.loadProviders()
    }

    /**
     * 检测并设置当前应用ID
     */
    private detectCurrentAppId(): void {
        const urlParams = new URLSearchParams(window.location.search)
        const appId = urlParams.get('appid') || urlParams.get('app_id') || 'default'

        // 存储应用ID用于后续使用
        this.config.appId = appId

        console.log(`检测到应用ID: ${appId}`)
    }

    /**
     * 从URL参数中提取SSO配置
     * 用于支持外部应用通过URL跳转进入的场景
     */
    private static extractConfigFromURL(): SSOConfig {
        const urlParams = new URLSearchParams(window.location.search)

        // 尝试获取issuer（发行者标识）
        const issuer = urlParams.get('issuer') || 'http://localhost:8080'

        // 获取客户端信息
        const clientId = urlParams.get('client_id') || 'default-client'
        const redirectUri = urlParams.get('redirect_uri') || window.location.origin + '/auth/callback'

        // 获取响应类型
        const responseType = urlParams.get('response_type') || 'code'

        // 获取作用域
        const scopeParam = urlParams.get('scope') || 'openid profile email'
        const scope = scopeParam.split(' ').filter(s => s.trim())

        // 获取状态参数
        const state = urlParams.get('state')

        // 检查是否是回调模式
        const isCallbackMode = urlParams.has('code') || urlParams.has('error')

        return {
            ssoServerUrl: issuer,
            clientId: clientId,
            clientSecret: '', // 通常不需要客户端密钥
            redirectUri: redirectUri,
            scope: scope,
            responseType: responseType as 'code' | 'token' | 'id_token',
            grantType: 'authorization_code',
            sessionTimeout: 3600,
            autoRefresh: true,
            storageType: StorageType.LOCAL,
            cookieSameSite: 'lax',
            // 存储原始URL参数用于回调处理
            additionalParams: Object.fromEntries(urlParams.entries()),
            state: state || undefined
        }
    }

    /**
     * 检查是否处于回调模式
     */
    isInCallbackMode(): boolean {
        return this.isCallbackMode
    }

    /**
     * 获取原始URL参数
     */
    getURLParams(): URLSearchParams {
        return this.urlParams
    }

    /**
     * 获取授权请求上下文
     */
    getAuthRequestContext(): SSOAuthRequest {
        return {
            client_id: this.config.clientId,
            redirect_uri: this.config.redirectUri,
            response_type: this.config.responseType || 'code',
            scope: this.config.scope || ['openid', 'profile'],
            state: this.config.state || this.generateState(),
            // 其他URL参数
            ...this.config.additionalParams
        }
    }

    /**
     * 初始化SSO服务
     */
    async initialize(): Promise<void> {
        try {
            // 验证配置
            await this.validateConfig()

            // 加载服务发现文档
            const discovery = await this.loadDiscoveryDocument()
            this.updateEndpointsFromDiscovery(discovery)

            // 加载支持的提供商
            await this.loadProviders()

            // 检查现有会话
            await this.checkSession()

            console.log('SSO service initialized successfully')
        } catch (error) {
            console.error('Failed to initialize SSO service:', error)
            throw error
        }
    }

    /**
     * 验证SSO配置
     */
    private async validateConfig(): Promise<void> {
        if (!this.config.ssoServerUrl) {
            throw new Error('SSO server URL is required')
        }
        if (!this.config.clientId) {
            throw new Error('Client ID is required')
        }
        if (!this.config.redirectUri) {
            throw new Error('Redirect URI is required')
        }
    }

    /**
     * 加载服务发现文档
     */
    private async loadDiscoveryDocument(): Promise<SSODiscoveryDocument> {
        try {

            // 尝试API路径
            const response = await this.get<SSODiscoveryDocument>('/api/v1/openid-configuration')
            return response
        } catch (error) {
            console.warn('Failed to load discovery document, using default endpoints:', error)
            // 返回默认配置
            return {
                issuer: this.config.ssoServerUrl,
                authorization_endpoint: `${this.config.ssoServerUrl}/api/v1/auth/oauth/authorize`,
                token_endpoint: `${this.config.ssoServerUrl}/api/v1/auth/oauth/token`,
                userinfo_endpoint: `${this.config.ssoServerUrl}/api/v1/auth/oauth/userinfo`,
                end_session_endpoint: `${this.config.ssoServerUrl}/api/v1/auth/oauth/logout`,
                jwks_uri: `${this.config.ssoServerUrl}/api/v1/jwks-json`,
                response_types_supported: ['code', 'token', 'id_token'],
                subject_types_supported: ['public'],
                id_token_signing_alg_values_supported: ['RS256'],
                scopes_supported: ['openid', 'profile', 'email', 'phone'],
                claims_supported: ['sub', 'name', 'email', 'profile', 'picture']
            }
        }
    }

    /**
     * 从发现文档更新端点配置
     */
    private updateEndpointsFromDiscovery(discovery: SSODiscoveryDocument): void {
        if (!this.config.tokenEndpoint && discovery.token_endpoint) {
            this.config.tokenEndpoint = discovery.token_endpoint
        }
        if (!this.config.userInfoEndpoint && discovery.userinfo_endpoint) {
            this.config.userInfoEndpoint = discovery.userinfo_endpoint
        }
        if (!this.config.logoutEndpoint && discovery.end_session_endpoint) {
            this.config.logoutEndpoint = discovery.end_session_endpoint
        }
        if (!this.config.checkSessionEndpoint && discovery.check_session_iframe) {
            this.config.checkSessionEndpoint = discovery.check_session_iframe
        }
    }

    /**
     * 加载支持的SSO提供商
     * 根据应用ID动态加载对应的providers
     */
    async loadProviders(): Promise<void> {
        try {
            // 获取当前应用ID
            const appId = this.config.appId || 'default'

            // 尝试从环境变量加载应用特定的providers
            const appProviders = this.loadAppSpecificProviders(appId)

            if (appProviders.length > 0) {
                // 使用应用特定的providers
                appProviders.forEach(provider => {
                    this.providers.set(provider.id, provider)
                })
                console.log(`✅ 加载了 ${appProviders.length} 个应用特定providers`)
            } else {
                // 回退到从服务器加载
                const response = await this.get<SSOProvider[]>('/api/v1/sso/providers')
                response.data.forEach(provider => {
                    const enhancedProvider: SSOProvider = {
                        ...provider,
                        config: provider.config || {
                            client_id: this.config.clientId,
                            authorization_url: provider.authorizationUrl,
                            redirect_uri: this.config.redirectUri,
                            scope: this.config.scope,
                            response_type: this.config.responseType || 'code'
                        }
                    }
                    this.providers.set(provider.id, enhancedProvider)
                })
                console.log(`✅ 从服务器加载了 ${response.data.length} 个providers`)
            }

            // 总是添加本地认证provider
            this.addLocalProvider()

        } catch (error) {
            console.warn('Failed to load SSO providers:', error)
            // 设置默认providers
            this.setupDefaultProviders()
        }
    }

    /**
     * 从环境变量加载应用特定的providers
     */
    private loadAppSpecificProviders(appId: string): SSOProvider[] {
        const providers: SSOProvider[] = []

        // 本地认证provider
        if (import.meta.env.VITE_SSO_LOCAL_ENABLED !== 'false') {
            providers.push({
                id: 'local',
                name: 'local',
                displayName: '本地账号',
                authorizationUrl: `${this.config.ssoServerUrl}/oauth/authorize`,
                enabled: true,
                config: {
                    client_id: this.config.clientId,
                    authorization_url: `${this.config.ssoServerUrl}/oauth/authorize`,
                    redirect_uri: this.config.redirectUri,
                    scope: this.config.scope,
                    response_type: this.config.responseType || 'code'
                }
            })
        }

        // GitHub provider
        if (import.meta.env.VITE_SSO_PROVIDER_GITHUB_ENABLED !== 'false') {
            providers.push({
                id: 'github',
                name: 'github',
                displayName: 'GitHub',
                authorizationUrl: 'https://github.com/login/oauth/authorize',
                enabled: true,
                config: {
                    client_id: import.meta.env.VITE_SSO_PROVIDER_GITHUB_CLIENT_ID || 'Ov23li5H25mAnW2AWrr1',
                    authorization_url: 'https://github.com/login/oauth/authorize',
                    token_url: 'https://github.com/login/oauth/access_token',
                    user_info_url: 'https://api.github.com/user',
                    redirect_uri: this.config.redirectUri,
                    scope: ['user:email', 'read:user'],
                    response_type: 'code',
                    requirePKCE: true
                }
            })
        }

        // Google provider
        if (import.meta.env.VITE_SSO_PROVIDER_GOOGLE_ENABLED !== 'false') {
            providers.push({
                id: 'google',
                name: 'google',
                displayName: 'Google',
                authorizationUrl: 'https://accounts.google.com/oauth/authorize',
                enabled: true,
                config: {
                    client_id: import.meta.env.VITE_SSO_PROVIDER_GOOGLE_CLIENT_ID || '',
                    authorization_url: 'https://accounts.google.com/oauth/authorize',
                    token_url: 'https://oauth2.googleapis.com/token',
                    user_info_url: 'https://www.googleapis.com/oauth2/v2/userinfo',
                    redirect_uri: this.config.redirectUri,
                    scope: ['openid', 'profile', 'email'],
                    response_type: 'code'
                }
            })
        }

        // 微信provider
        if (import.meta.env.VITE_SSO_PROVIDER_WECHAT_ENABLED !== 'false') {
            providers.push({
                id: 'wechat',
                name: 'wechat',
                displayName: '微信',
                authorizationUrl: import.meta.env.VITE_SSO_PROVIDER_WECHAT_AUTH_URL || '',
                enabled: true,
                config: {
                    client_id: import.meta.env.VITE_SSO_PROVIDER_WECHAT_CLIENT_ID || '',
                    authorization_url: import.meta.env.VITE_SSO_PROVIDER_WECHAT_AUTH_URL || '',
                    token_url: import.meta.env.VITE_SSO_PROVIDER_WECHAT_TOKEN_URL || '',
                    user_info_url: import.meta.env.VITE_SSO_PROVIDER_WECHAT_USERINFO_URL || '',
                    redirect_uri: this.config.redirectUri,
                    scope: ['snsapi_login'],
                    response_type: 'code'
                }
            })
        }

        return providers
    }

    /**
     * 添加本地认证provider
     */
    private addLocalProvider(): void {
        const localProvider: SSOProvider = {
            id: 'local',
            name: 'local',
            displayName: '本地账号',
            authorizationUrl: `${this.config.ssoServerUrl}/oauth/authorize`,
            enabled: true,
            config: {
                client_id: this.config.clientId,
                authorization_url: `${this.config.ssoServerUrl}/oauth/authorize`,
                redirect_uri: this.config.redirectUri,
                scope: this.config.scope,
                response_type: this.config.responseType || 'code'
            }
        }

        this.providers.set('local', localProvider)
    }

    /**
     * 设置默认providers
     */
    private setupDefaultProviders(): void {
        this.providers.clear()
        this.addLocalProvider()

        // 添加GitHub作为默认社交登录选项
        this.providers.set('github', {
            id: 'github',
            name: 'github',
            displayName: 'GitHub',
            authorizationUrl: 'https://github.com/login/oauth/authorize',
            enabled: true,
            config: {
                client_id: import.meta.env.VITE_SSO_PROVIDER_GITHUB_CLIENT_ID || 'Ov23li5H25mAnW2AWrr1',
                authorization_url: 'https://github.com/login/oauth/authorize',
                token_url: 'https://github.com/login/oauth/access_token',
                user_info_url: 'https://api.github.com/user',
                redirect_uri: this.config.redirectUri,
                scope: ['user:email', 'read:user'],
                response_type: 'code',
                requirePKCE: true
            }
        })

        console.log('✅ 设置了默认providers: local, github')
    }

    /**
     * 获取支持的SSO提供商列表
     */
    getProviders(): SSOProvider[] {
        return Array.from(this.providers.values()).filter(p => p.enabled)
    }

    /**
     * 获取指定提供商
     */
    getProvider(providerId: string): SSOProvider | undefined {
        return this.providers.get(providerId)
    }

    /**
     * 获取当前provider的配置
     */
    private getCurrentProviderConfig(): SSOProviderConfig | undefined {
        const provider = this.providers.get(this.currentProviderId)
        return provider?.config as SSOProviderConfig | undefined
    }

    /**
     * 设置当前使用的provider
     */
    setCurrentProvider(providerId: string): void {
        this.currentProviderId = providerId
    }

    /**
     * 验证token交换参数 - 双重验证模式
     */
    private validateTokenExchangeParams(params: any): void {
        console.log('🔍 验证双重验证参数:', {
            has_code: !!params.code,
            has_code_verifier: !!params.code_verifier,
            has_state: !!params.state,
            has_app_id: !!params.app_id,
            has_internal_auth: !!params.internal_auth,
            has_double_verification: !!params.double_verification,
            has_client_secret: !!params.client_secret
        })

        if (!params.code) {
            throw new Error('Authorization code is required for double verification')
        }

        if (!params.code_verifier) {
            throw new Error('PKCE code_verifier is required for double verification')
        }

        if (!params.state) {
            throw new Error('State parameter is required for CSRF protection')
        }

        if (!params.app_id) {
            throw new Error('Application ID is required for layered authentication')
        }

        if (!params.internal_auth || params.internal_auth !== 'true') {
            throw new Error('Internal authentication flag is required for double verification')
        }

        if (!params.double_verification || params.double_verification !== 'true') {
            throw new Error('Double verification flag is required')
        }

        // 验证code_verifier长度（应该在43-128字符之间）
        if (params.code_verifier.length < 43 || params.code_verifier.length > 128) {
            throw new Error('Invalid code_verifier length (must be 43-128 characters)')
        }

        // 验证code_verifier只包含允许的字符（符合RFC 7636规范）
        const allowedCharsRegex = /^[A-Za-z0-9\-._~]+$/
        if (!allowedCharsRegex.test(params.code_verifier)) {
            throw new Error('Invalid code_verifier format: only A-Z, a-z, 0-9, -, ., _, ~ characters are allowed')
        }

        console.log('✅ 双重验证参数验证通过')
    }

    /**
     * 构建授权URL
     * 支持PKCE双重验证和动态URL参数
     */
    async buildAuthorizationUrl(providerId: string, options: Partial<SSOAuthRequest> = {}): Promise<string> {
        const provider = this.providers.get(providerId)
        if (!provider) {
            throw new Error(`Provider ${providerId} not found`)
        }

        // 设置当前使用的provider
        this.setCurrentProvider(providerId)

        // 获取provider的配置信息
        const providerConfig = provider.config as SSOProviderConfig | undefined

        // 如果处于回调模式且没有明确指定选项，使用URL参数
        const finalOptions = this.isInCallbackMode() && Object.keys(options).length === 0
            ? this.getAuthRequestContext()
            : options
        // 使用provider配置优先，如果没有则使用全局配置
        const clientId = providerConfig?.client_id || this.config.clientId
        const redirectUri = 'http://localhost:3033';//providerConfig?.redirect_uri || this.config.redirectUri
        const scope = finalOptions.scope || providerConfig?.scope || this.config.scope || ['openid', 'profile']
        const responseType = finalOptions.response_type || providerConfig?.response_type || this.config.responseType || 'code'
        const uniquestate = finalOptions.state || this.generateState()
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: responseType,
            scope: scope.join(' '),
            state: uniquestate
        })

        // 添加可选参数
        if (finalOptions.prompt) params.append('prompt', finalOptions.prompt)
        if (finalOptions.max_age) params.append('max_age', finalOptions.max_age.toString())
        if (finalOptions.login_hint) params.append('login_hint', finalOptions.login_hint)
        if (finalOptions.ui_locales) params.append('ui_locales', finalOptions.ui_locales.join(' '))
        if (finalOptions.acr_values) params.append('acr_values', finalOptions.acr_values.join(' '))

        // PKCE双重验证支持 - 强制使用
        // 对于系统内用户认证，必须使用PKCE进行双重验证
        const shouldUsePKCE = true // 强制开启PKCE

        if (shouldUsePKCE) {
            // if (finalOptions.code_challenge && finalOptions.code_challenge_method) {
            //     // 使用提供的PKCE参数
            //     params.append('code_challenge', finalOptions.code_challenge)
            //     params.append('code_challenge_method', finalOptions.code_challenge_method)
            //     console.log('🔐 使用提供的PKCE参数')
            // } else {
            // 自动生成PKCE参数（使用S256方法，这是GitHub等服务支持的标准方法）
            const pkceParams = await this.generatePKCE()
            console.log('🔐 自动生成PKCE参数:', {
                code_challenge: pkceParams.code_challenge,
                code_challenge_method: 'S256',
                code_verifier_length: pkceParams.code_verifier.length
            })

            params.append('code_challenge', pkceParams.code_challenge)
            params.append('code_challenge_method', 'S256')

            // 存储code_verifier用于后续双重验证token交换
            sessionStorage.setItem('pkce_code_verifier', pkceParams.code_verifier)
            sessionStorage.setItem('pkce_state', uniquestate)
            sessionStorage.setItem('login_provider', this.currentProviderId)
            console.log('✅ PKCE参数已存储到sessionStorage')
            // }
        }

        // 添加自定义参数
        if (finalOptions.additional_params) {
            Object.entries(finalOptions.additional_params).forEach(([key, value]) => {
                params.append(key, value)
            })
        }

        // 使用provider配置的授权URL，如果没有则使用provider.authorizationUrl或默认值
        const baseUrl = providerConfig?.authorization_url || provider.authorizationUrl || `${this.config.ssoServerUrl}/api/v1/auth/oauth/authorize`
        return `${baseUrl}?${params.toString()}`
    }

    /**
     * 生成PKCE参数
     */
    private async generatePKCE(): Promise<{ code_verifier: string; code_challenge: string }> {
        // 生成code_verifier (43-128字符的随机字符串)
        const codeVerifier = this.generateRandomString(128)

        // 生成code_challenge (SHA256哈希并进行Base64URL编码)
        const codeChallenge = this.base64URLEncode(await this.sha256Sync(codeVerifier))

        return {
            code_verifier: codeVerifier,
            code_challenge: codeChallenge
        }
    }

    /**
     * SHA256哈希 (同步版本)
     */
    private async sha256Sync(message: string): Promise<ArrayBuffer> {
        // 使用Web Crypto API进行真正的SHA256哈希
        const msgBuffer = new TextEncoder().encode(message)
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)

        // 确保返回正确的ArrayBuffer
        if (hashBuffer instanceof ArrayBuffer) {
            return hashBuffer
        } else {
            // 某些环境下返回Promise，需要特殊处理
            throw new Error('SHA256 digest should return ArrayBuffer')
        }
    }

    /**
     * 生成随机字符串（符合PKCE规范）
     * 按照RFC 7636规范，只使用安全的URL字符
     */
    private generateRandomString(length: number): string {
        const array = new Uint8Array(length)
        crypto.getRandomValues(array)

        // 按照RFC 7636规范，code_verifier只能包含：
        // A-Z, a-z, 0-9, -, ., _, ~
        const allowedChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
        let result = ''

        for (let i = 0; i < length; i++) {
            // 将随机字节映射到允许的字符集
            const byte = array[i] % allowedChars.length
            result += allowedChars.charAt(byte)
        }

        return result
    }

    /**
     * SHA256哈希
     */
    private async sha256(message: string): Promise<ArrayBuffer> {
        const msgBuffer = new TextEncoder().encode(message)
        return crypto.subtle.digest('SHA-256', msgBuffer)
    }

    /**
     * Base64URL编码
     * 确保正确处理ArrayBuffer并生成43字符的code_challenge
     */
    private base64URLEncode(buffer: ArrayBuffer): string {
        // 确保buffer是ArrayBuffer
        const uint8Array = new Uint8Array(buffer)

        // 转换为base64
        let binaryString = ''
        for (let i = 0; i < uint8Array.length; i++) {
            binaryString += String.fromCharCode(uint8Array[i])
        }
        const base64 = btoa(binaryString)

        // Base64URL编码（替换+和/为-和_，移除=）
        const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

        // 验证长度（SHA256应该产生32字节的哈希，base64编码后应该是43字符）
        if (base64url.length !== 43) {
            console.warn(`PKCE code_challenge长度异常: ${base64url.length}, 期望43字符`)
        }

        return base64url
    }

    /**
     * 生成状态参数
     */
    private generateState(): string {
        return Math.random().toString(36).substring(2) + Date.now().toString(36)
    }

    /**
     * 处理OAuth回调
     * 支持从URL参数自动提取回调信息
     */
    async handleCallback(context?: Partial<SSOCallbackContext>): Promise<SSOLoginResponse> {
        // 如果没有提供上下文，从URL参数中提取
        if (!context) {
            context = this.extractCallbackFromURL()
        }

        if (context.error) {
            throw new SSOError({
                error: context.error,
                error_description: context.error_description,
                state: context.state
            })
        }

        if (!context.code) {
            throw new Error('Authorization code not found')
        }

        // 验证state参数 - 增强的双重验证
        const storedState = sessionStorage.getItem('pkce_state') || sessionStorage.getItem('sso_state')
        if (storedState && context.state && context.state !== storedState) {
            throw new Error('Invalid state parameter - CSRF protection failed')
        }

        // 验证必须的参数
        if (!context.code) {
            throw new Error('Authorization code is missing')
        }

        if (!context.state) {
            throw new Error('State parameter is required for security verification')
        }

        // 清除存储的state（用于后续双重验证）
        sessionStorage.removeItem('pkce_state')
        sessionStorage.removeItem('sso_state')

        // 使用授权码获取token
        return this.exchangeCodeForToken(context.code, context.state)
    }

    /**
     * 从URL参数中提取回调上下文
     */
    private extractCallbackFromURL(): SSOCallbackContext {
        const urlParams = this.getURLParams()

        return {
            code: urlParams.get('code') || undefined,
            state: urlParams.get('state') || undefined,
            error: urlParams.get('error') || undefined,
            error_description: urlParams.get('error_description') || undefined,
            error_uri: urlParams.get('error_uri') || undefined,
            redirect_uri: this.config.redirectUri
        }
    }

    /**
     * 使用授权码交换访问令牌
     * 支持PKCE (Proof Key for Code Exchange) 双重验证模式
     * 使用统一的API服务进行请求
     */
    private async exchangeCodeForToken(code: string, state?: string): Promise<SSOLoginResponse> {
        // 获取当前provider的配置
        const providerConfig = this.getCurrentProviderConfig()
        // || this.config.tokenEndpoint
        const tokenEndpoint = providerConfig?.token_url || `${this.config.ssoServerUrl}/api/v1/auth/oauth-login`

        // 获取PKCE code_verifier（必须包含，用于双重验证）
        const codeVerifier = sessionStorage.getItem('pkce_code_verifier')
        console.log("交换exchangeCodeForToken", codeVerifier);

        // 构建token交换请求参数 - 双重验证模式
        const finalState = state || sessionStorage.getItem('pkce_state')




        const tokenRequestData = {
            grant_type: 'authorization_code',
            provider: sessionStorage.getItem('login_provider') || this.currentProviderId,
            code: code,
            redirect_uri: providerConfig?.redirect_uri || this.config.redirectUri,
            client_id: providerConfig?.client_id || this.config.clientId,
            // 必须包含state用于验证 - 使用回调中的state或存储的state
            state: finalState,
            // PKCE双重验证 - 必须包含code_verifier
            code_verifier: codeVerifier,
            // 内部第三方登录标识
            internal_auth: 'true',
            // 应用ID（从配置中获取）
            app_id: this.config.appId || 'default',
            // 双重验证标识
            double_verification: 'true'
        }

        // 客户端认证 - 增强安全验证
        if (this.config.clientSecret || providerConfig?.client_secret) {
            tokenRequestData.client_secret = providerConfig?.client_secret || this.config.clientSecret
            console.log('🔐 使用客户端密钥认证模式')
        } else {
            // 公共客户端必须使用PKCE
            if (!codeVerifier) {
                throw new Error('PKCE code_verifier is required for public clients in double verification mode')
            }
            console.log('🔐 使用PKCE双重验证模式')
        }

        try {
            // 验证必要的参数
            this.validateTokenExchangeParams(tokenRequestData)

            console.log('🔄 开始双重验证模式token交换:', {
                grant_type: tokenRequestData.grant_type,
                has_code: !!tokenRequestData.code,
                has_code_verifier: !!tokenRequestData.code_verifier,
                has_client_secret: !!tokenRequestData.client_secret,
                internal_auth: tokenRequestData.internal_auth,
                app_id: tokenRequestData.app_id,
                double_verification: tokenRequestData.double_verification,
                token_endpoint: tokenEndpoint
            })

            debugger

            // 使用统一的API服务进行token交换
            const response = await this.post<SSOToken>(tokenEndpoint, tokenRequestData)

            // 验证token响应
            const validationResult = await this.tokenManager.validateToken(response)
            if (!validationResult.is_valid) {
                throw new Error(validationResult.error_description || 'Token validation failed')
            }

            // 获取用户信息
            const userInfo = await this.getUserInfo(response.access_token)

            // 创建会话
            const session = await this.sessionManager.createSession({
                user_id: userInfo.sub,
                client_id: this.config.clientId,
                remember_me: false
            })

            console.log("清理敏感数据 pkce_code_verifier")
            // 清理敏感数据
            sessionStorage.removeItem('pkce_code_verifier')

            console.log('✅ 双重验证模式token交换成功:', {
                user_id: userInfo.sub,
                token_type: response.token_type,
                expires_in: response.expires_in
            })

            return {
                user: userInfo,
                token: response,
                session: session
            }
        } catch (error) {
            console.error('❌ 双重验证模式token交换失败:', error)

            // 清理敏感数据（即使失败也要清理）
            sessionStorage.removeItem('pkce_code_verifier')
            console.log("清理敏感数据 pkce_code_verifier error")

            throw error
        }
    }

    /**
     * 获取用户信息
     */
    async getUserInfo(accessToken: string): Promise<SSOUser> {
        // 获取当前provider的配置
        const providerConfig = this.getCurrentProviderConfig()
        const userInfoEndpoint = providerConfig?.user_info_url || this.config.userInfoEndpoint || `${this.config.ssoServerUrl}/api/v1/auth/oauth/userinfo`

        try {
            // 使用统一的API服务获取用户信息
            const response = await this.get<SSOUser>(userInfoEndpoint, undefined, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })

            return response
        } catch (error) {
            console.error('Get user info failed:', error)
            throw error
        }
    }

    /**
     * SSO登录
     */
    async login(request: SSOLoginRequest): Promise<SSOLoginResponse> {
        // 如果是本地登录
        if (request.login_type === 'local') {
            return this.localLogin(request.username!, request.password!)
        }

        // 如果是SSO登录且有code，处理回调
        if (request.code) {
            return this.handleCallback({
                code: request.code,
                state: request.state,
                redirect_uri: request.redirect_uri
            })
        }

        // 其他情况抛出错误
        throw new Error('Invalid login request')
    }

    /**
     * 本地登录（兼容原有登录方式）
     */
    private async localLogin(username: string, password: string): Promise<SSOLoginResponse> {
        const response = await this.post<SSOLoginResponse>('/api/v1/auth/login', {
            username,
            password,
            remember_me: false,
            login_type: 'local'
        })

        // 转换传统用户格式到SSO用户格式
        const ssoUser: SSOUser = {
            sub: response.user.id,
            name: response.user.username,
            preferred_username: response.user.username,
            email: response.user.email,
            picture: response.user.avatar,
            custom_claims: {
                original_user: response.user
            }
        }

        return {
            user: ssoUser,
            token: {
                access_token: response.token,
                token_type: 'Bearer',
                expires_in: 3600
            },
            session: {
                session_id: `local_${Date.now()}`,
                user_id: response.user.id,
                client_id: this.config.clientId,
                authenticated_at: Date.now(),
                expires_at: Date.now() + 3600 * 1000,
                last_activity: Date.now(),
                is_active: true,
                remember_me: false
            }
        }
    }

    /**
     * SSO登出
     */
    async logout(request: SSOLogoutRequest = {}): Promise<SSOLogoutResponse> {
        try {
            // 销毁当前会话
            await this.sessionManager.destroySession()

            // 清除本地存储
            storageManager.clearAuthData()

            // 如果有登出端点，调用服务端登出
            if (this.config.logoutEndpoint && request.id_token_hint) {
                const logoutUrl = this.buildLogoutUrl(request)

                return {
                    logout_url: logoutUrl
                }
            }

            return {}
        } catch (error) {
            console.error('Logout failed:', error)
            throw error
        }
    }

    /**
     * 构建登出URL
     */
    private buildLogoutUrl(request: SSOLogoutRequest): string {
        const params = new URLSearchParams()

        if (request.id_token_hint) {
            params.append('id_token_hint', request.id_token_hint)
        }
        if (request.post_logout_redirect_uri) {
            params.append('post_logout_redirect_uri', request.post_logout_redirect_uri)
        }
        if (request.state) {
            params.append('state', request.state)
        }

        return `${this.config.logoutEndpoint}?${params.toString()}`
    }

    /**
     * 检查会话状态
     */
    async checkSession(): Promise<SSOSessionCheckResponse> {
        try {
            // 检查本地会话
            const localSession = this.sessionManager.getCurrentSession()

            if (!localSession || !localSession.is_active) {
                return {
                    is_authenticated: false
                }
            }

            // 检查服务端会话
            if (this.config.checkSessionEndpoint) {
                try {
                    const serverSession = await this.get<SSOSessionCheckResponse>('/api/v1/sso/session/check')
                    return serverSession
                } catch (error) {
                    console.warn('Server session check failed:', error)
                    // 如果服务端检查失败，但本地会话存在，返回本地会话信息
                    return {
                        is_authenticated: true,
                        session: localSession
                    }
                }
            }

            return {
                is_authenticated: true,
                session: localSession
            }
        } catch (error) {
            console.error('Session check failed:', error)
            return {
                is_authenticated: false,
                error: error instanceof Error ? error.message : 'Session check failed'
            }
        }
    }

    /**
     * 刷新访问令牌
     */
    async refreshToken(refreshToken?: string): Promise<SSORefreshTokenResponse> {
        const token = refreshToken || this.tokenManager.getRefreshToken()

        if (!token) {
            throw new Error('No refresh token available')
        }

        const refreshRequest: SSORefreshTokenRequest = {
            refresh_token: token,
            grant_type: 'refresh_token',
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret
        }

        const response = await this.post<SSORefreshTokenResponse>('/oauth/token', refreshRequest)

        // 更新token
        await this.tokenManager.setToken(response)

        return response
    }

    /**
     * 验证访问令牌
     */
    async validateAccessToken(token: string): Promise<SSOTokenValidationResult> {
        return this.tokenManager.validateToken({
            access_token: token,
            token_type: 'Bearer'
        })
    }

    /**
     * 注销访问令牌
     */
    async revokeToken(token?: string): Promise<void> {
        const tokenToRevoke = token || this.tokenManager.getAccessToken()

        if (!tokenToRevoke) {
            return
        }

        try {
            await this.post('/oauth/revoke', {
                token: tokenToRevoke,
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret
            })
        } catch (error) {
            console.warn('Token revocation failed:', error)
        } finally {
            // 无论服务端是否成功，清除本地token
            await this.tokenManager.clearTokens()
        }
    }

    /**
     * 获取当前用户
     */
    async getCurrentUser(): Promise<SSOUser | null> {
        try {
            const session = await this.checkSession()
            return session.user || null
        } catch (error) {
            console.error('Failed to get current user:', error)
            return null
        }
    }

    /**
     * 更新用户配置
     */
    updateConfig(newConfig: Partial<SSOConfig>): void {
        this.config = { ...this.config, ...newConfig }
    }

    /**
     * 获取SSO配置
     */
    getConfig(): SSOConfig {
        return { ...this.config }
    }

    /**
     * 自动处理SSO流程
     * 根据URL参数自动判断并执行相应的SSO操作
     */
    async handleAutomaticSSO(): Promise<SSOLoginResponse | void> {
        // 如果是回调模式，自动处理回调
        if (this.isInCallbackMode()) {
            console.log('检测到OAuth回调，自动处理...')
            return this.handleCallback()
        }

        // 如果有授权请求参数，自动重定向到授权端点
        if (this.hasAuthorizationRequest()) {
            console.log('检测到授权请求，自动重定向到授权端点...')
            const authUrl = await this.buildAuthorizationUrl('local')
            window.location.href = authUrl
            return
        }

        console.log('无需自动处理，当前不是SSO流程')
    }

    /**
     * 检查是否有授权请求参数
     */
    private hasAuthorizationRequest(): boolean {
        const params = this.getURLParams()
        return params.has('client_id') || params.has('response_type') || params.has('scope')
    }

    /**
     * 生成隐式流程URL (Implicit Flow)
     * 用于某些需要立即获取token的场景
     */
    async buildImplicitFlowUrl(providerId: string, options: Partial<SSOAuthRequest> = {}): Promise<string> {
        const implicitOptions: Partial<SSOAuthRequest> = {
            ...options,
            response_type: 'token' as const
        }

        return await this.buildAuthorizationUrl(providerId, implicitOptions)
    }

    /**
     * 生成混合流程URL (Hybrid Flow)
     * 同时获取授权码和ID Token
     */
    async buildHybridFlowUrl(providerId: string, options: Partial<SSOAuthRequest> = {}): Promise<string> {
        const hybridOptions = {
            ...options,
            response_type: 'code id_token' as const
        }

        return await this.buildAuthorizationUrl(providerId, hybridOptions)
    }

    /**
     * 处理ID Token
     * 用于验证和解析OpenID Connect ID Token
     */
    async handleIDToken(idToken: string): Promise<SSOUser> {
        try {
            // 解析ID Token (JWT)
            const tokenParts = idToken.split('.')
            if (tokenParts.length !== 3) {
                throw new Error('Invalid ID token format')
            }

            const payload = JSON.parse(atob(tokenParts[1]))

            // 验证token
            const validationResult = await this.tokenManager.validateToken({
                access_token: idToken,
                token_type: 'id_token'
            })

            if (!validationResult.is_valid) {
                throw new Error(validationResult.error_description || 'ID token validation failed')
            }

            // 转换为SSO用户对象
            const ssoUser: SSOUser = {
                sub: payload.sub,
                name: payload.name || payload.preferred_username,
                preferred_username: payload.preferred_username,
                email: payload.email,
                picture: payload.picture,
                custom_claims: {
                    id_token: idToken,
                    token_payload: payload
                }
            }

            return ssoUser
        } catch (error) {
            console.error('ID token handling failed:', error)
            throw error
        }
    }


    /**
     * 获取客户端信息
     * 用于动态客户端注册或信息查询
     */
    async getClientInfo(): Promise<any> {
        try {
            const response = await this.get(`/api/v1/oauth/clients/${this.config.clientId}`)
            return response
        } catch (error) {
            console.warn('Failed to get client info:', error)
            return null
        }
    }
}

/**
 * SSO令牌管理器
 * 负责令牌的存储、验证和刷新
 */
export class SSOTokenManager {
    private config: SSOConfig

    constructor(config: SSOConfig) {
        this.config = config
    }

    /**
     * 存储令牌
     */
    async setToken(token: SSOToken): Promise<void> {
        const tokenData = {
            ...token,
            stored_at: Date.now(),
            expires_at: Date.now() + (token.expires_in * 1000)
        }

        storageManager.saveSSOData({
            token: tokenData,
            expires_at: tokenData.expires_at
        })
    }

    /**
     * 获取访问令牌
     */
    getAccessToken(): string | null {
        const data = storageManager.getSSOData()
        if (!data || !data.token) return null

        // 检查令牌是否过期
        if (Date.now() >= data.expires_at) {
            return null
        }

        return data.token.access_token
    }

    /**
     * 获取刷新令牌
     */
    getRefreshToken(): string | null {
        const data = storageManager.getSSOData()
        return data?.token?.refresh_token || null
    }

    /**
     * 验证令牌
     */
    async validateToken(token: SSOToken): Promise<SSOTokenValidationResult> {
        try {
            // 基本验证
            if (!token.access_token) {
                return {
                    is_valid: false,
                    error: 'invalid_token',
                    error_description: 'Access token is missing'
                }
            }

            if (!token.token_type) {
                return {
                    is_valid: false,
                    error: 'invalid_token',
                    error_description: 'Token type is missing'
                }
            }

            // 检查过期时间
            if (token.expires_in && Date.now() >= Date.now() + (token.expires_in * 1000)) {
                return {
                    is_valid: false,
                    error: 'token_expired',
                    error_description: 'Token has expired'
                }
            }

            // TODO: 服务端令牌验证
            // 这里应该调用令牌内省端点

            return {
                is_valid: true,
                token: token
            }
        } catch (error) {
            return {
                is_valid: false,
                error: 'token_validation_failed',
                error_description: error instanceof Error ? error.message : 'Token validation failed'
            }
        }
    }

    /**
     * 清除令牌
     */
    async clearTokens(): Promise<void> {
        storageManager.clearSSOData()
    }

    /**
     * 检查令牌是否需要刷新
     */
    shouldRefreshToken(): boolean {
        const data = storageManager.getSSOData()
        if (!data || !data.token || !data.expires_at) return false

        // 如果令牌将在5分钟内过期，认为需要刷新
        const fiveMinutes = 5 * 60 * 1000
        return Date.now() >= (data.expires_at - fiveMinutes)
    }
}

/**
 * SSO会话管理器
 * 负责会话的创建、维护和销毁
 */
export class SSOSessionManager {
    private config: SSOConfig

    constructor(config: SSOConfig) {
        this.config = config
    }

    /**
     * 创建会话
     */
    async createSession(sessionData: Partial<SSOSession>): Promise<SSOSession> {
        const session: SSOSession = {
            session_id: this.generateSessionId(),
            user_id: sessionData.user_id!,
            client_id: sessionData.client_id || this.config.clientId,
            authenticated_at: Date.now(),
            expires_at: Date.now() + (this.config.sessionTimeout || 3600) * 1000,
            last_activity: Date.now(),
            ip_address: await this.getClientIP(),
            user_agent: navigator.userAgent,
            is_active: true,
            remember_me: sessionData.remember_me || false
        }

        storageManager.saveSSOSession(session)
        return session
    }

    /**
     * 更新会话活动时间
     */
    async updateSessionActivity(): Promise<void> {
        const session = this.getCurrentSession()
        if (session) {
            session.last_activity = Date.now()
            storageManager.saveSSOSession(session)
        }
    }

    /**
     * 获取当前会话
     */
    getCurrentSession(): SSOSession | null {
        return storageManager.getSSOSession()
    }

    /**
     * 销毁会话
     */
    async destroySession(): Promise<void> {
        const session = this.getCurrentSession()
        if (session) {
            // 通知服务端会话销毁
            try {
                // 使用统一的API服务调用会话销毁API
                await this.post('/api/v1/sso/session/destroy', {
                    session_id: session.session_id
                })
            } catch (error) {
                console.warn('Failed to destroy server session:', error)
            }
        }

        storageManager.clearSSOSession()
    }

    /**
     * 验证会话是否有效
     */
    async validateSession(): Promise<boolean> {
        const session = this.getCurrentSession()

        if (!session) return false
        if (!session.is_active) return false
        if (Date.now() >= session.expires_at) return false

        // 更新活动时间
        await this.updateSessionActivity()

        return true
    }

    /**
     * 延长会话时间
     */
    async extendSession(): Promise<void> {
        const session = this.getCurrentSession()
        if (session) {
            session.expires_at = Date.now() + (this.config.sessionTimeout || 3600) * 1000
            storageManager.saveSSOSession(session)
        }
    }

    /**
     * 生成会话ID
     */
    private generateSessionId(): string {
        return `sso_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    /**
     * 获取客户端IP地址
     */
    private async getClientIP(): Promise<string> {
        try {
            // 这里应该调用一个获取客户端IP的API
            // 暂时返回一个默认值
            return 'unknown'
        } catch (error) {
            return 'unknown'
        }
    }
}

/**
 * SSO错误类
 */
export class SSOError extends Error {
    public error: string
    public error_description?: string
    public error_uri?: string
    public state?: string

    constructor(error: SSOError | string) {
        if (typeof error === 'string') {
            super(error)
            this.error = 'sso_error'
            this.error_description = error
        } else {
            super(error.error_description || error.error)
            this.error = error.error
            this.error_description = error.error_description
            this.error_uri = error.error_uri
            this.state = error.state
        }

        this.name = 'SSOError'
    }
}

/**
 * 创建默认SSO配置
 */
export function createDefaultSSOConfig(): SSOConfig {
    return {
        // ssoServerUrl: 'http://localhost:8080',
        clientId: 'your-client-id',
        clientSecret: 'your-client-secret',
        // redirectUri: window.location.origin + '/auth/callback',
        redirectUri: 'www.baidu.com',
        scope: ['openid', 'profile', 'email'],
        responseType: 'code',
        grantType: 'authorization_code',
        sessionTimeout: 3600,
        autoRefresh: true,
        storageType: StorageType.LOCAL,
        cookieSameSite: 'lax'
    }
}
