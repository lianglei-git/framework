import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
    useAuth,
    useForm,
    Button,
    Input,
    VerificationType,
    validateLoginAccount,
    getCodeLoginChannels,
    resolveCodeContact,
    formatMaskedContact,
    formatCodeDeliveryHint,
    resolveLoginStepMode,
    isOtpSigninMode,
} from '../../'
import type { CodeChannel } from '../../utils/codeLoginContact'
import type { PreviewStatus } from '../../utils/loginStepMode'
import { authApi } from '../../core'
import { LoginAccountSummary } from './LoginAccountSummary'
import { LoginCodeChannelModal } from './LoginCodeChannelModal'
import { UnknownAccountNotice } from './UnknownAccountNotice'
import type { AccountPreview } from '../../types'

import { RiGithubFill, RiGoogleFill, RiWechatFill } from 'react-icons/ri'
import { useNavigate } from 'react-router-dom'
import { routeAfterLogin } from '../../routes/loginEntry'
import { LOGIN_ACCOUNT_PLACEHOLDER } from '../../constants/userIdentity'
import { scheduleProfileNudgeIfNeeded } from '../../utils/profileIdentity'
import { globalUserStore } from '../../stores/UserStore'
import { formatAuthError } from '../../utils/authError'
import { pickSocialProviders } from '../../sso/socialProviders'

interface AuthLoginProps {
    onSwitchToRegister: () => void
    onForgotPassword: () => void
    ssoService?: any
    ssoProviders?: any[]
    onSSOLogin?: (provider: string) => void
}

const AuthLogin: React.FC<AuthLoginProps> = ({
    onSwitchToRegister,
    onForgotPassword,
    ssoService,
    ssoProviders = [],
    onSSOLogin
}) => {
    const auth = useAuth()
    const navigate = useNavigate()
    const [loginStep, setLoginStep] = useState<'account' | 'password'>('account')
    const [verifyType, setVerifyType] = useState<'password' | 'code'>('password')
    const [codeLoginHint, setCodeLoginHint] = useState<string>('')
    const [accountPreview, setAccountPreview] = useState<AccountPreview | null>(null)
    const [previewStatus, setPreviewStatus] = useState<PreviewStatus>('idle')
    const [previewLoading, setPreviewLoading] = useState(false)
    const [codeChannel, setCodeChannel] = useState<CodeChannel | null>(null)
    const [channelPickerOpen, setChannelPickerOpen] = useState(false)
    const [pickerChannel, setPickerChannel] = useState<CodeChannel>('email')
    const [verificationCode, setVerificationCode] = useState('')
    const [codeSending, setCodeSending] = useState(false)
    const [codeCountdown, setCodeCountdown] = useState(0)
    const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const autoOtpSentRef = useRef<string | null>(null)

    const accountForm = useForm({
        initialValues: {
            account: '',
            password: '',
            remember_me: false,
            login_type: 'username' as const
        },
        validate: (values) => {
            const errors: Record<string, string> = {}
            const accountError = validateLoginAccount(values.account)
            if (accountError) {
                errors.account = accountError
            }
            return errors
        }
    })

    const account = accountForm.values.account.trim()
    const loginStepMode = useMemo(
        () => resolveLoginStepMode(previewStatus, account),
        [previewStatus, account],
    )
    const channels = useMemo(
        () => getCodeLoginChannels(accountPreview, account),
        [accountPreview, account],
    )
    const isOtpSignin = isOtpSigninMode(loginStepMode)
    const canUseCodeLogin = loginStepMode === 'existing_user' && channels.length > 0 && !previewLoading

    const clearCountdown = () => {
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current)
            countdownTimerRef.current = null
        }
        setCodeCountdown(0)
    }

    const resetCodeLoginState = () => {
        clearCountdown()
        setCodeChannel(null)
        setChannelPickerOpen(false)
        setPickerChannel('email')
        setVerificationCode('')
        setCodeSending(false)
        setCodeLoginHint('')
        autoOtpSentRef.current = null
    }

    const startCountdown = () => {
        clearCountdown()
        setCodeCountdown(60)
        countdownTimerRef.current = setInterval(() => {
            setCodeCountdown((prev) => {
                if (prev <= 1) {
                    if (countdownTimerRef.current) {
                        clearInterval(countdownTimerRef.current)
                        countdownTimerRef.current = null
                    }
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }

    const sendLoginCode = async (channel: CodeChannel) => {
        const contact = resolveCodeContact(channel, accountPreview, account)
        if (!contact) {
            setCodeLoginHint('无法获取验证方式，请使用密码登录')
            return
        }

        setCodeSending(true)
        if (!isOtpSignin) {
            setCodeLoginHint('')
        }
        try {
            if (channel === 'email') {
                await auth.sendEmailCode(contact, VerificationType.LOGIN)
            } else {
                await auth.sendPhoneCode(contact, VerificationType.LOGIN)
            }
            setCodeChannel(channel)
            startCountdown()
            setCodeLoginHint(`验证码已发送至 ${formatMaskedContact(channel, contact)}`)
        } catch (error: any) {
            setCodeLoginHint(formatAuthError(error, '验证码发送失败'))
        } finally {
            setCodeSending(false)
        }
    }

    const beginCodeLogin = async (channel: CodeChannel) => {
        setVerifyType('code')
        setVerificationCode('')
        await sendLoginCode(channel)
    }

    const handleCheckAccount = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!accountForm.validate()) return
        resetCodeLoginState()
        setVerifyType('password')
        setPreviewLoading(true)
        setAccountPreview(null)
        setPreviewStatus('loading')
        try {
            const preview = await authApi.getAccountPreview(account)
            if (preview.found) {
                setAccountPreview(preview)
                setPreviewStatus('found')
            } else {
                setAccountPreview(null)
                setPreviewStatus('not_found')
            }
        } catch {
            setAccountPreview(null)
            setPreviewStatus('error')
        } finally {
            setPreviewLoading(false)
        }
        setLoginStep('password')
    }

    const handleBackToAccount = () => {
        setLoginStep('account')
        setAccountPreview(null)
        setPreviewStatus('idle')
        setVerifyType('password')
        resetCodeLoginState()
        accountForm.setValue('password', '')
        accountForm.resetErrors()
    }

    useEffect(() => {
        if (loginStep !== 'password' || previewLoading) {
            return
        }
        if (loginStepMode !== 'email_otp_signin' && loginStepMode !== 'phone_otp_signin') {
            return
        }

        const channel: CodeChannel = loginStepMode === 'email_otp_signin' ? 'email' : 'phone'
        const key = `${account}:${loginStepMode}`
        if (autoOtpSentRef.current === key) {
            return
        }
        autoOtpSentRef.current = key
        void beginCodeLogin(channel)
    }, [loginStep, previewLoading, loginStepMode, account])

    const finishLogin = async () => {
        try {
            await globalUserStore.requestUserDetailsInfo()
            scheduleProfileNudgeIfNeeded(globalUserStore.detailsUserInfo)
        } catch {
            // 登录已成功，资料拉取失败不阻断跳转
        }
        routeAfterLogin(navigate)
    }

    const handleAccountLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!accountForm.values.password.trim()) {
            accountForm.setError('password', '请输入密码')
            return
        }
        try {
            await auth.unifiedNormalLocalLogin({
                password: accountForm.values.password,
                provider: 'local',
                username: accountForm.values.account,
            })
            await finishLogin()
        } catch (error: any) {
            accountForm.setError('password', formatAuthError(error, '账号或密码错误'))
        }
    }

    const handleCodeLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!codeChannel) {
            setCodeLoginHint('请先选择验证方式')
            return
        }
        if (verificationCode.trim().length !== 6) {
            setCodeLoginHint('请输入6位验证码')
            return
        }

        const contact = resolveCodeContact(codeChannel, accountPreview, account)
        if (!contact) {
            setCodeLoginHint('无法获取验证方式，请使用密码登录')
            return
        }

        try {
            if (codeChannel === 'email') {
                await auth.unifiedNormalLocalLogin({
                    email: contact,
                    code: verificationCode,
                    provider: 'email',
                })
            } else {
                await auth.phoneLogin({
                    phone: contact,
                    code: verificationCode,
                    remember_me: accountForm.values.remember_me,
                })
            }
            await finishLogin()
        } catch (error: any) {
            setCodeLoginHint(formatAuthError(error, '登录失败'))
        }
    }

    const switchToCodeLogin = () => {
        if (loginStepMode !== 'existing_user') {
            return
        }

        if (verifyType === 'code') {
            setVerifyType('password')
            resetCodeLoginState()
            return
        }

        if (!canUseCodeLogin) {
            setCodeLoginHint('该账号未绑定邮箱或手机号，请使用密码登录')
            return
        }

        if (channels.length === 1) {
            void beginCodeLogin(channels[0])
            return
        }

        const emailContact = resolveCodeContact('email', accountPreview, account)
        const phoneContact = resolveCodeContact('phone', accountPreview, account)
        if (!emailContact || !phoneContact) {
            void beginCodeLogin(channels[0])
            return
        }

        setPickerChannel('email')
        setChannelPickerOpen(true)
    }

    const handleChannelPickerConfirm = () => {
        setChannelPickerOpen(false)
        void beginCodeLogin(pickerChannel)
    }

    const handleChannelPickerCancel = () => {
        setChannelPickerOpen(false)
    }

    const handleChangeCodeChannel = () => {
        if (channels.length !== 2) {
            return
        }
        setPickerChannel(codeChannel || 'email')
        clearCountdown()
        setVerificationCode('')
        setChannelPickerOpen(true)
    }

    const otpChannel: CodeChannel | undefined = loginStepMode === 'phone_otp_signin'
        ? 'phone'
        : loginStepMode === 'email_otp_signin'
            ? 'email'
            : undefined

    const codeDeliveryHint = codeChannel
        ? formatCodeDeliveryHint(codeChannel, resolveCodeContact(codeChannel, accountPreview, account))
        : undefined

    const emailPickerLabel = formatMaskedContact(
        'email',
        resolveCodeContact('email', accountPreview, account),
    )
    const phonePickerLabel = formatMaskedContact(
        'phone',
        resolveCodeContact('phone', accountPreview, account),
    )

    const renderCodeForm = () => (
        <form onSubmit={handleCodeLogin} className="password-form" style={{ marginTop: 8 }}>
            <div className="code-field">
                <Input
                    type="text"
                    placeholder="验证码"
                    value={verificationCode}
                    onChange={setVerificationCode}
                    fullWidth
                    maxLength={6}
                    required
                />
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => codeChannel && void sendLoginCode(codeChannel)}
                    disabled={!codeChannel || codeSending || codeCountdown > 0}
                >
                    {codeCountdown > 0 ? `${codeCountdown}s` : codeSending ? '发送中...' : '发送验证码'}
                </Button>
            </div>
            <Button type="submit" variant="primary" fullWidth loading={auth.isLoading}>
                验证码登录
            </Button>
            {loginStepMode === 'existing_user' && channels.length === 2 && (
                <div className="password-actions" style={{ marginTop: 8 }}>
                    <button type="button" className="action-link" onClick={handleChangeCodeChannel}>
                        更换验证方式
                    </button>
                </div>
            )}
        </form>
    )

    const renderPasswordForm = () => (
        <form onSubmit={handleAccountLogin} className="password-form">
            <Input
                type="password"
                placeholder="请输入密码"
                value={accountForm.values.password}
                onChange={(value) => accountForm.setValue('password', value)}
                error={accountForm.errors.password}
                fullWidth
                required
                autoFocus
                showPasswordToggle
            />
            <Button type="submit" variant="primary" fullWidth loading={auth.isLoading} disabled={!accountForm.isValid}>
                登录
            </Button>
        </form>
    )

    const renderStepTwoForm = () => {
        if (loginStepMode === 'unknown_account') {
            return <UnknownAccountNotice onCreateAccount={onSwitchToRegister} />
        }

        if (isOtpSignin) {
            return renderCodeForm()
        }

        if (verifyType === 'password') {
            return renderPasswordForm()
        }

        return renderCodeForm()
    }

    const socialProviders = pickSocialProviders(ssoProviders)

    return (
        <div className="login-content">
            {loginStep === 'account' ? (
                <>
                    <form onSubmit={handleCheckAccount} className="account-login-form">
                        <Input
                            type="text"
                            placeholder={LOGIN_ACCOUNT_PLACEHOLDER}
                            value={accountForm.values.account}
                            onChange={(value) => accountForm.setValue('account', value)}
                            error={accountForm.errors.account}
                            fullWidth
                            required
                        />
                        <Button type="submit" variant="primary" fullWidth disabled={!accountForm.isValid}>
                            下一步
                        </Button>
                    </form>

                    <div className="register-link">
                        <span>还没有账户？</span>
                        <button type="button" className="link-btn" onClick={onSwitchToRegister}>创建账户</button>
                    </div>

                    <div className="divider"><span>or</span></div>

                    <div className="social-login">
                        {socialProviders.map((provider: any) => (
                            <Button
                                key={provider.id}
                                variant="secondary"
                                fullWidth
                                className={`social-btn ${provider.name}-btn`}
                                onClick={() => onSSOLogin?.(provider.id)}
                            >
                                <span className="social-icon">
                                    {provider.id === 'github' && <RiGithubFill />}
                                    {provider.id === 'google' && <RiGoogleFill />}
                                    {provider.id === 'wechat' && <RiWechatFill style={{ color: "#07c160" }} />}
                                </span>
                                <span>使用 {provider.displayName || provider.name} 登录</span>
                                <span></span>
                            </Button>
                        ))}
                    </div>
                </>
            ) : (
                <>
                    <div className="password-step">
                        <LoginAccountSummary
                            account={accountForm.values.account}
                            preview={accountPreview}
                            loading={previewLoading}
                            mode={isOtpSignin ? 'otp_signin' : 'default'}
                            otpChannel={otpChannel}
                            codeDeliveryHint={verifyType === 'code' ? codeDeliveryHint : undefined}
                            onSwitchAccount={handleBackToAccount}
                        />

                        {renderStepTwoForm()}

                        {loginStepMode === 'existing_user' && (
                            <div className="password-actions" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                <button type="button" className="action-link" onClick={onForgotPassword}>忘记密码？</button>
                                {canUseCodeLogin && (
                                    <button type="button" className="action-link" onClick={switchToCodeLogin}>
                                        {verifyType === 'password' ? '使用验证码登录' : '使用密码登录'}
                                    </button>
                                )}
                            </div>
                        )}

                        {codeLoginHint && (
                            <div className="error-message" style={{ marginTop: 12 }}>{codeLoginHint}</div>
                        )}
                    </div>

                    <LoginCodeChannelModal
                        visible={channelPickerOpen}
                        emailLabel={emailPickerLabel}
                        phoneLabel={phonePickerLabel}
                        selectedChannel={pickerChannel}
                        onSelect={setPickerChannel}
                        onConfirm={handleChannelPickerConfirm}
                        onCancel={handleChannelPickerCancel}
                    />
                </>
            )}
        </div>
    )
}

export { AuthLogin }
