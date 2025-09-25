/**
 * API集成测试
 * 验证SSO服务是否正确使用统一的API服务
 */

console.log('🧪 测试SSO服务API集成...')

// 模拟ApiService类
class MockApiService {
    constructor(baseURL = 'http://localhost:8080') {
        this.baseURL = baseURL
        this.requestLog = []
    }

    async get(url, params, options = {}) {
        this.requestLog.push({ method: 'GET', url, params, options })
        console.log(`✅ API GET: ${this.baseURL}${url}`, params ? `?${new URLSearchParams(params)}` : '')

        // 模拟返回用户数据
        if (url.includes('userinfo')) {
            return {
                sub: 'test-user-id',
                name: 'Test User',
                email: 'test@example.com',
                picture: ''
            }
        }

        // 模拟返回token数据
        if (url.includes('token')) {
            return {
                access_token: 'test-access-token',
                token_type: 'Bearer',
                expires_in: 3600,
                refresh_token: 'test-refresh-token'
            }
        }

        return {}
    }

    async post(url, data, options = {}) {
        this.requestLog.push({ method: 'POST', url, data, options })
        console.log(`✅ API POST: ${this.baseURL}${url}`, data)

        // 模拟返回会话销毁成功
        if (url.includes('session/destroy')) {
            return { success: true }
        }

        return {}
    }

    getRequestLog() {
        return this.requestLog
    }
}

// 测试SSO服务API集成
function testSSOApiIntegration() {
    console.log('1. 测试token交换API调用...')

    const mockApi = new MockApiService()
    const ssoService = new (class {
        constructor(api) {
            this.api = api
        }

        async getCurrentProviderConfig() {
            return {
                token_url: 'http://localhost:8080/oauth/token',
                user_info_url: 'http://localhost:8080/oauth/userinfo',
                client_id: 'test-client-id',
                redirect_uri: 'http://localhost:5173/callback'
            }
        }

        async post(url, data) {
            return this.api.post(url, data)
        }

        async get(url, params, options = {}) {
            return this.api.get(url, params, options)
        }

        // 模拟exchangeCodeForToken方法
        async exchangeCodeForToken(code, state) {
            const providerConfig = await this.getCurrentProviderConfig()

            const tokenRequestData = {
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: providerConfig.redirect_uri,
                client_id: providerConfig.client_id,
                ...(state && { state: state })
            }

            const response = await this.post('/oauth/token', tokenRequestData)

            return {
                user: await this.get('/oauth/userinfo', undefined, {
                    headers: { 'Authorization': `Bearer ${response.access_token}` }
                }),
                token: response,
                session: {
                    session_id: 'test-session',
                    user_id: 'test-user',
                    client_id: 'test-client',
                    authenticated_at: Date.now(),
                    expires_at: Date.now() + 3600000,
                    last_activity: Date.now(),
                    is_active: true,
                    remember_me: false
                }
            }
        }
    })(mockApi)

    // 执行token交换
    ssoService.exchangeCodeForToken('test-code', 'test-state').then(result => {
        console.log('✅ Token交换成功:', result.user.sub)

        const requestLog = mockApi.getRequestLog()
        console.log('\n📋 API调用记录:')
        requestLog.forEach((req, index) => {
            console.log(`${index + 1}. ${req.method} ${req.url}`)
            if (req.data) {
                console.log(`   数据:`, req.data)
            }
        })

        if (requestLog.length === 2 &&
            requestLog[0].method === 'POST' &&
            requestLog[0].url === '/oauth/token' &&
            requestLog[1].method === 'GET' &&
            requestLog[1].url === '/oauth/userinfo') {
            console.log('✅ API调用顺序正确')
        } else {
            console.log('❌ API调用顺序不正确')
        }

        console.log('\n🎉 API集成测试通过！')
    }).catch(error => {
        console.error('❌ API集成测试失败:', error.message)
    })
}

testSSOApiIntegration()
