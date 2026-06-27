/**
 * 子应用分层管理器
 * 根据Appid识别和配置不同的子应用
 */

export interface SubAppConfig {
    id: string
    name: string
    displayName: string
    description?: string
    ssoServerUrl: string
    clientId: string
    clientSecret?: string
    redirectUri: string
    scope: string[]
    responseType: 'code' | 'token' | 'id_token'
    providers: string[]
    branding?: {
        logo?: string
        primaryColor?: string
        companyName?: string
    }
    features?: {
        enableLocalAuth?: boolean
        enableSocialAuth?: boolean
        enableRememberMe?: boolean
        enableAutoLogin?: boolean
    }
}

class AppLayerManager {
    private static instance: AppLayerManager
    private subApps: Map<string, SubAppConfig> = new Map()
    private currentAppId: string = 'default'

    constructor() {
        this.initializeDefaultApps()
    }

    static getInstance(): AppLayerManager {
        if (!AppLayerManager.instance) {
            AppLayerManager.instance = new AppLayerManager()
        }
        return AppLayerManager.instance
    }

    /**
     * 初始化默认的子应用配置
     */
    private initializeDefaultApps(): void {
        // 默认应用配置
        const defaultApp: SubAppConfig = {
            id: 'default',
            name: 'default',
            displayName: '默认应用',
            ssoServerUrl: import.meta.env.VITE_SSO_SERVER_URL || 'http://localhost:8080',
            clientId: import.meta.env.VITE_SSO_CLIENT_ID || 'default-client',
            clientSecret: import.meta.env.VITE_SSO_CLIENT_SECRET || '',
            redirectUri: import.meta.env.VITE_SSO_REDIRECT_URI || `${window.location.origin}/auth/callback`,
            scope: ['openid', 'profile', 'email'],
            responseType: 'code',
            providers: ['local', 'github', 'google'],
            branding: {
                companyName: '中心认证系统'
            },
            features: {
                enableLocalAuth: true,
                enableSocialAuth: true,
                enableRememberMe: true,
                enableAutoLogin: false
            }
        }

        // 用户管理应用
        const userManagementApp: SubAppConfig = {
            id: 'user-management',
            name: 'user-management',
            displayName: '用户管理系统',
            ssoServerUrl: import.meta.env.VITE_SSO_SERVER_URL || 'http://localhost:8080',
            clientId: import.meta.env.VITE_SSO_CLIENT_ID_USER_MGMT || 'user-mgmt-client',
            redirectUri: `${window.location.origin}/user-mgmt/auth/callback`,
            scope: ['openid', 'profile', 'email', 'admin'],
            responseType: 'code',
            providers: ['local', 'github'],
            branding: {
                primaryColor: '#1890ff',
                companyName: '用户管理中心'
            },
            features: {
                enableLocalAuth: true,
                enableSocialAuth: true,
                enableRememberMe: true,
                enableAutoLogin: false
            }
        }

        // 订单管理系统
        const orderManagementApp: SubAppConfig = {
            id: 'order-management',
            name: 'order-management',
            displayName: '订单管理系统',
            ssoServerUrl: import.meta.env.VITE_SSO_SERVER_URL || 'http://localhost:8080',
            clientId: import.meta.env.VITE_SSO_CLIENT_ID_ORDER_MGMT || 'order-mgmt-client',
            redirectUri: `${window.location.origin}/order-mgmt/auth/callback`,
            scope: ['openid', 'profile', 'email'],
            responseType: 'code',
            providers: ['local', 'github', 'wechat'],
            branding: {
                primaryColor: '#52c41a',
                companyName: '订单管理中心'
            },
            features: {
                enableLocalAuth: true,
                enableSocialAuth: true,
                enableRememberMe: true,
                enableAutoLogin: false
            }
        }

        // 分析仪表板
        const analyticsApp: SubAppConfig = {
            id: 'analytics-dashboard',
            name: 'analytics-dashboard',
            displayName: '分析仪表板',
            ssoServerUrl: import.meta.env.VITE_SSO_SERVER_URL || 'http://localhost:8080',
            clientId: import.meta.env.VITE_SSO_CLIENT_ID_ANALYTICS || 'analytics-client',
            redirectUri: `${window.location.origin}/analytics/auth/callback`,
            scope: ['openid', 'profile', 'email', 'analytics'],
            responseType: 'code',
            providers: ['local', 'google'],
            branding: {
                primaryColor: '#722ed1',
                companyName: '数据分析中心'
            },
            features: {
                enableLocalAuth: true,
                enableSocialAuth: true,
                enableRememberMe: true,
                enableAutoLogin: true
            }
        }

        this.subApps.set('default', defaultApp)
        this.subApps.set('user-management', userManagementApp)
        this.subApps.set('order-management', orderManagementApp)
        this.subApps.set('analytics-dashboard', analyticsApp)
    }

    /**
     * 根据Appid获取子应用配置
     */
    getAppConfig(appId: string = 'default'): SubAppConfig | null {
        return this.subApps.get(appId) || this.subApps.get('default') || null
    }

    /**
     * 设置当前应用ID
     */
    setCurrentAppId(appId: string): void {
        this.currentAppId = appId
        console.log(`切换到子应用: ${appId}`)
    }

    /**
     * 获取当前应用ID
     */
    getCurrentAppId(): string {
        return this.currentAppId
    }

    /**
     * 从URL参数中提取Appid
     */
    extractAppIdFromURL(): string {
        const urlParams = new URLSearchParams(window.location.search)
        const appId = urlParams.get('appid') || urlParams.get('app_id') || 'default'

        // 如果URL中有appid，自动切换到该应用
        if (appId !== this.currentAppId) {
            this.setCurrentAppId(appId)
        }

        return appId
    }

    /**
     * 注册新的子应用
     */
    registerApp(appId: string, config: SubAppConfig): void {
        this.subApps.set(appId, config)
        console.log(`注册新子应用: ${appId}`)
    }

    /**
     * 获取所有子应用列表
     */
    getAllApps(): SubAppConfig[] {
        return Array.from(this.subApps.values())
    }

    /**
     * 获取当前应用的可用providers
     */
    getAvailableProviders(appId?: string): string[] {
        const appConfig = this.getAppConfig(appId || this.currentAppId)
        return appConfig?.providers || ['local']
    }

    /**
     * 检查子应用是否启用某个功能
     */
    isFeatureEnabled(feature: keyof NonNullable<SubAppConfig['features']>, appId?: string): boolean {
        const appConfig = this.getAppConfig(appId || this.currentAppId)
        return appConfig?.features?.[feature] ?? false
    }

    /**
     * 获取子应用的品牌化配置
     */
    getAppBranding(appId?: string) {
        const appConfig = this.getAppConfig(appId || this.currentAppId)
        return {
            logo: appConfig?.branding?.logo || '',
            primaryColor: appConfig?.branding?.primaryColor || '#007bff',
            companyName: appConfig?.branding?.companyName || '认证中心'
        }
    }

    /**
     * 生成子应用特定的SSO配置
     */
    generateSSOConfig(appId?: string): any {
        const appConfig = this.getAppConfig(appId || this.currentAppId)

        if (!appConfig) {
            throw new Error(`子应用配置不存在: ${appId}`)
        }

        return {
            ssoServerUrl: appConfig.ssoServerUrl,
            clientId: appConfig.clientId,
            clientSecret: appConfig.clientSecret || '',
            redirectUri: appConfig.redirectUri,
            scope: appConfig.scope,
            responseType: appConfig.responseType,
            providers: appConfig.providers,
            branding: appConfig.branding,
            features: appConfig.features
        }
    }

    /**
     * 验证子应用访问权限
     */
    validateAppAccess(appId: string, userRole?: string): boolean {
        const appConfig = this.getAppConfig(appId)

        if (!appConfig) {
            return false
        }

        // 这里可以根据用户角色和应用配置进行权限验证
        // 目前简单返回true，实际应该根据业务逻辑判断
        return true
    }
}

// 导出单例实例
export const appLayerManager = AppLayerManager.getInstance()

// 导出便捷方法
export const getCurrentAppId = () => appLayerManager.getCurrentAppId()
export const getCurrentAppConfig = () => appLayerManager.getAppConfig()
export const switchToApp = (appId: string) => appLayerManager.setCurrentAppId(appId)
export const getAvailableProviders = (appId?: string) => appLayerManager.getAvailableProviders(appId)
export const isFeatureEnabled = (feature: string, appId?: string) => appLayerManager.isFeatureEnabled(feature as any, appId)
export const getAppBranding = (appId?: string) => appLayerManager.getAppBranding(appId)
