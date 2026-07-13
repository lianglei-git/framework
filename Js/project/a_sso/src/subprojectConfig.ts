import { createAuthConfig } from '@zayne/login/core'
import type { SubProjectConfig } from '@zayne/login/config/subproject-integration'

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
  id: 'sso_test_a',
  name: 'SSO Test A',
  description: '子项目 A — a_sso',
  ssoServerUrl: import.meta.env.VITE_SSO_SERVER_URL || 'http://localhost:5555',
  ssoHomeUrl: import.meta.env.VITE_SSO_HOME_URL || 'http://localhost:3033',
  homepageUrl: 'http://localhost:5173',
  clientId: import.meta.env.VITE_SSO_CLIENT_ID || '8c1dd65d-7d2a-4ba4-aff1-610960a295e7',
  clientSecret: '',
  redirectUri: import.meta.env.VITE_SSO_REDIRECT_URI || 'http://localhost:5173',
  redirectUris: [import.meta.env.VITE_SSO_REDIRECT_URI || 'http://localhost:5173'],
  logoutEndpoint: '',
  tokenEndpoint: '/api/v1/auth/oauth/token',
  authorizationUrl: '/api/v1/auth/oauth/authorize',
  tokenUrl: '/api/v1/auth/oauth/token',
  userInfoUrl: '/api/v1/auth/oauth/userinfo',
  logoutUrl: '/api/v1/auth/oauth/logout',
  allowedScopes: ['openid', 'profile', 'email'],
  permissions: { read: ['profile.read'], write: [], admin: [] },
  branding: {
    primaryColor: '#1890ff',
    backgroundColor: '#f0f2f5',
    logo: '',
    favicon: '',
  },
  features: {
    autoRefresh: false,
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
