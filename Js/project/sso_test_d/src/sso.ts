/**
 * SSO 配置 — 由 admin-web 子项目脚手架生成
 */
import { createAuthConfig } from '@sparrow/login/core'

const redirectUri = import.meta.env.VITE_SSO_REDIRECT_URI || 'http://localhost:5176'
const clientId = import.meta.env.VITE_SSO_CLIENT_ID || '9bb1970a-42a7-497a-8144-a211128ea373'
const ssoServerUrl = import.meta.env.VITE_SSO_SERVER_URL || 'http://localhost:5558'
const ssoHomeUrl = import.meta.env.VITE_SSO_HOME_URL || 'http://localhost:3033'

export const appConfig = {
  id: 'sso_sso_test_d',
  ssoServerUrl,
  ssoHomeUrl,
  clientId,
  redirectUri,
  redirectUris: [redirectUri],
  allowedScopes: ["openid","profile","email"],
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
