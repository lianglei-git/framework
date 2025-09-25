import { SSOConfig, LogLevel } from '../types'

/**
 * SSO配置管理器
 * 负责配置的加载、验证、缓存和更新
 */
class SSOConfigManager {
    private config: SSOConfig
    private configCache: Map<string, any> = new Map()
    private listeners: Set<(config: SSOConfig) => void> = new Set()

    constructor(initialConfig: SSOConfig) {
        this.config = { ...initialConfig }
    }

    /**
     * 获取完整配置
     */
    getConfig(): SSOConfig {
        return { ...this.config }
    }

    /**
     * 更新配置
     */
    updateConfig(newConfig: Partial<SSOConfig>): void {
        const oldConfig = { ...this.config }
        this.config = { ...this.config, ...newConfig }

        // 验证配置
        this.validateConfig()

        // 缓存配置
        this.cacheConfig('main', this.config)

        // 触发配置更新事件
        this.notifyListeners()

        console.log('SSO配置已更新:', this.config)
    }

    /**
     * 获取配置项
     */
    get<K extends keyof SSOConfig>(key: K): SSOConfig[K] {
        return this.config[key]
    }

    /**
     * 设置配置项
     */
    set<K extends keyof SSOConfig>(key: K, value: SSOConfig[K]): void {
        this.config[key] = value
        this.validateConfig()
        this.cacheConfig('main', this.config)
        this.notifyListeners()
    }

    /**
     * 验证配置
     */
    private validateConfig(): void {
        const errors: string[] = []

        if (!this.config.ssoServerUrl) {
            errors.push('SSO服务器URL不能为空')
        }

        if (!this.config.clientId) {
            errors.push('客户端ID不能为空')
        }

        if (!this.config.redirectUri) {
            errors.push('重定向URI不能为空')
        }

        // 验证URL格式
        try {
            new URL(this.config.ssoServerUrl)
            new URL(this.config.redirectUri)
        } catch (error) {
            errors.push('无效的URL格式')
        }

        if (errors.length > 0) {
            throw new Error(`配置验证失败: ${errors.join(', ')}`)
        }
    }

    /**
     * 从环境变量加载配置
     */
    loadFromEnv(): void {
        const envConfig: Partial<SSOConfig> = {
            ssoServerUrl: process.env.VITE_SSO_SERVER_URL || process.env.SSO_SERVER_URL,
            clientId: process.env.VITE_SSO_CLIENT_ID || process.env.SSO_CLIENT_ID,
            clientSecret: process.env.VITE_SSO_CLIENT_SECRET || process.env.SSO_CLIENT_SECRET,
            redirectUri: process.env.VITE_SSO_REDIRECT_URI || process.env.SSO_REDIRECT_URI,
            scope: this.parseEnvList(process.env.VITE_SSO_SCOPE || process.env.SSO_SCOPE),
            responseType: process.env.VITE_SSO_RESPONSE_TYPE || process.env.SSO_RESPONSE_TYPE as any,
            grantType: process.env.VITE_SSO_GRANT_TYPE || process.env.SSO_GRANT_TYPE as any,
            sessionTimeout: this.parseEnvNumber(process.env.VITE_SSO_SESSION_TIMEOUT || process.env.SSO_SESSION_TIMEOUT),
            autoRefresh: this.parseEnvBoolean(process.env.VITE_SSO_AUTO_REFRESH || process.env.SSO_AUTO_REFRESH),
            storageType: process.env.VITE_SSO_STORAGE_TYPE || process.env.SSO_STORAGE_TYPE as any,
            debug: this.parseEnvBoolean(process.env.VITE_SSO_DEBUG || process.env.SSO_DEBUG)
        }

        this.updateConfig(envConfig)
    }

    /**
     * 从远程URL加载配置
     */
    async loadFromUrl(configUrl: string): Promise<void> {
        try {
            const response = await fetch(configUrl)
            if (!response.ok) {
                throw new Error(`加载配置失败: ${response.status}`)
            }

            const remoteConfig = await response.json()
            this.updateConfig(remoteConfig)
        } catch (error) {
            console.warn(`从URL加载配置失败: ${configUrl}`, error)
        }
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
    private getCachedConfig(key: string): any | null {
        const cached = this.configCache.get(key)
        if (!cached) return null

        // 检查是否过期（5分钟缓存）
        if (Date.now() - cached.timestamp > 5 * 60 * 1000) {
            this.configCache.delete(key)
            return null
        }

        return cached.data
    }

    /**
     * 解析环境变量中的列表
     */
    private parseEnvList(envValue: string | undefined): string[] {
        if (!envValue) return []
        return envValue.split(' ').filter(Boolean)
    }

    /**
     * 解析环境变量中的数字
     */
    private parseEnvNumber(envValue: string | undefined): number | undefined {
        if (!envValue) return undefined
        const parsed = parseInt(envValue, 10)
        return isNaN(parsed) ? undefined : parsed
    }

    /**
     * 解析环境变量中的布尔值
     */
    private parseEnvBoolean(envValue: string | undefined): boolean | undefined {
        if (!envValue) return undefined
        return envValue.toLowerCase() === 'true'
    }

    /**
     * 添加配置变更监听器
     */
    onConfigChange(listener: (config: SSOConfig) => void): () => void {
        this.listeners.add(listener)

        // 返回取消监听函数
        return () => {
            this.listeners.delete(listener)
        }
    }

    /**
     * 通知监听器
     */
    private notifyListeners(): void {
        this.listeners.forEach(listener => {
            try {
                listener(this.getConfig())
            } catch (error) {
                console.error('配置变更监听器执行失败:', error)
            }
        })
    }

    /**
     * 重置配置
     */
    reset(): void {
        this.config = {}
        this.configCache.clear()
        this.listeners.clear()
    }

    /**
     * 导出配置（用于调试）
     */
    exportConfig(): string {
        const exportableConfig = { ...this.config }
        // 移除敏感信息
        delete exportableConfig.clientSecret

        return JSON.stringify(exportableConfig, null, 2)
    }

    /**
     * 检查配置是否完整
     */
    isComplete(): boolean {
        return !!(
            this.config.ssoServerUrl &&
            this.config.clientId &&
            this.config.redirectUri
        )
    }

    /**
     * 获取配置摘要（用于日志）
     */
    getConfigSummary(): Record<string, any> {
        return {
            ssoServerUrl: this.config.ssoServerUrl,
            clientId: this.config.clientId,
            redirectUri: this.config.redirectUri,
            scope: this.config.scope,
            responseType: this.config.responseType,
            grantType: this.config.grantType,
            sessionTimeout: this.config.sessionTimeout,
            autoRefresh: this.config.autoRefresh,
            storageType: this.config.storageType,
            debug: this.config.debug,
            isComplete: this.isComplete()
        }
    }
}

export default SSOConfigManager
