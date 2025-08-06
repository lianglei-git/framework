import { computed, makeAutoObservable, observable, reaction } from "mobx"
import { User, UserRole } from '../types'
import { userApi } from '../services/api'
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
    avatar: undefined,
    role: UserLevelENUM.NormalUser,
}

class UserStore {
    // 状态
    showLoginPage: boolean = false
    detailsUserInfo: any = null
    info = { ...basicUserInfo }
    isLoading: boolean = false
    error: string | null = null

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
        return userApi.getAvatarSrc(this.info.avatar)
    }

    get isLogin() {
        return !!this.token
    }

    get role(): UserLevelENUM {
        return this.info.role
    }

    // 登录方法 - 兼容现有API
    login = async ({ username, password }: { username: string, password: string }, callback?: () => void) => {
        this.isLoading = true
        this.error = null

        try {
            const response = await userApi.getProfile() // 这里应该调用登录API，暂时用getProfile代替
            const type = response ? "success" : "error"
            console.log(type, response ? "登录成功" : "登录失败")

            if (response) {
                this.info.token = "mock_token" // 实际应该从登录响应中获取
                // 第一次登录请求一下详细信息
                await this.requestUserDetailsInfo()
                this.info = {
                    username,
                    remark: this.detailsUserInfo?.remark || "",
                    nickname: this.detailsUserInfo?.nickname || username,
                    token: "mock_token",
                    id: this.detailsUserInfo?.id || "",
                    avatar: this.detailsUserInfo?.avatar,
                    role: this.detailsUserInfo?.role || UserLevelENUM.NormalUser,
                }
                this.setLocalStorageUserInfo()
                callback?.()
            }
        } catch (error: any) {
            this.error = error.message || "登录失败"
            console.error("登录错误:", error)
        } finally {
            this.isLoading = false
        }
    }

    // 新的登录方法 - 使用模块化架构
    loginWithNewAPI = async (loginData: { account: string, password: string, remember_me?: boolean }) => {
        this.isLoading = true
        this.error = null

        try {
            const response = await userApi.getProfile() // 这里应该调用新的登录API

            if (response) {
                this.info = {
                    username: loginData.account,
                    nickname: response.nickname || loginData.account,
                    remark: response.remark || "",
                    token: "mock_token", // 实际应该从响应中获取
                    id: response.id || "",
                    avatar: response.avatar,
                    role: response.role || UserLevelENUM.NormalUser,
                }

                if (loginData.remember_me) {
                    this.setLocalStorageUserInfo()
                }

                return response
            } else {
                throw new Error("登录失败")
            }
        } catch (error: any) {
            this.error = error.message || "登录失败"
            throw error
        } finally {
            this.isLoading = false
        }
    }

    // 微信登录
    wechatLogin = async (userInfo: any, token: string) => {
        this.setUserInfo(userInfo, token)
    }

    // 登出
    logout = () => {
        localStorage.setItem("t_remeberInfo", "")
        this.info = { ...basicUserInfo }
        this.error = null
    }

    // 设置用户信息
    setUserInfo = (userInfo: any, token: string) => {
        this.info = {
            username: userInfo.username || userInfo.openid || '',
            nickname: userInfo.nickname || '',
            remark: userInfo.remark || '',
            token: token || '',
            id: userInfo.id || '',
            avatar: userInfo.avatar || userInfo.headimgurl || undefined,
            role: userInfo.role || UserLevelENUM.NormalUser,
        }
        this.setLocalStorageUserInfo()
    }

    // 更新用户信息
    updateUserInfo = async (userData: Partial<User>) => {
        this.isLoading = true
        this.error = null

        try {
            const updatedUser = await userApi.updateProfile(userData)
            this.info = { ...this.info, ...updatedUser }
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
                    nickname: authinfo.user.nickname,
                    remark: authinfo.user.remark,
                    id: authinfo.user.id,
                    avatar: authinfo.user.meta?.avatar || undefined,
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
        return this.info.role === role
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