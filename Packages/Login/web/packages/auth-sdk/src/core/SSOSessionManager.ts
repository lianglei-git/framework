import {
    SSOSession,
    SSOConfig,
    SSOUser,
    EventEmitter
} from '../types'
import { StorageUtils } from '../utils/storage'
import { NetworkUtils } from '../utils/network'

/**
 * SSO会话管理器
 * 负责会话的创建、维护、验证和销毁
 */
class SSOSessionManager extends EventEmitter {
    private config: SSOConfig
    private storage: StorageUtils
    private network: NetworkUtils
    private activityTimer: NodeJS.Timeout | null = null
    private sessionCheckTimer: NodeJS.Timeout | null = null

    constructor(config: SSOConfig) {
        super()
        this.config = config
        this.storage = new StorageUtils(config.storageType || 'localStorage')
        this.network = new NetworkUtils()
    }

    /**
     * 初始化会话管理器
     */
    async initialize(): Promise<void> {
        // 恢复现有会话
        const existingSession = this.getCurrentSession()
        if (existingSession && existingSession.is_active) {
            this.emit('session:restored', existingSession)
            this.startActivityTracking()
            this.startSessionChecking()
        }
    }

    /**
     * 创建新会话
     */
    async createSession(sessionData: Partial<SSOSession>): Promise<SSOSession> {
        const session: SSOSession = {
            session_id: this.generateSessionId(),
            user_id: sessionData.user_id!,
            client_id: sessionData.client_id || this.config.clientId,
            authenticated_at: Date.now(),
            expires_at: Date.now() + (this.config.sessionTimeout || 3600) * 1000,
            last_activity: Date.now(),
            is_active: true,
            remember_me: sessionData.remember_me || false,
            ...this.getClientInfo()
        }

        // 存储会话
        await this.storage.set('sso_session', session)

        // 启动活动跟踪
        this.startActivityTracking()
        this.startSessionChecking()

        this.emit('session:created', session)
        return session
    }

    /**
     * 获取当前会话
     */
    async getCurrentSession(): Promise<SSOSession | null> {
        const session = this.storage.get('sso_session')

        if (!session) {
            return null
        }

        // 检查会话是否过期
        if (Date.now() >= session.expires_at) {
            await this.destroySession()
            this.emit('session:expired', session)
            return null
        }

        // 检查会话是否活跃
        if (!session.is_active) {
            this.emit('session:inactive', session)
            return null
        }

        return session
    }

    /**
     * 更新会话活动
     */
    async updateActivity(): Promise<void> {
        const session = await this.getCurrentSession()
        if (!session) {
            return
        }

        session.last_activity = Date.now()
        await this.storage.set('sso_session', session)

        this.emit('session:activity', session)
    }

    /**
     * 验证会话
     */
    async validateSession(): Promise<boolean> {
        const session = await this.getCurrentSession()
        if (!session) {
            this.emit('session:invalid')
            return false
        }

        // 检查会话是否过期
        if (Date.now() >= session.expires_at) {
            await this.destroySession()
            this.emit('session:expired', session)
            return false
        }

        // 检查会话是否活跃
        if (!session.is_active) {
            this.emit('session:inactive', session)
            return false
        }

        // 更新活动时间
        await this.updateActivity()

        return true
    }

    /**
     * 延长会话时间
     */
    async extendSession(): Promise<void> {
        const session = await this.getCurrentSession()
        if (!session) {
            return
        }

        session.expires_at = Date.now() + (this.config.sessionTimeout || 3600) * 1000
        await this.storage.set('sso_session', session)

        this.emit('session:extended', session)
    }

    /**
     * 销毁会话
     */
    async destroySession(): Promise<void> {
        const session = this.storage.get('sso_session')
        if (session) {
            // 通知服务端销毁会话
            await this.notifySessionDestroy(session.session_id)

            this.emit('session:destroying', session)
        }

        // 清除本地会话
        await this.storage.remove('sso_session')

        // 停止定时器
        this.stopActivityTracking()
        this.stopSessionChecking()

        this.emit('session:destroyed')
    }

    /**
     * 通知服务端销毁会话
     */
    private async notifySessionDestroy(sessionId: string): Promise<void> {
        try {
            if (this.config.ssoServerUrl) {
                await this.network.post(
                    `${this.config.ssoServerUrl}/api/v1/sso/session/destroy`,
                    { session_id: sessionId },
                    {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                )
            }
        } catch (error) {
            console.warn('通知服务端销毁会话失败:', error)
        }
    }

    /**
     * 检查会话状态
     */
    async checkSessionStatus(): Promise<{ isValid: boolean; session?: SSOSession }> {
        const session = await this.getCurrentSession()
        if (!session) {
            return { isValid: false }
        }

        // 检查本地会话
        const isLocalValid = await this.validateSession()
        if (!isLocalValid) {
            return { isValid: false }
        }

        // 检查服务端会话
        try {
            if (this.config.ssoServerUrl) {
                const response = await this.network.get(
                    `${this.config.ssoServerUrl}/api/v1/sso/session/check`,
                    {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                )

                if (response.is_authenticated) {
                    return { isValid: true, session }
                }
            }
        } catch (error) {
            console.warn('服务端会话检查失败:', error)
        }

        return { isValid: true, session }
    }

    /**
     * 启动活动跟踪
     */
    private startActivityTracking(): void {
        if (this.activityTimer) {
            clearInterval(this.activityTimer)
        }

        // 定期更新活动时间
        this.activityTimer = setInterval(() => {
            this.updateActivity()
        }, 60000) // 每分钟更新一次
    }

    /**
     * 停止活动跟踪
     */
    private stopActivityTracking(): void {
        if (this.activityTimer) {
            clearInterval(this.activityTimer)
            this.activityTimer = null
        }
    }

    /**
     * 启动会话检查
     */
    private startSessionChecking(): void {
        if (this.sessionCheckTimer) {
            clearInterval(this.sessionCheckTimer)
        }

        // 定期检查会话状态
        this.sessionCheckTimer = setInterval(async () => {
            const isValid = await this.validateSession()
            if (!isValid) {
                this.emit('session:check_failed')
            }
        }, 300000) // 每5分钟检查一次
    }

    /**
     * 停止会话检查
     */
    private stopSessionChecking(): void {
        if (this.sessionCheckTimer) {
            clearInterval(this.sessionCheckTimer)
            this.sessionCheckTimer = null
        }
    }

    /**
     * 生成会话ID
     */
    private generateSessionId(): string {
        return `sso_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    /**
     * 获取客户端信息
     */
    private getClientInfo(): Partial<SSOSession> {
        return {
            ip_address: this.getClientIP(),
            user_agent: navigator.userAgent,
            location: this.getLocation()
        }
    }

    /**
     * 获取客户端IP
     */
    private getClientIP(): string {
        // 这里应该调用获取IP的API
        // 暂时返回一个占位符
        return 'unknown'
    }

    /**
     * 获取地理位置
     */
    private getLocation(): string {
        // 这里应该调用地理位置API
        // 暂时返回一个占位符
        return 'unknown'
    }

    /**
     * 监听用户活动
     */
    private setupActivityListeners(): void {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']

        events.forEach(event => {
            document.addEventListener(event, () => {
                this.updateActivity()
            }, { passive: true })
        })
    }

    /**
     * 监听页面可见性变化
     */
    private setupVisibilityListener(): void {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // 页面变为可见时，更新活动时间
                this.updateActivity()
            }
        })
    }

    /**
     * 监听存储变化
     */
    private setupStorageListener(): void {
        window.addEventListener('storage', (event) => {
            if (event.key === 'sso_session') {
                if (event.newValue === null) {
                    // 会话被清除
                    this.emit('session:cleared')
                } else {
                    // 会话被更新
                    const session = JSON.parse(event.newValue)
                    this.emit('session:updated', session)
                }
            }
        })
    }

    /**
     * 监听页面卸载
     */
    private setupBeforeUnloadListener(): void {
        window.addEventListener('beforeunload', () => {
            // 页面卸载前，更新活动时间
            this.updateActivity()
        })
    }

    /**
     * 销毁管理器
     */
    destroy(): void {
        this.stopActivityTracking()
        this.stopSessionChecking()
        this.removeAllListeners()
    }
}

export default SSOSessionManager
