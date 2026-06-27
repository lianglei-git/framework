/**
 * OAuth 2.0 标准 Token 响应类型定义
 */

// ==================== 成功响应 ====================

export interface TokenResponse {
    // OAuth 2.0 标准字段
    access_token: string            // JWT访问令牌，1小时有效
    refresh_token: string           // JWT刷新令牌，30天有效
    id_token: string                // OpenID Connect ID令牌
    token_type: "Bearer"            // 固定值
    expires_in: number              // access_token有效期（秒），固定3600
    scope: string                   // 授权范围，固定"openid profile email phone"
    
    // 扩展字段
    user: UserInfo                  // 用户信息
    provider: string                // 认证提供者（centralized/github/google等）
    session_id?: string             // Session ID（仅中心登录系统返回）
    session_info?: SessionInfo      // Session详细信息（仅登录时返回）
}

export interface UserInfo {
    id: string
    username: string
    email: string
    phone?: string
    avatar?: string
    role: string
    created_at: string
}

export interface SessionInfo {
    session_id: string
    start_time: string              // ISO 8601格式
    last_activity: string           // ISO 8601格式
    expires_at: string              // ISO 8601格式，1年后
    current_app_id: string
    events: string[]
}

// ==================== 错误响应 ====================

export interface TokenErrorResponse {
    // OAuth 2.0 标准错误字段
    error: string                   // 错误类型
    error_description: string       // 人类可读的错误描述
    
    // 扩展字段（用于前端智能处理）
    error_code?: string            // 详细错误码
    suggest_action?: SuggestAction // 建议前端执行的操作
    error_uri?: string             // 错误详情文档链接
}

// ==================== 错误类型常量 ====================

// OAuth 2.0 标准错误类型
export enum OAuth2ErrorType {
    INVALID_REQUEST = "invalid_request",           // 请求缺少必需参数
    INVALID_CLIENT = "invalid_client",             // 客户端认证失败
    INVALID_GRANT = "invalid_grant",               // 授权无效或过期
    UNAUTHORIZED_CLIENT = "unauthorized_client",   // 客户端无权使用此授权方式
    UNSUPPORTED_GRANT_TYPE = "unsupported_grant_type", // 不支持的授权类型
    INVALID_SCOPE = "invalid_scope",               // 请求的作用域无效
    ACCESS_DENIED = "access_denied",               // 用户拒绝授权
    SERVER_ERROR = "server_error",                 // 服务器内部错误
    TEMPORARILY_UNAVAILABLE = "temporarily_unavailable" // 服务暂时不可用
}

// 详细错误码
export enum TokenErrorCode {
    // Refresh Token 相关错误码
    REFRESH_TOKEN_INVALID = "REFRESH_TOKEN_INVALID",   // Refresh token 无效
    REFRESH_TOKEN_EXPIRED = "REFRESH_TOKEN_EXPIRED",   // Refresh token 已过期
    TOKEN_HASH_MISMATCH = "TOKEN_HASH_MISMATCH",       // Token hash 不匹配
    TOKEN_USER_MISMATCH = "TOKEN_USER_MISMATCH",       // Token 用户不匹配
    SESSION_INACTIVE = "SESSION_INACTIVE",             // Session 未激活
    SESSION_EXPIRED = "SESSION_EXPIRED",               // Session 已过期
    SESSION_NOT_FOUND = "SESSION_NOT_FOUND",           // Session 未找到
    SESSION_REVOKED = "SESSION_REVOKED",               // Session 已撤销（强制登出）
    
    // Authorization Code 相关错误码
    AUTH_CODE_INVALID = "AUTH_CODE_INVALID",           // 授权码无效
    AUTH_CODE_EXPIRED = "AUTH_CODE_EXPIRED",           // 授权码已过期
    AUTH_CODE_USED = "AUTH_CODE_USED",                 // 授权码已使用
    REDIRECT_URI_MISMATCH = "REDIRECT_URI_MISMATCH",   // 重定向URI不匹配
    
    // Client 认证错误码
    CLIENT_NOT_FOUND = "CLIENT_NOT_FOUND",             // 客户端未找到
    CLIENT_SECRET_INVALID = "CLIENT_SECRET_INVALID",   // 客户端密钥无效
    CLIENT_INACTIVE = "CLIENT_INACTIVE",               // 客户端未激活
    
    // User 相关错误码
    USER_NOT_FOUND = "USER_NOT_FOUND",                 // 用户未找到
    USER_SUSPENDED = "USER_SUSPENDED",                 // 用户已暂停
    USER_DELETED = "USER_DELETED",                     // 用户已删除
    
    // 服务器错误码
    TOKEN_GENERATION_FAILED = "TOKEN_GENERATION_FAILED", // Token生成失败
    DATABASE_ERROR = "DATABASE_ERROR",                   // 数据库错误
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"          // 服务不可用
}

// 建议操作类型
export type SuggestAction = 
    | "check_session"   // 尝试用 session_id 恢复
    | "relogin"         // 立即跳转登录
    | "retry_auth"      // 重新发起OAuth授权
    | "contact_admin"   // 联系管理员
    | "retry"           // 重试请求
    | "retry_later"     // 稍后重试

// ==================== 前端处理映射 ====================

/**
 * 错误码到处理策略的映射
 */
export const ERROR_HANDLING_MAP: Record<TokenErrorCode, {
    message: string
    action: SuggestAction
    severity: 'error' | 'warn' | 'info'
}> = {
    // Refresh Token 相关
    [TokenErrorCode.REFRESH_TOKEN_INVALID]: {
        message: '登录凭证无效，尝试恢复登录...',
        action: 'check_session',
        severity: 'warn'
    },
    [TokenErrorCode.REFRESH_TOKEN_EXPIRED]: {
        message: '登录凭证已过期，尝试恢复登录...',
        action: 'check_session',
        severity: 'warn'
    },
    [TokenErrorCode.TOKEN_HASH_MISMATCH]: {
        message: '登录状态异常，尝试恢复...',
        action: 'check_session',
        severity: 'warn'
    },
    [TokenErrorCode.TOKEN_USER_MISMATCH]: {
        message: '用户信息不匹配，请重新登录',
        action: 'relogin',
        severity: 'error'
    },
    [TokenErrorCode.SESSION_INACTIVE]: {
        message: '会话未激活，请重新登录',
        action: 'relogin',
        severity: 'error'
    },
    [TokenErrorCode.SESSION_EXPIRED]: {
        message: '会话已过期，请重新登录',
        action: 'relogin',
        severity: 'error'
    },
    [TokenErrorCode.SESSION_NOT_FOUND]: {
        message: '会话未找到，尝试恢复...',
        action: 'check_session',
        severity: 'warn'
    },
    [TokenErrorCode.SESSION_REVOKED]: {
        message: '您已在其他地方登出，请重新登录',
        action: 'relogin',
        severity: 'error'
    },
    
    // Authorization Code 相关
    [TokenErrorCode.AUTH_CODE_INVALID]: {
        message: '授权码无效，重新授权...',
        action: 'retry_auth',
        severity: 'warn'
    },
    [TokenErrorCode.AUTH_CODE_EXPIRED]: {
        message: '授权码已过期，重新授权...',
        action: 'retry_auth',
        severity: 'warn'
    },
    [TokenErrorCode.AUTH_CODE_USED]: {
        message: '授权码已使用，重新授权...',
        action: 'retry_auth',
        severity: 'warn'
    },
    [TokenErrorCode.REDIRECT_URI_MISMATCH]: {
        message: '配置错误，请联系管理员',
        action: 'contact_admin',
        severity: 'error'
    },
    
    // Client 认证错误
    [TokenErrorCode.CLIENT_NOT_FOUND]: {
        message: '应用配置错误，请联系管理员',
        action: 'contact_admin',
        severity: 'error'
    },
    [TokenErrorCode.CLIENT_SECRET_INVALID]: {
        message: '应用认证失败，请联系管理员',
        action: 'contact_admin',
        severity: 'error'
    },
    [TokenErrorCode.CLIENT_INACTIVE]: {
        message: '应用已停用，请联系管理员',
        action: 'contact_admin',
        severity: 'error'
    },
    
    // User 相关
    [TokenErrorCode.USER_NOT_FOUND]: {
        message: '用户不存在，请重新登录',
        action: 'relogin',
        severity: 'error'
    },
    [TokenErrorCode.USER_SUSPENDED]: {
        message: '账号已被停用，请联系管理员',
        action: 'contact_admin',
        severity: 'error'
    },
    [TokenErrorCode.USER_DELETED]: {
        message: '账号已被删除',
        action: 'contact_admin',
        severity: 'error'
    },
    
    // 服务器错误
    [TokenErrorCode.TOKEN_GENERATION_FAILED]: {
        message: 'Token生成失败，请重试',
        action: 'retry',
        severity: 'error'
    },
    [TokenErrorCode.DATABASE_ERROR]: {
        message: '数据库错误，请重试',
        action: 'retry',
        severity: 'error'
    },
    [TokenErrorCode.SERVICE_UNAVAILABLE]: {
        message: '服务暂不可用，请稍后重试',
        action: 'retry_later',
        severity: 'error'
    }
}

