/**
 * 设备指纹生成工具
 * 用于唯一标识用户的设备，支持 session 去重
 */

import { getLocalStorage } from './browserStorage'

const STORAGE_KEY = 'device_fingerprint'

/**
 * 获取设备指纹
 * 基于浏览器特征生成唯一标识，存储在 localStorage 中
 */
export function getDeviceFingerprint(): string {
    // 尝试从 localStorage 读取已有的设备ID
    const store = getLocalStorage()
    let deviceId = store?.getItem(STORAGE_KEY) ?? null
    
    if (!deviceId) {
        // 生成新的设备ID
        deviceId = generateDeviceId()
        
        try {
            store?.setItem(STORAGE_KEY, deviceId)
            console.log('✅ 设备指纹已生成:', deviceId)
        } catch (error) {
            console.error('❌ 保存设备指纹失败:', error)
        }
    } else {
        console.log('✅ 使用已有设备指纹:', deviceId)
    }
    
    return deviceId
}

/**
 * 生成设备ID
 * 方案1：简单的随机UUID（推荐，避免隐私问题）
 */
function generateDeviceId(): string {
    // 检查浏览器是否支持 crypto.randomUUID
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return 'device_' + crypto.randomUUID()
    }
    
    // 降级方案：使用时间戳 + 随机数
    return 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

/**
 * 生成基于浏览器特征的设备指纹（高级方案，可选）
 * 注意：此方案涉及浏览器指纹识别，可能有隐私问题
 */
export function generateBrowserBasedFingerprint(): string {
    const features = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 'unknown',
        navigator.platform,
    ].join('|')
    
    // 简单的哈希函数
    return 'browser_' + simpleHash(features)
}

/**
 * 简单的字符串哈希函数
 */
function simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36)
}

/**
 * 清除设备指纹（用于测试或重置）
 */
export function clearDeviceFingerprint(): void {
    try {
        getLocalStorage()?.removeItem(STORAGE_KEY)
        console.log('✅ 设备指纹已清除')
    } catch (error) {
        console.error('❌ 清除设备指纹失败:', error)
    }
}

/**
 * 检查是否已有设备指纹
 */
export function hasDeviceFingerprint(): boolean {
    return !!getLocalStorage()?.getItem(STORAGE_KEY)
}

