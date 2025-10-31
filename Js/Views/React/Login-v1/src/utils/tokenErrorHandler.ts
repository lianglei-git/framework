/**
 * Token 统一错误处理器
 * 根据后端返回的 error_code 和 suggest_action 智能处理错误
 */

import { 
    TokenErrorResponse, 
    TokenErrorCode,
    ERROR_HANDLING_MAP,
    SuggestAction
} from '../types/token'

// 错误处理回调类型
export interface TokenErrorHandlers {
    onCheckSession?: () => Promise<void>      // 尝试用 session_id 恢复
    onRelogin?: () => void                    // 跳转登录
    onRetryAuth?: () => void                  // 重新发起OAuth授权
    onContactAdmin?: (message: string) => void // 显示联系管理员提示
    onRetry?: () => Promise<void>             // 重试请求
    onRetryLater?: (message: string) => void  // 显示稍后重试提示
    onShowError?: (message: string, severity: 'error' | 'warning' | 'info') => void // 显示错误消息
}

/**
 * 统一处理 Token 错误
 * @param error 错误响应对象
 * @param handlers 错误处理回调
 * @returns 是否成功处理
 */
export async function handleTokenError(
    error: TokenErrorResponse,
    handlers: TokenErrorHandlers
): Promise<boolean> {
    const { error_code, suggest_action, error_description } = error
    
    console.group('🔴 Token错误处理')
    console.log('错误类型:', error.error)
    console.log('错误码:', error_code)
    console.log('错误描述:', error_description)
    console.log('建议操作:', suggest_action)
    console.groupEnd()

    // 获取错误处理配置
    const handlingConfig = error_code ? ERROR_HANDLING_MAP[error_code as TokenErrorCode] : null
    const action = suggest_action || handlingConfig?.action
    const message = handlingConfig?.message || error_description
    const severity = handlingConfig?.severity || 'error'

    // 显示错误消息（如果有回调）
    if (handlers.onShowError && message) {
        handlers.onShowError(message, severity)
    }

    // 根据建议操作执行对应处理
    switch (action) {
        case 'check_session':
            if (handlers.onCheckSession) {
                try {
                    console.log('⚡ 尝试用 session_id 恢复登录...')
                    await handlers.onCheckSession()
                    console.log('✅ Session 恢复成功')
                    return true
                } catch (err) {
                    console.log('⚠️ Session 恢复失败，跳转登录')
                    if (handlers.onRelogin) {
                        handlers.onRelogin()
                        return true
                    }
                }
            } else if (handlers.onRelogin) {
                handlers.onRelogin()
                return true
            }
            break

        case 'relogin':
            if (handlers.onRelogin) {
                console.log('🔄 跳转到登录页面')
                handlers.onRelogin()
                return true
            }
            break

        case 'retry_auth':
            if (handlers.onRetryAuth) {
                console.log('🔄 重新发起 OAuth 授权')
                handlers.onRetryAuth()
                return true
            }
            break

        case 'contact_admin':
            if (handlers.onContactAdmin) {
                handlers.onContactAdmin(message)
                return true
            }
            break

        case 'retry':
            if (handlers.onRetry) {
                try {
                    console.log('🔄 重试请求...')
                    await handlers.onRetry()
                    return true
                } catch (retryErr) {
                    console.error('❌ 重试失败:', retryErr)
                }
            }
            break

        case 'retry_later':
            if (handlers.onRetryLater) {
                handlers.onRetryLater(message)
                return true
            }
            break

        default:
            console.warn('⚠️ 未知的错误处理动作:', action)
    }

    return false
}

/**
 * 判断是否为可恢复的 Token 错误
 */
export function isRecoverableTokenError(error: TokenErrorResponse): boolean {
    const recoverableCodes = [
        TokenErrorCode.REFRESH_TOKEN_INVALID,
        TokenErrorCode.REFRESH_TOKEN_EXPIRED,
        TokenErrorCode.TOKEN_HASH_MISMATCH,
        TokenErrorCode.SESSION_NOT_FOUND
    ]
    
    return error.suggest_action === 'check_session' ||
           Boolean(error.error_code && recoverableCodes.includes(error.error_code as TokenErrorCode))
}

/**
 * 判断是否需要立即登出
 */
export function shouldForceLogout(error: TokenErrorResponse): boolean {
    const forceLogoutCodes = [
        TokenErrorCode.SESSION_REVOKED,
        TokenErrorCode.TOKEN_USER_MISMATCH,
        TokenErrorCode.SESSION_INACTIVE,
        TokenErrorCode.SESSION_EXPIRED,
        TokenErrorCode.USER_NOT_FOUND,
        TokenErrorCode.USER_SUSPENDED,
        TokenErrorCode.USER_DELETED
    ]
    
    return error.suggest_action === 'relogin' ||
           Boolean(error.error_code && forceLogoutCodes.includes(error.error_code as TokenErrorCode))
}

/**
 * 获取用户友好的错误消息
 */
export function getUserFriendlyMessage(error: TokenErrorResponse): string {
    if (error.error_code) {
        const config = ERROR_HANDLING_MAP[error.error_code as TokenErrorCode]
        if (config) {
            return config.message
        }
    }
    
    return error.error_description || '发生未知错误，请重试'
}

/**
 * 创建默认的错误处理器
 * @param navigate 导航函数（如 react-router 的 navigate）
 * @param ssoClient SSO 客户端实例
 */
export function createDefaultTokenErrorHandlers(
    navigate: (path: string) => void,
    ssoClient: any // 替换为实际的 SSO Client 类型
): TokenErrorHandlers {
    return {
        onCheckSession: async () => {
            // 尝试从 cookie 获取 session_id
            const sessionId = getSessionIdFromCookie()
            if (sessionId) {
                await ssoClient.recoverFromSession(sessionId)
            } else {
                throw new Error('No session_id found')
            }
        },
        
        onRelogin: () => {
            // 清除所有认证信息
            ssoClient.handleCompleteLogout?.()
            // 跳转到登录页
            navigate('/login')
        },
        
        onRetryAuth: () => {
            // 重新发起 OAuth 流程
            ssoClient.startOAuthFlow?.()
        },
        
        onContactAdmin: (message: string) => {
            alert(`配置错误: ${message}\n\n请联系系统管理员。`)
        },
        
        onRetry: async () => {
            // 重试逻辑由调用方实现
            throw new Error('Retry not implemented')
        },
        
        onRetryLater: (message: string) => {
            alert(`服务暂时不可用: ${message}\n\n请稍后再试。`)
        },
        
        onShowError: (message: string, severity: 'error' | 'warning' | 'info') => {
            console[severity](`Token错误: ${message}`)
            // 可以集成 toast 通知库
        }
    }
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

