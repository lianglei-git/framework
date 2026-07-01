// 验证工具
export {
    validateEmail,
    validatePhone,
    validateUsername,
    validatePassword,
    identifyAccountType,
    validateLoginAccount,
    validateLoginForm,
    validateRegisterForm,
    validateForgotPasswordForm,
    Validator,
    createValidator
} from './validation'

// 存储工具
export { storage, storageManager, StorageManager } from './storage'

// 错误文案
export { formatAuthError, throwAuthError, isUnauthorizedError } from './authError'

// 验证码登录渠道
export {
    maskEmail,
    maskPhone,
    getCodeLoginChannels,
    resolveCodeContact,
    formatMaskedContact,
    formatCodeDeliveryHint,
} from './codeLoginContact'
export type { CodeChannel } from './codeLoginContact'

// 登录第二步模式
export { resolveLoginStepMode, isOtpSigninMode } from './loginStepMode'
export type { PreviewStatus, LoginStepMode } from './loginStepMode'