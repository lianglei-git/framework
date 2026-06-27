/**
 * @sparrow/auth-sdk — headless SSO client (vanilla core)
 */
export { default as SSOSDK } from './core/SSOSDK'
export { default as SSOConfig } from './core/SSOConfig'
export { default as SSOTokenManager } from './core/SSOTokenManager'
export { default as SSOSessionManager } from './core/SSOSessionManager'
export { default as SSOSecurityManager } from './core/SSOSecurityManager'
export * from './types'
import SSOSDK from './core/SSOSDK'

export function createSSO(config: Record<string, unknown>) {
    return new SSOSDK(config)
}

export const VERSION = '1.0.0'
