import { User } from '../types'
import { ApiService, getCommonHeaders } from './httpClient'
import { resolveAvatarUrl } from '../utils/avatarUrl'
import { readLegacyAuthToken } from '../utils/browserStorage'

export class UserApiService extends ApiService {
    async getProfile(): Promise<User> {
        const response = await this.get<{ code: number, data: User, message?: string }>(`${this.baseURL}/api/v1/user/profile`, undefined, {
            headers: getCommonHeaders(readLegacyAuthToken())
        })

        if (response.code === 200) {
            return response.data
        } else {
            throw new Error(response.message || '获取用户信息失败')
        }
    }

    async updateProfile(data: Partial<User>): Promise<User> {
        const response = await this.put<{ code: number, data: User, message?: string }>(`${this.baseURL}/api/v1/user/profile`, data, {
            headers: getCommonHeaders(readLegacyAuthToken())
        })

        if (response.code === 200) {
            return response.data
        } else {
            throw new Error(response.message || '更新用户信息失败')
        }
    }

    async changePassword(oldPassword: string, newPassword: string): Promise<void> {
        const response = await this.post<{ code: number, message?: string }>(`${this.baseURL}/api/v1/user/change-password`, {
            old_password: oldPassword,
            new_password: newPassword
        }, {
            headers: getCommonHeaders(readLegacyAuthToken())
        })

        if (response.code !== 200) {
            throw new Error(response.message || '修改密码失败')
        }
    }

    async setPassword(newPassword: string): Promise<void> {
        const response = await this.post<{ code: number, message?: string }>(`${this.baseURL}/api/v1/user/set-password`, {
            new_password: newPassword
        }, {
            headers: getCommonHeaders(readLegacyAuthToken())
        })

        if (response.code !== 200) {
            throw new Error(response.message || '设置密码失败')
        }
    }

    async uploadAvatar(file: File): Promise<{ avatar_url: string }> {
        const response = await this.upload<{ code: number, data: { avatar_url: string, avatar_key?: string }, message?: string }>(`${this.baseURL}/api/v1/user/avatar`, file)

        if (response.code === 200) {
            return { avatar_url: response.data.avatar_url }
        } else {
            throw new Error(response.message || '上传头像失败')
        }
    }

    async checkUsername(username: string): Promise<boolean> {
        const response = await this.get<{ code: number, data: { available: boolean }, message?: string }>(
            `${this.baseURL}/api/v1/user/check-username`,
            { username },
            {
                headers: getCommonHeaders(readLegacyAuthToken())
            }
        )

        if (response.code === 200) {
            return !!response.data.available
        }
        throw new Error(response.message || '检查用户ID失败')
    }

    async deleteAccount(password: string): Promise<void> {
        const response = await this.post<{ code: number, message?: string }>(`${this.baseURL}/api/v1/user/delete-account`, {
            password: password
        }, {
            headers: getCommonHeaders(readLegacyAuthToken())
        })

        if (response.code !== 200) {
            throw new Error(response.message || '删除账户失败')
        }
    }

    /** @deprecated 优先使用 API 返回的 user.avatar_url；仅作旧缓存 fallback */
    getAvatarSrc(avatar: string | undefined): string | undefined {
        return resolveAvatarUrl(avatar, this.baseURL)
    }
}

export const userApi = new UserApiService()
export const updateUserInfoAPI = userApi.updateProfile.bind(userApi)
export const getDefatilsUserInfoAPI = userApi.getProfile.bind(userApi)
export const getAvatarSrc = userApi.getAvatarSrc.bind(userApi)
