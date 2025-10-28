/**
 * SSOA子项目SSO服务
 * 处理与SSO服务器的通信和认证逻辑
 */

import { SSOConfig } from '../config/sso'

// 类型定义
export interface SSOToken {
    access_token: string
    refresh_token?: string
    id_token?: string
    token_type: string
    expires_in: number
    scope?: string[]
    state?: string
    issued_at?: number
    expires_at?: number
}

export interface SSOUser {
    sub: string
    name?: string
    given_name?: string
    family_name?: string
    middle_name?: string
    nickname?: string
    preferred_username?: string
    profile?: string
    picture?: string
    website?: string
    email?: string
    email_verified?: boolean
    gender?: string
    birthdate?: string
    zoneinfo?: string
    locale?: string
    phone_number?: string
    phone_number_verified?: boolean
    address?: Record<string, any>
    updated_at?: number
    custom_claims?: Record<string, any>
}

export interface SSOSession {
    session_id: string
    user_id: string
    client_id: string
    authenticated_at: number
    expires_at: number
    last_activity: number
    ip_address?: string
    user_agent?: string
    location?: string
    device_fingerprint?: string
    is_active: boolean
    remember_me: boolean
}

export interface SSOLoginResponse {
    success: boolean
    user?: SSOUser
    token?: SSOToken
    session?: SSOSession
    error?: string
}

export interface SSOError {
    error: string
    error_description?: string
    error_uri?: string
}

/**
 * SSO服务类
 */
export class SSOService {
    private config: SSOConfig
    private baseURL: string

    constructor(config: SSOConfig) {
        this.config = config
        this.baseURL = config.ssoServerUrl
    }

    /**
     * 构建授权URL
     */
    buildAuthorizationUrl(provider: string = 'local'): string {
        const params = new URLSearchParams({
            client_id: "8c1dd65d-7d2a-4ba4-aff1-610960a295e7",
            app_id: "temp1",
            redirect_uri: "http://localhost:5173",
            response_type: this.config.responseType || 'code',
            scope: (this.config.scope || []).join(' '),
            state: this.generateState(),
            provider
        })

        // 添加PKCE参数（如果支持）
        if (this.config.grantType === 'authorization_code') {
            const codeChallenge = this.generateCodeChallenge()
            const codeVerifier = this.generateCodeVerifier()
            params.set('code_challenge', codeChallenge)
            params.set('code_challenge_method', 'S256')

            // 存储code_verifier用于后续使用
            sessionStorage.setItem('sso_code_verifier', codeVerifier)
        }
        debugger

        return `${this.baseURL}/oauth/authorize?${params.toString()}`
    }

    /**
     * 处理OAuth回调
     */
    async handleCallback(): Promise<SSOLoginResponse> {
        try {
            const urlParams = new URLSearchParams(window.location.search)
            const code = urlParams.get('code')
            const state = urlParams.get('state')
            const error = urlParams.get('error')
            const errorDescription = urlParams.get('error_description')

            // 检查错误
            if (error) {
                throw new Error(errorDescription || error)
            }

            // 检查授权码
            if (!code) {
                throw new Error('Authorization code not found')
            }

            // 验证state参数（防止CSRF攻击）
            const storedState = sessionStorage.getItem('sso_state')
            if (storedState && state !== storedState) {
                throw new Error('Invalid state parameter')
            }

            // 交换访问令牌
            const tokenResponse = await this.exchangeToken(code)

            if (!tokenResponse.success || !tokenResponse.token) {
                throw new Error(tokenResponse.error || 'Token exchange failed')
            }

            // 获取用户信息
            const userInfo = await this.getUserInfo(tokenResponse.token.access_token)

            // 清理临时数据
            this.cleanup()

            return {
                success: true,
                user: userInfo.user,
                token: tokenResponse.token,
                session: userInfo.session
            }
        } catch (error: any) {
            console.error('SSO callback error:', error)
            return {
                success: false,
                error: error.message || 'Authentication failed'
            }
        }
    }

    /**
     * 交换访问令牌 - 调用unit-auth的令牌端点
     */
    private async exchangeToken(code: string): Promise<SSOLoginResponse> {
        try {
            const response = await fetch(`${this.baseURL}/oauth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    grant_type: 'authorization_code',
                    code,
                    client_id: this.config.clientId,
                    client_secret: this.config.clientSecret,
                    redirect_uri: this.config.redirectUri,
                    code_verifier: sessionStorage.getItem('sso_code_verifier') || undefined
                })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error_description || errorData.error || 'Token exchange failed')
            }

            const tokenData = await response.json()

            // 计算令牌过期时间
            const now = Math.floor(Date.now() / 1000)
            const token: SSOToken = {
                ...tokenData,
                issued_at: now,
                expires_at: now + (tokenData.expires_in || 3600)
            }

            return {
                success: true,
                token
            }
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Token exchange failed'
            }
        }
    }

    /**
     * 获取用户信息 - 调用unit-auth的用户信息端点
     */
    private async getUserInfo(accessToken: string): Promise<{ user: SSOUser; session?: SSOSession }> {
        const response = await fetch(`${this.baseURL}/oauth/userinfo`, {
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
            user: userData,
            session: userData.session
        }
    }

    /**
     * 刷新访问令牌 - 调用unit-auth的刷新端点
     */
    async refreshToken(refreshToken: string): Promise<SSOLoginResponse> {
        try {
            const response = await fetch(`${this.baseURL}/oauth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                    client_id: this.config.clientId,
                    client_secret: this.config.clientSecret
                })
            })

            if (!response.ok) {
                throw new Error('Token refresh failed')
            }

            const tokenData = await response.json()

            // 计算令牌过期时间
            const now = Math.floor(Date.now() / 1000)
            const token: SSOToken = {
                ...tokenData,
                issued_at: now,
                expires_at: now + (tokenData.expires_in || 3600)
            }

            return {
                success: true,
                token
            }
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Token refresh failed'
            }
        }
    }

    /**
     * 登出 - 调用unit-auth的登出端点
     */
    async logout(): Promise<void> {
        try {
            // 清理本地存储
            this.cleanup()

            // 调用unit-auth的登出端点
            await fetch(`${this.baseURL}/oauth/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_id: this.config.clientId,
                    logout_uri: window.location.origin
                })
            })
        } catch (error) {
            console.warn('SSO logout warning:', error)
        }
    }

    /**
     * 生成随机状态参数
     */
    private generateState(): string {
        const array = new Uint8Array(32)
        crypto.getRandomValues(array)
        const state = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')

        // 存储state用于验证
        sessionStorage.setItem('sso_state', state)

        return state
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

    /**
     * 清理临时数据
     */
    private cleanup(): void {
        sessionStorage.removeItem('sso_state')
        sessionStorage.removeItem('sso_code_verifier')
    }

    /**
     * 检查是否在回调模式
     */
    isInCallbackMode(): boolean {
        return window.location.search.includes('code=') || window.location.search.includes('error=')
    }

    /**
     * 获取存储的认证状态
     */
    getStoredAuthState(): { user: SSOUser; token: SSOToken; session: SSOSession } | null {
        try {
            const userData = localStorage.getItem(`${this.config.storageType === 'localStorage' ? 'ssoa_' : 'ssoa_session_'}user`)
            const tokenData = localStorage.getItem(`${this.config.storageType === 'localStorage' ? 'ssoa_' : 'ssoa_session_'}token`)
            const sessionData = localStorage.getItem(`${this.config.storageType === 'localStorage' ? 'ssoa_' : 'ssoa_session_'}session`)

            if (userData && tokenData && sessionData) {
                return {
                    user: JSON.parse(userData),
                    token: JSON.parse(tokenData),
                    session: JSON.parse(sessionData)
                }
            }
        } catch (error) {
            console.warn('Failed to get stored auth state:', error)
        }

        return null
    }

    /**
     * 存储认证状态
     */
    storeAuthState(user: SSOUser, token: SSOToken, session: SSOSession): void {
        try {
            const storage = this.config.storageType === 'localStorage' ? localStorage : sessionStorage
            const prefix = this.config.storageType === 'localStorage' ? 'ssoa_' : 'ssoa_session_'

            storage.setItem(`${prefix}user`, JSON.stringify(user))
            storage.setItem(`${prefix}token`, JSON.stringify(token))
            storage.setItem(`${prefix}session`, JSON.stringify(session))
        } catch (error) {
            console.warn('Failed to store auth state:', error)
        }
    }

    /**
     * 清除认证状态
     */
    clearAuthState(): void {
        try {
            const storage = this.config.storageType === 'localStorage' ? localStorage : sessionStorage
            const prefix = this.config.storageType === 'localStorage' ? 'ssoa_' : 'ssoa_session_'

            storage.removeItem(`${prefix}user`)
            storage.removeItem(`${prefix}token`)
            storage.removeItem(`${prefix}session`)
        } catch (error) {
            console.warn('Failed to clear auth state:', error)
        }
    }
}
