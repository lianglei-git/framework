import axios from 'axios'
import { globalUserStore } from '../stores/UserStore'

// Token自动续签服务
export class TokenRefreshService {
    private refreshTimer: number | null = null
    private checkInterval: number | null = null
    private readonly basicUrl: string
    private readonly checkIntervalMs = 5 * 60 * 1000 // 5分钟检查一次
    private readonly refreshThresholdHours = 24 // 提前24小时续签

    constructor() {
        this.basicUrl = (import.meta as any).env?.DEV ? "http://localhost:8080" : "https://sparrowui.cn/translate"
        this.init()
    }

    // 初始化服务
    private init() {
        // 如果用户已登录，启动token监控
        if (globalUserStore.isLogin) {
            this.startTokenMonitoring()
        }

        // 监听登录状态变化
        globalUserStore.addLoginListener(() => {
            if (globalUserStore.isLogin) {
                this.startTokenMonitoring()
            } else {
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

    // 检查token状态
    async checkTokenStatus(): Promise<{
        is_valid: boolean
        expires_at: string
        remaining_hours: number
        remaining_minutes: number
        is_expiring_soon: boolean
        token_type: string
    } | null> {
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

    // 手动续签token
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

        // 如果即将过期（剩余时间少于阈值），则续签
        return tokenStatus.remaining_hours < this.refreshThresholdHours
    }

    // 自动续签逻辑
    private async autoRefreshToken(): Promise<void> {
        try {
            const tokenStatus = await this.checkTokenStatus()

            if (!tokenStatus) {
                console.log('无法获取token状态，跳过自动续签')
                return
            }

            if (await this.shouldRefreshToken(tokenStatus)) {
                console.log(`Token将在${tokenStatus.remaining_hours}小时后过期，开始自动续签`)

                const refreshResult = await this.refreshToken()
                if (refreshResult) {
                    console.log('Token自动续签成功')

                    // 触发token更新事件
                    window.dispatchEvent(new CustomEvent('token:refreshed', {
                        detail: { newToken: refreshResult.access_token }
                    }))
                } else {
                    console.error('Token自动续签失败')
                }
            } else {
                console.log(`Token状态正常，剩余${tokenStatus.remaining_hours}小时，无需续签`)
            }
        } catch (error) {
            console.error('自动续签过程出错:', error)
        }
    }

    // 启动token监控
    startTokenMonitoring(): void {
        this.stopTokenMonitoring() // 先停止之前的监控

        // 立即检查一次
        this.autoRefreshToken()

        // 设置定期检查
        this.checkInterval = setInterval(() => {
            this.autoRefreshToken()
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