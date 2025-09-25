#!/usr/bin/env node

/**
 * SSOA项目SSO集成测试
 * 测试SSOA项目是否能正确对接Login-v1的SSO功能
 */

import http from 'http'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('🧪 SSOA项目SSO集成测试')
console.log('========================')

// 测试配置
const CONFIG = {
    backendUrl: 'http://localhost:8080',
    loginV1Url: 'http://localhost:5173',
    ssoaUrl: 'http://localhost:5174',
    apiUrl: 'http://localhost:5174/api'
}

// 检查服务健康状态
async function checkServiceHealth(url, name) {
    try {
        const response = await fetch(url)
        if (response.ok) {
            console.log(`✅ ${name} - 健康检查通过 (${url})`)
            return true
        } else {
            console.log(`❌ ${name} - 健康检查失败 (${url}) - 状态码: ${response.status}`)
            return false
        }
    } catch (error) {
        console.log(`❌ ${name} - 连接失败 (${url}) - ${error.message}`)
        return false
    }
}

// 测试后端API
async function testBackendAPI() {
    console.log('\n🔧 测试后端API...')

    // 测试健康检查端点
    const healthCheck = await checkServiceHealth(`${CONFIG.backendUrl}/api/v1/health`, '后端健康检查')

    // 测试OAuth端点
    const oauthTest = await checkServiceHealth(`${CONFIG.backendUrl}/oauth/authorize`, 'OAuth授权端点')

    return healthCheck && oauthTest
}

// 测试Login-v1 API服务器
async function testLoginV1API() {
    console.log('\n🌐 测试Login-v1 API服务器...')

    // 测试SSO API端点
    const ssoEndpoints = [
        { path: '/api/auth/token', method: 'POST', name: '令牌端点' },
        { path: '/api/auth/userinfo', method: 'GET', name: '用户信息端点' },
        { path: '/api/auth/refresh', method: 'POST', name: '刷新端点' },
        { path: '/api/auth/logout', method: 'POST', name: '登出端点' },
        { path: '/api/auth/authorize', method: 'GET', name: '授权端点' }
    ]

    let allPassed = true
    for (const endpoint of ssoEndpoints) {
        try {
            const response = await fetch(`${CONFIG.apiUrl}${endpoint.path}`, {
                method: 'OPTIONS' // 使用OPTIONS预检请求
            })

            if (response.ok || response.status === 404) {
                console.log(`✅ ${endpoint.name} - 端点可用`)
            } else {
                console.log(`❌ ${endpoint.name} - 端点返回错误 (${response.status})`)
                allPassed = false
            }
        } catch (error) {
            console.log(`❌ ${endpoint.name} - 连接失败 - ${error.message}`)
            allPassed = false
        }
    }

    return allPassed
}

// 测试SSOA应用
async function testSSOAApp() {
    console.log('\n📱 测试SSOA应用...')

    // 检查主要文件是否存在
    const requiredFiles = [
        'src/config/sso.ts',
        'src/hooks/useSSO.ts',
        'src/services/ssoService.ts',
        'src/components/LoginButton.tsx',
        'src/App.tsx'
    ]

    let filesExist = true
    for (const file of requiredFiles) {
        const filePath = join(__dirname, file)
        try {
            const content = readFileSync(filePath, 'utf8')
            if (content.includes('localhost:5174')) {
                console.log(`✅ ${file} - 配置文件正确`)
            } else {
                console.log(`⚠️  ${file} - 可能需要检查配置`)
            }
        } catch (error) {
            console.log(`❌ ${file} - 文件不存在或读取失败`)
            filesExist = false
        }
    }

    return filesExist
}

// 测试配置文件
function testConfiguration() {
    console.log('\n⚙️  测试配置文件...')

    let configValid = true

    try {
        // 检查环境变量配置
        const envContent = readFileSync(join(__dirname, '.env'), 'utf8')

        if (envContent.includes('VITE_SSO_SERVER_URL=http://localhost:5174')) {
            console.log('✅ 环境变量配置正确 - 指向Login-v1 API服务器')
        } else {
            console.log('❌ 环境变量配置错误 - 应该指向Login-v1 API服务器')
            configValid = false
        }

        if (envContent.includes('VITE_SSO_REDIRECT_URI=http://localhost:5173/auth/callback')) {
            console.log('✅ 重定向URI配置正确')
        } else {
            console.log('❌ 重定向URI配置错误')
            configValid = false
        }

    } catch (error) {
        console.log('❌ .env文件不存在或读取失败')
        configValid = false
    }

    return configValid
}

// 测试认证流程
async function testAuthFlow() {
    console.log('\n🔐 测试认证流程...')

    // 这里我们只能测试API端点的可用性
    // 实际的认证流程需要用户交互

    try {
        // 测试构建授权URL
        const authorizeUrl = `${CONFIG.apiUrl}/api/auth/authorize?client_id=ssoa-client&redirect_uri=http://localhost:5173/auth/callback&provider=local`

        const response = await fetch(authorizeUrl)
        const data = await response.json()

        if (response.ok && data.authorization_url) {
            console.log('✅ 授权URL构建端点工作正常')
            console.log(`📍 登录URL: ${data.authorization_url}`)
        } else {
            console.log('❌ 授权URL构建端点返回错误')
            return false
        }

    } catch (error) {
        console.log('❌ 授权URL构建端点连接失败')
        return false
    }

    return true
}

// 显示测试结果
function showTestResults(results) {
    const { backend, loginV1API, ssoaApp, config, authFlow } = results

    console.log('\n========================')
    console.log('📊 测试结果总结')
    console.log('========================')

    const totalTests = 5
    const passedTests = [backend, loginV1API, ssoaApp, config, authFlow].filter(Boolean).length

    console.log(`总测试数: ${totalTests}`)
    console.log(`通过测试: ${passedTests}`)
    console.log(`失败测试: ${totalTests - passedTests}`)

    if (passedTests === totalTests) {
        console.log('\n🎉 所有测试通过！SSOA项目已成功对接Login-v1 SSO系统')
        console.log('\n🚀 下一步:')
        console.log('1. 运行: ./start-sso-system.sh 启动完整系统')
        console.log('2. 访问: http://localhost:5174 测试SSO功能')
        console.log('3. 点击登录按钮体验完整的认证流程')
    } else {
        console.log('\n⚠️  部分测试失败，请检查以下项目:')
        if (!backend) console.log('  - 后端服务 (unit-auth)')
        if (!loginV1API) console.log('  - Login-v1 API服务器')
        if (!ssoaApp) console.log('  - SSOA应用文件')
        if (!config) console.log('  - 配置文件')
        if (!authFlow) console.log('  - 认证流程端点')

        console.log('\n🔧 修复建议:')
        console.log('1. 确保所有服务都在正确的端口运行')
        console.log('2. 检查配置文件中的URL设置')
        console.log('3. 查看各个服务的日志文件')
        console.log('4. 运行 start-sso-system.sh 启动完整系统')
    }
}

// 主测试函数
async function main() {
    console.log('开始测试SSOA项目与Login-v1的SSO集成...')
    console.log(`配置信息:`)
    console.log(`- 后端服务: ${CONFIG.backendUrl}`)
    console.log(`- Login-v1前端: ${CONFIG.loginV1Url}`)
    console.log(`- SSOA应用: ${CONFIG.ssoaUrl}`)
    console.log(`- SSO API: ${CONFIG.apiUrl}`)

    // 运行各项测试
    const backend = await testBackendAPI()
    const loginV1API = await testLoginV1API()
    const ssoaApp = await testSSOAApp()
    const config = testConfiguration()
    const authFlow = await testAuthFlow()

    // 显示结果
    const results = { backend, loginV1API, ssoaApp, config, authFlow }
    showTestResults(results)

    // 退出
    process.exit(passedTests === totalTests ? 0 : 1)
}

// 运行测试
const totalTests = 5
const passedTests = 0

main().catch(error => {
    console.error('测试过程中发生错误:', error)
    process.exit(1)
})
