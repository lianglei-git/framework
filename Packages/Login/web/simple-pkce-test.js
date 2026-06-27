/**
 * 简单的PKCE参数生成测试
 */

const crypto = require('crypto')

// 生成随机字符串
function generateRandomString(length) {
    const array = new Uint8Array(length)
    for (let i = 0; i < length; i++) {
        array[i] = Math.floor(Math.random() * 256)
    }
    return Array.from(array, byte => String.fromCharCode(byte)).join('')
}

// SHA256哈希
function sha256Sync(message) {
    const hash = crypto.createHash('sha256')
    hash.update(message)
    return hash.digest()
}

// Base64URL编码
function base64URLEncode(buffer) {
    const base64 = buffer.toString('base64')
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// 测试PKCE参数生成
function testPKCE() {
    console.log('🧪 测试PKCE参数生成...')

    // 生成code_verifier (128字符的随机字符串)
    const codeVerifier = generateRandomString(128)
    console.log('code_verifier长度:', codeVerifier.length)

    // 生成code_challenge (SHA256哈希并进行Base64URL编码)
    const hashBuffer = sha256Sync(codeVerifier)
    const codeChallenge = base64URLEncode(hashBuffer)

    console.log('code_challenge长度:', codeChallenge.length)
    console.log('code_challenge:', codeChallenge)

    // 验证code_challenge长度（S256方法应该是43个字符）
    if (codeChallenge.length === 43) {
        console.log('✅ code_challenge长度正确（43字符）')
    } else {
        console.log('❌ code_challenge长度不正确')
    }

    return { codeVerifier, codeChallenge }
}

// 运行测试
testPKCE()
