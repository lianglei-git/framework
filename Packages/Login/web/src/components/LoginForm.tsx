import React, { useState } from 'react'
import {
    useAuth,
    useForm,
    Button,
    Input,
    Loading,
    validateLoginForm,
    validatePhone,
    identifyAccountType,
    AccountType
} from '../index'

interface LoginFormProps {
    onSuccess?: () => void
    onError?: (error: string) => void
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onError }) => {
    const auth = useAuth()
    const [loginType, setLoginType] = useState<'password' | 'phone'>('password')
    const [countdown, setCountdown] = useState(0)

    // 密码登录表单
    const passwordForm = useForm({
        initialValues: {
            account: '',
            password: '',
            remember_me: false
        },
        validate: (values) => {
            const errors = validateLoginForm(values)
            return errors.reduce((acc, error) => {
                acc[error.field] = error.message
                return acc
            }, {} as Record<string, string>)
        }
    })

    // 手机验证码登录表单
    const phoneForm = useForm({
        initialValues: {
            phone: '',
            code: '',
            remember_me: false
        },
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

    // 密码登录提交
    const handlePasswordSubmit = async (values: any) => {
        try {
            const accountType = identifyAccountType(values.account)
            await auth.login({
                account: values.account,
                password: values.password,
                remember_me: values.remember_me,
                login_type: accountType === AccountType.UNKNOWN ? 'username' : accountType
            })
            onSuccess?.()
        } catch (error: any) {
            onError?.(error.message || '登录失败')
        }
    }

    // 手机验证码登录提交
    const handlePhoneSubmit = async (values: any) => {
        try {
            await auth.phoneLogin({
                phone: values.phone,
                code: values.code,
                remember_me: values.remember_me
            })
            onSuccess?.()
        } catch (error: any) {
            onError?.(error.message || '登录失败')
        }
    }

    // 发送验证码
    const handleSendCode = async () => {
        const phone = phoneForm.values.phone
        if (!validatePhone(phone)) {
            phoneForm.setError('phone', '请输入正确的手机号')
            return
        }

        try {
            await auth.sendPhoneCode(phone, 'login')
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
            onError?.(error.message || '发送验证码失败')
        }
    }

    // 切换登录方式
    const toggleLoginType = () => {
        setLoginType(loginType === 'password' ? 'phone' : 'password')
        auth.clearError()
    }

    if (auth.isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loading type="spinner" size="large" text="登录中..." />
            </div>
        )
    }

    return (
        <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">用户登录</h2>
                <p className="text-gray-600">欢迎回来，请登录您的账户</p>
            </div>

            {/* 错误提示 */}
            {auth.error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded text-red-600 text-sm">
                    {auth.error}
                </div>
            )}

            {/* 登录方式切换 */}
            <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
                <button
                    type="button"
                    onClick={() => setLoginType('password')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${loginType === 'password'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                >
                    密码登录
                </button>
                <button
                    type="button"
                    onClick={() => setLoginType('phone')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${loginType === 'phone'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                >
                    验证码登录
                </button>
            </div>

            {/* 密码登录表单 */}
            {loginType === 'password' && (
                <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}>
                    <div className="space-y-4">
                        <Input
                            type="text"
                            placeholder="请输入邮箱/手机号/用户名"
                            value={passwordForm.values.account}
                            onChange={(value) => passwordForm.setValue('account', value)}
                            error={passwordForm.errors.account}
                            fullWidth
                            autoFocus
                        />

                        <Input
                            type="password"
                            placeholder="请输入密码"
                            value={passwordForm.values.password}
                            onChange={(value) => passwordForm.setValue('password', value)}
                            error={passwordForm.errors.password}
                            fullWidth
                            showPasswordToggle
                        />

                        <div className="flex items-center justify-between">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={passwordForm.values.remember_me}
                                    onChange={(e) => passwordForm.setValue('remember_me', e.target.checked)}
                                    className="mr-2"
                                />
                                <span className="text-sm text-gray-600">记住我</span>
                            </label>
                            <button
                                type="button"
                                className="text-sm text-blue-600 hover:text-blue-700"
                                onClick={() => {/* 跳转到忘记密码页面 */ }}
                            >
                                忘记密码？
                            </button>
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            loading={auth.isLoading}
                        >
                            登录
                        </Button>
                    </div>
                </form>
            )}

            {/* 手机验证码登录表单 */}
            {loginType === 'phone' && (
                <form onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)}>
                    <div className="space-y-4">
                        <Input
                            type="tel"
                            placeholder="请输入手机号"
                            value={phoneForm.values.phone}
                            onChange={(value) => phoneForm.setValue('phone', value)}
                            error={phoneForm.errors.phone}
                            fullWidth
                            autoFocus
                        />

                        <div className="flex gap-2">
                            <Input
                                type="text"
                                placeholder="请输入验证码"
                                value={phoneForm.values.code}
                                onChange={(value) => phoneForm.setValue('code', value)}
                                error={phoneForm.errors.code}
                                fullWidth
                                maxLength={6}
                            />
                            <Button
                                type="button"
                                onClick={handleSendCode}
                                disabled={countdown > 0}
                                variant="secondary"
                                className="whitespace-nowrap"
                            >
                                {countdown > 0 ? `${countdown}s` : '发送验证码'}
                            </Button>
                        </div>

                        <div className="flex items-center">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={phoneForm.values.remember_me}
                                    onChange={(e) => phoneForm.setValue('remember_me', e.target.checked)}
                                    className="mr-2"
                                />
                                <span className="text-sm text-gray-600">记住我</span>
                            </label>
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            loading={auth.isLoading}
                        >
                            登录
                        </Button>
                    </div>
                </form>
            )}

            {/* 底部链接 */}
            <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                    还没有账户？{' '}
                    <button
                        type="button"
                        className="text-blue-600 hover:text-blue-700 font-medium"
                        onClick={() => {/* 跳转到注册页面 */ }}
                    >
                        立即注册
                    </button>
                </p>
            </div>
        </div>
    )
} 