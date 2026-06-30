/** PKCE (RFC 7636) helpers for OAuth authorization code flow */

async function sha256(message: string): Promise<ArrayBuffer> {
    const msgBuffer = new TextEncoder().encode(message)
    return crypto.subtle.digest('SHA-256', msgBuffer)
}

function generateRandomString(length: number): string {
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    const allowedChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
    let result = ''
    for (let i = 0; i < length; i++) {
        result += allowedChars.charAt(array[i] % allowedChars.length)
    }
    return result
}

function base64URLEncode(buffer: ArrayBuffer): string {
    const uint8Array = new Uint8Array(buffer)
    let binaryString = ''
    for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i])
    }
    const base64 = btoa(binaryString)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function generatePKCE(): Promise<{ code_verifier: string; code_challenge: string }> {
    const codeVerifier = generateRandomString(128)
    const codeChallenge = base64URLEncode(await sha256(codeVerifier))
    return { code_verifier: codeVerifier, code_challenge: codeChallenge }
}

export function generateOAuthState(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
}
