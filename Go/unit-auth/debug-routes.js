/**
 * 路由调试脚本
 * 用于调试Unit Auth的路由配置
 */

// 测试配置
const BASE_URL = 'http://localhost:8080'

// 测试结果
let testCount = 0

async function debugEndpoint(name, url, method = 'GET', data = null) {
    testCount++
    console.log(`\n${testCount}. 测试 ${name}`)
    console.log(`   URL: ${url}`)
    console.log(`   方法: ${method}`)

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
        console.log(`   状态码: ${response.status}`)

        if (response.ok) {
            console.log(`   ✅ 成功`)
            const contentType = response.headers.get('content-type')
            if (contentType && contentType.includes('application/json')) {
                const jsonData = await response.json()
                console.log(`   响应:`, JSON.stringify(jsonData, null, 2))
            } else {
                const textData = await response.text()
                console.log(`   响应:`, textData.substring(0, 200))
            }
        } else {
            console.log(`   ❌ 失败`)
            const errorText = await response.text()
            console.log(`   错误: ${errorText}`)
        }

        return response.ok
    } catch (error) {
        console.log(`   ❌ 异常: ${error.message}`)
        return false
    }
}

async function debugRoutes() {
    console.log('🚀 Unit Auth 路由调试')
    console.log('=====================')

    // 1. 测试基础端点
    await debugEndpoint('健康检查', `${BASE_URL}/health`)

    // 2. 测试API端点
    await debugEndpoint('公开项目', `${BASE_URL}/api/v1/projects/public`)
    await debugEndpoint('当前项目', `${BASE_URL}/api/v1/projects/current`)

    // 3. 测试OpenID Connect端点
    await debugEndpoint('OpenID配置', `${BASE_URL}/api/v1/openid-configuration`)
    await debugEndpoint('JWK端点', `${BASE_URL}/api/v1/jwks-json`)

    // 4. 测试认证端点
    await debugEndpoint('发送邮件验证码', `${BASE_URL}/api/v1/auth/send-email-code`, 'POST', {
        email: 'test@example.com',
        type: 'register'
    })

    // 5. 测试OAuth端点
    await debugEndpoint('OAuth授权', `${BASE_URL}/api/v1/auth/oauth/authorize?client_id=test&redirect_uri=test&response_type=code`)
    await debugEndpoint('OAuth令牌', `${BASE_URL}/api/v1/auth/oauth/token`, 'POST', {
        grant_type: 'client_credentials',
        client_id: 'test',
        client_secret: 'test'
    })

    console.log('\n📊 调试完成')
    console.log(`总测试数: ${testCount}`)
}

// 运行调试
debugRoutes().catch(error => {
    console.error('调试过程中发生错误:', error)
})
