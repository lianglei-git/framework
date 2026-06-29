import { makeAutoObservable } from "mobx"
import { User, UserRole, type SSOSession, type SSOUser } from '../types'
import { authApi, userApi } from '../services/api'
import { storageManager } from "../utils"
import { storage } from '../utils/storage'
import { clearOriginAppUri } from '../utils/ssoOriginRedirect'
import { formatAuthError } from '../utils/authError'

// 用户等级枚举
export enum UserLevelENUM {
    SuperUser = 0,
    Developer = 1,
    NormalUser = 2,
}

// 本地存储兼容
const localStorage = globalThis.localStorage || {
    getItem: () => null,
    setItem: () => null,
    removeItem: () => null,
    clear: () => null,
}

// 基础用户信息
const basicUserInfo = {
    username: "",
    nickname: "",
    remark: "",
    token: "",
    id: "",
    avatar: undefined as string | undefined,
    role: UserLevelENUM.NormalUser,
}

class UserStore {
    // 状态
    showLoginPage: boolean = false
    detailsUserInfo: any = null
    info = { ...basicUserInfo }
    isLoading: boolean = false
    error: string | null = null
    authInfo: any = null
    ssoUser: SSOUser | null = null
    ssoSession: SSOSession | null = null

    // 登录状态监听器
    private loginListeners: (() => void)[] = []

    constructor() {
        makeAutoObservable(this)
        this.getLocalStorageUserInfo()

        window.addEventListener('auth:login', () => {
            this.syncFromStorage()
        })
    }

    // 计算属性
    get username() {
        return this.info.username
    }

    get nickName() {
        return this.info.nickname
    }

    get token() {
        if(this.info.token?.access_token) {
            return this.info.token.access_token
        }
        return this.info.token
    }

    get id() {
        return this.info.id
    }

    get avatarSrc() {
        return this.info.avatar
        // return userApi.getAvatarSrc(this.info.avatar)
    }

    get isLogin() {
        return !!this.token
    }

    /** 完整用户对象（SSO / 传统认证） */
    get user(): User | null {
        const auth = storage.getAuth()
        if (auth?.user) return auth.user
        if (!this.info.id && !this.info.username) return null
        return {
            id: this.info.id,
            username: this.info.username,
            nickname: this.info.nickname,
            role: this.info.role as unknown as UserRole,
        } as User
    }

    /** 完整 token 载荷（含 id_token、access_token 等） */
    get tokenPayload(): any {
        const auth = storage.getAuth()
        return auth?.token ?? this.info.token ?? null
    }

    get isAuthenticated(): boolean {
        return !!this.token && !!this.user
    }

    get isSSOAuthenticated(): boolean {
        return !!this.ssoUser && !!this.ssoSession
    }

    get role(): UserLevelENUM {
        return this.info.role
    }

    // 更新token
    updateToken = (newToken: string) => {
        this.info.token = newToken
        this.setLocalStorageUserInfo()
        console.log('Token已更新')
    }

    // 添加登录状态监听器
    addLoginListener = (listener: () => void) => {
        this.loginListeners.push(listener)
    }

    removeLoginListener = (listener: () => void) => {
        const index = this.loginListeners.indexOf(listener)
        if (index > -1) {
            this.loginListeners.splice(index, 1)
        }
    }

    // 触发登录状态变化
    private notifyLoginListeners = () => {
        this.loginListeners.forEach(listener => listener())
    }

    // 将UserRole转换为UserLevelENUM
    private convertUserRole(role: UserRole): UserLevelENUM {
        switch (role) {
            case UserRole.ADMIN:
                return UserLevelENUM.SuperUser
            case UserRole.MODERATOR:
                return UserLevelENUM.Developer
            case UserRole.USER:
            default:
                return UserLevelENUM.NormalUser
        }
    }

    // 微信登录
    wechatLogin = async (userInfo: any, token: string) => {
        this.setUserInfo(userInfo, token)
    }

    // 登出
    logout = async () => {
        this.isLoading = true
        try {
            await authApi.logout()
        } catch {
            // ignore
        }
        this.clearLocalAuth()
        this.isLoading = false
    }

    clearLocalAuth = () => {
        storageManager.clearAuthData()
        storage.clearAuth()
        storage.clearSSOData()
        storage.clearSSOSession()
        clearOriginAppUri()
        this.info = { ...basicUserInfo }
        this.authInfo = null
        this.ssoUser = null
        this.ssoSession = null
        this.error = null
        this.notifyLoginListeners()
    }

    /** 仅清本地 token/会话缓存，保留 IdP session cookie（供子项目测试恢复） */
    clearAuthTokensOnly = () => {
        storageManager.clearAuthData()
        storage.clearAuth()
        storage.clearSSOData()
        storage.clearSSOSession()
        this.authInfo = null
        this.info = { ...basicUserInfo }
        this.ssoUser = null
        this.ssoSession = null
        this.error = null
        this.notifyLoginListeners()
    }

    /** 从 storage 同步认证态；token 刷新时传 notify:false 避免重启续签监控 */
    syncFromStorage = (options?: { notify?: boolean }) => {
        this.getLocalStorageUserInfo()
        const authData = storage.getAuth()
        if (authData) {
            this.authInfo = authData
            if (authData.user) {
                this.setUserInfo(authData.user, authData.token, { notify: options?.notify })
            } else if (authData.token) {
                this.info = { ...this.info, token: authData.token }
            }
        }
        const session = storage.getSSOSession()
        if (session && !storage.isSSOTokenExpired()) {
            this.ssoSession = session
        }
        const ssoData = storage.getSSOData()
        if (ssoData?.user) {
            this.ssoUser = ssoData.user
        }
    }

    setAuthFromResponse = (response: any, options?: { notify?: boolean }) => {
        const authData = {
            user: response.user ?? response.token?.user,
            token: response.token,
            refresh_token: response.refresh_token,
            remember_me: response.remember_me ?? false,
            expires_at: response.expires_at ?? (response.expires_in
                ? Date.now() + response.expires_in * 1000
                : undefined),
        }
        storage.saveAuth(authData)
        this.authInfo = authData
        if (authData.user) {
            this.setUserInfo(authData.user, authData.token)
        } else if (authData.token) {
            this.info = { ...this.info, token: authData.token }
        }
        if (options?.notify) {
            window.dispatchEvent(new CustomEvent('auth:login', { detail: authData }))
        }
    }

    // 设置用户信息
    setUserInfo = (userInfo: any, token: string, options?: { notify?: boolean }) => {
        this.info = {
            username: userInfo.username || userInfo.openid || '',
            nickname: userInfo.meta?.nickname || userInfo.nickname || '',
            remark: userInfo.meta?.bio || userInfo.remark || '',
            token: token || '',
            id: userInfo.id || '',
            avatar: userInfo.avatar || userInfo.headimgurl || undefined,
            role: userInfo.role ? this.convertUserRole(userInfo.role) : UserLevelENUM.NormalUser,
        }
        this.setLocalStorageUserInfo()
        if (options?.notify !== false) {
            this.notifyLoginListeners()
        }
    }

    // 更新用户信息
    updateUserInfo = async (userData: Partial<User>) => {
        this.isLoading = true
        this.error = null

        try {
            const updatedUser = await userApi.updateProfile(userData)
            this.info = {
                ...this.info,
                username: updatedUser.username,
                nickname: updatedUser.meta?.nickname || this.info.nickname,
                remark: updatedUser.meta?.bio || this.info.remark,
                id: updatedUser.id,
                avatar: updatedUser.avatar,
                role: updatedUser.role ? this.convertUserRole(updatedUser.role) : this.info.role,
            }
            this.setLocalStorageUserInfo()
            return updatedUser
        } catch (error: any) {
            this.error = formatAuthError(error, '更新用户信息失败')
            throw error
        } finally {
            this.isLoading = false
        }
    }

    // 请求用户详细信息
    async requestUserDetailsInfo() {
        try {
            const response = await userApi.getProfile()
            this.detailsUserInfo = response
            return response
        } catch (error: any) {
            console.error("获取用户详细信息失败:", error)
            throw error
        }
    }

    // 本地存储相关
    getLocalStorageUserInfo() {
        const authinfo = storageManager.getAuthData()
        if (!authinfo?.user) {
            return this.info
        }

        try {
            const user = authinfo.user
            this.info = {
                ...this.info,
                username: user.username ?? user.email ?? '',
                nickname: user.meta?.nickname || user.nickname || '',
                remark: user.meta?.bio || user.remark || '',
                id: user.id ?? '',
                avatar: user.avatar || user.meta?.avatar || undefined,
                role: user.role ? this.convertUserRole(user.role) : UserLevelENUM.NormalUser,
            }
        } catch (error) {
            console.error('解析本地存储用户信息失败:', error)
        }
        return this.info
    }

    setLocalStorageUserInfo() {
        try {
            localStorage.setItem("t_remeberInfo", JSON.stringify(this.info))
        } catch (error) {
            console.error("保存用户信息到本地存储失败:", error)
        }
    }

    // 清除错误
    clearError = () => {
        this.error = null
    }

    // 设置错误
    setError = (error: string) => {
        this.error = error
    }

    // 检查用户权限
    hasRole = (role: string): boolean => {
        return this.info.role === this.convertUserRole(role as UserRole)
    }

    // 检查是否为管理员
    get isAdmin(): boolean {
        return this.info.role === UserLevelENUM.SuperUser || this.info.role === UserLevelENUM.Developer
    }

    // 检查是否为开发者
    get isDeveloper(): boolean {
        return this.info.role === UserLevelENUM.Developer
    }

    // 检查是否为超级用户
    get isSuperUser(): boolean {
        return this.info.role === UserLevelENUM.SuperUser
    }
}

// 创建全局用户存储实例
const globalUserStore = new UserStore()

window.globalUserStore = globalUserStore

export {
    globalUserStore,
} 