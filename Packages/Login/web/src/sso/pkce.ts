/** PKCE (RFC 7636) helpers for OAuth authorization code flow */

import { sha256Digest } from './sha256'

async function sha256(message: string): Promise<ArrayBuffer> {
    return sha256Digest(new TextEncoder().encode(message))
}

function fillRandomBytes(array: Uint8Array): void {
    if (globalThis.crypto?.getRandomValues) {
        crypto.getRandomValues(array)
        return
    }
    for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256)
    }
}

function generateRandomString(length: number): string {
    const array = new Uint8Array(length)
    fillRandomBytes(array)
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

export interface PKCEParams {
    code_verifier: string
    code_challenge: string
    code_challenge_method: 'S256'
}

export async function generatePKCE(): Promise<PKCEParams> {
    const codeVerifier = generateRandomString(128)
    const codeChallenge = base64URLEncode(await sha256(codeVerifier))
    return {
        code_verifier: codeVerifier,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
    }
}

export function generateOAuthState(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
}
