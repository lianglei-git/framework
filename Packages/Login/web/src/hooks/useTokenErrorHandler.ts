/**
 * React Hook: 统一 Token 错误处理
 * 提供在 React 组件中使用的 Token 错误处理 Hook
 */

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { TokenErrorResponse } from '../types/token'
import { handleTokenError, TokenErrorHandlers } from '../utils/tokenErrorHandler'
import { ssoClient } from '../services/sso'
import { message } from 'antd' // 或者使用其他 toast 库

/**
 * Token 错误处理 Hook
 * @returns 错误处理函数
 */
export function useTokenErrorHandler() {
    const navigate = useNavigate()

    /**
     * 处理 Token 错误
     */
    const handleError = useCallback(async (error: TokenErrorResponse): Promise<boolean> => {
        const handlers: TokenErrorHandlers = {
            onCheckSession: async () => {
                console.log('🔄 尝试通过 session_id 恢复登录...')
                
                // 从 cookie 获取 session_id
                const sessionId = getSessionIdFromCookie()
                if (!sessionId) {
                    throw new Error('No session_id found in cookie')
                }
                
                // 调用 SSO 客户端的 session 恢复方法
                await ssoClient.recoverFromSession(sessionId)
                
                message.success('登录状态已恢复')
            },
            
            onRelogin: () => {
                console.log('🚪 跳转到登录页面')
                
                // 清除所有认证信息
                ssoClient.handleCompleteLogout?.('token_error')
                
                // 显示提示消息
                const errorMessage = getErrorMessage(error.error_code)
                message.warning(errorMessage)
                
                // 跳转到登录页
                navigate('/login', { 
                    replace: true,
                    state: { from: window.location.pathname }
                })
            },
            
            onRetryAuth: () => {
                console.log('🔄 重新发起 OAuth 授权')
                message.info('重新授权中...')
                
                // 重新发起 OAuth 流程
                // ssoClient.startOAuthFlow()
            },
            
            onContactAdmin: (errorMessage: string) => {
                console.error('❌ 配置错误:', errorMessage)
                message.error({
                    content: `${errorMessage}，请联系管理员`,
                    duration: 5
                })
            },
            
            onRetry: async () => {
                console.log('🔄 自动重试中...')
                // 重试逻辑由调用方实现
                throw new Error('Retry not implemented')
            },
            
            onRetryLater: (errorMessage: string) => {
                message.warning({
                    content: errorMessage,
                    duration: 5
                })
            },
            
            onShowError: (errorMessage: string, severity: 'error' | 'warning' | 'info') => {
                const messageMap = {
                    error: message.error,
                    warning: message.warning,
                    info: message.info
                }
                messageMap[severity](errorMessage)
            }
        }

        return await handleTokenError(error, handlers)
    }, [navigate])

    return { handleError }
}

/**
 * 从 cookie 中获取 session_id
 */
function getSessionIdFromCookie(): string | null {
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=')
        if (name === 'sso_session_id') {
            return value
        }
    }
    return null
}

/**
 * 获取用户友好的错误消息
 */
function getErrorMessage(errorCode?: string): string {
    const messages: Record<string, string> = {
        'SESSION_REVOKED': '您已在其他地方登出，请重新登录',
        'TOKEN_USER_MISMATCH': '用户信息不匹配，请重新登录',
        'SESSION_EXPIRED': '登录已过期，请重新登录',
        'SESSION_INACTIVE': '会话已失效，请重新登录',
        'USER_SUSPENDED': '账号已被停用，请联系管理员',
        'USER_DELETED': '账号已被删除',
        'CLIENT_INACTIVE': '应用已停用，请联系管理员'
    }
    
    return messages[errorCode || ''] || '登录已失效，请重新登录'
}

