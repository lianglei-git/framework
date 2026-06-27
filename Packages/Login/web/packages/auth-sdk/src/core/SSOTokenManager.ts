import {
    SSOToken,
    SSOTokenValidationResult,
    SSOConfig,
    EventEmitter
} from '../types'
import { StorageUtils } from '../utils/storage'
import { NetworkUtils } from '../utils/network'

/**
 * SSO令牌管理器
 * 负责令牌的存储、验证、刷新和生命周期管理
 */
class SSOTokenManager extends EventEmitter {
    private config: SSOConfig
    private storage: StorageUtils
    private network: NetworkUtils
    private refreshTimer: NodeJS.Timeout | null = null

    constructor(config: SSOConfig) {
        super()
        this.config = config
        this.storage = new StorageUtils(config.storageType || 'localStorage')
        this.network = new NetworkUtils()
    }

    /**
     * 初始化令牌管理器
     */
    async initialize(): Promise<void> {
        // 检查现有令牌
        const existingToken = this.getAccessToken()
        if (existingToken) {
            // 验证现有令牌
            const validationResult = await this.validateToken({
                access_token: existingToken,
                token_type: 'Bearer'
            })

            if (!validationResult.is_valid) {
                // 清除无效令牌
                await this.clearTokens()
                this.emit('token:invalid', validationResult)
            } else {
                // 设置自动刷新
                this.scheduleTokenRefresh(validationResult.token!)
                this.emit('token:restored', validationResult.token)
            }
        }
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

        // 存储令牌
        await this.storage.set('sso_token', tokenData)

        // 设置自动刷新
        this.scheduleTokenRefresh(token)

        this.emit('token:stored', token)
    }

    /**
     * 获取访问令牌
     */
    getAccessToken(): string | null {
        const tokenData = this.storage.get('sso_token')
        if (!tokenData) return null

        // 检查令牌是否过期
        if (Date.now() >= tokenData.expires_at) {
            this.clearTokens()
            this.emit('token:expired', tokenData)
            return null
        }

        return tokenData.access_token
    }

    /**
     * 获取刷新令牌
     */
    getRefreshToken(): string | null {
        const tokenData = this.storage.get('sso_token')
        return tokenData?.refresh_token || null
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
                    error_description: '访问令牌不存在'
                }
            }

            if (!token.token_type) {
                return {
                    is_valid: false,
                    error: 'invalid_token',
                    error_description: '令牌类型不存在'
                }
            }

            // 检查过期时间
            if (token.expires_in && Date.now() >= Date.now() + (token.expires_in * 1000)) {
                return {
                    is_valid: false,
                    error: 'token_expired',
                    error_description: '令牌已过期'
                }
            }

            // TODO: 调用令牌内省端点进行服务端验证
            // const introspectionResult = await this.introspectToken(token.access_token)

            // 暂时跳过服务端验证
            return {
                is_valid: true,
                token: token
            }
        } catch (error) {
            return {
                is_valid: false,
                error: 'validation_error',
                error_description: error instanceof Error ? error.message : '令牌验证失败'
            }
        }
    }

    /**
     * 令牌内省
     */
    private async introspectToken(accessToken: string): Promise<any> {
        if (!this.config.ssoServerUrl) {
            throw new Error('SSO服务器URL未配置')
        }

        const response = await this.network.post(
            `${this.config.ssoServerUrl}/oauth/introspect`,
            {
                token: accessToken,
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret
            },
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        )

        return response
    }

    /**
     * 刷新令牌
     */
    async refreshToken(): Promise<SSOToken | null> {
        const refreshToken = this.getRefreshToken()
        if (!refreshToken) {
            throw new Error('没有可用的刷新令牌')
        }

        try {
            const response = await this.network.post(
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

            if (response.error) {
                throw new Error(response.error_description || response.error)
            }

            await this.setToken(response)
            this.emit('token:refreshed', response)

            return response
        } catch (error) {
            this.emit('token:refresh_error', error)
            throw error
        }
    }

    /**
     * 安排令牌刷新
     */
    private scheduleTokenRefresh(token: SSOToken): void {
        if (!this.config.autoRefresh) {
            return
        }

        // 清除现有定时器
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer)
        }

        // 计算刷新时间（令牌过期前5分钟）
        const refreshTime = Math.max(
            0,
            token.expires_in - 300
        ) * 1000

        this.refreshTimer = setTimeout(async () => {
            try {
                await this.refreshToken()
            } catch (error) {
                console.error('自动刷新令牌失败:', error)
            }
        }, refreshTime)
    }

    /**
     * 清除令牌
     */
    async clearTokens(): Promise<void> {
        await this.storage.remove('sso_token')

        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer)
            this.refreshTimer = null
        }

        this.emit('token:cleared')
    }

    /**
     * 撤销令牌
     */
    async revokeToken(token?: string): Promise<void> {
        const tokenToRevoke = token || this.getAccessToken()

        if (!tokenToRevoke) {
            return
        }

        try {
            // 调用撤销端点
            if (this.config.ssoServerUrl) {
                await this.network.post(
                    `${this.config.ssoServerUrl}/oauth/revoke`,
                    {
                        token: tokenToRevoke,
                        client_id: this.config.clientId,
                        client_secret: this.config.clientSecret
                    },
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    }
                )
            }

            await this.clearTokens()
            this.emit('token:revoked', tokenToRevoke)
        } catch (error) {
            console.error('撤销令牌失败:', error)
            throw error
        }
    }

    /**
     * 检查令牌是否需要刷新
     */
    shouldRefresh(): boolean {
        const tokenData = this.storage.get('sso_token')
        if (!tokenData) return false

        // 如果令牌将在5分钟内过期，认为需要刷新
        const fiveMinutes = 5 * 60 * 1000
        return Date.now() >= (tokenData.expires_at - fiveMinutes)
    }

    /**
     * 获取令牌信息
     */
    getTokenInfo(): SSOToken | null {
        const tokenData = this.storage.get('sso_token')
        return tokenData ? {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            token_type: tokenData.token_type,
            expires_in: Math.max(0, tokenData.expires_at - Date.now()),
            scope: tokenData.scope,
            state: tokenData.state
        } : null
    }

    /**
     * 监听存储变化
     */
    private watchStorage(): void {
        // 监听其他标签页的令牌变化
        window.addEventListener('storage', (event) => {
            if (event.key === 'sso_token' && event.newValue === null) {
                // 令牌被清除
                this.emit('token:cleared')
            }
        })
    }

    /**
     * 销毁管理器
     */
    destroy(): void {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer)
            this.refreshTimer = null
        }

        this.removeAllListeners()
    }
}

export default SSOTokenManager
