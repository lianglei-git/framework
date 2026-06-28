import { createAuthConfig } from '@sparrow/login/core'
import type { SubProjectConfig } from '@sparrow/login/config/subproject-integration'

export const subProjectConfig: SubProjectConfig & {
  ssoServerUrl: string
  ssoHomeUrl: string
  redirectUri: string
  tokenEndpoint: string
  authorizationUrl: string
  tokenUrl: string
  userInfoUrl: string
  logoutUrl: string
} = {
  id: 'sso_test_b',
  name: 'SSO Test B',
  description: '子项目 B — b_sso',
  ssoServerUrl: import.meta.env.VITE_SSO_SERVER_URL || 'http://localhost:5556',
  ssoHomeUrl: import.meta.env.VITE_SSO_HOME_URL || 'http://localhost:3033',
  homepageUrl: 'http://localhost:5174',
  clientId: import.meta.env.VITE_SSO_CLIENT_ID || '6a7db4e5-1c21-4cf1-92c9-507a0f924e29',
  clientSecret: '',
  redirectUri: import.meta.env.VITE_SSO_REDIRECT_URI || 'http://localhost:5174',
  redirectUris: [import.meta.env.VITE_SSO_REDIRECT_URI || 'http://localhost:5174'],
  logoutEndpoint: '',
  tokenEndpoint: '/api/v1/auth/oauth/token',
  authorizationUrl: '/api/v1/auth/oauth/authorize',
  tokenUrl: '/api/v1/auth/oauth/token',
  userInfoUrl: '/api/v1/auth/oauth/userinfo',
  logoutUrl: '/api/v1/auth/oauth/logout',
  allowedScopes: ['openid', 'profile', 'email'],
  permissions: { read: ['profile.read'], write: [], admin: [] },
  branding: {
    primaryColor: '#722ed1',
    backgroundColor: '#f9f0ff',
    logo: '',
    favicon: '',
  },
  features: {
    autoRefresh: import.meta.env.VITE_SSO_AUTO_REFRESH !== 'false',
    rememberMe: true,
    socialLogin: false,
    passwordReset: false,
    multiFactorAuth: false,
  },
  security: {
    requireHttps: false,
    allowedDomains: ['localhost'],
    blockedDomains: [],
    sessionTimeout: 1800,
  },
  development: {
    mockLogin: false,
    skipSSLVerification: true,
    debugMode: true,
  },
}

createAuthConfig({
  ...subProjectConfig,
  ssoServerUrl: subProjectConfig.ssoServerUrl,
  redirectUri: subProjectConfig.redirectUri,
  clientId: subProjectConfig.clientId,
  scope: subProjectConfig.allowedScopes,
  tokenEndpoint: subProjectConfig.tokenEndpoint,
  autoRefresh: subProjectConfig.features.autoRefresh,
})
