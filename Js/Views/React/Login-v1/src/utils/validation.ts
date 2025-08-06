import {
    ValidationError,
    PasswordValidationResult,
    AccountType,
    LoginFormData,
    RegisterFormData,
    ForgotPasswordFormData
} from '../types'

// 预定义验证函数
export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

export const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^1[3-9]\d{9}$/
    return phoneRegex.test(phone)
}

export const validateUsername = (username: string): boolean => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
    return usernameRegex.test(username)
}

export const validatePassword = (password: string): PasswordValidationResult => {
    const errors: string[] = []

    if (password.length < 8) {
        errors.push('密码长度至少8位')
    }

    if (!/[a-z]/.test(password)) {
        errors.push('密码必须包含小写字母')
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('密码必须包含大写字母')
    }

    if (!/\d/.test(password)) {
        errors.push('密码必须包含数字')
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('密码必须包含特殊字符')
    }

    const isValid = errors.length === 0
    let strength: 'weak' | 'medium' | 'strong' = 'weak'

    if (isValid) {
        if (password.length >= 12) {
            strength = 'strong'
        } else if (password.length >= 10) {
            strength = 'medium'
        }
    }

    return {
        isValid,
        errors,
        strength
    }
}

// 账号类型识别
export const identifyAccountType = (account: string): AccountType => {
    if (validateEmail(account)) {
        return AccountType.EMAIL
    }

    if (validatePhone(account)) {
        return AccountType.PHONE
    }

    if (validateUsername(account)) {
        return AccountType.USERNAME
    }

    return AccountType.UNKNOWN
}

// 表单验证函数
export const validateLoginForm = (data: LoginFormData): ValidationError[] => {
    const errors: ValidationError[] = []

    if (!data.account.trim()) {
        errors.push({ field: 'account', message: '请输入账号' })
    }

    if (!data.password.trim()) {
        errors.push({ field: 'password', message: '请输入密码' })
    }

    return errors
}

export const validateRegisterForm = (data: RegisterFormData): ValidationError[] => {
    const errors: ValidationError[] = []

    if (!data.username.trim()) {
        errors.push({ field: 'username', message: '请输入用户名' })
    } else if (!validateUsername(data.username)) {
        errors.push({ field: 'username', message: '用户名格式不正确，3-20位字母数字下划线' })
    }

    if (!data.email.trim()) {
        errors.push({ field: 'email', message: '请输入邮箱' })
    } else if (!validateEmail(data.email)) {
        errors.push({ field: 'email', message: '邮箱格式不正确' })
    }

    if (data.phone && !validatePhone(data.phone)) {
        errors.push({ field: 'phone', message: '手机号格式不正确' })
    }

    const passwordValidation = validatePassword(data.password)
    if (!passwordValidation.isValid) {
        errors.push({ field: 'password', message: passwordValidation.errors.join(', ') })
    }

    if (data.password !== data.confirm_password) {
        errors.push({ field: 'confirm_password', message: '两次输入的密码不一致' })
    }

    if (!data.agree_terms) {
        errors.push({ field: 'agree_terms', message: '请同意用户协议' })
    }

    if (!data.verification_code.trim()) {
        errors.push({ field: 'verification_code', message: '请输入验证码' })
    }

    return errors
}

export const validateForgotPasswordForm = (data: ForgotPasswordFormData): ValidationError[] => {
    const errors: ValidationError[] = []

    if (!data.account.trim()) {
        errors.push({ field: 'account', message: '请输入账号' })
    } else {
        const accountType = identifyAccountType(data.account)
        if (accountType === AccountType.UNKNOWN) {
            errors.push({ field: 'account', message: '请输入正确的邮箱或手机号' })
        }
    }

    if (!data.verification_code.trim()) {
        errors.push({ field: 'verification_code', message: '请输入验证码' })
    }

    const passwordValidation = validatePassword(data.new_password)
    if (!passwordValidation.isValid) {
        errors.push({ field: 'new_password', message: passwordValidation.errors.join(', ') })
    }

    if (data.new_password !== data.confirm_password) {
        errors.push({ field: 'confirm_password', message: '两次输入的密码不一致' })
    }

    return errors
}

// 通用验证器类
export class Validator {
    private errors: ValidationError[] = []

    required(value: any, field: string, message?: string): this {
        if (!value || (typeof value === 'string' && !value.trim())) {
            this.errors.push({ field, message: message || `${field}不能为空` })
        }
        return this
    }

    email(value: string, field: string, message?: string): this {
        if (value && !validateEmail(value)) {
            this.errors.push({ field, message: message || '邮箱格式不正确' })
        }
        return this
    }

    phone(value: string, field: string, message?: string): this {
        if (value && !validatePhone(value)) {
            this.errors.push({ field, message: message || '手机号格式不正确' })
        }
        return this
    }

    minLength(value: string, min: number, field: string, message?: string): this {
        if (value && value.length < min) {
            this.errors.push({ field, message: message || `${field}长度不能少于${min}位` })
        }
        return this
    }

    maxLength(value: string, max: number, field: string, message?: string): this {
        if (value && value.length > max) {
            this.errors.push({ field, message: message || `${field}长度不能超过${max}位` })
        }
        return this
    }

    pattern(value: string, pattern: RegExp, field: string, message?: string): this {
        if (value && !pattern.test(value)) {
            this.errors.push({ field, message: message || `${field}格式不正确` })
        }
        return this
    }

    custom(condition: boolean, field: string, message: string): this {
        if (condition) {
            this.errors.push({ field, message })
        }
        return this
    }

    getErrors(): ValidationError[] {
        return [...this.errors]
    }

    isValid(): boolean {
        return this.errors.length === 0
    }

    clear(): this {
        this.errors = []
        return this
    }
}

// 便捷验证函数
export const createValidator = () => new Validator() 