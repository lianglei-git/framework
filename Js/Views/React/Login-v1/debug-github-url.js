/**
 * 调试GitHub授权URL生成
 * 检查实际生成的PKCE参数
 */

// 模拟修复后的SSO服务类
class MockSSOService {
    constructor(config) {
        this.config = config
        this.providers = new Map()
    }

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

        console.log('shouldUsePKCE:', shouldUsePKCE)
        console.log('providerConfig?.client_secret:', providerConfig?.client_secret)
        console.log('this.config.clientSecret:', this.config.clientSecret)
        console.log('providerConfig?.requirePKCE:', providerConfig?.requirePKCE)

        if (shouldUsePKCE) {
            const pkceParams = this.generatePKCE()
            console.log('生成的PKCE参数:', pkceParams)

            params.append('code_challenge', pkceParams.code_challenge)
            params.append('code_challenge_method', 'S256')

            console.log('添加的code_challenge:', pkceParams.code_challenge)
            console.log('添加的code_challenge_method: S256')
        }

        const baseUrl = providerConfig?.authorization_url || provider.authorizationUrl || `${this.config.ssoServerUrl}/api/v1/auth/oauth/authorize`
        const finalUrl = `${baseUrl}?${params.toString()}`

        console.log('最终URL:', finalUrl)

        // 解析并验证URL参数
        const url = new URL(finalUrl)
        const urlParams = url.searchParams

        console.log('URL参数:')
        for (const [key, value] of urlParams.entries()) {
            console.log(`  ${key}: ${value}`)
        }

        return finalUrl
    }

    generatePKCE() {
        const codeVerifier = this.generateRandomString(128)
        const codeChallenge = this.base64URLEncode(this.sha256Sync(codeVerifier))

        console.log('codeVerifier长度:', codeVerifier.length)
        console.log('codeChallenge长度:', codeChallenge.length)
        console.log('codeChallenge:', codeChallenge)

        return { code_verifier: codeVerifier, code_challenge: codeChallenge }
    }

    sha256Sync(message) {
        // 模拟32字节的SHA256哈希
        const hash = new Uint8Array(32)
        for (let i = 0; i < 32; i++) {
            hash[i] = Math.floor(Math.random() * 256)
        }
        return hash.buffer
    }

    base64URLEncode(buffer) {
        const uint8Array = new Uint8Array(buffer)
        let binaryString = ''
        for (let i = 0; i < uint8Array.length; i++) {
            binaryString += String.fromCharCode(uint8Array[i])
        }
        const base64 = btoa(binaryString)
        const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
        return base64url
    }

    generateRandomString(length) {
        const array = new Uint8Array(length)
        for (let i = 0; i < length; i++) {
            array[i] = Math.floor(Math.random() * 128)
        }
        return Array.from(array, byte => String.fromCharCode(byte)).join('')
    }

    setProvider(providerId, provider) {
        this.providers.set(providerId, provider)
    }
}

// 测试GitHub URL生成
function testGitHubURL() {
    console.log('🧪 测试GitHub授权URL生成...')

    const config = {
        ssoServerUrl: 'http://localhost:8080',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        redirectUri: 'http://localhost:5173/auth/callback',
        scope: ['openid', 'profile', 'email'],
        responseType: 'code'
    }

    const ssoService = new MockSSOService(config)

    // GitHub配置
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

    ssoService.setProvider('github', githubProvider)

    try {
        const authUrl = ssoService.buildAuthorizationUrl('github', {
            redirect_uri: 'http://localhost:5173/auth/callback',
            scope: ['user:email', 'read:user'],
            response_type: 'code'
        })

        console.log('✅ GitHub授权URL生成成功')

        // 验证URL中的PKCE参数
        const url = new URL(authUrl)
        const params = url.searchParams

        const codeChallenge = params.get('code_challenge')
        const codeChallengeMethod = params.get('code_challenge_method')

        console.log('🔍 PKCE参数验证:')
        console.log('code_challenge:', codeChallenge)
        console.log('code_challenge_method:', codeChallengeMethod)

        if (codeChallenge && codeChallenge.length === 43) {
            console.log('✅ code_challenge长度正确（43字符）')
        } else {
            console.log('❌ code_challenge长度不正确')
        }

        if (codeChallengeMethod === 'S256') {
            console.log('✅ code_challenge_method正确（S256）')
        } else {
            console.log('❌ code_challenge_method不正确')
        }

        console.log('🎉 测试完成')

    } catch (error) {
        console.error('❌ 测试失败:', error.message)
    }
}

testGitHubURL()
