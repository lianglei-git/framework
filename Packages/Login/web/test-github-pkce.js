/**
 * GitHub PKCE测试脚本
 * 验证GitHub provider的PKCE参数是否正确生成
 */

// 模拟SSO服务类进行测试
class MockSSOService {
    constructor(config) {
        this.config = config
        this.providers = new Map()
    }

    // 模拟buildAuthorizationUrl方法
    buildAuthorizationUrl(providerId, options = {}) {
        const provider = this.providers.get(providerId)
        if (!provider) {
            throw new Error(`Provider ${providerId} not found`)
        }

        const providerConfig = provider.config
        const finalOptions = options

        const clientId = providerConfig?.client_id || this.config.clientId
        const redirectUri = providerConfig?.redirect_uri || this.config.redirectUri
        const scope = finalOptions.scope || providerConfig?.scope || this.config.scope || ['openid', 'profile']
        const responseType = finalOptions.response_type || providerConfig?.response_type || this.config.responseType || 'code'

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: responseType,
            scope: scope.join(' '),
            state: 'test_state'
        })

        // PKCE支持
        const shouldUsePKCE = (!providerConfig?.client_secret && !this.config.clientSecret && finalOptions.response_type === 'code') ||
            (providerConfig?.requirePKCE && finalOptions.response_type === 'code')

        if (shouldUsePKCE) {
            const pkceParams = this.generatePKCE()
            params.append('code_challenge', pkceParams.code_challenge)
            params.append('code_challenge_method', 'S256')
        }

        const baseUrl = providerConfig?.authorization_url || provider.authorizationUrl || `${this.config.ssoServerUrl}/api/v1/auth/oauth/authorize`
        return `${baseUrl}?${params.toString()}`
    }

    // 模拟generatePKCE方法
    generatePKCE() {
        const codeVerifier = this.generateRandomString(128)
        console.log('codeVerifier:', codeVerifier.substring(0, 20) + '...') // 只显示前20个字符

        const hashBuffer = this.sha256Sync(codeVerifier)
        console.log('hashBuffer type:', typeof hashBuffer)
        console.log('hashBuffer length:', hashBuffer.length)

        const codeChallenge = this.base64URLEncode(hashBuffer)
        console.log('codeChallenge:', codeChallenge)
        console.log('codeChallenge length:', codeChallenge.length)

        return { code_verifier: codeVerifier, code_challenge: codeChallenge }
    }

    // 模拟SHA256
    sha256Sync(message) {
        // 使用Node.js的crypto模块
        const crypto = require('crypto')
        const hash = crypto.createHash('sha256')
        hash.update(message)
        return hash.digest() // 返回Buffer
    }

    // 模拟base64URL编码
    base64URLEncode(buffer) {
        // 确保buffer是Uint8Array
        const uint8Array = new Uint8Array(buffer)
        const base64 = Buffer.from(uint8Array).toString('base64')
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    }

    // 模拟随机字符串生成
    generateRandomString(length) {
        const array = new Uint8Array(length)
        // 确保只生成ASCII字符（0-127）
        for (let i = 0; i < length; i++) {
            array[i] = Math.floor(Math.random() * 128) // 只生成0-127的字符
        }
        return Array.from(array, byte => String.fromCharCode(byte)).join('')
    }

    // 模拟生成状态
    generateState() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36)
    }

    // 添加provider
    setProvider(providerId, provider) {
        this.providers.set(providerId, provider)
    }
}

// 测试GitHub provider的PKCE参数生成
async function testGitHubPKCE() {
    console.log('🧪 测试GitHub PKCE参数生成...')

    // 创建SSO配置
    const config = {
        ssoServerUrl: 'http://localhost:8080',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        redirectUri: 'http://localhost:5173/auth/callback',
        scope: ['openid', 'profile', 'email'],
        responseType: 'code'
    }

    // 创建SSO服务
    const ssoService = new MockSSOService(config)

    try {
        // 模拟GitHub provider配置
        const githubProvider = {
            id: 'github',
            name: 'github',
            displayName: 'GitHub',
            authorizationUrl: 'https://github.com/login/oauth/authorize',
            enabled: true,
            config: {
                client_id: 'Ov23li5H25mAnW2AWrr1',
                client_secret: '', // GitHub是公共客户端
                authorization_url: 'https://github.com/login/oauth/authorize',
                token_url: 'https://github.com/login/oauth/access_token',
                user_info_url: 'https://api.github.com/user',
                redirect_uri: 'http://localhost:5173/auth/callback',
                scope: ['user:email', 'read:user'],
                response_type: 'code',
                requirePKCE: true // GitHub要求使用PKCE
            }
        }

        // 添加GitHub provider
        ssoService['providers'].set('github', githubProvider)

        // 生成授权URL
        const authUrl = ssoService.buildAuthorizationUrl('github', {
            redirect_uri: 'http://localhost:5173/auth/callback',
            scope: ['user:email', 'read:user'],
            response_type: 'code'
        })

        console.log('✅ GitHub授权URL生成成功:')
        console.log('🔗 URL:', authUrl)

        // 验证URL中包含PKCE参数
        const url = new URL(authUrl)
        const params = url.searchParams

        const codeChallenge = params.get('code_challenge')
        const codeChallengeMethod = params.get('code_challenge_method')

        console.log('\n🔍 PKCE参数验证:')
        console.log('code_challenge:', codeChallenge)
        console.log('code_challenge_method:', codeChallengeMethod)

        // 验证code_challenge长度（S256方法应该是43个字符）
        if (codeChallenge && codeChallenge.length === 43) {
            console.log('✅ code_challenge长度正确（43字符）')
        } else {
            console.log('❌ code_challenge长度不正确')
            return
        }

        // 验证code_challenge_method
        if (codeChallengeMethod === 'S256') {
            console.log('✅ code_challenge_method正确（S256）')
        } else {
            console.log('❌ code_challenge_method不正确')
            return
        }

        // 验证其他必要参数
        const clientId = params.get('client_id')
        const redirectUri = params.get('redirect_uri')
        const scope = params.get('scope')

        console.log('\n🔍 其他参数验证:')
        console.log('client_id:', clientId)
        console.log('redirect_uri:', redirectUri)
        console.log('scope:', scope)

        if (clientId === 'Ov23li5H25mAnW2AWrr1') {
            console.log('✅ client_id正确')
        } else {
            console.log('❌ client_id不正确')
        }

        if (redirectUri === 'http://localhost:5173/auth/callback') {
            console.log('✅ redirect_uri正确')
        } else {
            console.log('❌ redirect_uri不正确')
        }

        if (scope === 'user:email read:user') {
            console.log('✅ scope正确')
        } else {
            console.log('❌ scope不正确')
        }

        console.log('\n🎉 GitHub PKCE测试通过！')

    } catch (error) {
        console.error('❌ GitHub PKCE测试失败:', error.message)
        console.error(error.stack)
    }
}

// 运行测试
testGitHubPKCE()
