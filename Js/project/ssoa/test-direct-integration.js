#!/usr/bin/env node

/**
 * SSOA项目直接集成unit-auth测试
 * 测试SSOA项目是否能正确直接调用unit-auth后端API
 */

import http from 'http'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('🧪 SSOA项目直接集成unit-auth测试')
console.log('================================')

// 测试配置
const CONFIG = {
    backendUrl: 'http://localhost:8080',
    ssoaUrl: 'http://localhost:5173',
    redirectUrl: 'http://localhost:5173/auth/callback'
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

// 测试unit-auth后端API
async function testUnitAuthAPI() {
    console.log('\n🔧 测试unit-auth后端API...')

    // 测试健康检查端点
    const healthCheck = await checkServiceHealth(`${CONFIG.backendUrl}/api/monitoring/health`, '后端健康检查')

    // 测试OAuth端点
    const oauthEndpoints = [
        { path: '/api/v1/auth/oauth/authorize', name: 'OAuth授权端点' },
        { path: '/api/v1/auth/oauth/token', name: '令牌端点' },
        { path: '/api/v1/auth/oauth/userinfo', name: '用户信息端点' },
        { path: '/api/v1/auth/oauth/logout', name: '登出端点' }
    ]

    let allPassed = true
    for (const endpoint of oauthEndpoints) {
        try {
            const response = await fetch(`${CONFIG.backendUrl}${endpoint.path}`, {
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

    return healthCheck && allPassed
}

// 测试SSOA应用配置
async function testSSOAConfig() {
    console.log('\n📱 测试SSOA应用配置...')

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
            if (content.includes('localhost:8080')) {
                console.log(`✅ ${file} - 配置文件正确指向unit-auth`)
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

        if (envContent.includes('VITE_SSO_SERVER_URL=http://localhost:8080')) {
            console.log('✅ 环境变量配置正确 - 指向unit-auth后端')
        } else {
            console.log('❌ 环境变量配置错误 - 应该指向unit-auth后端')
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

    try {
        // 测试构建授权URL
        const authorizeUrl = `${CONFIG.backendUrl}/api/v1/auth/oauth/authorize?client_id=ssoa-client&redirect_uri=${encodeURIComponent(CONFIG.redirectUrl)}&response_type=code&scope=openid profile email`

        const response = await fetch(authorizeUrl)

        if (response.ok || response.status === 401) {
            console.log('✅ OAuth授权端点工作正常')
            console.log(`📍 授权URL: ${authorizeUrl}`)
        } else {
            console.log('❌ OAuth授权端点返回错误')
            return false
        }

    } catch (error) {
        console.log('❌ OAuth授权端点连接失败')
        return false
    }

    return true
}

// 显示测试结果
function showTestResults(results) {
    const { backend, ssoaConfig, config, authFlow } = results

    console.log('\n========================')
    console.log('📊 测试结果总结')
    console.log('========================')

    const totalTests = 4
    const passedTests = [backend, ssoaConfig, config, authFlow].filter(Boolean).length

    console.log(`总测试数: ${totalTests}`)
    console.log(`通过测试: ${passedTests}`)
    console.log(`失败测试: ${totalTests - passedTests}`)

    if (passedTests === totalTests) {
        console.log('\n🎉 所有测试通过！SSOA项目已正确配置直接集成unit-auth')
        console.log('\n🚀 下一步:')
        console.log('1. 启动unit-auth后端: cd ../Go/unit-auth && go run main.go')
        console.log('2. 启动SSOA应用: pnpm run dev')
        console.log('3. 访问: http://localhost:5173 测试SSO功能')
        console.log('4. 点击登录按钮应该重定向到Login-v1进行认证')
        console.log('5. 认证成功后返回SSOA应用')
    } else {
        console.log('\n⚠️  部分测试失败，请检查以下项目:')
        if (!backend) console.log('  - unit-auth后端服务')
        if (!ssoaConfig) console.log('  - SSOA应用文件')
        if (!config) console.log('  - 配置文件')
        if (!authFlow) console.log('  - 认证流程端点')

        console.log('\n🔧 修复建议:')
        console.log('1. 确保unit-auth后端服务在端口8080运行')
        console.log('2. 检查SSOA配置文件中的URL设置')
        console.log('3. 查看unit-auth后端的日志文件')
    }
}

// 主测试函数
async function main() {
    console.log('开始测试SSOA项目与unit-auth的直接集成...')
    console.log(`配置信息:`)
    console.log(`- unit-auth后端: ${CONFIG.backendUrl}`)
    console.log(`- SSOA应用: ${CONFIG.ssoaUrl}`)
    console.log(`- 重定向URI: ${CONFIG.redirectUrl}`)

    // 运行各项测试
    const backend = await testUnitAuthAPI()
    const ssoaConfig = await testSSOAConfig()
    const config = testConfiguration()
    const authFlow = await testAuthFlow()

    // 显示结果
    const results = { backend, ssoaConfig, config, authFlow }
    showTestResults(results)

    // 退出
    process.exit(passedTests === totalTests ? 0 : 1)
}

// 运行测试
const totalTests = 4
const passedTests = 0

main().catch(error => {
    console.error('测试过程中发生错误:', error)
    process.exit(1)
})
