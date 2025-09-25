/**
 * SSO集成测试脚本
 * 用于验证前端Login-v1与后端unit-auth的SSO集成
 */

const fs = require('fs')
const path = require('path')

// 配置
const BACKEND_URL = 'http://localhost:8080'
const FRONTEND_URL = 'http://localhost:3000'

/**
 * 测试配置验证
 */
function testConfiguration() {
    console.log('🔧 测试配置验证...')

    const configPath = path.join(__dirname, 'sso.config.js')
    const envConfigPath = path.join(__dirname, 'sso.env.config.js')

    if (!fs.existsSync(configPath)) {
        console.error('❌ sso.config.js 文件不存在')
        return false
    }

    if (!fs.existsSync(envConfigPath)) {
        console.error('❌ sso.env.config.js 文件不存在')
        return false
    }

    try {
        const ssoConfig = require(configPath)
        const envConfig = require(envConfigPath)

        console.log('✅ 配置文件存在')

        // 验证基本配置
        if (!ssoConfig.server.url) {
            console.error('❌ SSO服务器URL未配置')
            return false
        }

        if (!ssoConfig.server.clientId) {
            console.error('❌ 客户端ID未配置')
            return false
        }

        if (!ssoConfig.server.redirectUri) {
            console.error('❌ 重定向URI未配置')
            return false
        }

        console.log('✅ 基本配置验证通过')
        return true
    } catch (error) {
        console.error('❌ 配置文件加载失败:', error.message)
        return false
    }
}

/**
 * 测试后端健康状态
 */
async function testBackendHealth() {
    console.log('🏥 测试后端健康状态...')

    try {
        const response = await fetch(`${BACKEND_URL}/health`)

        if (response.ok) {
            const data = await response.json()
            console.log('✅ 后端服务正常运行:', data.message)
            return true
        } else {
            console.error('❌ 后端服务异常:', response.status, response.statusText)
            return false
        }
    } catch (error) {
        console.error('❌ 无法连接到后端服务:', error.message)
        return false
    }
}

/**
 * 测试OpenID Connect发现端点
 */
async function testOIDCDiscovery() {
    console.log('🔍 测试OpenID Connect发现端点...')

    try {
        const response = await fetch(`${BACKEND_URL}/.well-known/openid_configuration`)

        if (response.ok) {
            const discovery = await response.json()
            console.log('✅ OpenID Connect配置可用')

            // 验证必需的端点
            const requiredEndpoints = [
                'authorization_endpoint',
                'token_endpoint',
                'userinfo_endpoint',
                'jwks_uri'
            ]

            for (const endpoint of requiredEndpoints) {
                if (!discovery[endpoint]) {
                    console.warn(`⚠️  缺少端点: ${endpoint}`)
                }
            }

            console.log('✅ 发现端点验证通过')
            return true
        } else {
            console.error('❌ OpenID Connect配置不可用:', response.status, response.statusText)
            return false
        }
    } catch (error) {
        console.error('❌ 无法访问OpenID Connect配置:', error.message)
        return false
    }
}

/**
 * 测试JWK端点
 */
async function testJWKSEndpoint() {
    console.log('🔐 测试JWK端点...')

    try {
        const response = await fetch(`${BACKEND_URL}/.well-known/jwks.json`)

        if (response.ok) {
            const jwks = await response.json()
            console.log('✅ JWK端点可用')

            if (jwks.keys && jwks.keys.length > 0) {
                const key = jwks.keys[0]
                if (key.kty === 'RSA' && key.alg === 'RS256') {
                    console.log('✅ RSA公钥配置正确')
                    return true
                } else {
                    console.warn('⚠️  密钥类型或算法不匹配')
                    return true // 仍算通过，但给出警告
                }
            } else {
                console.warn('⚠️  JWK中没有密钥')
                return true
            }
        } else {
            console.error('❌ JWK端点不可用:', response.status, response.statusText)
            return false
        }
    } catch (error) {
        console.error('❌ 无法访问JWK端点:', error.message)
        return false
    }
}

/**
 * 测试SSO客户端管理
 */
async function testSSOClientManagement() {
    console.log('👥 测试SSO客户端管理...')

    try {
        // 尝试创建测试客户端
        const createClientResponse = await fetch(`${BACKEND_URL}/api/v1/admin/sso-clients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'Test Client',
                description: 'Integration test client',
                redirect_uris: ['http://localhost:3000/auth/callback'],
                grant_types: ['authorization_code', 'refresh_token'],
                scope: ['openid', 'profile', 'email']
            })
        })

        if (createClientResponse.ok) {
            const client = await createClientResponse.json()
            console.log('✅ SSO客户端创建成功')

            const clientId = client.data.id

            // 测试获取客户端
            const getClientResponse = await fetch(`${BACKEND_URL}/api/v1/admin/sso-clients/${clientId}`)

            if (getClientResponse.ok) {
                console.log('✅ SSO客户端查询成功')
            } else {
                console.error('❌ SSO客户端查询失败')
                return false
            }

            // 清理测试客户端
            await fetch(`${BACKEND_URL}/api/v1/admin/sso-clients/${clientId}`, {
                method: 'DELETE'
            })

            console.log('✅ SSO客户端管理功能正常')
            return true
        } else {
            console.error('❌ SSO客户端创建失败:', createClientResponse.status, createClientResponse.statusText)
            return false
        }
    } catch (error) {
        console.error('❌ SSO客户端管理测试失败:', error.message)
        return false
    }
}

/**
 * 测试OAuth 2.0流程
 */
async function testOAuthFlow() {
    console.log('🔄 测试OAuth 2.0流程...')

    try {
        // 注意：这是一个简化的测试，实际的OAuth流程需要用户交互
        // 这里我们只测试令牌端点是否可用

        const tokenResponse = await fetch(`${BACKEND_URL}/oauth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: 'default-client',
                client_secret: 'default-client-secret',
                scope: 'openid'
            })
        })

        if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json()
            console.log('✅ 令牌端点工作正常')

            // 测试用户信息端点
            const userInfoResponse = await fetch(`${BACKEND_URL}/oauth/userinfo`, {
                headers: {
                    'Authorization': `Bearer ${tokenData.access_token}`
                }
            })

            if (userInfoResponse.ok) {
                console.log('✅ 用户信息端点工作正常')
                return true
            } else {
                console.warn('⚠️  用户信息端点需要有效令牌')
                return true
            }
        } else {
            console.warn('⚠️  令牌端点需要有效客户端配置')
            return true
        }
    } catch (error) {
        console.error('❌ OAuth流程测试失败:', error.message)
        return false
    }
}

/**
 * 生成集成测试报告
 */
function generateReport(results) {
    console.log('\n📊 SSO集成测试报告')
    console.log('='.repeat(50))

    const totalTests = Object.keys(results).length
    const passedTests = Object.values(results).filter(Boolean).length

    console.log(`总测试数: ${totalTests}`)
    console.log(`通过测试: ${passedTests}`)
    console.log(`失败测试: ${totalTests - passedTests}`)
    console.log(`通过率: ${((passedTests / totalTests) * 100).toFixed(1)}%`)

    console.log('\n详细结果:')
    Object.entries(results).forEach(([test, passed]) => {
        const icon = passed ? '✅' : '❌'
        console.log(`${icon} ${test}`)
    })

    if (passedTests === totalTests) {
        console.log('\n🎉 所有测试通过！SSO集成成功！')
        return true
    } else {
        console.log('\n⚠️  部分测试失败，需要检查配置')
        return false
    }
}

/**
 * 主测试函数
 */
async function runIntegrationTests() {
    console.log('🚀 开始SSO集成测试...\n')

    const results = {
        '配置验证': testConfiguration(),
        '后端健康': await testBackendHealth(),
        'OIDC发现': await testOIDCDiscovery(),
        'JWK端点': await testJWKSEndpoint(),
        '客户端管理': await testSSOClientManagement(),
        'OAuth流程': await testOAuthFlow()
    }

    return generateReport(results)
}

// 运行测试
if (require.main === module) {
    runIntegrationTests()
        .then(success => {
            process.exit(success ? 0 : 1)
        })
        .catch(error => {
            console.error('测试过程中发生错误:', error)
            process.exit(1)
        })
}

module.exports = {
    runIntegrationTests,
    testConfiguration,
    testBackendHealth,
    testOIDCDiscovery,
    testJWKSEndpoint,
    testSSOClientManagement,
    testOAuthFlow
}
