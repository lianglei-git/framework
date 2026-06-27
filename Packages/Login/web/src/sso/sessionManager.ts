import { SSOConfig, SSOSession } from '../types'
import { storageManager } from '../utils/storage'

export class SSOSessionManager {
    private config: SSOConfig

    constructor(config: SSOConfig) {
        this.config = config
    }

    /**
     * 创建会话
     */
    async createSession(sessionData: Partial<SSOSession>): Promise<SSOSession> {
        const session: SSOSession = {
            session_id: sessionData.session_id!,
            user_id: sessionData.user_id!,
            client_id: sessionData.client_id!,
            authenticated_at: Date.now(),
            expires_at: sessionData.expires_at!,
            last_activity: sessionData.last_activity!,
            ip_address: await this.getClientIP(),
            user_agent: navigator.userAgent,
            is_active: true,
            remember_me: sessionData.remember_me || false,
            ...sessionData
        }

        storageManager.saveSSOSession(session)
        return session
    }

    /**
     * 更新会话活动时间
     */
    async updateSessionActivity(): Promise<void> {
        const session = this.getCurrentSession()
        if (session) {
            session.last_activity = Date.now()
            storageManager.saveSSOSession(session)
        }
    }

    /**
     * 获取当前会话
     */
    getCurrentSession(): SSOSession | null {
        return storageManager.getSSOSession()
    }

    /**
     * 销毁会话
     */
    async destroySession(): Promise<void> {
        // const session = this.getCurrentSession()
        // if (session) {
        //     // 通知服务端会话销毁
        //     try {
        //         // 使用统一的API服务调用会话销毁API
        //         await this.post('/api/v1/sso/session/destroy', {
        //             session_id: session.session_id
        //         })
        //     } catch (error) {
        //         console.warn('Failed to destroy server session:', error)
        //     }
        // }

        storageManager.clearSSOSession()
    }

    /**
     * 验证会话是否有效
     */
    async validateSession(): Promise<boolean> {
        const session = this.getCurrentSession()

        if (!session) return false
        if (!session.is_active) return false
        if (Date.now() >= session.expires_at) return false

        // 更新活动时间
        await this.updateSessionActivity()

        return true
    }

    /**
     * 延长会话时间
     */
    async extendSession(): Promise<void> {
        const session = this.getCurrentSession()
        if (session) {
            session.expires_at = Date.now() + (this.config.sessionTimeout || 3600) * 1000
            storageManager.saveSSOSession(session)
        }
    }

    /**
     * 生成会话ID
     */
    private generateSessionId(): string {
        return `sso_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    /**
     * 获取客户端IP地址
     */
    private async getClientIP(): Promise<string> {
        try {
            // 这里应该调用一个获取客户端IP的API
            // 暂时返回一个默认值
            return 'unknown'
        } catch (error) {
            return 'unknown'
        }
    }
}
