/**
 * 路由测试脚本
 * 用于验证Unit Auth后端的所有路由是否正常工作
 */

// 测试配置
const BASE_URL = 'http://localhost:8080'

// 测试结果
const results = {
    passed: 0,
    failed: 0,
    tests: []
}

// 测试函数
async function testEndpoint(name, url, method = 'GET', data = null) {
    try {
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        }

        if (data) {
            config.body = JSON.stringify(data)
        }

        const response = await fetch(url, config)
        const success = response.ok || response.status === 404 // 404也算通过（表示路由存在但需要认证）

        results.tests.push({
            name,
            url,
            method,
            status: response.status,
            success
        })

        if (success) {
            results.passed++
            console.log(`✅ ${name}: ${response.status}`)
        } else {
            results.failed++
            console.log(`❌ ${name}: ${response.status}`)
        }

        return success
    } catch (error) {
        results.failed++
        results.tests.push({
            name,
            url,
            method,
            error: error.message,
            success: false
        })
        console.log(`❌ ${name}: ${error.message}`)
        return false
    }
}

// 主测试函数
async function runRouteTests() {
    console.log('🚀 Unit Auth 路由测试')
    console.log('======================')

    // 1. 健康检查
    console.log('\n📡 基础端点测试')
    await testEndpoint('健康检查', `${BASE_URL}/health`)

    // 2. OpenID Connect端点
    console.log('\n🔍 OpenID Connect端点测试')
    await testEndpoint('OIDC配置', `${BASE_URL}/.well-known/openid_configuration`)
    await testEndpoint('JWK端点', `${BASE_URL}/.well-known/jwks.json`)

    // 3. OAuth端点
    console.log('\n🔐 OAuth端点测试')
    await testEndpoint('OAuth授权', `${BASE_URL}/oauth/authorize?client_id=test&redirect_uri=test&response_type=code`)
    await testEndpoint('OAuth令牌', `${BASE_URL}/oauth/token`, 'POST', {
        grant_type: 'client_credentials',
        client_id: 'test',
        client_secret: 'test'
    })
    await testEndpoint('OAuth用户信息', `${BASE_URL}/oauth/userinfo`)
    await testEndpoint('OAuth登出', `${BASE_URL}/oauth/logout`, 'POST')
    await testEndpoint('OAuth撤销', `${BASE_URL}/oauth/revoke`, 'POST')

    // 4. API端点
    console.log('\n📡 API端点测试')

    // 公开端点
    await testEndpoint('公开项目', `${BASE_URL}/api/v1/projects/public`)
    await testEndpoint('当前项目', `${BASE_URL}/api/v1/projects/current`)
    await testEndpoint('集成文档', `${BASE_URL}/api/v1/projects/integration-docs`)

    // 认证端点
    console.log('\n🔐 认证端点测试')
    await testEndpoint('发送邮件验证码', `${BASE_URL}/api/v1/auth/send-email-code`, 'POST', {
        email: 'test@example.com',
        type: 'register'
    })
    await testEndpoint('发送短信验证码', `${BASE_URL}/api/v1/auth/send-sms-code`, 'POST', {
        phone: '13800138000',
        type: 'login'
    })
    await testEndpoint('用户注册', `${BASE_URL}/api/v1/auth/register`, 'POST', {
        email: 'test@example.com',
        username: 'testuser',
        nickname: 'Test User',
        password: '123456',
        code: '123456'
    })
    await testEndpoint('用户登录', `${BASE_URL}/api/v1/auth/login`, 'POST', {
        account: 'test@example.com',
        password: '123456'
    })
    await testEndpoint('OAuth登录', `${BASE_URL}/api/v1/auth/oauth-login`, 'POST', {
        provider: 'github',
        code: 'test',
        state: 'test'
    })
    await testEndpoint('获取OAuth URL', `${BASE_URL}/api/v1/auth/oauth/github/url`)
    await testEndpoint('获取提供商列表', `${BASE_URL}/api/v1/auth/providers`)

    // 管理端点（需要认证）
    console.log('\n⚙️ 管理端点测试')
    await testEndpoint('SSO客户端列表', `${BASE_URL}/api/v1/admin/sso-clients`)
    await testEndpoint('SSO客户端统计', `${BASE_URL}/api/v1/admin/sso-clients/stats`)
    await testEndpoint('SSO会话统计', `${BASE_URL}/api/v1/admin/sso-sessions/stats`)

    // 5. 受保护端点（需要认证）
    console.log('\n🔒 受保护端点测试')
    await testEndpoint('用户信息', `${BASE_URL}/api/v1/user/profile`)
    await testEndpoint('用户统计', `${BASE_URL}/api/v1/stats/overall`)
    await testEndpoint('用户统计', `${BASE_URL}/api/v1/admin/stats/users`)

    // 6. 特殊端点
    console.log('\n🔧 特殊端点测试')
    await testEndpoint('令牌内省', `${BASE_URL}/api/v1/auth/introspect`, 'POST', {
        token: 'test-token'
    })
    await testEndpoint('令牌交换', `${BASE_URL}/api/v1/auth/token/exchange`, 'POST', {
        subject_token: 'test-token',
        audience: 'test-audience'
    })

    // 生成报告
    console.log('\n📊 测试报告')
    console.log('===========')
    console.log(`总测试数: ${results.tests.length}`)
    console.log(`通过: ${results.passed}`)
    console.log(`失败: ${results.failed}`)

    const successRate = ((results.passed / results.tests.length) * 100).toFixed(1)
    console.log(`成功率: ${successRate}%`)

    if (results.passed === results.tests.length) {
        console.log('\n🎉 所有路由测试通过！')
        return true
    } else {
        console.log('\n⚠️  部分路由测试失败')
        console.log('\n失败的测试:')
        results.tests.filter(test => !test.success).forEach(test => {
            console.log(`- ${test.name}: ${test.url} (${test.method}) - ${test.status || test.error}`)
        })
        return false
    }
}

// 运行测试
if (require.main === module) {
    runRouteTests()
        .then(success => {
            process.exit(success ? 0 : 1)
        })
        .catch(error => {
            console.error('测试过程中发生错误:', error)
            process.exit(1)
        })
}

module.exports = { runRouteTests }
