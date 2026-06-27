/**
 * Sparrow SSO SDK
 * 单点登录开发工具包主入口文件
 */

// 导出核心SDK类
export { default as SSOSDK } from './core/SSOSDK'
export { default as SSOConfig } from './core/SSOConfig'
export { default as SSOTokenManager } from './core/SSOTokenManager'
export { default as SSOSessionManager } from './core/SSOSessionManager'
export { default as SSOSecurityManager } from './core/SSOSecurityManager'

// 导出框架集成
export * from './frameworks/react'
export * from './frameworks/vue'
export * from './frameworks/angular'
export * from './frameworks/vanilla'

// 导出工具函数
export * from './utils/helpers'
export * from './utils/storage'
export * from './utils/security'
export * from './utils/network'

// 导出类型定义
export * from './types'

// 导出常量
export * from './constants'

// 默认导出SDK实例创建函数
export function createSSO(config: any) {
    return new SSOSDK(config)
}

// 导出版本信息
export const VERSION = '1.0.0'
