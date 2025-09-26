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
    email: string
    phone?: string
    avatar?: string
    role: UserRole
    status: UserStatus
    created_at: string
    updated_at: string
    last_login_at?: string
    meta?: UserMeta
}

export interface UserMeta {
    nickname?: string
    bio?: string
    location?: string
    website?: string
    social_links?: Record<string, string>
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

// 表单类型
export interface LoginFormData {
    account: string
    password: string
    remember_me: boolean
    login_type: 'email' | 'phone' | 'username'
}

export interface RegisterFormData {
    username: string
    email: string
    phone: string
    password: string
    confirm_password: string
    agree_terms: boolean
    verification_code: string
}

export interface ForgotPasswordFormData {
    account: string
    account_type: 'email' | 'phone'
    verification_code: string
    new_password: string
    confirm_password: string
}

export interface PhoneLoginFormData {
    phone: string
    code: string
    remember_me: boolean
}

// 验证类型
export interface ValidationError {
    field: string
    message: string
}

export interface PasswordValidationResult {
    isValid: boolean
    errors: string[]
    strength: 'weak' | 'medium' | 'strong'
}

export enum AccountType {
    EMAIL = 'email',
    PHONE = 'phone',
    USERNAME = 'username',
    UNKNOWN = 'unknown'
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

export interface FormState<T> {
    values: T
    errors: Record<keyof T, string>
    touched: Record<keyof T, boolean>
    isValid: boolean
    isDirty: boolean
    isSubmitting: boolean
}

export interface UseFormReturn<T> extends FormState<T> {
    setValue: (field: keyof T, value: any) => void
    setValues: (values: Partial<T>) => void
    setError: (field: keyof T, error: string) => void
    setErrors: (errors: Record<keyof T, string>) => void
    setTouched: (field: keyof T, touched: boolean) => void
    setTouchedAll: (touched: boolean) => void
    handleChange: (field: keyof T) => (event: React.ChangeEvent<HTMLInputElement>) => void
    handleBlur: (field: keyof T) => () => void
    handleSubmit: (onSubmit: (values: T) => Promise<void>) => (event?: React.FormEvent) => Promise<void>
    reset: () => void
    resetErrors: () => void
    validate: () => boolean
    getFieldError: (field: keyof T) => string
    hasFieldError: (field: keyof T) => boolean
    isFieldTouched: (field: keyof T) => boolean
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
}

// 存储类型
export interface LocalStorageData {
    user: User
    token: string
    refresh_token: string
    remember_me: boolean
    expires_at: number
}

export enum StorageType {
    LOCAL = 'localStorage',
    SESSION = 'sessionStorage'
}

// 主题类型
export type Theme = 'light' | 'dark' | 'auto'

// 组件类型
export interface ButtonProps {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link'
    size?: 'small' | 'medium' | 'large'
    type?: 'button' | 'submit' | 'reset'
    loading?: boolean
    disabled?: boolean
    fullWidth?: boolean
    icon?: React.ReactNode
    iconPosition?: 'left' | 'right'
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
    children: React.ReactNode
    className?: string
    'data-testid'?: string
}

export interface InputProps {
    type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'url' | 'search'
    placeholder?: string
    value: string
    onChange: (value: string) => void
    onBlur?: () => void
    onFocus?: () => void
    error?: string
    disabled?: boolean
    readonly?: boolean
    required?: boolean
    autoComplete?: string
    autoFocus?: boolean
    maxLength?: number
    minLength?: number
    pattern?: string
    icon?: React.ReactNode
    iconPosition?: 'left' | 'right'
    clearable?: boolean
    showPasswordToggle?: boolean
    size?: 'small' | 'medium' | 'large'
    fullWidth?: boolean
    label?: string
    helperText?: string
    className?: string
    'data-testid'?: string
}

export interface LoadingProps {
    type?: 'spinner' | 'dots' | 'pulse' | 'ring' | 'bars'
    size?: 'small' | 'medium' | 'large'
    color?: string
    text?: string
    fullScreen?: boolean
    overlay?: boolean
    className?: string
    'data-testid'?: string
}

// API 类型
export interface UserListParams {
    page?: number
    limit?: number
    search?: string
    role?: UserRole
    status?: UserStatus
    sort_by?: string
    sort_order?: 'asc' | 'desc'
}

export interface UserListResponse {
    users: User[]
    total: number
    page: number
    limit: number
    total_pages: number
}

export interface UserStats {
    total_users: number
    active_users: number
    new_users_today: number
    new_users_this_week: number
    new_users_this_month: number
}

export interface LogListParams {
    page?: number
    limit?: number
    user_id?: string
    action?: string
    start_date?: string
    end_date?: string
}

export interface LogListResponse {
    logs: any[]
    total: number
    page: number
    limit: number
    total_pages: number
}

export enum BulkAction {
    ACTIVATE = 'activate',
    DEACTIVATE = 'deactivate',
    DELETE = 'delete',
    CHANGE_ROLE = 'change_role'
}

// 事件类型
export type AuthEventListener = (data: any) => void

// SSO 类型定义
export interface SSOConfig {
    ssoServerUrl: string
    clientId: string
    clientSecret: string
    redirectUri: string
    scope?: string[]
    responseType?: 'code' | 'token' | 'id_token'
    grantType?: 'authorization_code' | 'implicit' | 'client_credentials'
    tokenEndpoint?: string
    userInfoEndpoint?: string
    logoutEndpoint?: string
    checkSessionEndpoint?: string
    sessionTimeout?: number
    autoRefresh?: boolean
    storageType?: StorageType
    cookieDomain?: string
    cookiePath?: string
    cookieSecure?: boolean
    cookieSameSite?: 'strict' | 'lax' | 'none'
}

export interface SSOToken {
    access_token: string
    refresh_token?: string
    id_token?: string
    token_type: string
    expires_in: number
    scope?: string[]
    state?: string
    session_info: SSOSession
}

export interface SSOProviderBasic {
    id: string
    name: string
    enabled: boolean
}

export interface SSOProvider {
    id: string
    name: string
    displayName: string
    icon?: string
    authorizationUrl: string
    enabled: boolean
    config?: Record<string, any>
}

export interface SSOOAuthUrlParams {
    authorizationUrl: string
    clientId: string
    redirectUri: string
    scope: string[]
    responseType: string
    state: SSOState
    additionalParams?: Record<string, any>
}

export interface SSOState {
    [key: string]: any
}

export interface SSOAuthRequest {
    provider: string
    redirect_uri?: string
    state?: string
    scope?: string[]
    response_type?: string
    prompt?: 'none' | 'login' | 'consent' | 'select_account'
    max_age?: number
    ui_locales?: string[]
    claims_locales?: string[]
    id_token_hint?: string
    login_hint?: string
    acr_values?: string[]
    additional_params?: Record<string, any>
}

export interface SSOAuthResponse {
    code?: string
    state?: string
    error?: string
    error_description?: string
    access_token?: string
    token_type?: string
    expires_in?: number
    scope?: string
    id_token?: string
}

export interface SSOLoginRequest {
    username?: string
    password?: string
    provider?: string
    code?: string
    state?: string
    redirect_uri?: string
    remember_me?: boolean
    login_type?: 'sso' | 'local'
}

export interface SSOLoginResponse {
    user: SSOUser
    token: SSOToken
    session: SSOSession
    redirect_url?: string
}

export interface SSOLogoutRequest {
    id_token_hint?: string
    post_logout_redirect_uri?: string
    state?: string
    logout_hint?: string
    additional_params?: Record<string, any>
}

export interface SSOLogoutResponse {
    logout_url?: string
    state?: string
    error?: string
    error_description?: string
}

export interface SSOUser {
    sub: string
    name?: string
    given_name?: string
    family_name?: string
    middle_name?: string
    nickname?: string
    preferred_username?: string
    profile?: string
    picture?: string
    website?: string
    email?: string
    email_verified?: boolean
    gender?: string
    birthdate?: string
    zoneinfo?: string
    locale?: string
    phone_number?: string
    phone_number_verified?: boolean
    address?: Record<string, any>
    updated_at?: number
    custom_claims?: Record<string, any>
}

export interface SSOSession {
    session_id: string
    user_id: string
    client_id: string
    authenticated_at: number
    expires_at: number
    last_activity: number
    ip_address?: string
    user_agent?: string
    location?: string
    device_fingerprint?: string
    is_active: boolean
    remember_me: boolean
}

export interface SSOSessionCheckResponse {
    is_authenticated: boolean
    session?: SSOSession
    user?: SSOUser
    error?: string
}

export interface SSOError {
    error: string
    error_description?: string
    error_uri?: string
    state?: string
}

export interface SSOProviderConfig {
    provider: string
    client_id: string
    client_secret?: string
    authorization_url: string
    token_url?: string
    user_info_url?: string
    logout_url?: string
    scope?: string[]
    response_type?: string
    grant_type?: string
    redirect_uri?: string
    enabled: boolean
    auto_discovery?: boolean
    issuer_url?: string
    jwks_url?: string
}

export interface SSOKeyPair {
    public_key: string
    private_key: string
    key_id: string
    algorithm: string
    expires_at?: number
}

export interface SSOCallbackContext {
    code?: string
    state?: string
    error?: string
    error_description?: string
    session_state?: string
    iss?: string
    client_id?: string
    redirect_uri?: string
}

export interface SSOTokenValidationResult {
    is_valid: boolean
    token?: SSOToken
    user?: SSOUser
    error?: string
    error_description?: string
}

export interface SSOIntrospectionRequest {
    token: string
    token_type_hint?: 'access_token' | 'refresh_token'
    client_id?: string
    client_secret?: string
}

export interface SSOIntrospectionResponse {
    active: boolean
    client_id?: string
    sub?: string
    aud?: string | string[]
    iss?: string
    exp?: number
    iat?: number
    auth_time?: number
    nonce?: string
    acr?: string
    amr?: string[]
    azp?: string
    scope?: string
    drn?: string
    policies?: Record<string, any>
    groups?: string[]
    roles?: string[]
    custom_claims?: Record<string, any>
}

export interface SSORefreshTokenRequest {
    refresh_token: string
    grant_type?: 'refresh_token'
    scope?: string[]
    client_id?: string
    client_secret?: string
}

export interface SSORefreshTokenResponse {
    access_token: string
    token_type: string
    expires_in: number
    refresh_token?: string
    scope?: string[]
}

export interface SSOUserInfoResponse {
    sub: string
    name?: string
    given_name?: string
    family_name?: string
    middle_name?: string
    nickname?: string
    preferred_username?: string
    profile?: string
    picture?: string
    website?: string
    email?: string
    email_verified?: boolean
    gender?: string
    birthdate?: string
    zoneinfo?: string
    locale?: string
    phone_number?: string
    phone_number_verified?: boolean
    address?: Record<string, any>
    updated_at?: number
    custom_claims?: Record<string, any>
}

export interface SSODiscoveryDocument {
    issuer: string
    authorization_endpoint: string
    token_endpoint: string
    userinfo_endpoint: string
    end_session_endpoint?: string
    check_session_iframe?: string
    revocation_endpoint?: string
    introspection_endpoint?: string
    device_authorization_endpoint?: string
    registration_endpoint?: string
    jwks_uri: string
    scopes_supported?: string[]
    response_types_supported: string[]
    response_modes_supported?: string[]
    grant_types_supported?: string[]
    acr_values_supported?: string[]
    subject_types_supported: string[]
    id_token_signing_alg_values_supported: string[]
    id_token_encryption_alg_values_supported?: string[]
    id_token_encryption_enc_values_supported?: string[]
    userinfo_signing_alg_values_supported?: string[]
    userinfo_encryption_alg_values_supported?: string[]
    userinfo_encryption_enc_values_supported?: string[]
    request_object_signing_alg_values_supported?: string[]
    request_object_encryption_alg_values_supported?: string[]
    request_object_encryption_enc_values_supported?: string[]
    token_endpoint_auth_methods_supported?: string[]
    token_endpoint_auth_signing_alg_values_supported?: string[]
    display_values_supported?: string[]
    claim_types_supported?: string[]
    claims_supported?: string[]
    service_documentation?: string
    claims_locales_supported?: string[]
    ui_locales_supported?: string[]
    claims_parameter_supported?: boolean
    request_parameter_supported?: boolean
    request_uri_parameter_supported?: boolean
    require_request_uri_registration?: boolean
    op_policy_uri?: string
    op_tos_uri?: string
}

export interface SSOClientRegistration {
    client_id: string
    client_secret?: string
    client_name: string
    client_uri?: string
    logo_uri?: string
    scope?: string[]
    grant_types?: string[]
    response_types?: string[]
    redirect_uris?: string[]
    post_logout_redirect_uris?: string[]
    token_endpoint_auth_method?: string
    token_endpoint_auth_signing_alg?: string
    userinfo_signed_response_alg?: string
    userinfo_encrypted_response_alg?: string
    userinfo_encrypted_response_enc?: string
    contacts?: string[]
    tos_uri?: string
    policy_uri?: string
    jwks_uri?: string
    jwks?: SSOKeyPair
    software_id?: string
    software_version?: string
    client_id_issued_at?: number
    client_secret_expires_at?: number
    registration_access_token?: string
    registration_client_uri?: string
    client_id_alias?: string
    sector_identifier_uri?: string
    subject_type?: string
    id_token_signed_response_alg?: string
    id_token_encrypted_response_alg?: string
    id_token_encrypted_response_enc?: string
    default_max_age?: number
    require_auth_time?: boolean
    default_acr_values?: string[]
    initiate_login_uri?: string
    request_uris?: string[]
    request_object_signing_alg?: string
    request_object_encryption_alg?: string
    request_object_encryption_enc?: string
    backchannel_logout_uri?: string
    backchannel_logout_session_required?: boolean
    frontchannel_logout_uri?: boolean
    frontchannel_logout_session_required?: boolean
    post_logout_redirect_uris?: string[]
    custom_metadata?: Record<string, any>
}

// ==========================================
// Token刷新相关类型定义
// ==========================================

export interface TokenStatus {
    is_valid: boolean
    expires_at: string
    remaining_hours: number
    remaining_minutes: number
    is_expiring_soon: boolean
    token_type: string
}

export interface TokenRefreshResult {
    access_token: string
    refresh_token?: string
    token_type: string
    expires_in: number
    refresh_expires_in?: number
    user_id: string
    email: string
    role: string
    user?: User
}

export interface UseTokenRefreshReturn {
    // 状态
    isMonitoring: boolean
    tokenStatus: TokenStatus | null
    isLoading: boolean
    error: string | null
    isRefreshing: boolean
    lastRefreshTime: number | null
    nextRefreshTime: number | null

    // 双Token方法
    refreshTokenWithRefreshToken: (refreshToken?: string) => Promise<TokenRefreshResult | null>
    loginWithTokenPair: (account: string, password: string) => Promise<TokenRefreshResult | null>

    // 传统方法
    refreshToken: () => Promise<boolean>
    loginWithRememberMe: (account: string, password: string) => Promise<boolean>

    // Token管理
    startMonitoring: () => void
    stopMonitoring: () => void
    checkTokenStatus: () => Promise<TokenStatus | null>
    getTokenExpirationTime: () => Promise<number | null>
    scheduleTokenRefresh: (expiresInSeconds: number) => void

    // 事件监听
    onTokenRefreshed: (callback: (token: string) => void) => () => void
    onTokenExpired: (callback: () => void) => () => void
    onRefreshError: (callback: (error: Error) => void) => () => void
}

export interface UseTokenPairLoginReturn {
    login: (account: string, password: string) => Promise<TokenRefreshResult>
    isLoading: boolean
    error: string | null
    clearError: () => void
}

export interface UseTokenRefreshEventsReturn {
    lastRefresh: number | null
    refreshError: Error | null
    clearError: () => void
}

export interface UseTokenStatusReturn {
    status: TokenStatus | null
    loading: boolean
    checkStatus: () => Promise<TokenStatus | null>
    isValid: boolean
    isExpiringSoon: boolean
    remainingHours: number
}

export interface UseSSOTokenRefreshReturn {
    // 核心刷新功能
    refreshToken: (refreshToken?: string) => Promise<TokenRefreshResult | null>
    loginWithTokenPair: (account: string, password: string) => Promise<TokenRefreshResult | null>

    // 状态管理
    checkTokenStatus: () => Promise<TokenStatus | null>
    startMonitoring: () => void
    stopMonitoring: () => void

    // 状态
    isMonitoring: boolean
    isRefreshing: boolean

    // 事件监听
    onTokenRefreshed: (callback: (token: string) => void) => () => void
    onTokenExpired: (callback: () => void) => () => void
    onRefreshError: (callback: (error: Error) => void) => () => void

    // 便捷方法
    isTokenValid: () => Promise<boolean>

    // 获取用户信息（如果需要）
    getUserInfo: () => User | null
}

// ==========================================
// SSO URL处理相关类型定义
// ==========================================

export interface UseSSOUrlHandlerReturn {
    // 状态
    ssoService: any
    isInitialized: boolean
    isCallbackMode: boolean
    isLoading: boolean
    error: string | null

    // 方法
    handleAutomaticSSO: () => Promise<SSOLoginResponse | void>
    handleCallback: (context?: Partial<SSOCallbackContext>) => Promise<SSOLoginResponse>
    buildAuthorizationUrl: (providerId: string, options?: Partial<SSOAuthRequest>) => string
    buildImplicitFlowUrl: (providerId: string, options?: Partial<SSOAuthRequest>) => string
    buildHybridFlowUrl: (providerId: string, options?: Partial<SSOAuthRequest>) => string
    getURLParams: () => URLSearchParams
    hasAuthorizationRequest: () => boolean
    getSSOConfig: () => SSOConfig | null
    clearError: () => void
}

export interface UseExternalSSOIntegrationReturn {
    // 状态
    authResult: SSOLoginResponse | null
    userInfo: any
    isLoading: boolean
    error: string | null
    isInitialized: boolean

    // 方法
    initiateAuthorization: (options?: Partial<SSOAuthRequest>) => Promise<void>
    checkAuthStatus: () => Promise<SSOSessionCheckResponse>
    logout: () => Promise<void>
    clearError: () => void

    // 原始服务实例
    ssoService: any
}

export interface UseOpenIDConnectReturn {
    // 状态
    idToken: string | null
    userClaims: any
    isLoading: boolean
    error: string | null

    // 方法
    handleIDToken: (token: string) => Promise<SSOUser>
    validateIDToken: (token: string) => Promise<SSOTokenValidationResult>
    buildLogoutUrl: (options?: { postLogoutRedirectUri?: string; state?: string }) => string
    clearError: () => void
} 