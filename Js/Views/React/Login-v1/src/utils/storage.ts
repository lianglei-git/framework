import { LocalStorageData, StorageType, Theme, User, SSOToken, SSOSession, SSOConfig } from '../types'

// 存储管理器
export class StorageManager {
    private prefix = 'verita_'

    // 认证相关存储
    saveAuthData(data: LocalStorageData): void {
        this.set('auth_data', data)
    }

    getAuthData(): LocalStorageData | null {
        return this.get('auth_data')
    }

    clearAuthData(): void {
        this.remove('auth_data')
    }

    getToken(): string | null {
        const authData = this.getAuthData()
        return authData?.token || null
    }

    getUser(): User | null {
        const authData = this.getAuthData()
        return authData?.user || null
    }

    isRememberMe(): boolean {
        const authData = this.getAuthData()
        return authData?.remember_me || false
    }

    // SSO相关存储
    saveSSOData(data: { token: SSOToken; expires_at: number }): void {
        this.set('sso_data', data, this.getSSOStorageType())
    }

    getSSOData(): { token: SSOToken; expires_at: number } | null {
        return this.get('sso_data', this.getSSOStorageType())
    }

    clearSSOData(): void {
        this.remove('sso_data', this.getSSOStorageType())
    }

    saveSSOSession(session: SSOSession): void {
        this.set('sso_session', session, this.getSSOStorageType())
    }

    getSSOSession(): SSOSession | null {
        return this.get('sso_session', this.getSSOStorageType())
    }

    clearSSOSession(): void {
        this.remove('sso_session', this.getSSOStorageType())
    }

    getSSOAccessToken(): string | null {
        const data = this.getSSOData()
        return data?.token?.access_token || null
    }

    getSSORefreshToken(): string | null {
        const data = this.getSSOData()
        return data?.token?.refresh_token || null
    }

    isSSOTokenExpired(): boolean {
        const data = this.getSSOData()
        return data ? Date.now() >= data.expires_at : true
    }

    getSSOStorageType(): StorageType {
        // 从配置或环境变量获取存储类型，默认为localStorage
        return (this.get('sso_storage_type') as StorageType) || StorageType.LOCAL
    }

    setSSOStorageType(type: StorageType): void {
        this.set('sso_storage_type', type, StorageType.LOCAL)
    }

    // 主题和语言
    saveTheme(theme: Theme): void {
        this.set('theme', theme)
    }

    getTheme(): Theme {
        return this.get('theme') || 'light'
    }

    saveLanguage(language: string): void {
        this.set('language', language)
    }

    getLanguage(): string {
        return this.get('language') || 'zh-CN'
    }

    // 用户设置
    saveUserSettings(settings: Record<string, any>): void {
        this.set('user_settings', settings)
    }

    getUserSettings(): Record<string, any> {
        return this.get('user_settings') || {}
    }

    // 通用方法
    set<T>(key: string, value: T, type: StorageType = StorageType.LOCAL): void {
        const storage = type === StorageType.LOCAL ? localStorage : sessionStorage
        const fullKey = `${this.prefix}${key}`

        try {
            storage.setItem(fullKey, JSON.stringify(value))
        } catch (error) {
            console.error('Storage set error:', error)
        }
    }

    get<T>(key: string, type: StorageType = StorageType.LOCAL): T | null {
        const storage = type === StorageType.LOCAL ? localStorage : sessionStorage
        const fullKey = `${this.prefix}${key}`

        try {
            const item = storage.getItem(fullKey)
            return item ? JSON.parse(item) : null
        } catch (error) {
            console.error('Storage get error:', error)
            return null
        }
    }

    remove(key: string, type: StorageType = StorageType.LOCAL): void {
        const storage = type === StorageType.LOCAL ? localStorage : sessionStorage
        const fullKey = `${this.prefix}${key}`

        try {
            storage.removeItem(fullKey)
        } catch (error) {
            console.error('Storage remove error:', error)
        }
    }

    has(key: string, type: StorageType = StorageType.LOCAL): boolean {
        const storage = type === StorageType.LOCAL ? localStorage : sessionStorage
        const fullKey = `${this.prefix}${key}`

        try {
            return storage.getItem(fullKey) !== null
        } catch (error) {
            console.error('Storage has error:', error)
            return false
        }
    }

    clear(type?: StorageType): void {
        const storage = type === StorageType.LOCAL ? localStorage : sessionStorage

        try {
            if (type) {
                // 清除指定类型的存储
                const keys = Object.keys(storage)
                keys.forEach(key => {
                    if (key.startsWith(this.prefix)) {
                        storage.removeItem(key)
                    }
                })
            } else {
                // 清除所有存储
                localStorage.clear()
                sessionStorage.clear()
            }
        } catch (error) {
            console.error('Storage clear error:', error)
        }
    }
}

// 创建存储管理器实例
const storageManager = new StorageManager()

// 便捷方法
export const storage = {
    // 认证相关
    saveAuth: (data: LocalStorageData) => storageManager.saveAuthData(data),
    getAuth: () => storageManager.getAuthData(),
    clearAuth: () => storageManager.clearAuthData(),
    getToken: () => storageManager.getToken(),
    getUser: () => storageManager.getUser(),
    isRememberMe: () => storageManager.isRememberMe(),

    // 主题和语言
    saveTheme: (theme: Theme) => storageManager.saveTheme(theme),
    getTheme: () => storageManager.getTheme(),
    saveLanguage: (language: string) => storageManager.saveLanguage(language),
    getLanguage: () => storageManager.getLanguage(),

    // 用户设置
    saveUserSettings: (settings: Record<string, any>) => storageManager.saveUserSettings(settings),
    getUserSettings: () => storageManager.getUserSettings(),

    // SSO相关
    saveSSOData: (data: { token: SSOToken; expires_at: number }) => storageManager.saveSSOData(data),
    getSSOData: () => storageManager.getSSOData(),
    clearSSOData: () => storageManager.clearSSOData(),
    saveSSOSession: (session: SSOSession) => storageManager.saveSSOSession(session),
    getSSOSession: () => storageManager.getSSOSession(),
    clearSSOSession: () => storageManager.clearSSOSession(),
    getSSOAccessToken: () => storageManager.getSSOAccessToken(),
    getSSORefreshToken: () => storageManager.getSSORefreshToken(),
    isSSOTokenExpired: () => storageManager.isSSOTokenExpired(),
    getSSOStorageType: () => storageManager.getSSOStorageType(),
    setSSOStorageType: (type: StorageType) => storageManager.setSSOStorageType(type),

    // 通用方法
    set: <T>(key: string, value: T, type?: StorageType) => storageManager.set(key, value, type),
    get: <T>(key: string, type?: StorageType) => storageManager.get<T>(key, type),
    remove: (key: string, type?: StorageType) => storageManager.remove(key, type),
    has: (key: string, type?: StorageType) => storageManager.has(key, type),
    clear: (type?: StorageType) => storageManager.clear(type)
}

// 导出存储管理器实例
export { storageManager } 