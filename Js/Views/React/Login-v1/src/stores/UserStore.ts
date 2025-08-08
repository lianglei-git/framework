import { computed, makeAutoObservable, observable, reaction } from "mobx"
import { User, UserRole } from '../types'
import { authApi, userApi } from '../services/api'
import { storageManager } from "../utils"

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

    // 登录状态监听器
    private loginListeners: (() => void)[] = []

    constructor() {
        makeAutoObservable(this)
        this.getLocalStorageUserInfo()

        window.addEventListener('auth:login', (event: any) => {
            this.getLocalStorageUserInfo();
        })
    }

    // 计算属性
    get user() {
        return this.info.username
    }

    get nickName() {
        return this.info.nickname
    }

    get token() {
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
        await authApi.logout();
        storageManager.clearAuthData();
        this.info = { ...basicUserInfo }
        this.error = null
        this.notifyLoginListeners() // 触发登录监听器
    }

    // 设置用户信息
    setUserInfo = (userInfo: any, token: string) => {
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
        this.notifyLoginListeners() // 触发登录监听器
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
            this.error = error.message || "更新用户信息失败"
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
        const authinfo = storageManager.getAuthData();
        if (authinfo) {
            try {
                this.info = {
                    ...this.info,
                    ...authinfo,
                    username: authinfo.user.username,
                    nickname: authinfo.user.meta?.nickname || authinfo.user.nickname,
                    remark: authinfo.user.meta?.bio || authinfo.user.remark,
                    id: authinfo.user.id,
                    avatar: authinfo.user.avatar || authinfo.user.meta?.avatar || undefined,
                    role: authinfo.user.role ? this.convertUserRole(authinfo.user.role) : UserLevelENUM.NormalUser,
                }
            } catch (error) {
                console.error("解析本地存储用户信息失败:", error)
            }
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