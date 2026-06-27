import {
    SSOConfig,
    SSOToken,
    SSOTokenValidationResult,
    SSOUser,
    EventEmitter
} from '../types'
import { StorageUtils } from '../utils/storage'
import { NetworkUtils } from '../utils/network'

/**
 * SSO安全管理器
 * 负责安全相关的功能，包括令牌验证、CSRF保护、PKCE等
 */
class SSOSecurityManager extends EventEmitter {
    private config: SSOConfig
    private storage: StorageUtils
    private network: NetworkUtils
    private csrfTokens: Map<string, string> = new Map()
    private tokenBlacklist: Set<string> = new Set()

    constructor(config: SSOConfig) {
        super()
        this.config = config
        this.storage = new StorageUtils(config.storageType || 'localStorage')
        this.network = new NetworkUtils()
    }

    /**
     * 初始化安全管理器
     */
    async initialize(): Promise<void> {
        // 加载黑名单令牌
        await this.loadBlacklistedTokens()

        // 生成初始CSRF令牌
        this.generateCSRFToken('default')

        console.log('SSO安全管理器初始化完成')
    }

    /**
     * 验证访问令牌
     */
    async validateAccessToken(token: string): Promise<SSOTokenValidationResult> {
        try {
            // 检查黑名单
            if (this.tokenBlacklist.has(token)) {
                return {
                    is_valid: false,
                    error: 'token_revoked',
                    error_description: '令牌已被撤销'
                }
            }

            // 基本格式验证
            const tokenParts = token.split('.')
            if (tokenParts.length !== 3) {
                return {
                    is_valid: false,
                    error: 'invalid_token_format',
                    error_description: '令牌格式不正确'
                }
            }

            // 解码令牌
            const payload = this.decodeJWTPayload(token)

            // 验证过期时间
            if (this.isTokenExpired(payload)) {
                return {
                    is_valid: false,
                    error: 'token_expired',
                    error_description: '令牌已过期'
                }
            }

            // 验证发行者
            if (!this.validateIssuer(payload.iss)) {
                return {
                    is_valid: false,
                    error: 'invalid_issuer',
                    error_description: '令牌发行者无效'
                }
            }

            // 验证受众
            if (!this.validateAudience(payload.aud)) {
                return {
                    is_valid: false,
                    error: 'invalid_audience',
                    error_description: '令牌受众无效'
                }
            }

            // 构造令牌对象
            const ssoToken: SSOToken = {
                access_token: token,
                token_type: payload.token_type || 'Bearer',
                expires_in: Math.max(0, payload.exp - Math.floor(Date.now() / 1000)),
                scope: Array.isArray(payload.scope) ? payload.scope : payload.scope?.split(' '),
                state: payload.state
            }

            return {
                is_valid: true,
                token: ssoToken,
                user: this.extractUserFromPayload(payload)
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
     * 解码JWT负载
     */
    private decodeJWTPayload(token: string): any {
        try {
            const payload = token.split('.')[1]
            return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
        } catch (error) {
            throw new Error('无效的JWT令牌格式')
        }
    }

    /**
     * 验证令牌是否过期
     */
    private isTokenExpired(payload: any): boolean {
        if (!payload.exp) return false
        return Math.floor(Date.now() / 1000) >= payload.exp
    }

    /**
     * 验证发行者
     */
    private validateIssuer(issuer: string): boolean {
        if (!this.config.ssoServerUrl) return true
        return issuer === this.config.ssoServerUrl
    }

    /**
     * 验证受众
     */
    private validateAudience(audience: string | string[]): boolean {
        if (!this.config.clientId) return true

        if (Array.isArray(audience)) {
            return audience.includes(this.config.clientId)
        }

        return audience === this.config.clientId
    }

    /**
     * 从JWT负载中提取用户信息
     */
    private extractUserFromPayload(payload: any): SSOUser {
        return {
            sub: payload.sub,
            name: payload.name,
            given_name: payload.given_name,
            family_name: payload.family_name,
            middle_name: payload.middle_name,
            nickname: payload.nickname,
            preferred_username: payload.preferred_username,
            profile: payload.profile,
            picture: payload.picture,
            website: payload.website,
            email: payload.email,
            email_verified: payload.email_verified,
            gender: payload.gender,
            birthdate: payload.birthdate,
            zoneinfo: payload.zoneinfo,
            locale: payload.locale,
            phone_number: payload.phone_number,
            phone_number_verified: payload.phone_number_verified,
            address: payload.address,
            updated_at: payload.updated_at,
            custom_claims: payload.custom_claims || {}
        }
    }

    /**
     * 生成CSRF令牌
     */
    generateCSRFToken(name: string = 'default'): string {
        const token = this.generateRandomString(32)
        this.csrfTokens.set(name, token)
        return token
    }

    /**
     * 验证CSRF令牌
     */
    validateCSRFToken(token: string, name: string = 'default'): boolean {
        const storedToken = this.csrfTokens.get(name)
        if (!storedToken) return false

        const isValid = token === storedToken && token.length > 0
        if (!isValid) {
            this.emit('security:csrf_failed', { token, name })
        }

        return isValid
    }

    /**
     * 清除CSRF令牌
     */
    clearCSRFToken(name: string = 'default'): void {
        this.csrfTokens.delete(name)
    }

    /**
     * 生成PKCE码挑战
     */
    generatePKCEChallenge(): { codeVerifier: string, codeChallenge: string } {
        const codeVerifier = this.generateRandomString(128)
        const codeChallenge = this.generateCodeChallenge(codeVerifier)
        return { codeVerifier, codeChallenge }
    }

    /**
     * 验证PKCE码挑战
     */
    verifyPKCEChallenge(codeVerifier: string, codeChallenge: string): boolean {
        const expectedChallenge = this.generateCodeChallenge(codeVerifier)
        return expectedChallenge === codeChallenge
    }

    /**
     * 生成码挑战
     */
    private generateCodeChallenge(codeVerifier: string): string {
        const encoder = new TextEncoder()
        const data = encoder.encode(codeVerifier)

        return crypto.subtle.digest('SHA-256', data)
            .then(digest => {
                const hashArray = Array.from(new Uint8Array(digest))
                return btoa(String.fromCharCode.apply(null, hashArray))
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=/g, '')
            })
    }

    /**
     * 撤销令牌
     */
    async revokeToken(token: string): Promise<void> {
        try {
            // 添加到黑名单
            this.tokenBlacklist.add(token)

            // 保存黑名单
            await this.saveBlacklistedTokens()

            // 通知服务端
            if (this.config.ssoServerUrl) {
                await this.network.post(
                    `${this.config.ssoServerUrl}/oauth/revoke`,
                    {
                        token: token,
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

            this.emit('security:token_revoked', token)
        } catch (error) {
            console.error('撤销令牌失败:', error)
            throw error
        }
    }

    /**
     * 检测可疑活动
     */
    detectSuspiciousActivity(context: {
        token?: string
        ip?: string
        userAgent?: string
        timestamp?: number
    }): boolean {
        // 检查令牌使用频率
        // 检查IP变化
        // 检查User-Agent变化
        // 检查地理位置变化

        // 暂时不实现复杂检测
        return false
    }

    /**
     * 加密敏感数据
     */
    encryptSensitiveData(data: string, key?: string): string {
        try {
            const cryptoKey = key || this.generateEncryptionKey()
            const encrypted = CryptoJS.AES.encrypt(data, cryptoKey).toString()
            return encrypted
        } catch (error) {
            console.error('加密失败:', error)
            return data
        }
    }

    /**
     * 解密敏感数据
     */
    decryptSensitiveData(encryptedData: string, key?: string): string {
        try {
            const cryptoKey = key || this.generateEncryptionKey()
            const decrypted = CryptoJS.AES.decrypt(encryptedData, cryptoKey).toString(CryptoJS.enc.Utf8)
            return decrypted
        } catch (error) {
            console.error('解密失败:', error)
            throw new Error('解密失败')
        }
    }

    /**
     * 生成加密密钥
     */
    private generateEncryptionKey(): string {
        return this.generateRandomString(32)
    }

    /**
     * 哈希密码
     */
    async hashPassword(password: string, salt?: string): Promise<string> {
        const crypto = window.crypto || (window as any).msCrypto
        if (!crypto?.subtle) {
            throw new Error('Web Crypto API不可用')
        }

        const encoder = new TextEncoder()
        const passwordBuffer = encoder.encode(password)
        const saltBuffer = encoder.encode(salt || this.generateSalt())

        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        )

        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: saltBuffer,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        )

        const exportedKey = await crypto.subtle.exportKey('raw', key)
        return this.arrayBufferToBase64(exportedKey)
    }

    /**
     * 生成盐值
     */
    private generateSalt(): string {
        const array = new Uint8Array(16)
        crypto.getRandomValues(array)
        return this.arrayBufferToBase64(array)
    }

    /**
     * ArrayBuffer转Base64
     */
    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = ''
        const bytes = new Uint8Array(buffer)
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i])
        }
        return btoa(binary)
    }

    /**
     * 加载黑名单令牌
     */
    private async loadBlacklistedTokens(): Promise<void> {
        try {
            const blacklisted = this.storage.get('sso_blacklisted_tokens')
            if (blacklisted && Array.isArray(blacklisted)) {
                this.tokenBlacklist = new Set(blacklisted)
            }
        } catch (error) {
            console.warn('加载黑名单令牌失败:', error)
        }
    }

    /**
     * 保存黑名单令牌
     */
    private async saveBlacklistedTokens(): Promise<void> {
        try {
            const tokens = Array.from(this.tokenBlacklist)
            await this.storage.set('sso_blacklisted_tokens', tokens)
        } catch (error) {
            console.error('保存黑名单令牌失败:', error)
        }
    }

    /**
     * 记录安全事件
     */
    logSecurityEvent(event: string, details: any): void {
        const securityEvent = {
            timestamp: new Date().toISOString(),
            event,
            details,
            userAgent: navigator.userAgent,
            url: window.location.href,
            ip: this.getClientIP()
        }

        console.warn('安全事件:', securityEvent)
        this.emit('security:event', securityEvent)
    }

    /**
     * 获取客户端IP
     */
    private getClientIP(): string {
        // 这里应该调用获取IP的API
        return 'unknown'
    }

    /**
     * 生成随机字符串
     */
    private generateRandomString(length: number = 32): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        let result = ''
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return result
    }

    /**
     * 清理过期数据
     */
    cleanup(): void {
        // 清理过期的CSRF令牌
        this.csrfTokens.clear()

        // 清理过期的黑名单令牌
        // 这里可以添加清理逻辑

        this.emit('security:cleanup')
    }

    /**
     * 销毁管理器
     */
    destroy(): void {
        this.csrfTokens.clear()
        this.tokenBlacklist.clear()
        this.removeAllListeners()
    }
}

export default SSOSecurityManager
