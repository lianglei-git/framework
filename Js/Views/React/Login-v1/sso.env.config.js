/**
 * SSO环境配置
 * 此文件包含前端项目连接后端SSO系统的配置
 */

// 开发环境配置
const devConfig = {
    // SSO服务器配置
    ssoServerUrl: 'http://localhost:8080',
    clientId: 'default-client',
    clientSecret: 'default-client-secret',
    redirectUri: 'http://localhost:3000/auth/callback',
    scope: ['openid', 'profile', 'email', 'phone'],
    responseType: 'code',
    grantType: 'authorization_code',

    // 会话配置
    sessionTimeout: 3600,
    autoRefresh: true,
    refreshThreshold: 300,
    rememberMe: false,

    // 存储配置
    storageType: 'localStorage',
    storagePrefix: 'sso_',

    // 端点配置
    endpoints: {
        authorization: '/oauth/authorize',
        token: '/oauth/token',
        userInfo: '/oauth/userinfo',
        logout: '/oauth/logout',
        checkSession: '/oauth/check_session',
        refreshToken: '/oauth/token',
        revokeToken: '/oauth/revoke',
        introspectToken: '/oauth/introspect'
    }
}

// 生产环境配置
const prodConfig = {
    // SSO服务器配置
    ssoServerUrl: 'https://sso.yourcompany.com',
    clientId: 'your-production-client-id',
    clientSecret: 'your-production-client-secret',
    redirectUri: 'https://yourapp.com/auth/callback',
    scope: ['openid', 'profile', 'email'],
    responseType: 'code',
    grantType: 'authorization_code',

    // 会话配置
    sessionTimeout: 3600,
    autoRefresh: true,
    refreshThreshold: 300,
    rememberMe: false,

    // 存储配置
    storageType: 'localStorage',
    storagePrefix: 'sso_',

    // 端点配置
    endpoints: {
        authorization: '/oauth/authorize',
        token: '/oauth/token',
        userInfo: '/oauth/userinfo',
        logout: '/oauth/logout',
        checkSession: '/oauth/check_session',
        refreshToken: '/oauth/token',
        revokeToken: '/oauth/revoke',
        introspectToken: '/oauth/introspect'
    }
}

// 根据环境选择配置
const isProduction = process.env.NODE_ENV === 'production'
const baseConfig = isProduction ? prodConfig : devConfig

// 从环境变量覆盖配置
const envConfig = {
    ssoServerUrl: process.env.VITE_SSO_SERVER_URL || baseConfig.ssoServerUrl,
    clientId: process.env.VITE_SSO_CLIENT_ID || baseConfig.clientId,
    clientSecret: process.env.VITE_SSO_CLIENT_SECRET || baseConfig.clientSecret,
    redirectUri: process.env.VITE_SSO_REDIRECT_URI || baseConfig.redirectUri,
    scope: process.env.VITE_SSO_SCOPE ? process.env.VITE_SSO_SCOPE.split(' ') : baseConfig.scope,
    responseType: process.env.VITE_SSO_RESPONSE_TYPE || baseConfig.responseType,
    grantType: process.env.VITE_SSO_GRANT_TYPE || baseConfig.grantType,

    // 会话配置
    sessionTimeout: parseInt(process.env.VITE_SSO_SESSION_TIMEOUT || baseConfig.sessionTimeout.toString()),
    autoRefresh: process.env.VITE_SSO_AUTO_REFRESH !== 'false',
    refreshThreshold: parseInt(process.env.VITE_SSO_REFRESH_THRESHOLD || baseConfig.refreshThreshold.toString()),
    rememberMe: process.env.VITE_SSO_REMEMBER_ME === 'true',

    // 存储配置
    storageType: (process.env.VITE_SSO_STORAGE_TYPE as 'localStorage' | 'sessionStorage') || baseConfig.storageType,
    storagePrefix: process.env.VITE_SSO_STORAGE_PREFIX || baseConfig.storagePrefix,

    // 端点配置
    endpoints: {
        authorization: process.env.VITE_SSO_ENDPOINT_AUTHORIZATION || baseConfig.endpoints.authorization,
        token: process.env.VITE_SSO_ENDPOINT_TOKEN || baseConfig.endpoints.token,
        userInfo: process.env.VITE_SSO_ENDPOINT_USERINFO || baseConfig.endpoints.userInfo,
        logout: process.env.VITE_SSO_ENDPOINT_LOGOUT || baseConfig.endpoints.logout,
        checkSession: process.env.VITE_SSO_ENDPOINT_CHECK_SESSION || baseConfig.endpoints.checkSession,
        refreshToken: process.env.VITE_SSO_ENDPOINT_REFRESH_TOKEN || baseConfig.endpoints.refreshToken,
        revokeToken: process.env.VITE_SSO_ENDPOINT_REVOKE_TOKEN || baseConfig.endpoints.revokeToken,
        introspectToken: process.env.VITE_SSO_ENDPOINT_INTROSPECT_TOKEN || baseConfig.endpoints.introspectToken
    }
}

// 验证配置
function validateConfig(config) {
    const errors = []

    if (!config.ssoServerUrl) {
        errors.push('SSO服务器URL不能为空')
    }

    if (!config.clientId) {
        errors.push('客户端ID不能为空')
    }

    if (!config.redirectUri) {
        errors.push('重定向URI不能为空')
    }

    if (!config.endpoints.authorization) {
        errors.push('授权端点不能为空')
    }

    if (!config.endpoints.token) {
        errors.push('令牌端点不能为空')
    }

    if (!config.endpoints.userInfo) {
        errors.push('用户信息端点不能为空')
    }

    // 验证URL格式
    try {
        new URL(config.ssoServerUrl)
        new URL(config.redirectUri)
    } catch (e) {
        errors.push('无效的URL格式')
    }

    if (errors.length > 0) {
        throw new Error(`SSO配置验证失败: ${errors.join(', ')}`)
    }
}

// 验证配置
if (process.env.VITE_SSO_CONFIG_VALIDATE === 'true') {
    try {
        validateConfig(envConfig)
        console.log('✅ SSO配置验证通过')
    } catch (error) {
        console.error('❌ SSO配置验证失败:', error.message)
    }
}

export default envConfig
