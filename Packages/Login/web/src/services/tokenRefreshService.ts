import axios from 'axios'
import { globalUserStore } from '../stores/UserStore'
import { getSSOConfig } from '../sso/config'
import { SSOService } from '../services/sso'
import { storage } from '../utils/storage'

// Token自动续签服务
export class TokenRefreshService {
    private refreshTimer: number | null = null
    private checkInterval: number | null = null
    private refreshInFlight: Promise<void> | null = null
    private lastRefreshAttemptAt = 0
    private readonly basicUrl: string
    private readonly checkIntervalMs = 5 * 60 * 1000 // 5分钟检查一次
    private readonly refreshThresholdHours = 24 // 提前24小时续签（传统 token）
    /** OAuth access token 约 60s，两次续签最短间隔 */
    private readonly oauthMinRefreshIntervalMs = 45 * 1000
    /** OAuth：剩余不足该秒数才续签（须小于 access token 有效期） */
    private readonly oauthRefreshBeforeExpirySec = 20

    constructor() {
        this.basicUrl = (import.meta as any).env?.DEV ? "http://localhost:8080" : "https://sparrowui.cn/translate"
        this.init()
    }

    // 初始化：OAuth 子项目改由 httpClient 在 401 时续签，不做定时轮询
    private init() {
        globalUserStore.addLoginListener(() => {
            if (!globalUserStore.isLogin) {
                this.stopTokenMonitoring()
            }
        })
    }

    // 获取通用请求头
    private getCommonHeaders() {
        return {
            Authorization: `Bearer ${globalUserStore.token}`,
            'Content-Type': 'application/json'
        }
    }

    // 存储Refresh Token到本地存储
    private storeRefreshToken(refreshToken: string): void {
        try {
            localStorage.setItem('refresh_token', refreshToken)
            console.log('Refresh Token已存储')
        } catch (error) {
            console.error('存储Refresh Token失败:', error)
        }
    }

    // 从本地存储获取Refresh Token
    private getStoredRefreshToken(): string | null {
        try {
            return (
                localStorage.getItem('refresh_token') ||
                storage.getSSORefreshToken() ||
                storage.getAuth()?.token?.refresh_token ||
                null
            )
        } catch (error) {
            console.error('获取Refresh Token失败:', error)
            return null
        }
    }

    private isOAuthSubProject(): boolean {
        const cfg = getSSOConfig()
        return !!(cfg?.clientId && cfg?.ssoServerUrl)
    }

    private decodeJwtExp(token: string): number | null {
        try {
            const payload = token.split('.')[1]
            if (!payload) return null
            const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
            return typeof json.exp === 'number' ? json.exp : null
        } catch {
            return null
        }
    }

    private async checkOAuthTokenStatus(): Promise<{
        is_valid: boolean
        expires_at: string
        remaining_hours: number
        remaining_minutes: number
        remaining_seconds: number
        is_expiring_soon: boolean
        token_type: string
    } | null> {
        const accessToken =
            storage.getSSOAccessToken() ||
            (typeof globalUserStore.token === 'string'
                ? globalUserStore.token
                : globalUserStore.token?.access_token) ||
            (typeof storage.getAuth()?.token === 'string'
                ? storage.getAuth()?.token
                : storage.getAuth()?.token?.access_token)

        if (!accessToken || typeof accessToken !== 'string') {
            return null
        }

        const exp = this.decodeJwtExp(accessToken)
        if (!exp) return null

        const remainingSeconds = exp - Math.floor(Date.now() / 1000)
        const remainingMinutes = Math.max(0, Math.floor(remainingSeconds / 60))
        const remainingHours = remainingMinutes / 60

        return {
            is_valid: remainingSeconds > 0,
            expires_at: new Date(exp * 1000).toISOString(),
            remaining_hours: remainingHours,
            remaining_minutes: remainingMinutes,
            remaining_seconds: remainingSeconds,
            is_expiring_soon: remainingSeconds < this.oauthRefreshBeforeExpirySec,
            token_type: 'Bearer',
        }
    }

    private async refreshOAuthToken(): Promise<{ access_token: string } | null> {
        try {
            const cfg = getSSOConfig()
            const service = await SSOService.getInstance(cfg)
            const result = await service.refreshToken()
            if (result?.access_token) {
                globalUserStore.syncFromStorage({ notify: false })
                this.lastRefreshAttemptAt = Date.now()
                return { access_token: result.access_token }
            }
            return null
        } catch (error) {
            console.error('OAuth Token续签错误:', error)
            return null
        }
    }

    // 清除本地存储的Refresh Token
    private clearRefreshToken(): void {
        try {
            localStorage.removeItem('refresh_token')
            console.log('Refresh Token已清除')
        } catch (error) {
            console.error('清除Refresh Token失败:', error)
        }
    }

    // 检查token状态
    async checkTokenStatus(): Promise<{
        is_valid: boolean
        expires_at: string
        remaining_hours: number
        remaining_minutes: number
        remaining_seconds?: number
        is_expiring_soon: boolean
        token_type: string
    } | null> {
        if (this.isOAuthSubProject()) {
            return this.checkOAuthTokenStatus()
        }

        try {
            const response = await axios.get(`${this.basicUrl}/api/v1/auth/token-status`, {
                headers: this.getCommonHeaders()
            })

            if (response.data.code === 200) {
                return response.data.data
            } else {
                console.error('Token状态检查失败:', response.data.message)
                return null
            }
        } catch (error) {
            console.error('Token状态检查错误:', error)
            return null
        }
    }

    // 手动续签token（简单续签）
    async refreshToken(): Promise<{
        access_token: string
        token_type: string
        expires_in: number
        user_id: string
        email: string
        role: string
    } | null> {
        try {
            const response = await axios.post(`${this.basicUrl}/api/v1/auth/refresh-token`, {}, {
                headers: this.getCommonHeaders()
            })

            if (response.data.code === 200) {
                const newToken = response.data.data.access_token

                // 更新全局用户存储中的token
                globalUserStore.updateToken(newToken)

                console.log('Token续签成功')
                return response.data.data
            } else {
                console.error('Token续签失败:', response.data.message)
                return null
            }
        } catch (error) {
            console.error('Token续签错误:', error)
            return null
        }
    }

    // 双Token登录
    async loginWithTokenPair(account: string, password: string): Promise<{
        user: any
        access_token: string
        refresh_token: string
        expires_in: number
        refresh_expires_in: number
    } | null> {
        try {
            const response = await axios.post(`${this.basicUrl}/api/v1/auth/login-with-token-pair`, {
                account,
                password
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            if (response.data.code === 200) {
                const tokenData = response.data.data

                // 更新全局用户存储
                globalUserStore.updateToken(tokenData.access_token)
                globalUserStore.updateUser(tokenData.user)

                // 存储Refresh Token
                this.storeRefreshToken(tokenData.refresh_token)

                console.log('双Token登录成功')
                return tokenData
            } else {
                console.error('双Token登录失败:', response.data.message)
                return null
            }
        } catch (error) {
            console.error('双Token登录错误:', error)
            return null
        }
    }

    // 双Token续签（推荐使用）
    async refreshTokenWithRefreshToken(refreshToken?: string): Promise<{
        access_token: string
        refresh_token: string
        token_type: string
        expires_in: number
        refresh_expires_in: number
        user_id: string
        email: string
        role: string
    } | null> {
        try {
            const tokenToUse = refreshToken || this.getStoredRefreshToken()

            if (!tokenToUse) {
                console.error('没有可用的Refresh Token')
                return null
            }

            const response = await axios.post(`${this.basicUrl}/api/v1/auth/refresh-with-refresh-token`, {
                refresh_token: tokenToUse
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            if (response.data.code === 200) {
                const tokenData = response.data.data

                // 更新全局用户存储中的token
                globalUserStore.updateToken(tokenData.access_token)

                // 存储新的Refresh Token
                this.storeRefreshToken(tokenData.refresh_token)

                console.log('双Token续签成功')
                return tokenData
            } else {
                console.error('双Token续签失败:', response.data.message)
                // 如果Refresh Token无效，清除本地存储
                this.clearRefreshToken()
                return null
            }
        } catch (error) {
            console.error('双Token续签错误:', error)
            // 如果Refresh Token无效，清除本地存储
            this.clearRefreshToken()
            return null
        }
    }

    // 记住我登录
    async loginWithRememberMe(account: string, password: string): Promise<{
        access_token: string
        token_type: string
        expires_in: number
        user_id: string
        email: string
        role: string
    } | null> {
        try {
            const response = await axios.post(`${this.basicUrl}/api/v1/auth/login-with-remember`, {
                account,
                password,
                remember_me: true
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            if (response.data.code === 200) {
                const newToken = response.data.data.access_token

                // 更新全局用户存储中的token
                globalUserStore.updateToken(newToken)

                console.log('记住我登录成功')
                return response.data.data
            } else {
                console.error('记住我登录失败:', response.data.message)
                return null
            }
        } catch (error) {
            console.error('记住我登录错误:', error)
            return null
        }
    }

    // 检查是否需要续签
    private async shouldRefreshToken(tokenStatus: any): Promise<boolean> {
        if (!tokenStatus || !tokenStatus.is_valid) {
            return false
        }

        if (this.isOAuthSubProject()) {
            const remainingSec = tokenStatus.remaining_seconds ?? tokenStatus.remaining_minutes * 60
            return remainingSec < this.oauthRefreshBeforeExpirySec
        }

        // 如果即将过期（剩余时间少于阈值），则续签
        return tokenStatus.remaining_hours < this.refreshThresholdHours
    }

    // 自动续签逻辑
    private async autoRefreshToken(): Promise<void> {
        if (this.refreshInFlight) {
            return this.refreshInFlight
        }

        if (this.isOAuthSubProject()) {
            const sinceLast = Date.now() - this.lastRefreshAttemptAt
            if (sinceLast < this.oauthMinRefreshIntervalMs) {
                return
            }
        }

        this.refreshInFlight = this.runAutoRefresh().finally(() => {
            this.refreshInFlight = null
        })
        return this.refreshInFlight
    }

    private async runAutoRefresh(): Promise<void> {
        try {
            const tokenStatus = await this.checkTokenStatus()

            if (!tokenStatus) {
                console.log('无法获取token状态，跳过自动续签')
                return
            }

            if (await this.shouldRefreshToken(tokenStatus)) {
                const remainingSec = (tokenStatus as any).remaining_seconds
                const remainingLabel = remainingSec != null
                    ? `${remainingSec}秒`
                    : `${tokenStatus.remaining_hours}小时`
                console.log(`Token将在${remainingLabel}后过期，开始自动续签`)

                const refreshToken = this.getStoredRefreshToken()
                let refreshResult

                if (this.isOAuthSubProject() && refreshToken) {
                    console.log('使用 OAuth BFF 续签')
                    refreshResult = await this.refreshOAuthToken()
                } else if (refreshToken) {
                    console.log('使用双Token续签')
                    refreshResult = await this.refreshTokenWithRefreshToken()
                } else {
                    console.log('使用简单Token续签')
                    refreshResult = await this.refreshToken()
                }

                if (refreshResult) {
                    console.log('Token自动续签成功')

                    // 触发token更新事件
                    window.dispatchEvent(new CustomEvent('token:refreshed', {
                        detail: { newToken: refreshResult.access_token }
                    }))
                } else {
                    console.error('Token自动续签失败')
                    // 如果双Token续签失败，尝试简单续签作为fallback
                    if (refreshToken) {
                        console.log('尝试简单续签作为fallback')
                        const fallbackResult = await this.refreshToken()
                        if (fallbackResult) {
                            console.log('Fallback续签成功')
                            window.dispatchEvent(new CustomEvent('token:refreshed', {
                                detail: { newToken: fallbackResult.access_token }
                            }))
                        } else {
                            console.error('Fallback续签也失败了')
                        }
                    }
                }
            } else {
                const remainingSec = (tokenStatus as any).remaining_seconds
                const remainingLabel = remainingSec != null
                    ? `${remainingSec}秒`
                    : `${tokenStatus.remaining_hours}小时`
                console.log(`Token状态正常，剩余${remainingLabel}，无需续签`)
            }
        } catch (error) {
            console.error('自动续签过程出错:', error)
        }
    }

    // 启动token监控
    startTokenMonitoring(): void {
        if (this.checkInterval) {
            return
        }

        // 立即检查一次
        void this.autoRefreshToken()

        // 设置定期检查
        this.checkInterval = setInterval(() => {
            void this.autoRefreshToken()
        }, this.checkIntervalMs)

        console.log('Token监控已启动，检查间隔:', this.checkIntervalMs / 1000 / 60, '分钟')
    }

    // 停止token监控
    stopTokenMonitoring(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval)
            this.checkInterval = null
        }
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer)
            this.refreshTimer = null
        }
        console.log('Token监控已停止')
    }

    // 设置定时续签（用于精确控制续签时间）
    scheduleTokenRefresh(expiresInSeconds: number): void {
        this.stopTokenMonitoring() // 停止之前的定时器

        // 提前1天续签
        const refreshTime = Math.max(0, expiresInSeconds - (this.refreshThresholdHours * 3600))

        if (refreshTime > 0) {
            this.refreshTimer = setTimeout(async () => {
                console.log('执行定时token续签')
                await this.autoRefreshToken()
            }, refreshTime * 1000)

            console.log(`Token定时续签已设置，将在${refreshTime / 3600}小时后执行`)
        }
    }

    // 获取token过期时间（秒）
    async getTokenExpirationTime(): Promise<number | null> {
        try {
            const tokenStatus = await this.checkTokenStatus()
            if (tokenStatus && tokenStatus.is_valid) {
                const expiresAt = new Date(tokenStatus.expires_at)
                const now = new Date()
                return Math.floor((expiresAt.getTime() - now.getTime()) / 1000)
            }
        } catch (error) {
            console.error('获取token过期时间失败:', error)
        }
        return null
    }

    // 销毁服务
    destroy(): void {
        this.stopTokenMonitoring()
    }
}

// 创建全局token续签服务实例
export const tokenRefreshService = new TokenRefreshService()

// 导出服务实例
export default tokenRefreshService 