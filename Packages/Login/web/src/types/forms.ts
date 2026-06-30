// Form, validation, UI component types
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

    unifiedNormalLocalLogin: (data: unifiedNormalLocalLoginRequest) => Promise<void>
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
