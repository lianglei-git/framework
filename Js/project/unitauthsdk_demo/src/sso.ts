/**
 * SSO 配置 — unitauthsdk_demo
 */
import { createAuthConfig } from '@zayne/login/core'

const redirectUri = import.meta.env.VITE_SSO_REDIRECT_URI || 'http://localhost:5179'
const clientId = import.meta.env.VITE_SSO_CLIENT_ID || ''
const ssoServerUrl = import.meta.env.VITE_SSO_SERVER_URL || 'http://localhost:5560'
const ssoHomeUrl = import.meta.env.VITE_SSO_HOME_URL || 'http://localhost:3033'

export const appConfig = {
  id: 'sso_unitauthsdk_demo',
  ssoServerUrl,
  ssoHomeUrl,
  clientId,
  redirectUri,
  redirectUris: [redirectUri],
  allowedScopes: ['openid', 'profile', 'email'],
  tokenEndpoint: '/api/v1/auth/oauth/token',
  authorizationUrl: '/api/v1/auth/oauth/authorize',
  tokenUrl: '/api/v1/auth/oauth/token',
  userInfoUrl: '/api/v1/auth/oauth/userinfo',
  logoutUrl: '/api/v1/auth/oauth/logout',
}

createAuthConfig({
  ...appConfig,
  autoRefresh: false,
})
