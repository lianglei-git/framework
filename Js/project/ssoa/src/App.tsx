import './App.css'
import { useSubProjectSSO } from '../../../Views/React/Login-v1/src/hooks/useSubProjectSSO'

function App() {

  const {
    isAuthenticated,
    user,
    login,
    logout,
    isLoading,
    error
  } = useSubProjectSSO({
    
    customConfig: {
      id: 'sso_test_a',
      name: 'ssoa ',
      description: '这是测试应用',
      ssoServerUrl: 'http://localhost:8080',
      homepageUrl: 'https://demo.example.com',
      clientId: '8c1dd65d-7d2a-4ba4-aff1-610960a295e7',
      clientSecret: 'client_secret_a4121ad0-bc7e-4b59-8ab1-e29544060fc4',
     // redirectUris: ['https://demo.example.com/auth/callback'],
      redirectUri: "http://localhost:5173",
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
    },
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
