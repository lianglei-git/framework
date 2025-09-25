/**
 * SSOA子项目SSO配置
 * 用于集成Sparrow SSO系统
 */

export interface SSOConfig {
    // 服务器配置
    ssoServerUrl: string
    clientId: string
    clientSecret: string
    redirectUri: string

    // OAuth2配置
    scope?: string[]
    responseType?: 'code' | 'token' | 'id_token'
    grantType?: 'authorization_code' | 'implicit' | 'password' | 'client_credentials' | 'refresh_token'

    // 会话配置
    sessionTimeout?: number
    autoRefresh?: boolean
    rememberMe?: boolean

    // 存储配置
    storageType?: 'localStorage' | 'sessionStorage' | 'memory'
    cookieDomain?: string
    cookiePath?: string
    cookieSecure?: boolean
    cookieSameSite?: 'strict' | 'lax' | 'none'

    // 安全配置
    enableLogging?: boolean
    debug?: boolean
    allowInsecure?: boolean

    // 网络配置
    timeout?: number
    retries?: number

    // UI配置
    language?: string
    theme?: 'light' | 'dark' | 'auto'
}

/**
 * 默认SSO配置
 */
export const defaultSSOConfig: SSOConfig = {
    // 从环境变量获取配置，如果没有则使用默认值
    // 指向Login-v1项目作为SSO登录中心
    ssoServerUrl: 'http://localhost:3033',
    clientId: import.meta.env.VITE_SSO_CLIENT_ID || 'ssoa-client',
    clientSecret: import.meta.env.VITE_SSO_CLIENT_SECRET || 'ssoa-secret',
    redirectUri: import.meta.env.VITE_SSO_REDIRECT_URI || 'http://localhost:5173/auth/callback',

    // OAuth2配置
    scope: (import.meta.env.VITE_SSO_SCOPE || 'openid profile email').split(' '),
    responseType: 'code',
    grantType: 'authorization_code',

    // 会话配置
    sessionTimeout: parseInt(import.meta.env.VITE_SSO_SESSION_TIMEOUT || '3600'),
    autoRefresh: import.meta.env.VITE_SSO_AUTO_REFRESH !== 'false',
    rememberMe: import.meta.env.VITE_SSO_REMEMBER_ME !== 'false',

    // 存储配置
    storageType: (import.meta.env.VITE_SSO_STORAGE_TYPE || 'localStorage') as 'localStorage' | 'sessionStorage' | 'memory',
    cookieDomain: '',
    cookiePath: '/',
    cookieSecure: false,
    cookieSameSite: 'lax',

    // 开发配置
    enableLogging: import.meta.env.DEV,
    debug: import.meta.env.DEV,
    allowInsecure: import.meta.env.DEV,

    // 网络配置
    timeout: 10000,
    retries: 3,

    // UI配置
    language: 'zh-CN',
    theme: 'light'
}

/**
 * 验证SSO配置
 */
export function validateSSOConfig(config: SSOConfig): string[] {
    const errors: string[] = []

    // 验证必填字段
    if (!config.ssoServerUrl) {
        errors.push('SSO服务器URL不能为空')
    }

    if (!config.clientId) {
        errors.push('客户端ID不能为空')
    }

    if (!config.redirectUri) {
        errors.push('重定向URI不能为空')
    }

    // 验证URL格式
    try {
        new URL(config.ssoServerUrl)
        new URL(config.redirectUri)
    } catch {
        errors.push('无效的URL格式')
    }

    return errors
}

/**
 * 创建SSO配置实例
 */
export function createSSOConfig(overrides: Partial<SSOConfig> = {}): SSOConfig {
    const config = { ...defaultSSOConfig, ...overrides }

    if (import.meta.env.DEV) {
        const errors = validateSSOConfig(config)
        if (errors.length > 0) {
            console.warn('SSO配置验证失败:', errors)
        } else {
            console.log('SSO配置验证通过')
        }
    }

    return config
}

// 导出默认配置
export default defaultSSOConfig
