/**
 * SSO SDK类型定义
 */

// 基础配置接口
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

// 令牌接口
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

// 用户接口
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

// 会话接口
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

// 提供商接口
export interface SSOProvider {
    id: string
    name: string
    displayName: string
    icon?: string
    authorizationUrl: string
    enabled: boolean
    config?: Record<string, any>
}

// 登录请求接口
export interface SSOLoginRequest {
    username?: string
    password?: string
    provider?: string
    code?: string
    state?: string
    redirect_uri?: string
    remember_me?: boolean
    login_type?: 'sso' | 'local' | 'oauth'
}

// 登录响应接口
export interface SSOLoginResponse {
    user: SSOUser
    token: SSOToken
    session: SSOSession
    redirect_url?: string
}

// 令牌验证结果接口
export interface SSOTokenValidationResult {
    is_valid: boolean
    token?: SSOToken
    user?: SSOUser
    error?: string
    error_description?: string
}

// SSO错误接口
export interface SSOError {
    error: string
    error_description?: string
    error_uri?: string
    state?: string
}

// 事件监听器类型
export type SSOEventListener = (data: any) => void

// 事件类型枚举
export enum SSOEventType {
    INITIALIZED = 'initialized',
    LOGIN_SUCCESS = 'login:success',
    LOGIN_ERROR = 'login:error',
    LOGOUT_SUCCESS = 'logout:success',
    LOGOUT_ERROR = 'logout:error',
    TOKEN_EXPIRED = 'token:expired',
    TOKEN_REFRESHED = 'token:refreshed',
    TOKEN_REFRESH_ERROR = 'token:refresh:error',
    SESSION_RESTORED = 'session:restored',
    SESSION_EXPIRED = 'session:expired',
    SESSION_INVALID = 'session:invalid',
    SESSION_ERROR = 'session:error',
    SECURITY_EVENT = 'security:event',
    CONFIG_UPDATED = 'config:updated',
    DESTROYED = 'destroyed'
}

// 网络请求配置接口
export interface RequestConfig {
    timeout?: number
    retries?: number
    headers?: Record<string, string>
    withCredentials?: boolean
}

// 存储数据接口
export interface StorageData {
    token?: SSOToken
    session?: SSOSession
    user?: SSOUser
    config?: Partial<SSOConfig>
}

// 框架集成配置接口
export interface FrameworkConfig {
    framework: 'react' | 'vue' | 'angular' | 'vanilla'
    version?: string
    options?: Record<string, any>
}

// React Hooks类型
export interface UseSSOOptions {
    autoInit?: boolean
    onSuccess?: (response: SSOLoginResponse) => void
    onError?: (error: Error) => void
    redirectOnSuccess?: string
    redirectOnError?: string
}

export interface UseSSOReturn {
    // 状态
    isInitialized: boolean
    isAuthenticated: boolean
    isLoading: boolean
    user: SSOUser | null
    error: string | null

    // 方法
    login: (request: SSOLoginRequest) => Promise<SSOLoginResponse>
    logout: () => Promise<void>
    getAuthorizationUrl: (provider: string, options?: any) => string
    refreshToken: () => Promise<SSOToken | null>

    // 工具方法
    clearError: () => void
    updateConfig: (config: Partial<SSOConfig>) => void
}

// Vue Composition API类型
export interface UseSSOComposable {
    // 状态
    isInitialized: Ref<boolean>
    isAuthenticated: ComputedRef<boolean>
    isLoading: Ref<boolean>
    user: Ref<SSOUser | null>
    error: Ref<string | null>

    // 方法
    login: (request: SSOLoginRequest) => Promise<SSOLoginResponse>
    logout: () => Promise<void>
    getAuthorizationUrl: (provider: string, options?: any) => string
    refreshToken: () => Promise<SSOToken | null>

    // 工具方法
    clearError: () => void
    updateConfig: (config: Partial<SSOConfig>) => void
}

// Angular服务类型
export interface SSOServiveInterface {
    // 状态
    isInitialized$: Observable<boolean>
    isAuthenticated$: Observable<boolean>
    isLoading$: Observable<boolean>
    user$: Observable<SSOUser | null>
    error$: Observable<string | null>

    // 方法
    login(request: SSOLoginRequest): Observable<SSOLoginResponse>
    logout(): Observable<void>
    getAuthorizationUrl(provider: string, options?: any): string
    refreshToken(): Observable<SSOToken | null>

    // 工具方法
    clearError(): void
    updateConfig(config: Partial<SSOConfig>): void
}

// 工具函数类型
export interface SSOUtils {
    // 格式化用户显示名称
    formatUserDisplayName(user: SSOUser | null): string

    // 检查权限
    hasPermission(user: SSOUser | null, permission: string): boolean

    // 获取登录URL
    getLoginUrl(returnUrl?: string): string

    // 获取登出URL
    getLogoutUrl(): string

    // 生成随机字符串
    generateRandomString(length?: number): string

    // 验证邮箱格式
    isValidEmail(email: string): boolean

    // 验证手机号格式
    isValidPhone(phone: string): boolean

    // 加密数据
    encrypt(data: string, key?: string): string

    // 解密数据
    decrypt(encryptedData: string, key?: string): string
}

// 插件接口
export interface SSOLugin {
    name: string
    version: string
    install(sdk: SSOSDK, options?: any): void
    uninstall(sdk: SSOSDK): void
}

// 中间件接口
export interface SSOMiddleware {
    name: string
    priority?: number
    beforeRequest?: (config: RequestConfig) => RequestConfig
    afterRequest?: (response: any) => any
    onError?: (error: Error) => void
}

// 拦截器接口
export interface SSOInterceptor {
    request?: (config: RequestConfig) => RequestConfig
    response?: (response: any) => any
    error?: (error: Error) => void
}

// 日志级别枚举
export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    NONE = 'none'
}

// 日志配置接口
export interface LogConfig {
    level: LogLevel
    enabled: boolean
    showTimestamp?: boolean
    showLevel?: boolean
    formatter?: (level: LogLevel, message: string, data?: any) => string
}

// 缓存配置接口
export interface CacheConfig {
    enabled: boolean
    ttl?: number
    maxSize?: number
    storageType?: 'memory' | 'localStorage' | 'sessionStorage'
}

// 监控配置接口
export interface MonitorConfig {
    enabled: boolean
    endpoint?: string
    interval?: number
    metrics?: string[]
}

// 导出默认配置
export const DEFAULT_SSO_CONFIG: SSOConfig = {
    ssoServerUrl: '',
    clientId: '',
    clientSecret: '',
    redirectUri: window.location.origin + '/sso/callback',
    scope: ['openid', 'profile', 'email'],
    responseType: 'code',
    grantType: 'authorization_code',
    sessionTimeout: 3600,
    autoRefresh: true,
    storageType: 'localStorage',
    enableLogging: true,
    debug: false
}

// 导出错误类
export class SSOError extends Error {
    public error: string
    public error_description?: string
    public error_uri?: string
    public state?: string

    constructor(error: string | SSOError, description?: string) {
        if (typeof error === 'string') {
            super(description || error)
            this.error = error
            this.error_description = description
        } else {
            super(error.error_description || error.error)
            this.error = error.error
            this.error_description = error.error_description
            this.error_uri = error.error_uri
            this.state = error.state
        }

        this.name = 'SSOError'
    }
}
