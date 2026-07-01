import {
    SSOConfig,
    SSOProvider,
    SSOProviderBasic,
    SSOToken,
    SSOLogoutRequest,
    SSOLogoutResponse,
    SSOUser,
    SSOSession,
    SSOSessionCheckResponse,
    SSOCallbackContext,
    SSOTokenValidationResult,
    StorageType,
} from '../types'
import { TokenErrorResponse } from '../types/token'
import { handleTokenError, createDefaultTokenErrorHandlers } from '../utils/tokenErrorHandler'
import { formatAuthError } from '../utils/authError'
import { ApiService } from '../core/httpClient'
import { storage, storageManager } from '../utils/storage'
import { globalUserStore } from '../stores/UserStore'
import { handleSSOCallbackResult } from '../utils/handleSSOCallbackResult'
import { clearOriginAppUri, getOriginAppUri } from '../utils/ssoOriginRedirect'
import { cleanOAuthParamsFromUrl } from '../utils/oauthLoading'
import {
    writeSsoSessionCookies,
    readSsoSessionCookies,
    clearSsoSessionCookies,
} from '../utils/ssoSessionCookie'
import { SSOTokenManager } from './tokenManager'
import { SSOSessionManager } from './sessionManager'
import { SSOError, createDefaultSSOConfig, getSSOConfig, setSSOConfig } from './config'
import { extractConfigFromURL } from './urlConfig'
import { generatePKCE, generateOAuthState } from './pkce'
import { applyDiscoveryEndpoints, resolveOAuthEndpoint as resolveOAuthEndpointUrl } from './oauthEndpoints'
import { beginAuthorizeAttempt, getAuthorizeEpoch, isAuthorizeAttemptStale } from './oauthAuthorizeGuard'
import {
    clearPkceBundle,
    commitPkceBundle,
    readPkceState,
    validatePkceCallback,
} from './oauthState'

export class SSOService extends ApiService {
    private config: SSOConfig
    private tokenManager: SSOTokenManager
    private sessionManager: SSOSessionManager
    private providers: Map<string, SSOProvider> = new Map()
    private urlParams: URLSearchParams
    private isCallbackMode: boolean = false
    private currentProviderId: string = 'local'




    constructor(config: SSOConfig) {
        if (SSOService.instance) {
            return SSOService.instance;
        }

        // 如果没有提供配置，尝试从URL参数中获取
        // 配置应该融合，url配置权限更高。

        const extrace = extractConfigFromURL();
        const finalConfig = { ...config };

        for (const k of Object.keys(extrace) as (keyof SSOConfig)[]) {
            const v = extrace[k];
            if (v !== undefined && v !== null && v !== '') {
                (finalConfig as Record<string, unknown>)[k as string] = v;
            }
        }
        super(finalConfig.ssoServerUrl)

        this.config = finalConfig
        this.tokenManager = new SSOTokenManager(finalConfig)
        this.sessionManager = new SSOSessionManager(finalConfig)
        this.urlParams = new URLSearchParams(window.location.search)

        // 检查是否是回调模式（有code或error参数）
        this.isCallbackMode = this.urlParams.has('code') || this.urlParams.has('error')

        // 检测并设置当前应用ID
        this.detectCurrentAppId()



    }

    /**
     * 检测并设置当前应用ID
     */
    private detectCurrentAppId(): void {
        const urlParams = new URLSearchParams(window.location.search)
        let appId = urlParams.get('appid') || urlParams.get('app_id');
        if (!appId) {
            appId = this.config.id;
        }

        // 存储应用ID用于后续使用
        this.config.appId = appId

        console.log(`检测到应用ID: ${appId}`)
    }

    /**
     * 从URL参数中提取SSO配置 — 见 urlConfig.ts
     */
    private resolveOAuthEndpoint(pathOrUrl?: string, fallback = '/api/v1/auth/oauth/token'): string {
        return resolveOAuthEndpointUrl(this.config.ssoServerUrl, pathOrUrl || this.config.tokenEndpoint, this.isSubProjectApp(), fallback)
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
            state: this.config.state || generateOAuthState(),
            // 其他URL参数
            ...this.config.additionalParams
        }
    }

    static instance: SSOService | null = null;
    static getInstance = async (config: any): Promise<SSOService> => {
        if (SSOService.instance) return SSOService.instance;
        const ins = new SSOService(config);
        let rescb: any;
        SSOService.instance = new Promise(res => (rescb = res)) as any
        await ins.initialize();
        rescb(ins);
        SSOService.instance = ins
        return SSOService.instance
    }


    /**
     * 初始化SSO服务
     */
    protected async initialize(): Promise<void> {
        try {
            // 验证配置
            await this.validateConfig()

            // 加载服务发现文档
            const discovery = await this.loadDiscoveryDocument()
            applyDiscoveryEndpoints(this.config, discovery, this.isSubProjectApp())

            // 加载支持的提供商
            await this.loadProviders()

            // 检查现有会话和session cookies
            await this.checkSession()

            // 检查session cookies并尝试自动登录

            // 处理SSO回调（如果有）
            if (this.isInCallbackMode()) {
                console.log('检测到SSO回调，自动处理...')
                try {
                    this.handleCallback()
                        .then((result) => {
                            if (result) {
                                // 子项目已在 redirect_uri 落地，勿再跳 origin_app_uri（否则会死循环）
                                if (this.isSubProjectApp()) {
                                    clearOriginAppUri()
                                    cleanOAuthParamsFromUrl()
                                    console.log('子项目 OAuth 回调完成，已清理 URL')
                                } else {
                                    handleSSOCallbackResult({ afterLogin: true }).then((handled) => {
                                        if (!handled && window.location.port === '3033') {
                                            window.location.replace('/account')
                                        }
                                    })
                                }
                            } else {
                                window.dispatchEvent(new CustomEvent('auth:oauth-failed'))
                            }
                        })
                        .catch((error) => {
                            console.error('SSO回调处理失败:', error)
                            cleanOAuthParamsFromUrl()
                            window.dispatchEvent(new CustomEvent('auth:oauth-failed', { detail: { error } }))
                            alert(`登录失败：${formatAuthError(error, '请重试')}`)
                        })
                } catch (error) {
                    console.error('SSO回调处理失败:', error)
                    cleanOAuthParamsFromUrl()
                    window.dispatchEvent(new CustomEvent('auth:oauth-failed', { detail: { error } }))
                    alert(`登录失败：${formatAuthError(error, '请重试')}`)
                }
            } else if (this.isSubProjectApp()) {
                await this.tryRecoverSubProjectSession()
            }
            // 登录中心回跳 authorize 由 LoginPage / AuthLogin 在登录成功后触发，不在 initialize 抢跑

            // await this.checkSessionCookies()


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

        // if (!this.config.clientId) {
        //     throw new Error('Client ID is required')
        // }
        // if (!this.config.redirectUri) {
        //     throw new Error('Redirect URI is required')
        // }
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
     * 将 provider 列表写入内存 Map
     */
    private applyProviderList(list: Array<Partial<SSOProvider> & { id: string; name: string }>): void {
        list.forEach((provider) => {
            this.providers.set(provider.id, {
                ...provider,
                displayName: provider.displayName || provider.name,
                authorizationUrl: provider.authorizationUrl || '',
                enabled: provider.enabled !== false,
            } as SSOProvider)
        })
    }

    /**
     * 加载基础的SSO提供商列表（不包含配置信息）
     * 从服务器端动态加载providers
     */
    async loadProviders(): Promise<SSOProviderBasic[]> {
        try {
            const response = await this.get<{ code?: number; data?: SSOProviderBasic[] } | SSOProviderBasic[]>(
                '/api/v1/sso/providers'
            )
            const list = Array.isArray(response) ? response : response?.data
            if (!Array.isArray(list) || list.length === 0) {
                throw new Error('Invalid providers response')
            }

            console.log('✅ 从服务器加载 providers 成功:', list)
            this.applyProviderList(list)
            return list
        } catch (error) {
            console.warn('⚠️ 从服务器加载 providers 失败，使用本地配置:', error)
            this.setupDefaultProviders()
            return this.getProviders()
        }
    }

    /**
     * 获取OAuth URL和相关参数
     * @param providerId Provider ID
     * @param options 额外的选项
     */
    async getOAuthURL(providerId: string, options: Partial<SSOAuthRequest> = {}): Promise<SSOOAuthUrlParams> {
        const response = await this.get<{ data?: SSOOAuthUrlParams } | SSOOAuthUrlParams>(
            `/api/v1/auth/oauth/${providerId}/url`,
            options
        )
        const payload = (response as { data?: SSOOAuthUrlParams })?.data ?? (response as SSOOAuthUrlParams)
        if (!payload?.auth_url) {
            throw new Error('无法获取第三方登录地址')
        }
        console.log('✅ 获取 OAuth URL 成功:', payload)
        return payload
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

        if (import.meta.env.VITE_SSO_PROVIDER_GITHUB_ENABLED !== 'false') {
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
        }

        if (import.meta.env.VITE_SSO_PROVIDER_GOOGLE_ENABLED !== 'false') {
            this.providers.set('google', {
                id: 'google',
                name: 'google',
                displayName: 'Google',
                authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
                enabled: true,
                config: {
                    client_id: import.meta.env.VITE_SSO_PROVIDER_GOOGLE_CLIENT_ID || '',
                    authorization_url: 'https://accounts.google.com/o/oauth2/v2/auth',
                    token_url: 'https://oauth2.googleapis.com/token',
                    user_info_url: 'https://www.googleapis.com/oauth2/v2/userinfo',
                    redirect_uri: this.config.redirectUri,
                    scope: ['openid', 'profile', 'email'],
                    response_type: 'code'
                }
            })
        }

        if (import.meta.env.VITE_SSO_PROVIDER_WECHAT_ENABLED !== 'false') {
            this.providers.set('wechat', {
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

        console.log('✅ 设置了默认 providers:', Array.from(this.providers.keys()).join(', '))
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
    private getCurrentProviderConfig(id = this.currentProviderId): SSOProviderConfig | undefined {
        const provider = this.providers.get(id)
        return provider as SSOProviderConfig | undefined
    }

    /**
     * 设置当前使用的provider
     */
    setCurrentProvider(providerId: string): void {
        this.currentProviderId = providerId
    }

    getLoginUrl(provider = 'local') {
        if (provider == 'local') {

            return
        }

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
        const attemptEpoch = beginAuthorizeAttempt()
        storage.set('login_provider', providerId, StorageType.LOCAL)
        // 设置当前使用的provider
        this.setCurrentProvider(providerId)

        // 如果处于回调模式且没有明确指定选项，使用URL参数
        const contextOptions = this.isInCallbackMode() && Object.keys(options).length === 0
            ? this.getAuthRequestContext()
            : options

        const finalOptions: Partial<SSOAuthRequest> = {
            redirect_uri: this.config.redirectUri || window.location.origin,
            client_id: this.config.clientId,
            response_type: this.config.responseType || 'code',
            scope: this.config.scope,
            ...contextOptions,
        }

        // 构建URL参数
        const params: Record<string, string> = {
            state: generateOAuthState(),
        }

        // 添加可选参数
        if (finalOptions.prompt) Reflect.set(params, 'prompt', finalOptions.prompt)

        if (finalOptions.client_id) Reflect.set(params, 'client_id', finalOptions.client_id)
        if (finalOptions.app_id) Reflect.set(params, 'app_id', finalOptions.app_id)
        if (finalOptions.grant_type) Reflect.set(params, 'grant_type', finalOptions.grant_type)

        if (finalOptions.redirect_uri) Reflect.set(params, 'redirect_uri', finalOptions.redirect_uri)
        if (finalOptions.response_type) Reflect.set(params, 'response_type', finalOptions.response_type)
        if (finalOptions.scope) {
            const scopeValue = Array.isArray(finalOptions.scope)
                ? finalOptions.scope.join(' ')
                : finalOptions.scope
            Reflect.set(params, 'scope', scopeValue)
        }

        if (finalOptions.max_age) Reflect.set(params, 'max_age', finalOptions.max_age.toString())
        if (finalOptions.login_hint) Reflect.set(params, 'login_hint', finalOptions.login_hint)
        if (finalOptions.ui_locales) Reflect.set(params, 'ui_locales', finalOptions.ui_locales.join(' '))
        if (finalOptions.acr_values) Reflect.set(params, 'acr_values', finalOptions.acr_values.join(' '))

        // PKCE双重验证支持 - 强制使用
        const shouldUsePKCE = true
        let pendingPkce: { state: string; codeVerifier: string } | null = null

        if (shouldUsePKCE) {
            // 自动生成PKCE参数（使用S256方法，这是GitHub等服务支持的标准方法）
            const pkceParams = await generatePKCE()
            console.log('🔐 自动生成PKCE参数:', {
                code_challenge: pkceParams.code_challenge,
                code_challenge_method: pkceParams.code_challenge_method,
                code_verifier_length: pkceParams.code_verifier.length
            })

            Reflect.set(params, 'code_challenge', pkceParams.code_challenge)
            Reflect.set(params, 'code_challenge_method', pkceParams.code_challenge_method)

            pendingPkce = { state: params.state, codeVerifier: pkceParams.code_verifier }
        }

        // 获取OAuth URL和相关参数
        const oauthParams = await this.getOAuthURL(providerId, params)

        if (!oauthParams?.auth_url) {
            throw new Error('无法获取第三方登录地址')
        }

        if (isAuthorizeAttemptStale(attemptEpoch)) {
            console.warn('OAuth authorize 已被更新的登录请求取代，放弃本次跳转')
            throw new Error('OAuth authorize superseded')
        }

        if (pendingPkce) {
            commitPkceBundle(pendingPkce.state, pendingPkce.codeVerifier)
            console.log('✅ PKCE参数已存储到localStorage')
        }

        console.log(oauthParams.auth_url, 'oauthParamsoauthParams')

        return oauthParams.auth_url
    }

    // async buildAuthorizationUrlForLocal(config) {
    //     const params = new URLSearchParams({
    //         client_id: config.client_id,
    //         app_id: config.app_id,
    //         grant_type: config.grant_type,
    //         redirect_uri: config.redirect_uri,
    //         response_type: config.response_type,
    //         scope: config.scope,
    //         state: this.generateState(),
    //         provider: 'local',
    //     })

    //     if (config.grant_type === 'authorization_code') {
    //         const { code_challenge, code_verifier } = await this.generatePKCE()
    //         params.set('code_challenge', code_challenge)
    //         params.set('code_challenge_method', 'S256')

    //         // 存储code_verifier用于后续使用
    //         localStorage.setItem('pkce_code_verifier', code_verifier)
    //     }

    //     return `${this.baseURL}/api/v1/auth/oauth/authorize?${params.toString()}`
    // }

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

        verifyOAuthState(context.state)

        // 验证必须的参数
        if (!context.code) {
            throw new Error('Authorization code is missing')
        }

        if (!context.state) {
            throw new Error('State parameter is required for security verification')
        }

        clearPkceState()

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

    private resolveAppId(): string {
        const c = this.config as SSOConfig & { id?: string; appId?: string }
        return c.appId || c.id || 'default'
    }

    /** 子项目（a_sso / b_sso 等），非 3033 中心登录页 */
    isSubProjectApp(): boolean {
        const appId = this.resolveAppId()
        return !!(this.config.clientId && appId && appId !== 'centralized')
    }

    /**
     * 将 session_id 写入 host 级 cookie，供跨应用 SSO（W-92）
     */
    private setSessionCookie(sessionId: string, appId?: string): void {
        const resolvedAppId = appId || this.resolveAppId()
        if (!sessionId) return
        writeSsoSessionCookies(sessionId, resolvedAppId)
        console.log('✅ SSO session cookies 已写入:', { session_id: sessionId, app_id: resolvedAppId })
    }

    /**
     * 从 cookie 读取 SSO session（localhost 各端口共享）
     */
    private getSessionFromCookies(): { sessionId: string | null; appId: string | null } {
        return readSsoSessionCookies()
    }

    hasValidSessionCookie(): boolean {
        const { sessionId } = readSsoSessionCookies()
        return !!sessionId
    }

    static clearSessionCookies(): void {
        clearSsoSessionCookies()
    }

    clearSessionCookies(): void {
        SSOService.clearSessionCookies()
    }

    /**
     * 子项目：用 IdP session cookie 静默恢复当前应用的 token（W-92 强免登）
     */
    async tryRecoverSubProjectSession(): Promise<boolean> {
        if (this.isInCallbackMode()) {
            return false
        }

        const existing = storage.getAuth()?.token
        const accessToken = typeof existing === 'string' ? existing : existing?.access_token
        if (accessToken && !storage.isSSOTokenExpired?.()) {
            return true
        }

        const { sessionId } = readSsoSessionCookies()
        if (!sessionId) {
            return false
        }

        const recovered = await this.recoverFromSession(sessionId)
        return !!recovered
    }

    /**
     * 弱免登：有 IdP session 时跳转 authorize（由 8080 直接发 code，通常不经 3033）
     */
    async trySilentAuthorize(): Promise<void> {
        if (!this.isSubProjectApp()) {
            return
        }
        if (this.isInCallbackMode()) {
            return
        }
        const existing = storage.getAuth()?.token
        const accessToken = typeof existing === 'string' ? existing : existing?.access_token
        if (accessToken && !storage.isSSOTokenExpired?.()) {
            return
        }
        if (!this.hasValidSessionCookie()) {
            return
        }
        const epochBefore = getAuthorizeEpoch()
        try {
            const loginUrl = await this.buildAuthorizationUrl('sub_job', {
                client_id: this.config.clientId,
                app_id: this.resolveAppId(),
                grant_type: 'authorization_code',
                redirect_uri: this.config.redirectUri,
                response_type: 'code',
                scope: (this.config.scope || []).join?.(' ') || (Array.isArray(this.config.scope) ? this.config.scope.join(' ') : 'openid profile email'),
            })
            if (getAuthorizeEpoch() !== epochBefore + 1) {
                console.log('静默免登已取消：用户发起了新的登录')
                return
            }
            window.location.href = loginUrl
        } catch (err) {
            if (err instanceof Error && err.message === 'OAuth authorize superseded') {
                return
            }
            throw err
        }
    }

    /** @deprecated use tryRecoverSubProjectSession */
    private async checkSessionCookies(): Promise<void> {
        await this.tryRecoverSubProjectSession()
    }


    /**
     * 使用授权码交换访问令牌
     * 支持PKCE (Proof Key for Code Exchange) 双重验证模式
     * 使用统一的API服务进行请求
     */
    private async exchangeCodeForToken(code: string, state?: string): Promise<SSOLoginResponse> {
        const provider = storage.get('login_provider', StorageType.LOCAL);
        // 获取当前provider的配置
        const providerConfig = this.getCurrentProviderConfig(provider)
        const tokenEndpoint = this.resolveOAuthEndpoint(this.config.tokenEndpoint)

        console.log("tokenEndpoint:", tokenEndpoint)
        // 获取PKCE code_verifier（必须包含，用于双重验证）
        const codeVerifier = localStorage.getItem('pkce_code_verifier')
        console.log("交换exchangeCodeForToken", codeVerifier);


        // 构建token交换请求参数 - 双重验证模式
        const finalState = state || readPkceState()

        // 解析state参数（可能是JSON格式）
        let parsedState = finalState
        try {
            if (typeof finalState === 'string') {
                parsedState = JSON.parse(finalState)
            }
        } catch (error) {
            // 如果不是有效的JSON，保持原样
            parsedState = finalState
        }




        const tokenRequestData = {
            grant_type: 'authorization_code',
            // grant_type: "code",
            provider,
            code: code,
            redirect_uri: providerConfig?.redirect_uri || this.config.redirectUri,
            client_id: providerConfig?.client_id || this.config.clientId,
            // 必须包含state用于验证 - 使用回调中的state或存储的state
            state: finalState, // 保持原始格式发送给服务器
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


            // 使用统一的API服务进行token交换
            const response = await this.post<SSOToken>(tokenEndpoint, tokenRequestData)



            return this.unifiedSaveLoginInfos(response) as any;
        } catch (error) {
            console.error('❌ 双重验证模式token交换失败:', error)

            // 清理敏感数据（即使失败也要清理）
            localStorage.removeItem('pkce_code_verifier')
            console.log("清理敏感数据 pkce_code_verifier error")

            throw error
        }
    }


    // 统一保存登录信息
    unifiedSaveLoginInfos = async (response: any) => {
        // 验证token响应
        const validationResult = await this.tokenManager.validateToken(response)
        if (!validationResult.is_valid) {
            throw new Error(formatAuthError(validationResult, '登录凭证无效，请重新登录'))
        }


        // 创建会话
        let session = null;
        if (response.session_info) {
            session = await this.sessionManager.createSession(response.session_info)
            // 将session_id设置到cookie中，用于后续会话保持和自动登录
            this.setSessionCookie(response.session_info.session_id, this.resolveAppId())
        }

        // 获取用户信息
        // const userInfo = await this.getUserInfo(response.access_token)

        const auth = {
            user: response.user,
            token: response,
            session: session
        }

        storage.saveAuth(auth as any);
        const tokenExpiresAt = response.expires_in
            ? Date.now() + response.expires_in * 1000
            : (typeof session?.expires_at === 'number' ? session.expires_at : Date.now() + 3600 * 1000)
        storage.saveSSOData({
            token: response,
            expires_at: tokenExpiresAt,
        })

        globalUserStore.syncFromStorage({ notify: false })

        console.log("清理敏感数据 pkce_code_verifier")
        // 清理敏感数据
        localStorage.removeItem('pkce_code_verifier')

        console.log('✅ 双重验证模式token交换成功:', {
            // user_id: userInfo.sub,
            token_type: response.token_type,
            expires_in: response.expires_in
        })

        window.dispatchEvent(new CustomEvent('auth:login', { detail: auth }))

        return auth;

    }
    /**
     * 获取用户信息
     */
    async getUserInfo(accessToken: string): Promise<SSOUser> {
        // 获取当前provider的配置
        const providerConfig = this.getCurrentProviderConfig()
        // const userInfoEndpoint = providerConfig?.user_info_url || this.config.userInfoEndpoint || 
        const userInfoEndpoint = `${this.config.ssoServerUrl}/api/v1/auth/oauth/userinfo`

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

            // 清除session cookies
            this.clearSessionCookies()

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


    // 登出
    async ssoLogout({
        id_token_hint,
        post_logout_redirect_uri,
        state,
    }: {
        id_token_hint: string
        post_logout_redirect_uri?: string
        state?: string
    }, requestType = 'href') {
        await this.tokenManager.clearTokens()
        await this.sessionManager.destroySession()
        storage.clearAuth()
        this.clearSessionCookies()

        const redirectUri =
            post_logout_redirect_uri ||
            this.config.redirectUri ||
            `${window.location.origin}${window.location.pathname}`

        if (requestType === 'href') {
            const querys = new URLSearchParams()
            querys.set('id_token_hint', id_token_hint)
            querys.set('post_logout_redirect_uri', redirectUri)
            if (state) {
                querys.set('state', state)
            }
            const uri = `${this.baseURL}/api/v1/auth/oauth/logout?${querys.toString()}`
            window.location.href = uri
            return
        }

        return this.post(`/api/v1/auth/oauth/logout`, {
            id_token_hint,
            post_logout_redirect_uri: redirectUri,
            ...(state ? { state } : {}),
        })
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
     * 支持后端的refresh_token轮换机制
     */
    async refreshToken(refreshToken?: string): Promise<SSORefreshTokenResponse> {

        try {
            // 步骤1: 获取refresh_token
            const token = refreshToken || this.tokenManager.getRefreshToken()

            if (!token) {
                throw new Error('No refresh token available')
            }

            console.log('🔄 开始刷新token...')

            // 步骤2: 构建请求参数
            const refreshRequest: any = {
                grant_type: 'refresh_token',
                refresh_token: token,
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                app_id: (this.config as any).appId || 'default' // 支持多应用场景，获取local_user_id
            }

            // 步骤3: 调用正确的token端点（与后端一致）
            const tokenEndpoint = this.resolveOAuthEndpoint('/api/v1/auth/oauth/token')
            console.log('📡 调用token端点:', tokenEndpoint)

            const response = await this.post<any>(tokenEndpoint, refreshRequest)

            console.log('✅ Token刷新成功:', {
                has_access_token: !!response.access_token,
                has_refresh_token: !!response.refresh_token,
                expires_in: response.expires_in,
                token_type: response.token_type
            })

            // 步骤4: 更新token到tokenManager（处理refresh_token轮换）
            await this.tokenManager.setToken(response as SSOToken)

            // 步骤5: 更新session信息（如果返回了）
            if (response.session_info) {
                console.log('📝 更新session信息')
                await this.sessionManager.createSession(response.session_info)

                // 更新session cookie
                this.setSessionCookie(response.session_info.session_id, (this.config as any).appId)
            }

            // 步骤6: 更新本地存储的认证信息
            const auth = storage.getAuth()
            if (auth) {
                auth.token = response as any
                // 如果返回了用户信息，也更新用户信息
                if (response.user) {
                    auth.user = response.user
                }
                storage.saveAuth(auth)
                console.log('💾 本地认证信息已更新')
            }

            // 步骤7: 更新SSO数据存储
            storage.saveSSOData({
                token: response as any,
                expires_at: Date.now() + (response.expires_in ?? 3600) * 1000,
            })

            // 步骤8: 触发token刷新事件，通知应用
            window.dispatchEvent(new CustomEvent('auth:token-refreshed', {
                detail: {
                    access_token: response.access_token,
                    refresh_token: response.refresh_token,
                    expires_in: response.expires_in,
                    user: response.user
                }
            }))

            console.log('🎉 Token刷新流程完成')

            return response as SSORefreshTokenResponse
        } catch (error: any) {
            console.error('❌ Token刷新失败:', error)

            // 正确获取错误响应数据
            // Axios错误结构: error.response.data 是后端返回的数据
            let errorResponse: TokenErrorResponse | null = null

            if (error.response && error.response.data) {
                // 后端返回了错误响应
                errorResponse = error.response.data as TokenErrorResponse
                console.log('📄 后端错误响应:', errorResponse)
            } else if (error.data) {
                // 某些情况下错误直接在 error.data 中
                errorResponse = error.data as TokenErrorResponse
            }

            // 如果有标准的错误响应，使用统一的错误处理器
            if (errorResponse && errorResponse.error_code) {
                console.log('🔍 检测到标准错误响应，执行智能处理:', {
                    error_code: errorResponse.error_code,
                    suggest_action: errorResponse.suggest_action
                })

                // 处理后端返回的标准错误
                const handled = await handleTokenError(errorResponse, {
                    onCheckSession: async () => {
                        // 尝试用 session_id 恢复
                        const { sessionId } = this.getSessionFromCookies()
                        if (!sessionId) {
                            console.log('⚠️ 未找到 session_id，无法恢复')
                            throw new Error('登录失效，请重新登录！No session_id found')
                        }
                        // 通过该方式可以触发beforeLogin事件，从而在beforeLogin事件中进行登录，走的登录流程，无跨域限制。
                        window.dispatchEvent(new Event('auth:re-authorize-session'))


                        console.log('🔄 尝试通过 session_id 恢复:', sessionId)
                        // 这个应该是中心登录系统去调用，而不是前端子应用去调用
                        // 通过该方式可直接获取到token，有跨域限制。
                        // const recovered = await this.recoverFromSession(sessionId)
                        // if (!recovered) {
                        //     throw new Error('登录失效，请重新登录！Session recovery failed')
                        // }

                        console.log('✅/ Session 恢复成功')
                        // 恢复成功，返回新的 token
                        // return recovered
                    },

                    onRelogin: () => {
                        // 完整登出并跳转
                        console.log('🚪 执行完整登出流程')
                        // this.handleCompleteLogout(errorResponse!.error_code || 'token_error')
                        throw new Error(errorResponse!.error_description || 'Please login again')
                    },

                    onShowError: (message, severity) => {
                        const t = severity || 'error';
                        console[t as 'error' | 'warn' | 'info' | 'debug'](`Token错误: ${message}`)
                    }
                })

                // 如果成功处理且有恢复的 token，返回它
                if (handled) {
                    console.log('✅ 错误已被成功处理，返回恢复的token')
                    return handled as SSORefreshTokenResponse
                }

            } else {
                // 非标准错误响应（网络错误、超时等）
                console.log('⚠️ 非标准错误响应，可能是网络问题:', {
                    has_response: !!error.response,
                    status: error.response?.status,
                    message: error.message
                })
            }

            // 抛出原始错误
            throw error
        }
    }

    /**
     * 通过session ID恢复登录
     */
    private async recoverFromSession(sessionId: string): Promise<any | null> {
        try {
            const appId = this.resolveAppId()
            console.log('🔄 尝试通过 session 恢复登录:', { sessionId, appId })

            const sessionCheck = await this.post<any>(
                `${this.config.ssoServerUrl}/api/v1/auth/oauth/session-check`,
                { session_id: sessionId, app_id: appId }
            )

            if (sessionCheck?.access_token) {
                console.log('✅ Session 有效，已获取 token')
                if (sessionCheck.session_info?.session_id) {
                    writeSsoSessionCookies(sessionCheck.session_info.session_id, appId)
                } else {
                    writeSsoSessionCookies(sessionId, appId)
                }
                await this.unifiedSaveLoginInfos(sessionCheck)
                return sessionCheck
            }

            if (sessionCheck?.is_authenticated === false) {
                clearSsoSessionCookies()
            }
            return null
        } catch (error) {
            console.error('❌ Session 恢复失败:', error)
            return null
        }
    }

    /**
     * 完整登出处理
     */
    private async handleCompleteLogout(reason: string): Promise<void> {
        console.log(`🚪 执行完整登出，原因: ${reason}`)


        window.dispatchEvent(new CustomEvent('auth:beforeLogout', {
            detail: { reason, message: 'Please login again' }
        }))
    }

    /**
     * 验证访问令牌
     */
    async validateAccessToken(token_info): Promise<SSOTokenValidationResult> {
        return await this.tokenManager.validateToken(token_info)
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
        // 优先检查session cookies进行自动登录
        // if (this.hasValidSessionCookie()) {
        //     console.log('检测到有效的session cookies，尝试自动登录...')
        //     try {
        //         await this.checkSessionCookies()
        //         // 如果自动登录成功，不需要继续处理
        //         return
        //     } catch (error) {
        //         console.warn('自动登录失败，继续正常流程:', error)
        //         // 清除无效的session cookies
        //         this.clearSessionCookies()
        //     }
        // }

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
