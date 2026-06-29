/**
 * 最简 SSO 对接：一个配置文件 + createAuthConfig 即可。
 */
import { createAuthConfig } from '@sparrow/login/core'

const redirectUri = import.meta.env.VITE_SSO_REDIRECT_URI || 'http://localhost:5175'
const clientId = import.meta.env.VITE_SSO_CLIENT_ID || 'f3e8a2b1-9c4d-4e5f-a6b7-c8d9e0f1a2b3'
const ssoServerUrl = import.meta.env.VITE_SSO_SERVER_URL || 'http://localhost:5557'
const ssoHomeUrl = import.meta.env.VITE_SSO_HOME_URL || 'http://localhost:3033'

export const appConfig = {
  id: 'sso_test_c',
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
