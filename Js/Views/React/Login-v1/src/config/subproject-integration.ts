/**
 * 子项目集成配置
 * 用于支持第三方应用的SSO集成
 */

export interface SubProjectConfig {
    // 子项目基本信息
    id: string
    name: string
    description: string
    homepageUrl: string
    logoUrl?: string

    // OAuth2配置
    clientId: string
    clientSecret: string
    redirectUris: string[]
    allowedScopes: string[]

    // 权限配置
    permissions: {
        read: string[]
        write: string[]
        admin: string[]
    }

    // UI配置
    branding: {
        primaryColor: string
        backgroundColor: string
        logo: string
        favicon: string
    }

    // 回调配置
    postLogoutRedirectUri?: string
    errorRedirectUri?: string

    // 功能开关
    features: {
        autoRefresh: boolean
        rememberMe: boolean
        socialLogin: boolean
        passwordReset: boolean
        multiFactorAuth: boolean
    }

    // 安全配置
    security: {
        requireHttps: boolean
        allowedDomains: string[]
        blockedDomains: string[]
        sessionTimeout: number
    }

    // 开发配置
    development: {
        mockLogin: boolean
        skipSSLVerification: boolean
        debugMode: boolean
    }
}

/**
 * 默认子项目配置
 */
export const DEFAULT_SUBPROJECT_CONFIG: Partial<SubProjectConfig> = {
    features: {
        autoRefresh: true,
        rememberMe: true,
        socialLogin: true,
        passwordReset: true,
        multiFactorAuth: false
    },
    security: {
        requireHttps: true,
        allowedDomains: [],
        blockedDomains: [],
        sessionTimeout: 3600 // 1小时
    },
    development: {
        mockLogin: false,
        skipSSLVerification: false,
        debugMode: false
    }
}

/**
 * 预定义的子项目配置
 */
export const SUBPROJECT_CONFIGS: Record<string, SubProjectConfig> = {
    // 示例子项目1：用户管理系统
    'user-management': {
        id: 'user-management',
        name: '用户管理系统',
        description: '企业级用户管理系统',
        homepageUrl: 'https://user.example.com',
        logoUrl: 'https://user.example.com/logo.png',
        clientId: 'user-mgmt-client',
        clientSecret: 'user-mgmt-secret',
        redirectUris: [
            'https://user.example.com/auth/callback',
            'http://localhost:3000/auth/callback'
        ],
        allowedScopes: ['openid', 'profile', 'email', 'user.read', 'user.write'],
        permissions: {
            read: ['user.read', 'profile.read'],
            write: ['user.write', 'profile.write'],
            admin: ['user.admin', 'system.admin']
        },
        branding: {
            primaryColor: '#1890ff',
            backgroundColor: '#f0f2f5',
            logo: 'https://user.example.com/logo.png',
            favicon: 'https://user.example.com/favicon.ico'
        },
        postLogoutRedirectUri: 'https://user.example.com/login',
        errorRedirectUri: 'https://user.example.com/error',
        features: {
            autoRefresh: true,
            rememberMe: true,
            socialLogin: true,
            passwordReset: true,
            multiFactorAuth: true
        },
        security: {
            requireHttps: true,
            allowedDomains: ['example.com', 'user.example.com'],
            blockedDomains: [],
            sessionTimeout: 3600
        },
        development: {
            mockLogin: false,
            skipSSLVerification: false,
            debugMode: false
        }
    },

    // 示例子项目2：订单管理系统
    'order-management': {
        id: 'order-management',
        name: '订单管理系统',
        description: '电商订单处理系统',
        homepageUrl: 'https://orders.example.com',
        logoUrl: 'https://orders.example.com/logo.png',
        clientId: 'order-mgmt-client',
        clientSecret: 'order-mgmt-secret',
        redirectUris: [
            'https://orders.example.com/auth/callback',
            'http://localhost:3001/auth/callback'
        ],
        allowedScopes: ['openid', 'profile', 'email', 'order.read', 'order.write'],
        permissions: {
            read: ['order.read', 'product.read'],
            write: ['order.write', 'product.write'],
            admin: ['order.admin', 'inventory.admin']
        },
        branding: {
            primaryColor: '#52c41a',
            backgroundColor: '#f6ffed',
            logo: 'https://orders.example.com/logo.png',
            favicon: 'https://orders.example.com/favicon.ico'
        },
        postLogoutRedirectUri: 'https://orders.example.com/login',
        errorRedirectUri: 'https://orders.example.com/error',
        features: {
            autoRefresh: true,
            rememberMe: true,
            socialLogin: false,
            passwordReset: true,
            multiFactorAuth: true
        },
        security: {
            requireHttps: true,
            allowedDomains: ['example.com', 'orders.example.com'],
            blockedDomains: [],
            sessionTimeout: 7200 // 2小时
        },
        development: {
            mockLogin: false,
            skipSSLVerification: false,
            debugMode: false
        }
    },

    // 示例子项目3：报表分析系统
    'analytics-dashboard': {
        id: 'analytics-dashboard',
        name: '报表分析系统',
        description: '数据分析和报表系统',
        homepageUrl: 'https://analytics.example.com',
        logoUrl: 'https://analytics.example.com/logo.png',
        clientId: 'analytics-client',
        clientSecret: 'analytics-secret',
        redirectUris: [
            'https://analytics.example.com/auth/callback',
            'http://localhost:3002/auth/callback'
        ],
        allowedScopes: ['openid', 'profile', 'email', 'analytics.read', 'reports.read'],
        permissions: {
            read: ['analytics.read', 'reports.read', 'dashboard.read'],
            write: ['analytics.write', 'reports.write', 'dashboard.write'],
            admin: ['analytics.admin', 'system.reports']
        },
        branding: {
            primaryColor: '#722ed1',
            backgroundColor: '#f9f0ff',
            logo: 'https://analytics.example.com/logo.png',
            favicon: 'https://analytics.example.com/favicon.ico'
        },
        postLogoutRedirectUri: 'https://analytics.example.com/login',
        errorRedirectUri: 'https://analytics.example.com/error',
        features: {
            autoRefresh: true,
            rememberMe: true,
            socialLogin: false,
            passwordReset: true,
            multiFactorAuth: false
        },
        security: {
            requireHttps: true,
            allowedDomains: ['example.com', 'analytics.example.com'],
            blockedDomains: [],
            sessionTimeout: 1800 // 30分钟
        },
        development: {
            mockLogin: false,
            skipSSLVerification: false,
            debugMode: false
        }
    }
}

/**
 * 获取子项目配置
 */
export function getSubProjectConfig(subProjectId: string): SubProjectConfig | null {
    return SUBPROJECT_CONFIGS[subProjectId] || null
}

/**
 * 注册新的子项目配置
 */
export function registerSubProjectConfig(config: SubProjectConfig): void {
    SUBPROJECT_CONFIGS[config.id] = config
}

/**
 * 获取所有子项目配置
 */
export function getAllSubProjectConfigs(): SubProjectConfig[] {
    return Object.values(SUBPROJECT_CONFIGS)
}

/**
 * 验证子项目配置
 */
export function validateSubProjectConfig(config: SubProjectConfig): string[] {
    const errors: string[] = []

    // 验证必填字段
    if (!config.id) errors.push('子项目ID不能为空')
    if (!config.name) errors.push('子项目名称不能为空')
    if (!config.homepageUrl) errors.push('子项目首页URL不能为空')
    if (!config.clientId) errors.push('客户端ID不能为空')
    if (!config.clientSecret) errors.push('客户端密钥不能为空')

    // 验证URL格式
    try {
        new URL(config.homepageUrl)
    } catch {
        errors.push('无效的首页URL格式')
    }

    // 验证重定向URI
    if (!config.redirectUris || config.redirectUris.length === 0) {
        errors.push('至少需要一个重定向URI')
    } else {
        config.redirectUris.forEach((uri, index) => {
            try {
                new URL(uri)
            } catch {
                errors.push(`重定向URI ${index + 1} 格式无效: ${uri}`)
            }
        })
    }

    // 验证权限配置
    if (!config.permissions.read && !config.permissions.write && !config.permissions.admin) {
        errors.push('至少需要配置一个权限级别')
    }

    return errors
}

/**
 * 创建子项目配置模板
 */
export function createSubProjectTemplate(overrides: Partial<SubProjectConfig> = {}): SubProjectConfig {
    return {
        ...DEFAULT_SUBPROJECT_CONFIG,
        ...overrides
    } as SubProjectConfig
}
