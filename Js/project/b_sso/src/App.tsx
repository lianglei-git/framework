


// {
//   "client_id": "6a7db4e5-1c21-4cf1-92c9-507a0f924e29",
//   "client_secret": "client_secret_22e58ccf-c367-4ead-b517-3be17f796211",
//   "name": "sso_test_b",
//   "description": "Test SSO Client created by script",
//   "redirect_uris": "[\"http://localhost:5173\"]",
//   "grant_types": "[\"authorization_code\",\"refresh_token\"]",
//   "response_types": "[\"code\"]",
//   "scope": "[\"openid\",\"profile\",\"email\"]",
//   "auto_approve": false,
//   "is_active": true,
//   "authorization_endpoint": "http://localhost:8080/oauth/authorize",
//   "token_endpoint": "http://localhost:8080/oauth/token",
//   "userinfo_endpoint": "http://localhost:8080/oauth/userinfo",
//   "created_at": "2025-09-28T11:51:51.005+08:00"
// }

import './App.css'
import { useSubProjectSSO, setSSOConfig } from '../../../Views/React/Login-v1/src/hooks/useSubProjectSSO'


const customConfig = {
  id: 'sso_test_b',
  name: 'kajsd ',
  description: '这是测试应用',
  ssoServerUrl: 'http://localhost:3342',
  // 上线后需要替换和ssoServerUrl一样的路径
  ssoHomeUrl: 'http://localhost:3033',
  homepageUrl: 'https://demo.example.com',
  clientId: '6a7db4e5-1c21-4cf1-92c9-507a0f924e29',
  // clientSecret: 'client_secret_22e58ccf-c367-4ead-b517-3be17f796211',
  // redirectUris: ['https://demo.example.com/auth/callback'],
  redirectUri: "http://localhost:5174",
  logoutEndpoint: "",
  tokenEndpoint: "/api/v1/auth/oauth/token",
  // 这个字段目前在我这是没用的，因为已经被写死了
  "authorizationUrl": "/api/v1/auth/oauth/authorize",
  "tokenUrl":         "/api/v1/auth/oauth/token",
  "userInfoUrl":      "/api/v1/auth/oauth/userinfo",
  "logoutUrl":        "/api/v1/auth/oauth/logout",
  allowedScopes: ['openid', 'profile', 'email', 'custom.read'],
  branding: {
    primaryColor: '#722ed1',
    backgroundColor: '#f9f0ff',
    logo: 'https://demo.example.com/logo.png'
  },
  features: {
    autoRefresh: true,
    rememberMe: true,
    socialLogin: true,
    passwordReset: true,
    multiFactorAuth: false
  },
  security: {
    requireHttps: true,
    allowedDomains: ['example.com', 'demo.example.com'],
    blockedDomains: [],
    sessionTimeout: 1800
  }
}

setSSOConfig(customConfig);

function App() {

  const {
    isAuthenticated,
    user,
    login,
    logout,
    isLoading,
    error,
    refreshToken,

  } = useSubProjectSSO({
    customConfig,
    onSuccess: (user, token, session) => {
      console.log('自定义配置认证成功:', { user, token, session })
    },
    subProjectId: 'temp1'
  })


  if (isLoading) {
    return <div>加载中...</div>
  }

  if (error) {
    return <div>错误: {error.message}</div>
  }

  return (
    <div className="app">
      <div>
        {isAuthenticated ? (
          <div>
            <h1>欢迎, {user?.name}!</h1>
            <button onClick={logout}>登出</button>
            <button onClick={refreshToken}>刷新令牌</button>

          </div>
        ) : (
          <button onClick={() => login({ redirect: true })}>
            登录
          </button>
        )}
      </div>
    </div>
  )
}

export default App
