import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { globalUserStore } from './UserStore';
import { getWechatQRCodeAPI, checkWechatLoginStatusAPI, wechatLoginAPI, emailRegisterAPI, sendEmailCodeAPI, loginAPIv1 } from './api';
import './Login.less';

const Login: React.FC = observer(() => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [loginMethod, setLoginMethod] = useState<'account' | 'wechat'>('account');
    const [loginStep, setLoginStep] = useState<'account' | 'password'>('account');

    // 账号密码登录
    const [accountForm, setAccountForm] = useState({
        email: '',
        password: ''
    });
    const [accountError, setAccountError] = useState('');
    const [accountLoading, setAccountLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [userInfo, setUserInfo] = useState<any>(null);

    // 微信扫码相关
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [qrCodeId, setQrCodeId] = useState('');
    const [qrError, setQrError] = useState('');
    const [qrLoading, setQrLoading] = useState(false);
    const [polling, setPolling] = useState<NodeJS.Timeout | null>(null);

    // 注册相关
    const [form, setForm] = useState({
        email: '',
        nickname: '',
        password: '',
        confirmPassword: '',
        code: ''
    });
    const [regError, setRegError] = useState('');
    const [regLoading, setRegLoading] = useState(false);
    const [isSendingCode, setIsSendingCode] = useState(false);
    const [countdown, setCountdown] = useState(0);

    // 校验账号
    const handleCheckAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setAccountError('');
        if (!/^\S+@\S+\.\S+$/.test(accountForm.email)) {
            setAccountError('请输入有效邮箱');
            return;
        }
        setAccountLoading(true);
        try {
            // 这里应该调用校验账号的API，暂时模拟
            // const res = await checkAccountAPI({ email: accountForm.email });
            // 模拟API调用
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 模拟账号存在
            setUserInfo({
                email: accountForm.email,
                nickname: '用户' + accountForm.email.split('@')[0]
            });
            setLoginStep('password');
        } catch {
            setAccountError('账号不存在或网络错误');
        } finally {
            setAccountLoading(false);
        }
    };

    // 账号密码登录
    const handleAccountLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAccountError('');
        if (!accountForm.password) {
            setAccountError('请输入密码');
            return;
        }
        setPasswordLoading(true);
        try {
            const res = await loginAPIv1({
                username: accountForm.email,
                password: accountForm.password
            });
            if (res.data.code === 0) {
                globalUserStore.setUserInfo(res.data.userInfo, res.data.token);
                setTimeout(() => window.close(), 300);
            } else {
                setAccountError(res.data.message || '密码错误');
            }
        } catch {
            setAccountError('网络错误');
        } finally {
            setPasswordLoading(false);
        }
    };

    // 返回账号输入
    const handleBackToAccount = () => {
        setLoginStep('account');
        setAccountForm(f => ({ ...f, password: '' }));
        setAccountError('');
        setUserInfo(null);
    };

    // 获取微信二维码
    const handleGetQr = async () => {
        setQrLoading(true);
        setQrError('');
        try {
            const res = await getWechatQRCodeAPI();
            if (res.data.code === 0) {
                setQrCodeUrl(res.data.qrCodeUrl);
                setQrCodeId(res.data.qrCodeId);
                // 开始轮询
                if (polling) clearInterval(polling);
                const timer = setInterval(async () => {
                    const statusRes = await checkWechatLoginStatusAPI({ qrCodeId: res.data.qrCodeId });
                    if (statusRes.data.code === 0 && statusRes.data.status === 'success') {
                        clearInterval(timer);
                        setPolling(null);
                        const loginRes = await wechatLoginAPI({ code: statusRes.data.code });
                        if (loginRes.data.code === 0) {
                            globalUserStore.setUserInfo(loginRes.data.userInfo, loginRes.data.token);
                            setTimeout(() => window.close(), 300);
                        }
                    }
                }, 2000);
                setPolling(timer);
            } else {
                setQrError('二维码获取失败');
            }
        } catch {
            setQrError('网络错误');
        } finally {
            setQrLoading(false);
        }
    };

    // 发送邮箱验证码
    const handleSendCode = async () => {
        if (!/^\S+@\S+\.\S+$/.test(form.email)) {
            setRegError('请输入有效邮箱');
            return;
        }
        setIsSendingCode(true);
        setRegError('');
        try {
            const res = await sendEmailCodeAPI({ email: form.email, type: 'register' });
            if (res.data.code === 0) {
                setCountdown(60);
                const timer = setInterval(() => {
                    setCountdown(prev => {
                        if (prev <= 1) { clearInterval(timer); return 0; }
                        return prev - 1;
                    });
                }, 1000);
            } else {
                setRegError(res.data.message || '验证码发送失败');
            }
        } catch {
            setRegError('网络错误');
        } finally {
            setIsSendingCode(false);
        }
    };

    // 注册提交
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setRegError('');
        if (!/^\S+@\S+\.\S+$/.test(form.email)) {
            setRegError('请输入有效邮箱'); return;
        }
        if (!form.nickname.trim()) {
            setRegError('请输入昵称'); return;
        }
        if (form.password.length < 6) {
            setRegError('密码至少6位'); return;
        }
        if (form.password !== form.confirmPassword) {
            setRegError('两次密码不一致'); return;
        }
        if (!/^[0-9]{6}$/.test(form.code)) {
            setRegError('请输入6位验证码'); return;
        }
        setRegLoading(true);
        try {
            const res = await emailRegisterAPI({
                email: form.email,
                password: form.password,
                nickname: form.nickname,
                code: form.code
            });
            if (res.data.code === 0) {
                alert('注册成功，请登录');
                setMode('login');
                setLoginStep('account');
                setAccountForm({ email: '', password: '' });
                setAccountError('');
                setUserInfo(null);
            } else {
                setRegError(res.data.message || '注册失败');
            }
        } catch {
            setRegError('网络错误');
        } finally {
            setRegLoading(false);
        }
    };

    // 已登录
    if (globalUserStore.isLogin) {
        return (
            <div className="login-container">
                <div className="login-card">
                    <div className="success-state">
                        <div className="success-icon">✓</div>
                        <h2>已登录</h2>
                        <p>欢迎回来，{globalUserStore.nickName}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <h1 className="title">
                    {mode === 'login' ? '登录您的账户' : '创建新账户'}
                </h1>

                {mode === 'login' ? (
                    <div className="login-content">
                        {loginStep === 'account' ? (
                            <>
                                {/* 账号校验 */}
                                <form onSubmit={handleCheckAccount} className="account-login-form">
                                    <div className="input-field">
                                        <input
                                            type="text"
                                            value={accountForm.email}
                                            onChange={e => setAccountForm(f => ({ ...f, email: e.target.value }))}
                                            placeholder="邮箱 / 手机号"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="signin-btn"
                                        disabled={accountLoading}
                                    >
                                        {accountLoading ? '校验中...' : '下一步'}
                                    </button>
                                    {accountError && <div className="error-message">{accountError}</div>}
                                </form>

                                {/* 注册链接 */}
                                <div className="register-link">
                                    <span>还没有账户？</span>
                                    <button
                                        className="link-btn"
                                        onClick={() => setMode('register')}
                                    >
                                        创建账户
                                    </button>
                                </div>

                                {/* 分割线 */}
                                <div className="divider">
                                    <span>或</span>
                                </div>

                                {/* 社交登录 */}
                                <div className="social-login">
                                    <button className="social-btn github-btn">
                                        <span className="social-icon">🐙</span>
                                        <span>使用 GitHub 登录</span>
                                    </button>
                                    <button
                                        className="social-btn wechat-btn"
                                        onClick={() => setLoginMethod('wechat')}
                                    >
                                        <span className="social-icon">💬</span>
                                        <span>使用微信登录</span>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* 密码输入 */}
                                <div className="password-step">
                                    <div className="user-info">
                                        <div className="user-avatar">
                                            {userInfo?.nickname?.charAt(0) || 'U'}
                                        </div>
                                        <div className="user-details">
                                            <div className="user-name">{userInfo?.nickname}</div>
                                            <div className="user-email">{userInfo?.email}</div>
                                        </div>
                                        <button
                                            className="back-btn"
                                            onClick={handleBackToAccount}
                                        >
                                            切换账号
                                        </button>
                                    </div>

                                    <form onSubmit={handleAccountLogin} className="password-form">
                                        <div className="input-field">
                                            <input
                                                type="password"
                                                value={accountForm.password}
                                                onChange={e => setAccountForm(f => ({ ...f, password: e.target.value }))}
                                                placeholder="请输入密码"
                                                required
                                                autoFocus
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            className="signin-btn"
                                            disabled={passwordLoading}
                                        >
                                            {passwordLoading ? '登录中...' : '登录'}
                                        </button>
                                        {accountError && <div className="error-message">{accountError}</div>}
                                    </form>

                                    <div className="password-actions">
                                        <button className="action-link">忘记密码？</button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="register-content">
                        <form onSubmit={handleRegister} className="register-form">
                            <div className="input-field">
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    placeholder="邮箱"
                                    required
                                />
                            </div>
                            <div className="input-field">
                                <input
                                    type="text"
                                    value={form.nickname}
                                    onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
                                    placeholder="昵称"
                                    required
                                />
                            </div>
                            <div className="input-field">
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                    placeholder="密码"
                                    required
                                />
                            </div>
                            <div className="input-field">
                                <input
                                    type="password"
                                    value={form.confirmPassword}
                                    onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                                    placeholder="确认密码"
                                    required
                                />
                            </div>
                            <div className="code-field">
                                <input
                                    type="text"
                                    value={form.code}
                                    onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                                    placeholder="验证码"
                                    maxLength={6}
                                    required
                                />
                                <button
                                    type="button"
                                    className="send-code-btn"
                                    onClick={handleSendCode}
                                    disabled={isSendingCode || countdown > 0 || !/^\S+@\S+\.\S+$/.test(form.email)}
                                >
                                    {countdown > 0 ? `${countdown}s` : isSendingCode ? '发送中...' : '发送验证码'}
                                </button>
                            </div>
                            {regError && <div className="error-message">{regError}</div>}
                            <button
                                type="submit"
                                className="signin-btn"
                                disabled={regLoading}
                            >
                                {regLoading ? '注册中...' : '注册'}
                            </button>
                        </form>

                        {/* 登录链接 */}
                        <div className="login-link">
                            <span>已有账户？</span>
                            <button
                                className="link-btn"
                                onClick={() => {
                                    setMode('login');
                                    setLoginStep('account');
                                    setAccountForm({ email: '', password: '' });
                                    setAccountError('');
                                    setUserInfo(null);
                                }}
                            >
                                立即登录
                            </button>
                        </div>
                    </div>
                )}

                {/* 底部链接 */}
                <div className="footer-links">
                    <button className="footer-link">使用条款</button>
                    <span className="separator">·</span>
                    <button className="footer-link">隐私政策</button>
                </div>
            </div>

            {/* 微信登录弹窗 */}
            {loginMethod === 'wechat' && (
                <div className="wechat-modal">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>微信扫码登录</h3>
                            <button
                                className="close-btn"
                                onClick={() => setLoginMethod('account')}
                            >
                                ×
                            </button>
                        </div>
                        <div className="qr-container">
                            {qrCodeUrl ? (
                                <div className="qr-code-section">
                                    <img src={qrCodeUrl} alt="微信二维码" />
                                    <p>请使用微信扫码登录</p>
                                    <button
                                        className="refresh-btn"
                                        onClick={handleGetQr}
                                        disabled={qrLoading}
                                    >
                                        {qrLoading ? '获取中...' : '重新获取二维码'}
                                    </button>
                                </div>
                            ) : (
                                <div className="qr-placeholder">
                                    <div className="qr-icon">📱</div>
                                    <p>点击下方按钮获取二维码</p>
                                    <button
                                        className="wechat-btn"
                                        onClick={handleGetQr}
                                        disabled={qrLoading}
                                    >
                                        {qrLoading ? '获取中...' : '获取二维码'}
                                    </button>
                                </div>
                            )}
                            {qrError && <div className="error-message">{qrError}</div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export { Login };