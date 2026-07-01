import { AccountType } from '../types'
import { identifyAccountType } from './validation'

export type PreviewStatus = 'idle' | 'loading' | 'found' | 'not_found' | 'error'

export type LoginStepMode =
    | 'existing_user'
    | 'email_otp_signin'
    | 'phone_otp_signin'
    | 'unknown_account'

export function resolveLoginStepMode(
    previewStatus: PreviewStatus,
    account: string,
): LoginStepMode {
    const trimmed = account.trim()
    const inputType = identifyAccountType(trimmed)

    if (previewStatus === 'found') {
        return 'existing_user'
    }

    if (previewStatus === 'not_found') {
        if (inputType === AccountType.EMAIL) {
            return 'email_otp_signin'
        }
        if (inputType === AccountType.PHONE) {
            return 'phone_otp_signin'
        }
        if (inputType === AccountType.USERNAME) {
            return 'unknown_account'
        }
        return 'existing_user'
    }

    if (previewStatus === 'error') {
        if (inputType === AccountType.EMAIL) {
            return 'email_otp_signin'
        }
        if (inputType === AccountType.PHONE) {
            return 'phone_otp_signin'
        }
        return 'existing_user'
    }

    return 'existing_user'
}

export function isOtpSigninMode(mode: LoginStepMode): boolean {
    return mode === 'email_otp_signin' || mode === 'phone_otp_signin'
}
