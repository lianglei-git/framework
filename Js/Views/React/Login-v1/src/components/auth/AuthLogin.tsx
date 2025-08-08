import React, { useState } from 'react'
import {
    useAuth,
    useForm,
    Button,
    Input,
    validatePhone,
    identifyAccountType,
    AccountType,
    VerificationType
} from '../../'
import { getOAuthURLAPI } from '../../services/api'

interface AuthLoginProps {
    onSwitchToRegister: () => void
    onForgotPassword: () => void
    onOpenThirdparty: () => void
}

const AuthLogin: React.FC<AuthLoginProps> = ({ onSwitchToRegister, onForgotPassword, onOpenThirdparty }) => {
    const auth = useAuth()
    const [loginStep, setLoginStep] = useState<'account' | 'password'>('account')
    const [loginType, setLoginType] = useState<'email' | 'phone'>('account');
    // 验证类型 默认是密码输入
    const [verifyType, setVerifyType] = useState<'password' | 'code'>('password')
    const [isSendingCode, setIsSendingCode] = useState(false)
    const [countdown, setCountdown] = useState(0)
    const [codeLoginHint, setCodeLoginHint] = useState<string>('')
    const [emailCode, setEmailCode] = useState('')
    const [emailSending, setEmailSending] = useState(false)
    const [emailCountdown, setEmailCountdown] = useState(0)

    // 账号密码登录表单（两步）
    const accountForm = useForm({
        initialValues: {
            account: '',
            password: '',
            remember_me: false,
            login_type: 'username' as const
        },
        validate: (values) => {
            const errors: Record<string, string> = {}
            if (!values.account.trim()) {
                errors.account = '请输入账号'
            } else {
                const accountType = identifyAccountType(values.account)
                if (accountType === AccountType.UNKNOWN || accountType === AccountType.USERNAME) {
                    errors.account = '请输入有效的邮箱、手机号'
                }
            }
            return errors
        }
    })

    // 手机验证码登录表单
    const phoneForm = useForm({
        initialValues: { phone: '', code: '', remember_me: false },
        validate: (values) => {
            const errors: Record<string, string> = {}
            if (!values.phone.trim()) {
                errors.phone = '请输入手机号'
            } else if (!validatePhone(values.phone)) {
                errors.phone = '请输入正确的手机号'
            }
            if (!values.code.trim()) {
                errors.code = '请输入验证码'
            } else if (values.code.length !== 6) {
                errors.code = '验证码为6位数字'
            }
            return errors
        }
    })

    // 步骤：校验账号进入密码阶段
    const handleCheckAccount = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!accountForm.validate()) return
        setLoginStep('password')
    }

    const handleBackToAccount = () => {
        setLoginStep('account')
        accountForm.setValue('password', '')
        accountForm.resetErrors()
        setCodeLoginHint('')
    }

    const handleAccountLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!accountForm.values.password.trim()) {
            accountForm.setError('password', '请输入密码')
            return
        }
        try {
            const accountType = identifyAccountType(accountForm.values.account)
            await auth.login({
                account: accountForm.values.account,
                password: accountForm.values.password,
                remember_me: accountForm.values.remember_me,
                login_type: accountType === AccountType.UNKNOWN ? 'username' : accountType
            })
        } catch (error: any) {
            accountForm.setError('password', error.message || '密码错误')
        }
    }

    const handlePhoneLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!phoneForm.validate()) return
        try {
            await auth.phoneLogin({
                phone: phoneForm.values.phone,
                code: phoneForm.values.code,
                remember_me: phoneForm.values.remember_me
            })
        } catch (error: any) {
            phoneForm.setError('code', error.message || '登录失败')
        }
    }

    const handleSendCode = async () => {
        const phone = phoneForm.values.phone
        if (!validatePhone(phone)) {
            phoneForm.setError('phone', '请输入正确的手机号')
            return
        }
        setIsSendingCode(true)
        try {
            await auth.sendPhoneCode(phone, VerificationType.LOGIN)
            setCountdown(60)
            const timer = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(timer)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        } catch (error: any) {
            phoneForm.setError('phone', error.message || '发送验证码失败')
        } finally {
            setIsSendingCode(false)
        }
    }

    // 切换到验证码登录：手机号走短信验证码；邮箱暂不支持，给出提示
    const switchToCodeLogin = () => {
        setVerifyType(verifyType === 'password' ? 'code' : 'password')
        const type = identifyAccountType(accountForm.values.account)
        // setCodeLoginHint('')
        if (type === AccountType.PHONE) {
            //     // 预填手机号
            phoneForm.setValue('phone', accountForm.values.account)
        } else if (type === AccountType.EMAIL) {
            //     // 展示邮箱验证码输入区域
            // setCodeLoginHint('我们已为您的邮箱发送验证码，请输入6位验证码完成登录')
            handleSendEmailLoginCode()
        } else {
            accountForm.setError('account', '请输入有效的手机号或邮箱')
            // if (loginStep !== 'account') setLoginStep('account')
        }
    }

    const handleSendEmailLoginCode = async () => {
        const email = accountForm.values.account
        if (identifyAccountType(email) !== AccountType.EMAIL) {
            accountForm.setError('account', '请输入有效的邮箱')
            return
        }
        try {
            setEmailSending(true)
            await auth.sendEmailCode(email, VerificationType.LOGIN)
            setEmailCountdown(60)
            const timer = setInterval(() => {
                setEmailCountdown(prev => {
                    if (prev <= 1) { clearInterval(timer); return 0 }
                    return prev - 1
                })
            }, 1000)
        } catch (e: any) {
            setCodeLoginHint(e.message || '验证码发送失败')
        } finally {
            setEmailSending(false)
        }
    }

    const handleEmailCodeLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (emailCode.trim().length !== 6) {
            setCodeLoginHint('请输入6位验证码')
            return
        }
        try {
            await auth.emailCodeLogin?.({ email: accountForm.values.account, code: emailCode })
        } catch (err: any) {
            setCodeLoginHint(err.message || '登录失败')
        }
    }


    const handleGithubLogin = async () => {
        // 临时存储sessionStorage
        window.sessionStorage.setItem('github_access', 'true')
        //   = 'https://github.com/login/oauth/authorize?client_id=Ov23li5H25mAnW2AWrr1&scope=read:user';
        window.location.href = await getOAuthURLAPI('github', location.search.split('?')?.[1])
    }

    const verifyForComponent = () => {
        if (verifyType === 'password') {
            return <form onSubmit={handleAccountLogin} className="password-form">
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
                <Button type="submit" variant="primary" fullWidth loading={auth.isLoading} disabled={!accountForm.isValid}>登录</Button>
            </form>
        }

        if (verifyType === 'code') {

            if (identifyAccountType(accountForm.values.account) === AccountType.EMAIL) {
                return (
                    <form onSubmit={handleEmailCodeLogin} className="password-form" style={{ marginTop: 8 }}>
                        <div className="code-field">
                            <Input type="text" placeholder="邮箱验证码" value={emailCode} onChange={setEmailCode} fullWidth maxLength={6} required />
                            <Button type="button" variant="secondary" onClick={handleSendEmailLoginCode} disabled={emailSending || emailCountdown > 0}>
                                {emailCountdown > 0 ? `${emailCountdown}s` : emailSending ? '发送中...' : '发送验证码'}
                            </Button>
                        </div>
                        <Button type="submit" variant="primary" fullWidth loading={auth.isLoading}>验证码登录</Button>
                    </form>
                )
            }

            return <form onSubmit={handlePhoneLogin} className="phone-form">
                {/* <Input type="tel" placeholder="手机号" value={phoneForm.values.phone} onChange={(value) => phoneForm.setValue('phone', value)} error={phoneForm.errors.phone} fullWidth required /> */}
                <div className="code-field">
                    <Input type="text" placeholder="验证码" value={phoneForm.values.code} onChange={(value) => phoneForm.setValue('code', value)} error={phoneForm.errors.code} fullWidth maxLength={6} required />
                    <Button type="button" variant="secondary" onClick={handleSendCode} disabled={isSendingCode || countdown > 0}>
                        {countdown > 0 ? `${countdown}s` : isSendingCode ? '发送中...' : '发送验证码'}
                    </Button>
                </div>
                <Button type="submit" variant="primary" fullWidth loading={auth.isLoading} disabled={!phoneForm.isValid}>验证码登录</Button>
            </form>


        }
    }



    return (
        <div className="login-content">
            {/* {loginType === 'account' ? ( */}
            {loginStep === 'account' ? (
                <>
                    <form onSubmit={handleCheckAccount} className="account-login-form">
                        <Input
                            type="text"
                            placeholder="邮箱 / 手机号"
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
                        <button className="link-btn" onClick={onSwitchToRegister}>创建账户</button>
                    </div>

                    <div className="divider"><span>or</span></div>

                    <div className="social-login">
                        <Button variant="secondary" fullWidth className="social-btn github-btn" onClick={handleGithubLogin}>
                            <span className="social-icon"><i class="ri-github-fill"></i></span>
                            <span>使用 GitHub 登录</span>
                            <span></span>
                        </Button>
                        <Button variant="secondary" fullWidth className="social-btn wechat-btn" onClick={onOpenThirdparty}>
                            <span className="social-icon"><i style={{ color: "#07c160" }} class="ri-wechat-fill"></i></span>
                            <span>使用微信登录</span>
                            <span></span>
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    <div className="password-step">
                        <div className="user-info">
                            <div className="user-avatar">{accountForm.values.account?.charAt(0) || 'U'}</div>
                            <div className="user-details">
                                <div className="user-name">{accountForm.values.account}</div>
                                <div className="user-email">{accountForm.values.account}</div>
                            </div>
                            <button className="back-btn" onClick={handleBackToAccount}>切换账号</button>
                        </div>

                        {verifyForComponent()}

                        <div className="password-actions" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            <button className="action-link" onClick={onForgotPassword}>忘记密码？</button>
                            <button className="action-link" onClick={switchToCodeLogin}>{verifyType === 'password' ? '使用验证码登录' : '使用密码登录'}</button>
                        </div>



                        {codeLoginHint && (
                            <div className="error-message" style={{ marginTop: 12 }}>{codeLoginHint}</div>
                        )}
                    </div>
                </>
            )}
            {/* // ) : (
            //     // <form onSubmit={handlePhoneLogin} className="phone-form">
            //     //     <Input type="tel" placeholder="手机号" value={phoneForm.values.phone} onChange={(value) => phoneForm.setValue('phone', value)} error={phoneForm.errors.phone} fullWidth required />
            //     //     <div className="code-field">
            //     //         <Input type="text" placeholder="验证码" value={phoneForm.values.code} onChange={(value) => phoneForm.setValue('code', value)} error={phoneForm.errors.code} fullWidth maxLength={6} required />
            //     //         <Button type="button" variant="secondary" onClick={handleSendCode} disabled={isSendingCode || countdown > 0 || !validatePhone(phoneForm.values.phone)}>
            //     //             {countdown > 0 ? `${countdown}s` : isSendingCode ? '发送中...' : '发送验证码'}
            //     //         </Button>
            //     //     </div>
            //     //     <Button type="submit" variant="primary" fullWidth loading={auth.isLoading} disabled={!phoneForm.isValid}>登录</Button>
            //     //     <div className="password-actions" style={{ marginTop: 8 }}>
            //     //         <button className="action-link" onClick={() => setLoginType('account')}>使用密码登录</button>
            //     //     </div>
            //     // </form>
            // )} */}

            {/* 登录方式切换 - 预留 */}
            {/* <div className="login-switch">...</div> */}
        </div>
    )
}

export { AuthLogin } 