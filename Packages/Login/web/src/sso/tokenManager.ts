import { SSOConfig, SSOToken, SSOTokenValidationResult } from '../types'
import { storageManager } from '../utils/storage'

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
