import { SSOConfig, StorageType } from '../types'

export class SSOError extends Error {
    public error: string
    public error_description?: string
    public error_uri?: string
    public state?: string

    constructor(error: { error: string; error_description?: string; error_uri?: string; state?: string } | string) {
        if (typeof error === 'string') {
            super(error)
            this.error = 'sso_error'
            this.error_description = error
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


/**
 * 创建默认SSO配置
 */
export function createDefaultSSOConfig(): SSOConfig {
    return {
        ssoServerUrl: import.meta.env.VITE_SSO_SERVER_URL,
        // clientId: 'your-client-id',
        // clientSecret: 'your-client-secret',
        // redirectUri: window.location.origin + '/auth/callback',
        redirectUri: import.meta.env.VITE_SSO_REDIRECT_URI,
        scope: ['openid', 'profile', 'email'],
        responseType: 'code',
        // 默认应用ID
        id: 'centralized',
        grantType: 'authorization_code',
        sessionTimeout: 3600,
        autoRefresh: true,
        storageType: StorageType.LOCAL,
        cookieSameSite: 'lax',
        "authorizationUrl": "/api/v1/auth/oauth/authorize",
        "tokenEndpoint": "/api/v1/auth/oauth-login",
        "userInfoUrl": "/api/v1/auth/oauth/userinfo",
        "logoutUrl": "/api/v1/auth/oauth/logout",

    }
}

let ssoconfig = createDefaultSSOConfig();
export const getSSOConfig = () => {
    return ssoconfig
}

export const setSSOConfig = (target: SSOConfig) => {
    ssoconfig = target
}
