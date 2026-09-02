import axios from 'axios'

const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: '请求无效，请检查输入后重试',
  401: '账号或密码错误，请重新输入',
  403: '当前账号无权执行此操作',
  404: '请求的资源不存在',
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
  'Invalid credentials': '账号或密码错误，请重新输入',
  'Username already exists': '用户名已存在',
  'Email already exists': '邮箱已被注册',
  'Phone number already exists': '手机号已被注册',
  'User not found': '用户不存在',
  'Invalid role': '无效的角色',
  'Invalid status': '无效的状态',
  'beta profile required': '内测角色必须填写内测档案',
  'invalid beta group': '内测分组仅支持 A / B / C',
  'invalid beta status': '内测资格状态无效',
  'SSO client not found': 'SSO 客户端不存在',
  'Client ID is required': '缺少客户端 ID',
}

const TECHNICAL_MESSAGE_PATTERNS = [
  /^Request failed with status code \d+$/i,
  /^Network Error$/i,
  /^timeout of \d+ms exceeded$/i,
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

  const oauthError = payload.error
  if (typeof oauthError === 'string' && OAUTH_ERROR_MESSAGES[oauthError]) {
    return OAUTH_ERROR_MESSAGES[oauthError]
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

  return null
}

function messageFromStatus(status?: number, fallback = '操作失败，请稍后重试'): string {
  if (status && HTTP_STATUS_MESSAGES[status]) {
    return HTTP_STATUS_MESSAGES[status]
  }
  return fallback
}

export function formatAuthError(error: unknown, fallback = '操作失败，请稍后重试'): string {
  if (!error) return fallback

  if (typeof error === 'string') {
    if (isTechnicalMessage(error)) return fallback
    return localizeMessage(error) ?? fallback
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

    if (!isTechnicalMessage(error.message)) {
      return localizeMessage(error.message) ?? fallback
    }
  }

  return fallback
}

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

export function isForbiddenError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return error.response?.status === 403
  }
  return false
}
