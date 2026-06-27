/**
 * SSO服务器服务
 * 为子项目提供SSO认证服务
 * 作为Sparrow SSO系统的认证服务器
 */

import {
    SSOToken,
    SSOUser,
    SSOSession,
    SSOLoginRequest,
    SSOLoginResponse,
    SSOTokenValidationResult
} from '../types'
import axios from 'axios'
import { storageManager } from '../utils/storage'

// 后端API基础URL
const backendBaseURL = import.meta.env.DEV ? "http://localhost:8080" : "https://sparrowui.cn/translate"

/**
 * SSO服务器服务类
 * 提供SSO认证服务给子项目
 */
export class SSOServerService {
    private clientId: string
    private clientSecret: string

    constructor(clientId: string, clientSecret: string) {
        this.clientId = clientId
        this.clientSecret = clientSecret
    }

    /**
     * 验证客户端凭据
     */
    private validateClientCredentials(clientId: string, clientSecret: string): boolean {
        // 简单的客户端验证 - 生产环境应该有更安全的验证机制
        return clientId === this.clientId && clientSecret === this.clientSecret
    }

    /**
     * 令牌端点 - 处理授权码交换令牌
     */
    async token(request: {
        grant_type: string
        code?: string
        refresh_token?: string
        client_id: string
        client_secret: string
        redirect_uri: string
        code_verifier?: string
    }): Promise<{ access_token: string; refresh_token?: string; expires_in: number; token_type: string }> {
        // 验证客户端凭据
        if (!this.validateClientCredentials(request.client_id, request.client_secret)) {
            throw new Error('Invalid client credentials')
        }

        try {
            switch (request.grant_type) {
                case 'authorization_code':
                    return await this.handleAuthorizationCodeGrant(request)
                case 'refresh_token':
                    return await this.handleRefreshTokenGrant(request)
                default:
                    throw new Error('Unsupported grant type')
            }
        } catch (error: any) {
            console.error('Token endpoint error:', error)
            throw new Error(error.message || 'Token exchange failed')
        }
    }

    /**
     * 处理授权码授权
     */
    private async handleAuthorizationCodeGrant(request: any): Promise<any> {
        if (!request.code) {
            throw new Error('Authorization code is required')
        }

        // 调用后端API获取令牌
        const response = await fetch(`${backendBaseURL}/oauth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                code: request.code,
                client_id: this.clientId,
                client_secret: this.clientSecret,
                redirect_uri: request.redirect_uri,
                code_verifier: request.code_verifier
            })
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error_description || errorData.error || 'Token exchange failed')
        }

        const tokenData = await response.json()

        return {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_in: tokenData.expires_in || 3600,
            token_type: tokenData.token_type || 'Bearer'
        }
    }

    /**
     * 处理刷新令牌授权
     */
    private async handleRefreshTokenGrant(request: any): Promise<any> {
        if (!request.refresh_token) {
            throw new Error('Refresh token is required')
        }

        // 调用后端API刷新令牌
        const response = await fetch(`${backendBaseURL}/oauth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                grant_type: 'refresh_token',
                refresh_token: request.refresh_token,
                client_id: this.clientId,
                client_secret: this.clientSecret
            })
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error_description || errorData.error || 'Token refresh failed')
        }

        const tokenData = await response.json()

        return {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_in: tokenData.expires_in || 3600,
            token_type: tokenData.token_type || 'Bearer'
        }
    }

    /**
     * 用户信息端点
     */
    async userinfo(accessToken: string): Promise<{ sub: string; name?: string; email?: string }> {
        try {
            // 验证访问令牌
            const validation = await this.validateToken(accessToken)
            if (!validation.valid) {
                throw new Error('Invalid access token')
            }

            // 从后端获取用户信息
            const response = await fetch(`${backendBaseURL}/oauth/userinfo`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            })

            if (!response.ok) {
                throw new Error('Failed to fetch user info')
            }

            const userData = await response.json()

            return {
                sub: userData.id || userData.sub,
                name: userData.name || userData.username,
                email: userData.email
            }
        } catch (error: any) {
            console.error('Userinfo endpoint error:', error)
            throw new Error(error.message || 'Failed to fetch user info')
        }
    }

    /**
     * 登出端点
     */
    async logout(request: {
        client_id: string
        logout_uri?: string
    }): Promise<{ logout_url?: string }> {
        try {
            // 验证客户端凭据
            if (!this.validateClientCredentials(request.client_id, this.clientSecret)) {
                throw new Error('Invalid client credentials')
            }

            // 清理本地存储的认证状态
            storageManager.clear('sso_user')
            storageManager.clear('sso_token')
            storageManager.clear('sso_session')

            // 如果提供了logout_uri，重定向到该地址
            if (request.logout_uri) {
                return {
                    logout_url: request.logout_uri
                }
            }

            return {}
        } catch (error: any) {
            console.error('Logout endpoint error:', error)
            throw new Error(error.message || 'Logout failed')
        }
    }

    /**
     * 验证访问令牌
     */
    private async validateToken(accessToken: string): Promise<SSOTokenValidationResult> {
        try {
            // 调用后端API验证令牌
            const response = await fetch(`${backendBaseURL}/oauth/introspect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    token: accessToken,
                    token_type_hint: 'access_token'
                })
            })

            if (!response.ok) {
                return { valid: false }
            }

            const data = await response.json()
            return {
                valid: data.active === true,
                user: data.sub,
                client_id: data.client_id,
                scope: data.scope,
                expires_at: data.exp
            }
        } catch (error) {
            console.error('Token validation error:', error)
            return { valid: false }
        }
    }

    /**
     * 构建登录URL
     */
    buildLoginUrl(clientId: string, redirectUri: string, provider: string = 'local'): string {
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'openid profile email',
            state: this.generateState(),
            provider
        })

        // 添加PKCE参数
        const codeChallenge = this.generateCodeChallenge()
        const codeVerifier = this.generateCodeVerifier()
        params.set('code_challenge', codeChallenge)
        params.set('code_challenge_method', 'S256')

        // 存储code_verifier和state
        sessionStorage.setItem(`sso_code_verifier_${clientId}`, codeVerifier)
        sessionStorage.setItem(`sso_state_${clientId}`, params.get('state')!)

        return `${window.location.origin}/auth?${params.toString()}`
    }

    /**
     * 生成状态参数
     */
    private generateState(): string {
        const array = new Uint8Array(32)
        crypto.getRandomValues(array)
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
    }

    /**
     * 生成代码验证器 (PKCE)
     */
    private generateCodeVerifier(): string {
        const array = new Uint8Array(32)
        crypto.getRandomValues(array)
        return btoa(String.fromCharCode.apply(null, Array.from(array)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '')
    }

    /**
     * 生成代码挑战 (PKCE)
     */
    private generateCodeChallenge(): string {
        const codeVerifier = this.generateCodeVerifier()
        return btoa(codeVerifier)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '')
    }
}

// 创建默认的SSO服务器实例
const defaultSSOServer = new SSOServerService(
    import.meta.env.VITE_SSO_CLIENT_ID || 'login-v1',
    import.meta.env.VITE_SSO_CLIENT_SECRET || 'login-v1-secret'
)

export default defaultSSOServer
