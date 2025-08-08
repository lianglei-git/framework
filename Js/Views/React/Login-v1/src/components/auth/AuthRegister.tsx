import React, { useState } from 'react'
import {
    useAuth,
    useForm,
    Button,
    Input,
    identifyAccountType,
    AccountType,
    VerificationType
} from '../../'

interface AuthRegisterProps {
    onSwitchToLogin: () => void
}

const AuthRegister: React.FC<AuthRegisterProps> = ({ onSwitchToLogin }) => {
    const auth = useAuth()
    const [isSendingCode, setIsSendingCode] = useState(false)
    const [countdown, setCountdown] = useState(0)

    const registerForm = useForm({
        initialValues: { email: '', nickname: '', password: '', confirmPassword: '', code: '' },
        validate: (values) => {
            const errors: Record<string, string> = {}
            if (!values.email.trim()) {
                errors.email = '请输入邮箱'
            } else if (!/^\S+@\S+\.\S+$/.test(values.email)) {
                errors.email = '请输入有效的邮箱地址'
            }
            // if (!values.nickname.trim()) { errors.nickname = '请输入昵称' }
            if (!values.password) { errors.password = '请输入密码' }
            else if (values.password.length < 6) { errors.password = '密码至少6位' }
            if (values.password !== values.confirmPassword) { errors.confirmPassword = '两次密码不一致' }
            if (!/^[0-9]{6}$/.test(values.code)) { errors.code = '请输入6位验证码' }
            return errors
        }
    })

    const handleSendEmailCode = async () => {
        if (!/^\S+@\S+\.\S+$/.test(registerForm.values.email)) {
            registerForm.setError('email', '请输入有效邮箱')
            return
        }
        setIsSendingCode(true)
        try {
            await auth.sendEmailCode(registerForm.values.email, VerificationType.REGISTER)
            setCountdown(60)
            const timer = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) { clearInterval(timer); return 0 }
                    return prev - 1
                })
            }, 1000)
        } catch (error: any) {
            registerForm.setError('email', error.message || '验证码发送失败')
        } finally {
            setIsSendingCode(false)
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!registerForm.validate()) return
        try {
            await auth.register({
                username: registerForm.values.email.slice(0, registerForm.values.email.indexOf('@')),
                email: registerForm.values.email,
                password: registerForm.values.password,
                confirm_password: registerForm.values.confirmPassword,
                agree_terms: true,
                verification_code: registerForm.values.code
            })
            // 自动登录
            const accountType = identifyAccountType(registerForm.values.email)
            await auth.login({
                account: registerForm.values.email,
                password: registerForm.values.password,
                remember_me: true,
                login_type: accountType === AccountType.UNKNOWN ? 'username' : accountType
            })
        } catch (error: any) {
            registerForm.setError('email', error.message || '注册失败')
        }
    }

    return (
        <div className="register-content">
            <form onSubmit={handleRegister} className="register-form">
                <Input type="email" placeholder="邮箱" value={registerForm.values.email} onChange={(v) => registerForm.setValue('email', v)} error={registerForm.errors.email} fullWidth required />
                {/* <Input type="text" placeholder="昵称" value={registerForm.values.nickname} onChange={(v) => registerForm.setValue('nickname', v)} error={registerForm.errors.nickname} fullWidth required /> */}
                <Input type="password" placeholder="密码" value={registerForm.values.password} onChange={(v) => registerForm.setValue('password', v)} error={registerForm.errors.password} fullWidth required showPasswordToggle />
                <Input type="password" placeholder="确认密码" value={registerForm.values.confirmPassword} onChange={(v) => registerForm.setValue('confirmPassword', v)} error={registerForm.errors.confirmPassword} fullWidth required showPasswordToggle />
                <div className="code-field">
                    <Input type="text" placeholder="验证码" value={registerForm.values.code} onChange={(v) => registerForm.setValue('code', v)} error={registerForm.errors.code} fullWidth maxLength={6} required />
                    <Button type="button" variant="secondary" onClick={handleSendEmailCode} disabled={isSendingCode || countdown > 0 || !/^\S+@\S+\.\S+$/.test(registerForm.values.email)}>
                        {countdown > 0 ? `${countdown}s` : isSendingCode ? '发送中...' : '发送验证码'}
                    </Button>
                </div>
                <Button type="submit" variant="primary" fullWidth loading={auth.isLoading}>注册</Button>
            </form>

            <div className="login-link">
                <span>已有账户？</span>
                <button className="link-btn" onClick={onSwitchToLogin}>立即登录</button>
            </div>
        </div>
    )
}

export { AuthRegister } 