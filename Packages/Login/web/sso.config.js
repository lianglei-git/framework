/**
 * SSO配置文件
 * 此文件包含SSO系统的所有配置项
 */

const ssoConfig = {
    // SSO服务器配置
    server: {
        // SSO服务器的基础URL - 连接到unit-auth后端
        url: process.env.VITE_SSO_SERVER_URL || 'http://localhost:8080',

        // 客户端配置
        clientId: process.env.VITE_SSO_CLIENT_ID || 'your-client-id',
        clientSecret: process.env.VITE_SSO_CLIENT_SECRET || 'your-client-secret',

        // 重定向URI
        redirectUri: process.env.VITE_SSO_REDIRECT_URI || window.location.origin + '/auth/callback',

        // 授权范围
        scope: (process.env.VITE_SSO_SCOPE || 'openid profile email phone').split(' '),

        // 响应类型
        responseType: process.env.VITE_SSO_RESPONSE_TYPE || 'code',

        // 授权类型
        grantType: process.env.VITE_SSO_GRANT_TYPE || 'authorization_code'
    },

    // 会话配置
    session: {
        // 会话超时时间（秒）
        timeout: parseInt(process.env.VITE_SSO_SESSION_TIMEOUT || '3600'),

        // 自动刷新会话
        autoRefresh: process.env.VITE_SSO_AUTO_REFRESH !== 'false',

        // 刷新阈值（秒）
        refreshThreshold: parseInt(process.env.VITE_SSO_REFRESH_THRESHOLD || '300'),

        // 记住登录状态
        rememberMe: process.env.VITE_SSO_REMEMBER_ME !== 'false'
    },

    // 存储配置
    storage: {
        // 存储类型：localStorage 或 sessionStorage
        type: process.env.VITE_SSO_STORAGE_TYPE || 'localStorage',

        // 存储键前缀
        prefix: process.env.VITE_SSO_STORAGE_PREFIX || 'sso_',

        // Cookie配置
        cookie: {
            domain: process.env.VITE_SSO_COOKIE_DOMAIN || '',
            path: process.env.VITE_SSO_COOKIE_PATH || '/',
            secure: process.env.VITE_SSO_COOKIE_SECURE === 'true',
            sameSite: process.env.VITE_SSO_COOKIE_SAMESITE || 'lax'
        }
    },

    // 安全配置
    security: {
        // 是否启用HTTPS
        requireHttps: process.env.VITE_SSO_REQUIRE_HTTPS !== 'false',

        // 是否启用CSP
        enableCSP: process.env.VITE_SSO_ENABLE_CSP !== 'false',

        // 是否启用HSTS
        enableHSTS: process.env.VITE_SSO_ENABLE_HSTS !== 'false',

        // 允许的域名
        allowedDomains: (process.env.VITE_SSO_ALLOWED_DOMAINS || '').split(',').filter(Boolean),

        // 禁止的域名
        blockedDomains: (process.env.VITE_SSO_BLOCKED_DOMAINS || '').split(',').filter(Boolean)
    },

    // OAuth2/OpenID Connect提供商配置
    providers: {
        // 本地登录 - 连接到unit-auth后端
        local: {
            id: 'local',
            name: 'local',
            displayName: '本地账户',
            enabled: process.env.VITE_SSO_PROVIDER_LOCAL_ENABLED !== 'false',
            authorizationUrl: process.env.VITE_SSO_PROVIDER_LOCAL_AUTH_URL || `${process.env.VITE_SSO_SERVER_URL || 'http://localhost:8080'}/oauth/authorize`,
            tokenUrl: process.env.VITE_SSO_PROVIDER_LOCAL_TOKEN_URL || `${process.env.VITE_SSO_SERVER_URL || 'http://localhost:8080'}/oauth/token`,
            userInfoUrl: process.env.VITE_SSO_PROVIDER_LOCAL_USERINFO_URL || `${process.env.VITE_SSO_SERVER_URL || 'http://localhost:8080'}/oauth/userinfo`,
            logoutUrl: process.env.VITE_SSO_PROVIDER_LOCAL_LOGOUT_URL || `${process.env.VITE_SSO_SERVER_URL || 'http://localhost:8080'}/oauth/logout`
        },

        // GitHub - 公共客户端，必须使用PKCE
        github: {
            id: 'github',
            name: 'github',
            displayName: 'GitHub',
            enabled: process.env.VITE_SSO_PROVIDER_GITHUB_ENABLED !== 'false',
            // process.env.VITE_SSO_PROVIDER_GITHUB_CLIENT_ID || 
            clientId: 'Ov23li5H25mAnW2AWrr1',
            // GitHub是公共客户端，不应该有clientSecret，必须使用PKCE
            clientSecret: '',
            authorizationUrl: 'https://github.com/login/oauth/authorize',
            tokenUrl: 'https://github.com/login/oauth/access_token',
            userInfoUrl: 'https://api.github.com/user',
            scope: ['user:email', 'read:user'],
            autoDiscovery: false,
            // 强制使用PKCE
            requirePKCE: true
        },

        // Google
        google: {
            id: 'google',
            name: 'google',
            displayName: 'Google',
            enabled: process.env.VITE_SSO_PROVIDER_GOOGLE_ENABLED !== 'false',
            clientId: process.env.VITE_SSO_PROVIDER_GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.VITE_SSO_PROVIDER_GOOGLE_CLIENT_SECRET || '',
            authorizationUrl: 'https://accounts.google.com/oauth/authorize',
            tokenUrl: 'https://oauth2.googleapis.com/token',
            userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
            scope: ['openid', 'profile', 'email'],
            autoDiscovery: false
        },

        // 微信
        wechat: {
            id: 'wechat',
            name: 'wechat',
            displayName: '微信',
            enabled: process.env.VITE_SSO_PROVIDER_WECHAT_ENABLED !== 'false',
            clientId: process.env.VITE_SSO_PROVIDER_WECHAT_CLIENT_ID || '',
            clientSecret: process.env.VITE_SSO_PROVIDER_WECHAT_CLIENT_SECRET || '',
            authorizationUrl: process.env.VITE_SSO_PROVIDER_WECHAT_AUTH_URL || '',
            tokenUrl: process.env.VITE_SSO_PROVIDER_WECHAT_TOKEN_URL || '',
            userInfoUrl: process.env.VITE_SSO_PROVIDER_WECHAT_USERINFO_URL || '',
            scope: ['snsapi_login'],
            autoDiscovery: false
        }
    },

    // 端点配置
    endpoints: {
        // 授权端点
        authorization: process.env.VITE_SSO_ENDPOINT_AUTHORIZATION || '/oauth/authorize',

        // 令牌端点
        token: process.env.VITE_SSO_ENDPOINT_TOKEN || '/oauth/token',

        // 用户信息端点
        userInfo: process.env.VITE_SSO_ENDPOINT_USERINFO || '/oauth/userinfo',

        // 登出端点
        logout: process.env.VITE_SSO_ENDPOINT_LOGOUT || '/oauth/logout',

        // 会话检查端点
        checkSession: process.env.VITE_SSO_ENDPOINT_CHECK_SESSION || '/oauth/check_session',

        // 令牌刷新端点
        refreshToken: process.env.VITE_SSO_ENDPOINT_REFRESH_TOKEN || '/oauth/token',

        // 令牌撤销端点
        revokeToken: process.env.VITE_SSO_ENDPOINT_REVOKE_TOKEN || '/oauth/revoke',

        // 令牌内省端点
        introspectToken: process.env.VITE_SSO_ENDPOINT_INTROSPECT_TOKEN || '/oauth/introspect'
    },

    // UI配置
    ui: {
        // 显示语言
        language: process.env.VITE_SSO_UI_LANGUAGE || 'zh-CN',

        // 主题
        theme: process.env.VITE_SSO_UI_THEME || 'light',

        // 品牌化配置
        branding: {
            logo: process.env.VITE_SSO_UI_LOGO || '',
            favicon: process.env.VITE_SSO_UI_FAVICON || '',
            primaryColor: process.env.VITE_SSO_UI_PRIMARY_COLOR || '#1890ff',
            companyName: process.env.VITE_SSO_UI_COMPANY_NAME || 'SSO认证中心',
            copyright: process.env.VITE_SSO_UI_COPYRIGHT || ''
        },

        // 登录页面配置
        loginPage: {
            showRememberMe: process.env.VITE_SSO_UI_LOGIN_SHOW_REMEMBER_ME !== 'false',
            showRegister: process.env.VITE_SSO_UI_LOGIN_SHOW_REGISTER !== 'false',
            showSocialLogin: process.env.VITE_SSO_UI_LOGIN_SHOW_SOCIAL !== 'false',
            showTerms: process.env.VITE_SSO_UI_LOGIN_SHOW_TERMS !== 'false',
            allowGuestAccess: process.env.VITE_SSO_UI_LOGIN_ALLOW_GUEST !== 'false'
        }
    },

    // 监控和日志配置
    logging: {
        // 日志级别：debug, info, warn, error
        level: process.env.VITE_SSO_LOG_LEVEL || 'warn',

        // 是否启用日志
        enabled: process.env.VITE_SSO_LOG_ENABLED !== 'false',

        // 日志端点
        endpoint: process.env.VITE_SSO_LOG_ENDPOINT || '/api/logs'
    },

    // 开发模式配置
    development: {
        // 是否启用开发模式
        enabled: process.env.NODE_ENV === 'development',

        // 模拟登录
        mockLogin: process.env.VITE_SSO_DEV_MOCK_LOGIN === 'true',

        // 跳过SSL验证（仅开发环境）
        skipSSLVerification: process.env.VITE_SSO_DEV_SKIP_SSL === 'true'
    }
}

// 验证配置
function validateConfig(config) {
    const errors = []

    // 验证服务器配置
    if (!config.server.url) {
        errors.push('SSO服务器URL不能为空')
    }

    if (!config.server.clientId) {
        errors.push('客户端ID不能为空')
    }

    if (!config.server.redirectUri) {
        errors.push('重定向URI不能为空')
    }

    // 验证URL格式
    try {
        new URL(config.server.url)
        new URL(config.server.redirectUri)
    } catch (e) {
        errors.push('无效的URL格式')
    }

    if (errors.length > 0) {
        throw new Error(`SSO配置验证失败: ${errors.join(', ')}`)
    }
}

// 如果启用了配置验证，验证配置
if (process.env.VITE_SSO_CONFIG_VALIDATE === 'true') {
    try {
        validateConfig(ssoConfig)
        console.log('SSO配置验证通过')
    } catch (error) {
        console.error('SSO配置验证失败:', error.message)
    }
}

export default ssoConfig
