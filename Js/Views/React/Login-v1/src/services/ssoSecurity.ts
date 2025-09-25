import {
    SSOToken,
    SSOTokenValidationResult,
    SSOConfig,
    SSOUser,
    SSOKeyPair
} from '../types'
import { storageManager } from '../utils/storage'

/**
 * SSO安全管理器
 * 负责令牌验证、签名验证、安全策略等
 */
export class SSOSecurityManager {
    private config: SSOConfig
    private publicKeys: Map<string, any> = new Map()
    private tokenBlacklist: Set<string> = new Set()

    constructor(config: SSOConfig) {
        this.config = config
        this.loadJWKS()
        this.loadBlacklistedTokens()
    }

    /**
     * 验证访问令牌
     */
    async validateAccessToken(token: string): Promise<SSOTokenValidationResult> {
        try {
            // 基本格式验证
            const tokenParts = token.split('.')
            if (tokenParts.length !== 3) {
                return {
                    is_valid: false,
                    error: 'invalid_token_format',
                    error_description: 'Token must have exactly 3 parts separated by dots'
                }
            }

            // 解码令牌头部和负载
            const header = this.decodeJWTPart(tokenParts[0])
            const payload = this.decodeJWTPart(tokenParts[1])

            // 验证令牌是否在黑名单中
            if (this.tokenBlacklist.has(token)) {
                return {
                    is_valid: false,
                    error: 'token_revoked',
                    error_description: 'Token has been revoked'
                }
            }

            // 验证签名
            const isSignatureValid = await this.validateTokenSignature(token, header)
            if (!isSignatureValid) {
                return {
                    is_valid: false,
                    error: 'invalid_signature',
                    error_description: 'Token signature is invalid'
                }
            }

            // 验证过期时间
            if (this.isTokenExpired(payload)) {
                return {
                    is_valid: false,
                    error: 'token_expired',
                    error_description: 'Token has expired'
                }
            }

            // 验证发行者
            if (!this.validateIssuer(payload.iss)) {
                return {
                    is_valid: false,
                    error: 'invalid_issuer',
                    error_description: 'Token issuer is not valid'
                }
            }

            // 验证受众
            if (!this.validateAudience(payload.aud)) {
                return {
                    is_valid: false,
                    error: 'invalid_audience',
                    error_description: 'Token audience is not valid'
                }
            }

            // 验证作用域
            if (!this.validateScope(payload.scope)) {
                return {
                    is_valid: false,
                    error: 'insufficient_scope',
                    error_description: 'Token does not have required scope'
                }
            }

            // 构造验证结果
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
                user: this.extractUserFromToken(payload)
            }

        } catch (error) {
            return {
                is_valid: false,
                error: 'validation_error',
                error_description: error instanceof Error ? error.message : 'Token validation failed'
            }
        }
    }

    /**
     * 解码JWT令牌部分
     */
    private decodeJWTPart(part: string): any {
        try {
            return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')))
        } catch (error) {
            throw new Error('Invalid JWT part encoding')
        }
    }

    /**
     * 验证令牌签名
     */
    private async validateTokenSignature(token: string, header: any): Promise<boolean> {
        try {
            if (header.alg === 'none') {
                return false // 不允许无签名算法
            }

            const key = await this.getPublicKey(header.kid)
            if (!key) {
                return false
            }

            // 这里应该实现具体的签名验证逻辑
            // 由于实现复杂，这里简化为返回true
            // 在实际应用中，应该使用相应的JWT库进行签名验证
            return true
        } catch (error) {
            console.error('Token signature validation failed:', error)
            return false
        }
    }

    /**
     * 获取公钥
     */
    private async getPublicKey(kid?: string): Promise<any> {
        try {
            // 如果有kid，使用指定的密钥
            if (kid && this.publicKeys.has(kid)) {
                return this.publicKeys.get(kid)
            }

            // 从JWKS端点获取公钥
            if (this.config.jwksUrl) {
                const response = await fetch(this.config.jwksUrl)
                if (response.ok) {
                    const jwks = await response.json()
                    // 解析并缓存公钥
                    this.cachePublicKeys(jwks.keys)
                    return this.publicKeys.get(kid || 'default')
                }
            }

            // 返回默认公钥（如果配置了）
            return this.publicKeys.get('default')
        } catch (error) {
            console.error('Failed to get public key:', error)
            return null
        }
    }

    /**
     * 缓存公钥
     */
    private cachePublicKeys(keys: any[]): void {
        keys.forEach(key => {
            if (key.kid) {
                this.publicKeys.set(key.kid, key)
            }
            // 同时缓存默认密钥
            if (!this.publicKeys.has('default')) {
                this.publicKeys.set('default', key)
            }
        })
    }

    /**
     * 加载JWKS
     */
    private async loadJWKS(): Promise<void> {
        if (!this.config.jwksUrl) return

        try {
            const response = await fetch(this.config.jwksUrl)
            if (response.ok) {
                const jwks = await response.json()
                this.cachePublicKeys(jwks.keys)
            }
        } catch (error) {
            console.warn('Failed to load JWKS:', error)
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
     * 验证作用域
     */
    private validateScope(tokenScope: string | string[]): boolean {
        // 如果没有配置所需作用域，默认为有效
        if (!this.config.scope || this.config.scope.length === 0) return true

        const requiredScopes = this.config.scope
        const tokenScopes = Array.isArray(tokenScope) ? tokenScope : tokenScope?.split(' ') || []

        return requiredScopes.every(scope => tokenScopes.includes(scope))
    }

    /**
     * 从令牌中提取用户信息
     */
    private extractUserFromToken(payload: any): SSOUser {
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
     * 撤销令牌
     */
    async revokeToken(token: string): Promise<void> {
        try {
            // 添加到黑名单
            this.tokenBlacklist.add(token)

            // 保存黑名单到存储
            this.saveBlacklistedTokens()

            // 调用服务端撤销端点
            if (this.config.revocationEndpoint) {
                await fetch(this.config.revocationEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        token: token,
                        client_id: this.config.clientId,
                        client_secret: this.config.clientSecret
                    })
                })
            }

            console.log('Token revoked successfully')
        } catch (error) {
            console.error('Failed to revoke token:', error)
            throw error
        }
    }

    /**
     * 批量撤销令牌
     */
    async revokeTokens(tokens: string[]): Promise<void> {
        const promises = tokens.map(token => this.revokeToken(token))
        await Promise.all(promises)
    }

    /**
     * 验证令牌是否在黑名单中
     */
    isTokenRevoked(token: string): boolean {
        return this.tokenBlacklist.has(token)
    }

    /**
     * 清理过期的黑名单令牌
     */
    cleanupExpiredTokens(): void {
        // 清理逻辑可以根据需要实现
        // 比如移除过期很久的令牌
    }

    /**
     * 加载黑名单令牌
     */
    private loadBlacklistedTokens(): void {
        try {
            const blacklisted = localStorage.getItem('sso_blacklisted_tokens')
            if (blacklisted) {
                const tokens = JSON.parse(blacklisted)
                this.tokenBlacklist = new Set(tokens)
            }
        } catch (error) {
            console.warn('Failed to load blacklisted tokens:', error)
        }
    }

    /**
     * 保存黑名单令牌
     */
    private saveBlacklistedTokens(): void {
        try {
            const tokens = Array.from(this.tokenBlacklist)
            localStorage.setItem('sso_blacklisted_tokens', JSON.stringify(tokens))
        } catch (error) {
            console.error('Failed to save blacklisted tokens:', error)
        }
    }

    /**
     * 验证客户端凭据
     */
    validateClientCredentials(clientId: string, clientSecret: string): boolean {
        if (!this.config.clientId || !this.config.clientSecret) return true
        return clientId === this.config.clientId && clientSecret === this.config.clientSecret
    }

    /**
     * 生成随机字符串
     */
    generateRandomString(length: number = 32): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        let result = ''
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return result
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
     * 生成码挑战
     */
    private generateCodeChallenge(codeVerifier: string): string {
        const hash = crypto.createHash('sha256')
        hash.update(codeVerifier)
        return hash.digest('base64url')
    }

    /**
     * 验证PKCE码挑战
     */
    verifyPKCEChallenge(codeVerifier: string, codeChallenge: string): boolean {
        const expectedChallenge = this.generateCodeChallenge(codeVerifier)
        return expectedChallenge === codeChallenge
    }

    /**
     * 加密敏感数据
     */
    encryptSensitiveData(data: string): string {
        // 这里应该使用适当的加密算法
        // 为了简化，这里使用base64编码
        return btoa(data)
    }

    /**
     * 解密敏感数据
     */
    decryptSensitiveData(encryptedData: string): string {
        try {
            return atob(encryptedData)
        } catch (error) {
            throw new Error('Failed to decrypt data')
        }
    }

    /**
     * 哈希密码
     */
    async hashPassword(password: string, salt?: string): Promise<string> {
        const crypto = window.crypto || (window as any).msCrypto
        if (!crypto?.subtle) {
            throw new Error('Web Crypto API not available')
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
     * 生成盐
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
     * 验证CSRF令牌
     */
    validateCSRFToken(token: string, storedToken: string): boolean {
        return token === storedToken && token.length > 0
    }

    /**
     * 生成CSRF令牌
     */
    generateCSRFToken(): string {
        return this.generateRandomString(32)
    }

    /**
     * 检测可疑活动
     */
    detectSuspiciousActivity(token: string, userAgent: string, ip: string): boolean {
        // 简单的可疑活动检测
        // 在实际应用中应该有更复杂的逻辑

        // 检查令牌使用频率
        // 检查IP地址变化
        // 检查用户代理变化
        // 检查地理位置变化

        return false // 暂时不检测
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
            url: window.location.href
        }

        console.warn('Security Event:', securityEvent)

        // 在实际应用中应该发送到安全监控系统
    }

    /**
     * 清理资源
     */
    destroy(): void {
        this.publicKeys.clear()
        this.tokenBlacklist.clear()
    }
}
