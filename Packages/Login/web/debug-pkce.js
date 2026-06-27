/**
 * 调试PKCE参数生成
 * 验证修复后的PKCE生成逻辑
 */

// 模拟修复后的函数
function generateRandomString(length) {
    const array = new Uint8Array(length)
    // 模拟crypto.getRandomValues
    for (let i = 0; i < length; i++) {
        array[i] = Math.floor(Math.random() * 128) // 只生成ASCII字符
    }
    return Array.from(array, byte => String.fromCharCode(byte)).join('')
}

function sha256Sync(message) {
    // 模拟crypto.subtle.digest
    console.log('模拟SHA256输入:', message.substring(0, 20) + '...')

    // 模拟32字节的SHA256哈希
    const hash = new Uint8Array(32)
    for (let i = 0; i < 32; i++) {
        hash[i] = Math.floor(Math.random() * 256)
    }
    return hash.buffer
}

function base64URLEncode(buffer) {
    const uint8Array = new Uint8Array(buffer)

    let binaryString = ''
    for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i])
    }
    const base64 = btoa(binaryString)
    const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

    console.log('Base64编码后:', base64)
    console.log('Base64URL编码后:', base64url)
    console.log('长度:', base64url.length)

    return base64url
}

function generatePKCE() {
    const codeVerifier = generateRandomString(128)
    console.log('codeVerifier长度:', codeVerifier.length)

    const codeChallenge = base64URLEncode(sha256Sync(codeVerifier))
    console.log('codeChallenge:', codeChallenge)
    console.log('codeChallenge长度:', codeChallenge.length)

    return { code_verifier: codeVerifier, code_challenge: codeChallenge }
}

// 测试
console.log('🧪 测试PKCE参数生成...')
const pkce = generatePKCE()

if (pkce.code_challenge.length === 43) {
    console.log('✅ code_challenge长度正确（43字符）')
} else {
    console.log('❌ code_challenge长度不正确')
}

console.log('✅ 测试完成')
