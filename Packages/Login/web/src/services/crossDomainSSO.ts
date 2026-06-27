import { SSOConfig } from '../types'
import { storageManager } from '../utils/storage'

/**
 * 跨域SSO管理器
 * 实现跨多个域名/应用的单点登录功能
 */
export class CrossDomainSSOManager {
    private config: SSOConfig
    private sessionId: string
    private parentWindow: Window | null = null
    private childWindows: Window[] = []
    private messageHandlers: Map<string, (data: any) => void> = new Map()

    constructor(config: SSOConfig) {
        this.config = config
        this.sessionId = this.generateSessionId()

        this.setupMessageListener()
        this.setupParentCommunication()
    }

    /**
     * 生成会话ID
     */
    private generateSessionId(): string {
        return `sso_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    /**
     * 设置消息监听器
     */
    private setupMessageListener(): void {
        window.addEventListener('message', (event) => {
            this.handleMessage(event)
        })
    }

    /**
     * 处理接收到的消息
     */
    private handleMessage(event: MessageEvent): void {
        // 验证消息来源
        if (!this.isValidOrigin(event.origin)) {
            console.warn('Invalid origin for SSO message:', event.origin)
            return
        }

        const message = event.data
        if (!message || typeof message !== 'object' || !message.type) {
            return
        }

        // 处理不同类型的消息
        const handler = this.messageHandlers.get(message.type)
        if (handler) {
            handler(message.data)
        }

        // 处理内置消息类型
        switch (message.type) {
            case 'SSO_SESSION_REQUEST':
                this.handleSessionRequest(event.source as Window)
                break
            case 'SSO_SESSION_RESPONSE':
                this.handleSessionResponse(message.data)
                break
            case 'SSO_LOGOUT_REQUEST':
                this.handleLogoutRequest()
                break
            case 'SSO_TOKEN_REFRESH':
                this.handleTokenRefresh(message.data)
                break
        }
    }

    /**
     * 验证消息来源是否有效
     */
    private isValidOrigin(origin: string): boolean {
        // 检查是否在允许的域名列表中
        const allowedDomains = this.config.allowedDomains || []
        if (allowedDomains.length === 0) {
            // 如果没有配置允许的域名，检查是否是同源
            return origin === window.location.origin
        }

        return allowedDomains.some(domain => origin.includes(domain))
    }

    /**
     * 设置父窗口通信
     */
    private setupParentCommunication(): void {
        // 检查是否在iframe中
        if (window.parent !== window && window.parent !== window.top) {
            this.parentWindow = window.parent
            this.sendMessage(this.parentWindow, {
                type: 'SSO_IFRAME_READY',
                data: {
                    sessionId: this.sessionId,
                    origin: window.location.origin
                }
            })
        }
    }

    /**
     * 发送消息到目标窗口
     */
    private sendMessage(targetWindow: Window, message: any): void {
        try {
            targetWindow.postMessage(message, '*')
        } catch (error) {
            console.error('Failed to send SSO message:', error)
        }
    }

    /**
     * 处理会话请求
     */
    private handleSessionRequest(source: Window): void {
        const sessionData = storageManager.getSSOData()
        if (sessionData && !storageManager.isSSOTokenExpired()) {
            this.sendMessage(source, {
                type: 'SSO_SESSION_RESPONSE',
                data: {
                    sessionId: this.sessionId,
                    token: sessionData.token,
                    user: this.getCurrentUser(),
                    expiresAt: sessionData.expires_at
                }
            })
        } else {
            this.sendMessage(source, {
                type: 'SSO_SESSION_RESPONSE',
                data: {
                    sessionId: this.sessionId,
                    authenticated: false
                }
            })
        }
    }

    /**
     * 处理会话响应
     */
    private handleSessionResponse(data: any): void {
        if (data.authenticated && data.token) {
            storageManager.saveSSOData({
                token: data.token,
                expires_at: data.expiresAt
            })
            console.log('SSO session established from parent window')
        }
    }

    /**
     * 处理登出请求
     */
    private handleLogoutRequest(): void {
        this.logoutAllWindows()
    }

    /**
     * 处理令牌刷新
     */
    private handleTokenRefresh(data: any): void {
        if (data.token) {
            storageManager.saveSSOData({
                token: data.token,
                expires_at: data.expiresAt
            })
            console.log('SSO token refreshed from other window')
        }
    }

    /**
     * 注册消息处理器
     */
    registerMessageHandler(type: string, handler: (data: any) => void): void {
        this.messageHandlers.set(type, handler)
    }

    /**
     * 移除消息处理器
     */
    unregisterMessageHandler(type: string): void {
        this.messageHandlers.delete(type)
    }

    /**
     * 请求会话状态
     */
    requestSessionStatus(): Promise<boolean> {
        return new Promise((resolve) => {
            const handler = (data: any) => {
                resolve(data.authenticated === true)
                this.unregisterMessageHandler('SSO_SESSION_STATUS_RESPONSE')
            }

            this.registerMessageHandler('SSO_SESSION_STATUS_RESPONSE', handler)

            if (this.parentWindow) {
                this.sendMessage(this.parentWindow, {
                    type: 'SSO_SESSION_STATUS_REQUEST',
                    data: { sessionId: this.sessionId }
                })
            } else {
                resolve(false)
            }

            // 超时处理
            setTimeout(() => {
                resolve(false)
                this.unregisterMessageHandler('SSO_SESSION_STATUS_RESPONSE')
            }, 5000)
        })
    }

    /**
     * 广播登录状态
     */
    broadcastLogin(token: any): void {
        this.sendToAllWindows({
            type: 'SSO_LOGIN_SUCCESS',
            data: {
                sessionId: this.sessionId,
                token: token,
                user: this.getCurrentUser(),
                timestamp: Date.now()
            }
        })
    }

    /**
     * 广播登出状态
     */
    broadcastLogout(): void {
        this.sendToAllWindows({
            type: 'SSO_LOGOUT_SUCCESS',
            data: {
                sessionId: this.sessionId,
                timestamp: Date.now()
            }
        })
    }

    /**
     * 发送消息到所有窗口
     */
    private sendToAllWindows(message: any): void {
        // 发送到父窗口
        if (this.parentWindow) {
            this.sendMessage(this.parentWindow, message)
        }

        // 发送到所有子窗口
        this.childWindows.forEach(childWindow => {
            this.sendMessage(childWindow, message)
        })

        // 发送到所有同域的窗口
        this.sendToSameOriginWindows(message)
    }

    /**
     * 发送消息到同域窗口
     */
    private sendToSameOriginWindows(message: any): void {
        try {
            // 使用BroadcastChannel API发送到同域的其他标签页
            if ('BroadcastChannel' in window) {
                const channel = new BroadcastChannel('sso_channel')
                channel.postMessage(message)
                channel.close()
            }
        } catch (error) {
            console.warn('Failed to send to same origin windows:', error)
        }
    }

    /**
     * 注册子窗口
     */
    registerChildWindow(childWindow: Window): void {
        this.childWindows.push(childWindow)
        console.log('SSO child window registered:', childWindow)
    }

    /**
     * 移除子窗口
     */
    removeChildWindow(childWindow: Window): void {
        const index = this.childWindows.indexOf(childWindow)
        if (index > -1) {
            this.childWindows.splice(index, 1)
            console.log('SSO child window removed:', childWindow)
        }
    }

    /**
     * 在所有窗口中登出
     */
    logoutAllWindows(): void {
        // 清除本地会话
        storageManager.clearSSOData()
        storageManager.clearSSOSession()

        // 广播登出消息
        this.broadcastLogout()

        console.log('SSO logout completed in all windows')
    }

    /**
     * 检查所有窗口的会话状态
     */
    async checkAllSessions(): Promise<boolean> {
        const localSession = storageManager.getSSOData()
        if (!localSession || storageManager.isSSOTokenExpired()) {
            return false
        }

        // 检查父窗口会话
        if (this.parentWindow) {
            const parentSessionValid = await this.requestSessionStatus()
            if (!parentSessionValid) {
                return false
            }
        }

        return true
    }

    /**
     * 同步会话到所有窗口
     */
    syncSessionToAllWindows(): void {
        const sessionData = storageManager.getSSOData()
        if (sessionData && !storageManager.isSSOTokenExpired()) {
            this.sendToAllWindows({
                type: 'SSO_SESSION_SYNC',
                data: {
                    sessionId: this.sessionId,
                    token: sessionData.token,
                    user: this.getCurrentUser(),
                    expiresAt: sessionData.expires_at
                }
            })
        }
    }

    /**
     * 获取当前用户
     */
    private getCurrentUser(): any {
        // 从存储中获取用户信息
        const ssoData = storageManager.getSSOData()
        return ssoData?.token?.user || null
    }

    /**
     * 验证会话并刷新令牌
     */
    async validateAndRefreshSession(): Promise<boolean> {
        const sessionData = storageManager.getSSOData()
        if (!sessionData) {
            return false
        }

        // 检查是否需要刷新令牌
        const fiveMinutes = 5 * 60 * 1000
        if (Date.now() >= (sessionData.expires_at - fiveMinutes)) {
            try {
                // 这里应该调用令牌刷新API
                // const newToken = await this.refreshToken(sessionData.token.refresh_token)
                // storageManager.saveSSOData({ ...sessionData, token: newToken })
                console.log('Token refresh needed but not implemented yet')
            } catch (error) {
                console.error('Token refresh failed:', error)
                return false
            }
        }

        return true
    }

    /**
     * 清理资源
     */
    destroy(): void {
        window.removeEventListener('message', this.handleMessage)
        this.messageHandlers.clear()
        this.childWindows = []
        this.parentWindow = null
    }
}

// 创建全局跨域SSO管理器实例
let crossDomainSSO: CrossDomainSSOManager | null = null

/**
 * 获取跨域SSO管理器实例
 */
export function getCrossDomainSSO(config: SSOConfig): CrossDomainSSOManager {
    if (!crossDomainSSO) {
        crossDomainSSO = new CrossDomainSSOManager(config)
    }
    return crossDomainSSO
}

/**
 * 销毁跨域SSO管理器
 */
export function destroyCrossDomainSSO(): void {
    if (crossDomainSSO) {
        crossDomainSSO.destroy()
        crossDomainSSO = null
    }
}
