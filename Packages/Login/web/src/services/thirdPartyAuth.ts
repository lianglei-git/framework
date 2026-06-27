/**
 * 第三方认证处理器
 * 负责处理GitHub、Google、微信等第三方登录流程
 */

import { SSOService, SSOLoginResponse } from './sso'
import { SSOProvider } from '../types'
import { formatAuthError } from '../utils/authError'

export interface ThirdPartyAuthResult {
    success: boolean
    user?: any
    token?: string
    error?: string
    provider: string
}

export class ThirdPartyAuthHandler {
    private ssoService: SSOService
    private authApiService: any

    constructor(ssoService: SSOService, authApiService: any) {
        this.ssoService = ssoService
        this.authApiService = authApiService
    }

    /**
     * 处理第三方登录
     */
    async handleThirdPartyLogin(providerId: string): Promise<ThirdPartyAuthResult> {
        console.log(`🔄 开始处理 ${providerId} 登录...`)

        try {
            // 检查是否是回调模式
            if (this.ssoService.isInCallbackMode()) {
                return await this.handleCallback(providerId)
            }

            // 构建授权URL并重定向
            const authUrl = this.ssoService.buildAuthorizationUrl(providerId, {
                redirect_uri: this.ssoService.getConfig().redirectUri,
                scope: this.getProviderScope(providerId),
                response_type: 'code'
            })

            console.log(`🔗 重定向到 ${providerId} 授权页面:`, authUrl)

            // 重定向到第三方授权页面
            window.location.href = authUrl

            return {
                success: false,
                provider: providerId,
                error: '正在重定向到授权页面...'
            }
        } catch (error: any) {
            console.error(`${providerId} 登录失败:`, error)
            return {
                success: false,
                provider: providerId,
                error: formatAuthError(error, '登录失败')
            }
        }
    }

    /**
     * 处理OAuth回调
     */
    async handleCallback(providerId: string): Promise<ThirdPartyAuthResult> {
        console.log(`🔄 处理 ${providerId} 回调...`)

        try {
            // 处理OAuth回调
            const callbackResult = await this.ssoService.handleCallback()

            if (callbackResult && callbackResult.user && callbackResult.token) {
                console.log(`✅ ${providerId} 登录成功:`, callbackResult.user.name)

                return {
                    success: true,
                    user: callbackResult.user,
                    token: callbackResult.token.access_token,
                    provider: providerId
                }
            } else {
                throw new Error('回调响应格式错误')
            }
        } catch (error: any) {
            console.error(`${providerId} 回调处理失败:`, error)
            return {
                success: false,
                provider: providerId,
                error: formatAuthError(error, '回调处理失败')
            }
        }
    }

    /**
     * 获取provider特定的权限范围
     */
    private getProviderScope(providerId: string): string[] {
        const scopeMap: Record<string, string[]> = {
            github: ['user:email', 'read:user'],
            google: ['openid', 'profile', 'email'],
            wechat: ['snsapi_login']
        }

        return scopeMap[providerId] || ['openid', 'profile', 'email']
    }

    /**
     * 验证provider配置
     */
    validateProvider(providerId: string): boolean {
        const provider = this.ssoService.getProvider(providerId)

        if (!provider) {
            console.error(`Provider ${providerId} 不存在`)
            return false
        }

        if (!provider.enabled) {
            console.error(`Provider ${providerId} 已禁用`)
            return false
        }

        if (!provider.config?.client_id) {
            console.error(`Provider ${providerId} 缺少client_id配置`)
            return false
        }

        return true
    }

    /**
     * 检查是否支持第三方登录
     */
    isThirdPartyLoginSupported(providerId: string): boolean {
        const supportedProviders = ['github', 'google', 'wechat', 'qq', 'weibo']
        return supportedProviders.includes(providerId)
    }

    /**
     * 获取provider的显示信息
     */
    getProviderDisplayInfo(providerId: string): { name: string, icon: string, color: string } | null {
        const providerInfo: Record<string, { name: string, icon: string, color: string }> = {
            github: { name: 'GitHub', icon: '🐙', color: '#333' },
            google: { name: 'Google', icon: '🔍', color: '#4285f4' },
            wechat: { name: '微信', icon: '💬', color: '#07c160' },
            qq: { name: 'QQ', icon: '🐧', color: '#12b7f5' },
            weibo: { name: '微博', icon: '🐦', color: '#e6162d' }
        }

        return providerInfo[providerId] || null
    }

    /**
     * 获取所有可用的第三方登录providers
     */
    getAvailableThirdPartyProviders(): SSOProvider[] {
        const providers = this.ssoService.getProviders()
        return providers.filter(provider =>
            this.isThirdPartyLoginSupported(provider.id) &&
            provider.enabled
        )
    }
}

/**
 * 创建第三方认证处理器
 */
export function createThirdPartyAuthHandler(ssoService: SSOService, authApiService: any): ThirdPartyAuthHandler {
    return new ThirdPartyAuthHandler(ssoService, authApiService)
}

/**
 * 第三方登录状态管理
 */
export class ThirdPartyAuthState {
    private static readonly STORAGE_KEY = 'third_party_auth_state'

    static saveState(providerId: string, state: any): void {
        const authStates = this.getAllStates()
        authStates[providerId] = {
            ...state,
            timestamp: Date.now()
        }
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(authStates))
    }

    static getState(providerId: string): any | null {
        const authStates = this.getAllStates()
        const state = authStates[providerId]

        if (!state) {
            return null
        }

        // 检查状态是否过期（10分钟）
        const isExpired = Date.now() - state.timestamp > 10 * 60 * 1000
        if (isExpired) {
            this.removeState(providerId)
            return null
        }

        return state
    }

    static removeState(providerId: string): void {
        const authStates = this.getAllStates()
        delete authStates[providerId]
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(authStates))
    }

    static clearAllStates(): void {
        localStorage.removeItem(this.STORAGE_KEY)
    }

    private static getAllStates(): Record<string, any> {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY)
            return stored ? JSON.parse(stored) : {}
        } catch (error) {
            console.error('解析第三方认证状态失败:', error)
            return {}
        }
    }
}
