import { SSOConfig, SSOProviderConfig, SSODiscoveryDocument } from '../types'

/**
 * SSO配置管理器
 * 负责SSO配置的加载、验证和缓存
 */
export class SSOConfigManager {
    private static instance: SSOConfigManager
    private config: SSOConfig | null = null
    private providers: Map<string, SSOProviderConfig> = new Map()
    private discoveryDocument: SSODiscoveryDocument | null = null
    private configCache: Map<string, any> = new Map()

    private constructor() { }

    /**
     * 获取单例实例
     */
    static getInstance(): SSOConfigManager {
        if (!SSOConfigManager.instance) {
            SSOConfigManager.instance = new SSOConfigManager()
        }
        return SSOConfigManager.instance
    }

    /**
     * 加载SSO配置
     */
    async loadConfig(configUrl?: string): Promise<SSOConfig> {
        try {
            // 如果已有配置且未过期，直接返回
            if (this.config && !this.isConfigExpired()) {
                return this.config
            }

            // 从环境变量加载默认配置
            const defaultConfig = this.loadDefaultConfig()

            // 如果指定了配置URL，从URL加载
            if (configUrl) {
                const remoteConfig = await this.loadRemoteConfig(configUrl)
                this.config = { ...defaultConfig, ...remoteConfig }
            } else {
                this.config = defaultConfig
            }

            // 验证配置
            this.validateConfig(this.config)

            // 缓存配置
            this.cacheConfig('main', this.config)

            return this.config
        } catch (error) {
            console.error('Failed to load SSO config:', error)
            throw error
        }
    }

    /**
     * 加载默认配置
     */
    private loadDefaultConfig(): SSOConfig {
        return {
            ssoServerUrl: this.getEnvVar('VITE_SSO_SERVER_URL', 'https://sso.example.com'),
            clientId: this.getEnvVar('VITE_SSO_CLIENT_ID', ''),
            clientSecret: this.getEnvVar('VITE_SSO_CLIENT_SECRET', ''),
            redirectUri: this.getEnvVar('VITE_SSO_REDIRECT_URI', window.location.origin + '/auth/callback'),
            scope: this.getEnvVar('VITE_SSO_SCOPE', 'openid profile email').split(' '),
            responseType: this.getEnvVar('VITE_SSO_RESPONSE_TYPE', 'code') as 'code' | 'token' | 'id_token',
            grantType: this.getEnvVar('VITE_SSO_GRANT_TYPE', 'authorization_code') as 'authorization_code' | 'implicit' | 'client_credentials',
            sessionTimeout: parseInt(this.getEnvVar('VITE_SSO_SESSION_TIMEOUT', '3600')),
            autoRefresh: this.getEnvVar('VITE_SSO_AUTO_REFRESH', 'true') === 'true',
            storageType: this.getEnvVar('VITE_SSO_STORAGE_TYPE', 'localStorage') as 'localStorage' | 'sessionStorage',
            cookieDomain: this.getEnvVar('VITE_SSO_COOKIE_DOMAIN', ''),
            cookiePath: this.getEnvVar('VITE_SSO_COOKIE_PATH', '/'),
            cookieSecure: this.getEnvVar('VITE_SSO_COOKIE_SECURE', 'false') === 'true',
            cookieSameSite: this.getEnvVar('VITE_SSO_COOKIE_SAMESITE', 'lax') as 'strict' | 'lax' | 'none'
        }
    }

    /**
     * 从远程URL加载配置
     */
    private async loadRemoteConfig(configUrl: string): Promise<Partial<SSOConfig>> {
        try {
            const response = await fetch(configUrl)
            if (!response.ok) {
                throw new Error(`Failed to load config from ${configUrl}`)
            }

            const config = await response.json()
            return config
        } catch (error) {
            console.warn(`Failed to load remote config from ${configUrl}:`, error)
            return {}
        }
    }

    /**
     * 验证配置
     */
    private validateConfig(config: SSOConfig): void {
        if (!config.ssoServerUrl) {
            throw new Error('SSO server URL is required')
        }

        if (!config.clientId) {
            throw new Error('Client ID is required')
        }

        if (!config.redirectUri) {
            throw new Error('Redirect URI is required')
        }

        // 验证URL格式
        try {
            new URL(config.ssoServerUrl)
            new URL(config.redirectUri)
        } catch (error) {
            throw new Error('Invalid URL format in SSO configuration')
        }
    }

    /**
     * 检查配置是否过期
     */
    private isConfigExpired(): boolean {
        const cacheTime = this.getCachedConfig('main', 'timestamp')
        if (!cacheTime) return true

        const expiryTime = parseInt(this.getEnvVar('VITE_SSO_CONFIG_CACHE_TIME', '300000')) // 5分钟
        return Date.now() - cacheTime > expiryTime
    }

    /**
     * 缓存配置
     */
    private cacheConfig(key: string, data: any): void {
        this.configCache.set(key, {
            data,
            timestamp: Date.now()
        })
    }

    /**
     * 获取缓存的配置
     */
    private getCachedConfig(key: string, subKey?: string): any {
        const cached = this.configCache.get(key)
        if (!cached) return null

        return subKey ? cached[subKey] : cached.data
    }

    /**
     * 获取环境变量
     */
    private getEnvVar(key: string, defaultValue: string = ''): string {
        // 在浏览器环境中，从import.meta.env获取
        if (typeof window !== 'undefined' && (window as any).VITE_ENV) {
            return (window as any).VITE_ENV[key] || defaultValue
        }

        // 从import.meta.env获取（Vite环境）
        if ((import.meta as any).env) {
            return (import.meta as any).env[key] || defaultValue
        }

        // 从process.env获取（Node.js环境）
        if (typeof globalThis.process !== 'undefined' && globalThis.process.env) {
            return globalThis.process.env[key] || defaultValue
        }

        return defaultValue
    }

    /**
     * 加载SSO提供商配置
     */
    async loadProviderConfig(providerId: string): Promise<SSOProviderConfig | null> {
        try {
            // 检查缓存
            if (this.providers.has(providerId)) {
                return this.providers.get(providerId)!
            }

            // 从环境变量加载
            const config = this.loadProviderConfigFromEnv(providerId)
            if (config) {
                this.providers.set(providerId, config)
                return config
            }

            // 从远程加载
            const remoteConfig = await this.loadRemoteProviderConfig(providerId)
            if (remoteConfig) {
                this.providers.set(providerId, remoteConfig)
                return remoteConfig
            }

            return null
        } catch (error) {
            console.error(`Failed to load provider config for ${providerId}:`, error)
            return null
        }
    }

    /**
     * 从环境变量加载提供商配置
     */
    private loadProviderConfigFromEnv(providerId: string): SSOProviderConfig | null {
        const envPrefix = `VITE_SSO_PROVIDER_${providerId.toUpperCase()}_`

        const clientId = this.getEnvVar(`${envPrefix}CLIENT_ID`)
        if (!clientId) return null

        return {
            provider: providerId,
            client_id: clientId,
            client_secret: this.getEnvVar(`${envPrefix}CLIENT_SECRET`),
            authorization_url: this.getEnvVar(`${envPrefix}AUTHORIZATION_URL`, ''),
            token_url: this.getEnvVar(`${envPrefix}TOKEN_URL`),
            user_info_url: this.getEnvVar(`${envPrefix}USER_INFO_URL`),
            logout_url: this.getEnvVar(`${envPrefix}LOGOUT_URL`),
            scope: this.getEnvVar(`${envPrefix}SCOPE`, 'openid profile email').split(' '),
            response_type: this.getEnvVar(`${envPrefix}RESPONSE_TYPE`, 'code'),
            grant_type: this.getEnvVar(`${envPrefix}GRANT_TYPE`, 'authorization_code'),
            redirect_uri: this.getEnvVar(`${envPrefix}REDIRECT_URI`),
            enabled: this.getEnvVar(`${envPrefix}ENABLED`, 'true') === 'true',
            auto_discovery: this.getEnvVar(`${envPrefix}AUTO_DISCOVERY`, 'false') === 'true',
            issuer_url: this.getEnvVar(`${envPrefix}ISSUER_URL`),
            jwks_url: this.getEnvVar(`${envPrefix}JWKS_URL`)
        }
    }

    /**
     * 从远程加载提供商配置
     */
    private async loadRemoteProviderConfig(providerId: string): Promise<SSOProviderConfig | null> {
        try {
            const config = this.getConfig()
            const response = await fetch(`${config.ssoServerUrl}/api/v1/sso/providers/${providerId}`)

            if (!response.ok) {
                return null
            }

            return await response.json()
        } catch (error) {
            console.warn(`Failed to load remote provider config for ${providerId}:`, error)
            return null
        }
    }

    /**
     * 加载服务发现文档
     */
    async loadDiscoveryDocument(serverUrl?: string): Promise<SSODiscoveryDocument> {
        try {
            const url = serverUrl || this.config?.ssoServerUrl
            if (!url) {
                throw new Error('SSO server URL not configured')
            }

            // 检查缓存
            if (this.discoveryDocument && !this.isDiscoveryExpired()) {
                return this.discoveryDocument
            }

            const response = await fetch(`${url}/.well-known/openid_configuration`)

            if (!response.ok) {
                throw new Error(`Failed to load discovery document: ${response.status}`)
            }

            this.discoveryDocument = await response.json()
            this.cacheConfig('discovery', this.discoveryDocument)

            return this.discoveryDocument
        } catch (error) {
            console.error('Failed to load discovery document:', error)
            throw error
        }
    }

    /**
     * 检查发现文档是否过期
     */
    private isDiscoveryExpired(): boolean {
        const cacheTime = this.getCachedConfig('discovery', 'timestamp')
        if (!cacheTime) return true

        const expiryTime = parseInt(this.getEnvVar('VITE_SSO_DISCOVERY_CACHE_TIME', '86400000')) // 24小时
        return Date.now() - cacheTime > expiryTime
    }

    /**
     * 获取当前配置
     */
    getConfig(): SSOConfig {
        if (!this.config) {
            throw new Error('SSO configuration not loaded')
        }
        return this.config
    }

    /**
     * 更新配置
     */
    updateConfig(updates: Partial<SSOConfig>): void {
        if (!this.config) {
            throw new Error('SSO configuration not loaded')
        }

        this.config = { ...this.config, ...updates }
        this.cacheConfig('main', this.config)
    }

    /**
     * 重置配置
     */
    reset(): void {
        this.config = null
        this.providers.clear()
        this.discoveryDocument = null
        this.configCache.clear()
    }

    /**
     * 获取所有提供商配置
     */
    getProviders(): SSOProviderConfig[] {
        return Array.from(this.providers.values())
    }

    /**
     * 获取指定提供商配置
     */
    getProvider(providerId: string): SSOProviderConfig | null {
        return this.providers.get(providerId) || null
    }

    /**
     * 验证提供商配置
     */
    validateProviderConfig(providerId: string): boolean {
        const config = this.providers.get(providerId)
        if (!config) return false

        return !!(config.client_id && config.authorization_url)
    }

    /**
     * 创建配置模板
     */
    createConfigTemplate(): string {
        return JSON.stringify({
            ssoServerUrl: "https://sso.example.com",
            clientId: "your-client-id",
            clientSecret: "your-client-secret",
            redirectUri: window.location.origin + "/auth/callback",
            scope: ["openid", "profile", "email"],
            responseType: "code",
            grantType: "authorization_code",
            sessionTimeout: 3600,
            autoRefresh: true,
            storageType: "localStorage",
            cookieDomain: "",
            cookiePath: "/",
            cookieSecure: false,
            cookieSameSite: "lax"
        }, null, 2)
    }
}

// 导出单例实例
export const ssoConfigManager = SSOConfigManager.getInstance()
