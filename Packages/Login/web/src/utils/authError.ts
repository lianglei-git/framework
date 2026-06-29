import axios from 'axios'
import { getUserFriendlyMessage } from './tokenErrorHandler'
import type { TokenErrorResponse } from '../types/token'

const HTTP_STATUS_MESSAGES: Record<number, string> = {
    400: '请求无效，请检查输入后重试',
    401: '登录已失效或未授权，请重新登录',
    403: '当前账号无权执行此操作',
    404: '请求的服务不存在',
    409: '该邮箱或用户名已被注册',
    422: '提交的信息有误，请检查后重试',
    429: '操作过于频繁，请稍后再试',
    500: '服务器繁忙，请稍后再试',
    502: '服务暂时不可用，请稍后再试',
    503: '服务维护中，请稍后再试',
}

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
    invalid_request: '请求参数不完整，请刷新页面后重试',
    invalid_client: '应用配置有误，请联系管理员',
    invalid_grant: '账号或密码错误，请重新输入',
    unauthorized_client: '当前应用无权使用此登录方式',
    unsupported_grant_type: '不支持的登录方式',
    invalid_scope: '授权范围无效',
    access_denied: '登录被拒绝，请重试或联系管理员',
    server_error: '服务器繁忙，请稍后再试',
    temporarily_unavailable: '服务暂时不可用，请稍后再试',
    invalid_credentials: '账号或密码错误，请重新输入',
}

const KNOWN_EN_MESSAGES: Record<string, string> = {
    'Invalid username or password': '账号或密码错误，请重新输入',
    'Invalid email or verification code': '邮箱或验证码错误，请重新输入',
    'Invalid phone or verification code': '手机号或验证码错误，请重新输入',
    'Invalid or expired state': '登录状态已过期，请重新登录',
    'Invalid client credentials': '应用凭证无效，请联系管理员',
    'Invalid credentials': '账号或密码错误，请重新输入',
    'Invalid JSON format or missing required fields': '请求格式有误，请刷新页面后重试',
    'Request body must be valid JSON': '请求格式有误，请刷新页面后重试',
    'Missing provider parameter': '缺少登录方式参数',
    'OAuth provider not available': '该第三方登录暂不可用',
    'Failed to generate OAuth URL': '无法发起第三方登录，请稍后重试',
    'Missing required parameters: email and code': '请填写邮箱和验证码',
    'Missing required parameters: phone and code': '请填写手机号和验证码',
    'Failed to generate access token': '登录失败，请稍后重试',
    'Failed to generate refresh token': '登录失败，请稍后重试',
    'Failed to update user info': '更新用户信息失败，请稍后重试',
    'Session not found or expired': '登录已过期，请重新登录',
    'token is required': '缺少登录凭证，请重新登录',
    'Invalid post_logout_redirect_uri': '登出回调地址无效',
    'The grant type is not supported': '不支持的授权类型',
    'Authorization code not found': '未获取到授权码，请重新登录',
    'SSO login failed': 'SSO 登录失败，请重试',
    'Token validation failed': '登录凭证无效，请重新登录',
    'Token exchange failed': '登录凭证交换失败，请重新登录',
    'Failed to fetch user info': '获取用户信息失败，请稍后重试',
    'Logout failed': '登出失败，请稍后重试',
}

const TECHNICAL_MESSAGE_PATTERNS = [
    /^Request failed with status code \d+$/i,
    /^Network Error$/i,
    /^timeout of \d+ms exceeded$/i,
    /^HTTP error! status:/i,
    /^Request error:/i,
]

function isTechnicalMessage(message: string): boolean {
    const trimmed = message.trim()
    if (!trimmed) return true
    return TECHNICAL_MESSAGE_PATTERNS.some((pattern) => pattern.test(trimmed))
}

function isChineseMessage(message: string): boolean {
    return /[\u4e00-\u9fff]/.test(message)
}

function localizeMessage(message: string): string | null {
    const trimmed = message.trim()
    if (!trimmed || isTechnicalMessage(trimmed)) return null
    if (isChineseMessage(trimmed)) return trimmed
    if (KNOWN_EN_MESSAGES[trimmed]) return KNOWN_EN_MESSAGES[trimmed]
    const lower = trimmed.toLowerCase()
    for (const [en, zh] of Object.entries(KNOWN_EN_MESSAGES)) {
        if (en.toLowerCase() === lower) return zh
    }
    return null
}

function pickServerMessage(data: unknown): string | null {
    if (!data || typeof data !== 'object') return null

    const payload = data as Record<string, unknown>

    // OAuth error 码优先于英文 error_description
    const oauthError = payload.error
    if (typeof oauthError === 'string' && OAUTH_ERROR_MESSAGES[oauthError]) {
        return OAUTH_ERROR_MESSAGES[oauthError]
    }

    if (payload.error_code) {
        const friendly = getUserFriendlyMessage(payload as TokenErrorResponse)
        const localized = localizeMessage(friendly)
        if (localized) return localized
    }

    if (typeof payload.error_description === 'string') {
        const localized = localizeMessage(payload.error_description)
        if (localized) return localized
    }

    if (typeof payload.message === 'string') {
        const localized = localizeMessage(payload.message)
        if (localized) return localized
    }

    if (typeof oauthError === 'string') {
        const localized = localizeMessage(oauthError)
        if (localized) return localized
    }

    const nested = payload.data
    if (nested && typeof nested === 'object') {
        const nestedMessage = (nested as Record<string, unknown>).message
        if (typeof nestedMessage === 'string') {
            return localizeMessage(nestedMessage)
        }
    }

    return null
}

function messageFromStatus(status?: number, fallback = '操作失败，请稍后重试'): string {
    if (status && HTTP_STATUS_MESSAGES[status]) {
        return HTTP_STATUS_MESSAGES[status]
    }
    return fallback
}

/**
 * 将 API / 网络错误转换为用户可读的中文提示
 */
export function formatAuthError(error: unknown, fallback = '操作失败，请稍后重试'): string {
    if (!error) return fallback

    if (typeof error === 'string') {
        if (isTechnicalMessage(error)) return fallback
        return localizeMessage(error) ?? fallback
    }

    if (typeof error === 'object' && error !== null && !(error instanceof Error) && !axios.isAxiosError(error)) {
        const serverMessage = pickServerMessage(error)
        if (serverMessage) return serverMessage
    }

    if (axios.isAxiosError(error)) {
        const serverMessage = pickServerMessage(error.response?.data)
        if (serverMessage) return serverMessage

        if (error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '')) {
            return '请求超时，请检查网络后重试'
        }

        if (!error.response) {
            return '网络连接失败，请检查网络后重试'
        }

        return messageFromStatus(error.response.status, fallback)
    }

    if (error instanceof Error) {
        const axiosLike = (error as Error & { response?: { status?: number; data?: unknown } }).response
        if (axiosLike) {
            const serverMessage = pickServerMessage(axiosLike.data)
            if (serverMessage) return serverMessage
            return messageFromStatus(axiosLike.status, fallback)
        }

        const statusMatch = error.message.match(/status code (\d+)/i)
        if (statusMatch && isTechnicalMessage(error.message)) {
            return messageFromStatus(Number(statusMatch[1]), fallback)
        }

        if (!isTechnicalMessage(error.message)) {
            return localizeMessage(error.message) ?? fallback
        }
    }

    return fallback
}

/**
 * 判断是否为未授权（401）错误，用于触发登出等逻辑
 */
export function isUnauthorizedError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
        return error.response?.status === 401
    }
    if (error instanceof Error) {
        const status = (error as Error & { response?: { status?: number } }).response?.status
        if (status === 401) return true
        return /status code 401/i.test(error.message)
    }
    return false
}

/**
 * 抛出带友好文案的 Error，供 API 层统一使用
 */
export function throwAuthError(error: unknown, fallback = '操作失败，请稍后重试'): never {
    throw new Error(formatAuthError(error, fallback))
}
