// Auth & user types
import type { SSOUser, SSOSession, SSOLoginRequest } from './sso'

// 基础类型
export interface BaseResponse<T = any> {
    code: number
    message: string
    data: T
    success: boolean
}

export interface User {
    id: string
    username: string
    nickname?: string
    email: string
    phone?: string
    avatar?: string
    role: UserRole
    status: UserStatus
    created_at: string
    updated_at?: string
    last_login_at?: string
    login_count?: number
    email_verified?: boolean
    phone_verified?: boolean
    linked_accounts?: LinkedAccount[]
    meta?: UserMeta
}

export interface UserMeta {
    nickname?: string
    bio?: string
    location?: string
    website?: string
    avatar?: string
    social_links?: Record<string, string>
}

export interface LinkedAccount {
    provider: string
    linked: boolean
}

export enum UserRole {
    USER = 'user',
    ADMIN = 'admin',
    MODERATOR = 'moderator'
}

export enum UserStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    SUSPENDED = 'suspended',
    PENDING = 'pending'
}

// 统一授权登录
export interface unifiedNormalLocalLoginRequest {
    internal_auth?: string
    double_verification?: string
    provider: string
    app_id?: string
    client_id?: string
    username?: string
    email?: string
    phone?: string
    password?: string
    code?: string
    state?: string
}
export interface unifiedNormalLocalLoginResponse {
    access_token: string;
    expires_in: number;
    id_token: string;
    provider: string;
    refresh_token: string;
    scope: string;
    session_id: string;
    session_info: {
        current_app_id: string;
        events: string[];
        expires_at: string;
        last_activity: string;
        session_id: string;
        start_time: string;
    };
    token_type: string;
    user: {
        id: string;
        email: string;
        phone: string;
        username: string;
        nickname: string;
        meta: {
            avatar: string;
        };
        role: string;
        status: string;
        email_verified: boolean;
        phone_verified: boolean;
        login_count: number;
        last_login_at: string;
        created_at: string;
    };
}

// 认证类型
export interface LoginRequest {
    account: string
    password: string
    remember_me?: boolean
    login_type?: 'email' | 'phone' | 'username'
}

export interface PhoneLoginRequest {
    phone: string
    code: string
    remember_me?: boolean
}

// EmailLoginRequest 邮箱验证码登录
export interface EmailLoginRequest {
    email: string
    code: string
}

export interface RegisterRequest {
    username: string
    email: string
    phone?: string
    password: string
    confirm_password: string
    agree_terms: boolean
    verification_code?: string
}

export interface ResetPasswordRequest {
    email: string
    code: string
    password: string
}

export interface PhoneResetPasswordRequest {
    phone: string
    code: string
    password: string
}

export interface SendEmailCodeRequest {
    email: string
    type: VerificationType
}

export interface SendPhoneCodeRequest {
    phone: string
    type: VerificationType
}

export enum VerificationType {
    REGISTER = 'register',
    LOGIN = 'login',
    RESET_PASSWORD = 'reset_password',
    CHANGE_EMAIL = 'change_email',
    CHANGE_PHONE = 'change_phone'
}

export interface LoginResponse {
    user: User
    token: string
    refresh_token: string
    expires_in: number
}

// 状态管理类型
export interface AuthState {
    user: User | null
    token: string | null
    refresh_token: string | null
    isAuthenticated: boolean
    isLoading: boolean
    error: string | null
}

export interface AuthContextType extends AuthState {
    login: (data: LoginRequest) => Promise<void>
    phoneLogin: (data: PhoneLoginRequest) => Promise<void>
    register: (data: RegisterRequest) => Promise<void>
    logout: () => Promise<void>
    resetPassword: (data: ResetPasswordRequest) => Promise<void>
    sendEmailCode: (email: string, type: VerificationType) => Promise<void>
    sendPhoneCode: (phone: string, type: VerificationType) => Promise<void>
    updateProfile: (data: Partial<User>) => Promise<void>
    changePassword: (oldPassword: string, newPassword: string) => Promise<void>
    refreshUser: () => Promise<void>
    clearError: () => void
    hasRole: (role: string) => boolean
    hasPermission: (permission: string) => boolean
}
// 认证Hook返回类型
export interface UseAuthReturn {
    // 传统认证状态
    user: User | null
    token: string | null
    refresh_token: string | null
    isLoading: boolean
    error: string | null
    isAuthenticated: boolean

    // SSO认证状态
    ssoUser: SSOUser | null
    ssoSession: SSOSession | null
    ssoService?: any
    isSSOAuthenticated: boolean

    // 传统认证方法
    login: (data: LoginRequest) => Promise<void>
    phoneLogin: (data: PhoneLoginRequest) => Promise<void>
    register: (data: RegisterRequest) => Promise<void>
    logout: () => Promise<void>
    refreshToken: () => Promise<void>
    resetPassword: (data: ResetPasswordRequest) => Promise<void>
    phoneResetPassword: (data: PhoneResetPasswordRequest) => Promise<void>
    sendEmailCode: (email: string, type: VerificationType) => Promise<void>
    sendPhoneCode: (phone: string, type: VerificationType) => Promise<void>
    forgotPassword: (email: string) => Promise<void>
    updateProfile: (data: Partial<User>) => Promise<void>
    changePassword: (oldPassword: string, newPassword: string) => Promise<void>
    refreshUser: () => Promise<void>
    hasRole: (role: string) => boolean
    clearError: () => void

    // 新增：邮箱验证码登录
    emailCodeLogin?: (data: EmailLoginRequest) => Promise<void>
    // 新增：OAuth登录（GitHub等）
    oauthLogin?: (provider: string, code: string, state?: string) => Promise<void>

    // SSO认证方法
    ssoLogin?: (request: SSOLoginRequest) => Promise<void>
    ssoLogout?: () => Promise<void>
    checkSSOSession?: () => Promise<boolean>
    getSSOAuthorizationUrl?: (provider: string, options?: any) => string
    refreshSSOToken?: () => Promise<any>
    validateSSOToken?: (token: string) => Promise<any>

    unifiedNormalLocalLogin: (data: unifiedNormalLocalLoginRequest) => Promise<void>
}
