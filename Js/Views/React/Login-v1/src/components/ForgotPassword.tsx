import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useForm } from '../hooks/useForm'
import { Button, Input } from './common'
import { validateEmail, validatePassword, identifyAccountType } from '../utils/validation'
import { ResetPasswordRequest, PhoneResetPasswordRequest, AccountType } from '../types'
import './ForgotPassword.less'

interface ForgotPasswordProps {
    onBack?: () => void
    onSuccess?: () => void
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack, onSuccess }) => {
    const auth = useAuth()
    const [step, setStep] = useState<'email' | 'code' | 'password'>('email')
    const [accountType, setAccountType] = useState<AccountType>(AccountType.UNKNOWN)
    const [account, setAccount] = useState('')

    // 邮箱步骤表单
    const emailForm = useForm({
        initialValues: { email: '' },
        validate: (values) => {
            const errors: Record<string, string> = {}
            if (!values.email) {
                errors.email = '请输入邮箱地址'
            } else if (!validateEmail(values.email)) {
                errors.email = '请输入有效的邮箱地址'
            }
            return errors
        }
    })

    // 验证码步骤表单
    const codeForm = useForm({
        initialValues: { code: '' },
        validate: (values) => {
            const errors: Record<string, string> = {}
            if (!values.code) {
                errors.code = '请输入验证码'
            } else if (values.code.length !== 6) {
                errors.code = '验证码必须是6位数字'
            }
            return errors
        }
    })

    // 密码步骤表单
    const passwordForm = useForm({
        initialValues: { password: '', confirmPassword: '' },
        validate: (values) => {
            const errors: Record<string, string> = {}
            if (!values.password) {
                errors.password = '请输入新密码'
            } else if (values.password.length < 6) {
                errors.password = '密码长度至少6位'
            }
            if (!values.confirmPassword) {
                errors.confirmPassword = '请确认新密码'
            } else if (values.password !== values.confirmPassword) {
                errors.confirmPassword = '两次输入的密码不一致'
            }
            return errors
        }
    })

    // 处理邮箱提交
    const handleEmailSubmit = async () => {
        if (!emailForm.validate()) return

        try {
            await auth.forgotPassword(emailForm.values.email)
            setAccount(emailForm.values.email)
            setAccountType(identifyAccountType(emailForm.values.email))
            setStep('code')
        } catch (error) {
            console.error('发送重置邮件失败:', error)
        }
    }

    // 处理验证码提交
    const handleCodeSubmit = async () => {
        if (!codeForm.validate()) return

        try {
            // 验证码验证成功，进入密码设置步骤
            setStep('password')
        } catch (error) {
            console.error('验证码验证失败:', error)
        }
    }

    // 处理密码重置
    const handlePasswordReset = async () => {
        if (!passwordForm.validate()) return

        try {
            if (accountType === AccountType.EMAIL) {
                const resetData: ResetPasswordRequest = {
                    email: account,
                    code: codeForm.values.code,
                    password: passwordForm.values.password
                }
                await auth.resetPassword(resetData)
            } else if (accountType === AccountType.PHONE) {
                const resetData: PhoneResetPasswordRequest = {
                    phone: account,
                    code: codeForm.values.code,
                    password: passwordForm.values.password
                }
                await auth.phoneResetPassword(resetData)
            }

            // 重置成功
            if (onSuccess) {
                onSuccess()
            }
        } catch (error) {
            console.error('重置密码失败:', error)
        }
    }

    // 重新发送验证码
    const handleResendCode = async () => {
        try {
            await auth.forgotPassword(account)
            // 显示成功提示
        } catch (error) {
            console.error('重新发送验证码失败:', error)
        }
    }

    // 返回上一步
    const handleBack = () => {
        if (step === 'code') {
            setStep('email')
            codeForm.reset()
        } else if (step === 'password') {
            setStep('code')
            passwordForm.reset()
        }
    }

    return (
        <div className="forgot-password">
            <div className="forgot-password-header">
                <h2>忘记密码</h2>
                <p>请输入您的邮箱地址，我们将发送重置密码的验证码</p>
            </div>

            {step === 'email' && (
                <div className="forgot-password-step">
                    {/* <form > */}
                    <Input
                        type="email"
                        placeholder="请输入邮箱地址"
                        value={emailForm.values.email}
                        onChange={emailForm.setValue.bind(null, 'email')}
                        error={emailForm.getFieldError('email')}
                        fullWidth
                    />
                    <Button
                        type="submit"
                        loading={auth.isLoading}
                        disabled={!emailForm.isValid}
                        fullWidth
                        onClick={emailForm.handleSubmit(handleEmailSubmit)}
                    >
                        发送验证码
                    </Button>
                    {/* </form> */}
                    <Button variant="ghost" onClick={onBack} fullWidth>
                        返回登录
                    </Button>
                </div>
            )}

            {step === 'code' && (
                <div className="forgot-password-step">
                    <div className="step-info">
                        <p>验证码已发送到 {account}</p>
                    </div>
                    <form onSubmit={codeForm.handleSubmit(handleCodeSubmit)}>
                        <Input
                            type="text"
                            placeholder="请输入6位验证码"
                            value={codeForm.values.code}
                            onChange={codeForm.setValue.bind(null, 'code')}
                            error={codeForm.getFieldError('code')}
                            maxLength={6}
                            fullWidth
                        />
                        <Button
                            type="submit"
                            loading={auth.isLoading}
                            disabled={!codeForm.isValid}
                            fullWidth
                        >
                            验证
                        </Button>
                    </form>
                    <div className="code-actions">
                        <Button variant="link" onClick={handleResendCode}>
                            重新发送验证码
                        </Button>
                        <Button variant="ghost" onClick={handleBack}>
                            返回修改邮箱
                        </Button>
                    </div>
                </div>
            )}

            {step === 'password' && (
                <div className="forgot-password-step">
                    <form onSubmit={passwordForm.handleSubmit(handlePasswordReset)}>
                        <Input
                            type="password"
                            placeholder="请输入新密码"
                            value={passwordForm.values.password}
                            onChange={passwordForm.setValue.bind(null, 'password')}
                            error={passwordForm.getFieldError('password')}
                            fullWidth
                        />
                        <Input
                            type="password"
                            placeholder="请确认新密码"
                            value={passwordForm.values.confirmPassword}
                            onChange={passwordForm.setValue.bind(null, 'confirmPassword')}
                            error={passwordForm.getFieldError('confirmPassword')}
                            fullWidth
                        />
                        <Button
                            type="submit"
                            loading={auth.isLoading}
                            disabled={!passwordForm.isValid}
                            fullWidth
                        >
                            重置密码
                        </Button>
                    </form>
                    <Button variant="ghost" onClick={handleBack} fullWidth>
                        返回修改验证码
                    </Button>
                </div>
            )}

            {auth.error && (
                <div className="error-message">
                    {auth.error}
                </div>
            )}
        </div>
    )
} 