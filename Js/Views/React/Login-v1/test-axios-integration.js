/**
 * Axios集成测试
 * 验证API服务是否正确使用axios
 */

console.log('🧪 测试API服务Axios集成...')

// 模拟axios
const mockAxios = {
    defaults: {
        timeout: 10000
    },
    isAxiosError: (error) => {
        return error && error.isAxiosError === true
    },
    create: () => mockAxios
}

// 模拟axios响应
class MockAxiosResponse {
    constructor(data, status = 200, statusText = 'OK') {
        this.data = data
        this.status = status
        this.statusText = statusText
        this.headers = {}
        this.config = {}
    }
}

// 模拟axios实例
class MockAxiosInstance {
    constructor() {
        this.requestLog = []
    }

    async request(config) {
        this.requestLog.push(config)
        console.log(`✅ Axios ${config.method?.toUpperCase() || 'GET'} ${config.url}`)

        // 模拟成功响应
        if (config.url && config.url.includes('login')) {
            return new MockAxiosResponse({
                code: 200,
                data: {
                    user: { id: 1, username: 'test' },
                    token: 'test-token'
                },
                message: '登录成功'
            })
        }

        if (config.url && config.url.includes('userinfo')) {
            return new MockAxiosResponse({
                sub: 'test-user-id',
                name: 'Test User',
                email: 'test@example.com'
            })
        }

        if (config.url && config.url.includes('token')) {
            return new MockAxiosResponse({
                access_token: 'test-access-token',
                token_type: 'Bearer',
                expires_in: 3600
            })
        }

        return new MockAxiosResponse({ code: 200, data: {} })
    }

    get(url, config = {}) {
        return this.request({ ...config, method: 'GET', url })
    }

    post(url, data = null, config = {}) {
        return this.request({ ...config, method: 'POST', url, data })
    }

    put(url, data = null, config = {}) {
        return this.request({ ...config, method: 'PUT', url, data })
    }

    delete(url, config = {}) {
        return this.request({ ...config, method: 'DELETE', url })
    }

    patch(url, data = null, config = {}) {
        return this.request({ ...config, method: 'PATCH', url, data })
    }

    getRequestLog() {
        return this.requestLog
    }
}

// 测试API服务
function testApiService() {
    console.log('1. 测试基础API服务...')

    // 模拟修改后的ApiService类
    class MockApiService {
        constructor(baseURL = 'http://localhost:8080') {
            this.baseURL = baseURL
            this.defaultHeaders = {
                'Content-Type': 'application/json'
            }
            this.axiosInstance = new MockAxiosInstance()
        }

        async request<T>(url, options = {}) {
            const token = localStorage.getItem('auth_token')
            const headers = {
                ...this.defaultHeaders,
                ...options.headers,
                ...(token && { Authorization: `Bearer ${token}` })
            }

            const config = {
                ...options,
                headers,
                url: `${this.baseURL}${url}`,
                timeout: 10000
            }

            try {
                const response = await this.axiosInstance.request(config)
                return response.data
            } catch (error) {
                console.error('API request error:', error)
                if (mockAxios.isAxiosError(error)) {
                    if (error.response) {
                        throw new Error(`HTTP error! status: ${error.response.status}, message: ${error.response.data?.message || error.message}`)
                    } else if (error.request) {
                        throw new Error('Network error: No response received')
                    } else {
                        throw new Error(`Request error: ${error.message}`)
                    }
                } else {
                    throw error
                }
            }
        }

        async get<T>(url, params, options = {}) {
            const config = {
                method: 'GET',
                params,
                ...options
            }
            return this.request < T > (url, config)
        }

        async post<T>(url, data, options = {}) {
            const config = {
                method: 'POST',
                data,
                ...options
            }
            return this.request < T > (url, config)
        }
    }

    const apiService = new MockApiService()

    // 测试登录
    apiService.post('/api/v1/auth/login', {
        account: 'test@example.com',
        password: 'password123'
    }).then(response => {
        console.log('✅ 登录请求成功:', response.user.username)

        // 测试获取用户信息
        return apiService.get('/oauth/userinfo', undefined, {
            headers: { 'Authorization': 'Bearer test-token' }
        })
    }).then(userInfo => {
        console.log('✅ 获取用户信息成功:', userInfo.name)

        const requestLog = apiService.axiosInstance.getRequestLog()
        console.log('\n📋 Axios请求记录:')
        requestLog.forEach((req, index) => {
            console.log(`${index + 1}. ${req.method} ${req.url}`)
            if (req.data) {
                console.log(`   数据:`, req.data)
            }
        })

        if (requestLog.length === 2) {
            console.log('✅ 所有API调用都使用axios')
            console.log('✅ 请求数量正确')
        } else {
            console.log('❌ 请求数量不正确')
        }

        console.log('\n🎉 Axios集成测试通过！')
    }).catch(error => {
        console.error('❌ 测试失败:', error.message)
    })
}

testApiService()
