import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { globalUserStore } from './src/stores/UserStore';
import {
  useAuth,
  useForm,
  Button,
  Input,
  Loading,
  validateLoginForm,
  validatePhone,
  identifyAccountType,
  AccountType,
  VerificationType
} from './src';
import {
  getWechatQRCodeAPI,
  checkWechatLoginStatusAPI,
  wechatLoginAPI,
  emailRegisterAPI,
  sendEmailCodeAPI,
  loginAPIv1
} from './api';
import './Login.less';
import { ForgotPassword } from './src/components/ForgotPassword';

const Login: React.FC = observer(() => {
  const auth = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot-password'>('login');
  const [loginStep, setLoginStep] = useState<'account' | 'password'>('account');
  const [loginType, setLoginType] = useState<'account' | 'phone'>('account');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 账号密码登录表单
  const accountForm = useForm({
    initialValues: {
      account: '',
      password: '',
      remember_me: false,
      login_type: 'username' as const
    },
    validate: (values) => {
      const errors: Record<string, string> = {};

      // 只验证账号字段
      if (!values.account.trim()) {
        errors.account = '请输入账号';
      } else {
        // 验证账号格式
        const accountType = identifyAccountType(values.account);
        if (accountType === AccountType.UNKNOWN) {
          errors.account = '请输入有效的邮箱、手机号或用户名';
        }
      }

      return errors;
    }
  });

  // 手机验证码登录表单
  const phoneForm = useForm({
    initialValues: {
      phone: '',
      code: '',
      remember_me: false
    },
    validate: (values) => {
      const errors: Record<string, string> = {};

      if (!values.phone.trim()) {
        errors.phone = '请输入手机号';
      } else if (!validatePhone(values.phone)) {
        errors.phone = '请输入正确的手机号';
      }

      if (!values.code.trim()) {
        errors.code = '请输入验证码';
      } else if (values.code.length !== 6) {
        errors.code = '验证码为6位数字';
      }

      return errors;
    }
  });

  // 注册表单
  const registerForm = useForm({
    initialValues: {
      email: '',
      nickname: '',
      password: '',
      confirmPassword: '',
      code: ''
    },
    validate: (values) => {
      const errors: Record<string, string> = {};

      if (!values.email.trim()) {
        errors.email = '请输入邮箱';
      } else if (!/^\S+@\S+\.\S+$/.test(values.email)) {
        errors.email = '请输入有效的邮箱地址';
      }

      if (!values.nickname.trim()) {
        errors.nickname = '请输入昵称';
      }

      if (!values.password) {
        errors.password = '请输入密码';
      } else if (values.password.length < 6) {
        errors.password = '密码至少6位';
      }

      if (values.password !== values.confirmPassword) {
        errors.confirmPassword = '两次密码不一致';
      }

      if (!/^[0-9]{6}$/.test(values.code)) {
        errors.code = '请输入6位验证码';
      }

      return errors;
    }
  });

  // 倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 账号校验 - 直接进入密码输入阶段
  const handleCheckAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    // 执行验证，如果验证失败则返回
    if (!accountForm.validate()) {
      return;
    }

    // 直接进入密码输入步骤，不进行后端校验
    setLoginStep('password');
  };

  // 返回账号输入
  const handleBackToAccount = () => {
    setLoginStep('account');
    accountForm.setValue('password', '');
    accountForm.resetErrors();
  };

  // 账号密码登录 - 对接后端API
  const handleAccountLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证密码字段
    if (!accountForm.values.password.trim()) {
      accountForm.setError('password', '请输入密码');
      return;
    }

    try {
      const accountType = identifyAccountType(accountForm.values.account);
      await auth.login({
        account: accountForm.values.account,
        password: accountForm.values.password,
        remember_me: accountForm.values.remember_me,
        login_type: accountType === AccountType.UNKNOWN ? 'username' : accountType
      });
      // setTimeout(() => window.close(), 300);
      console.log('登录成功, 即将跳转');

    } catch (error: any) {
      accountForm.setError('password', error.message || '密码错误');
    }
  };

  // 手机验证码登录 - 对接后端API
  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneForm.validate()) return;

    try {
      await auth.phoneLogin({
        phone: phoneForm.values.phone,
        code: phoneForm.values.code,
        remember_me: phoneForm.values.remember_me
      });
      setTimeout(() => window.close(), 300);
    } catch (error: any) {
      phoneForm.setError('code', error.message || '登录失败');
    }
  };

  // 发送验证码 - 对接后端API
  const handleSendCode = async () => {
    const phone = phoneForm.values.phone;
    if (!validatePhone(phone)) {
      phoneForm.setError('phone', '请输入正确的手机号');
      return;
    }

    setIsSendingCode(true);
    try {
      await auth.sendPhoneCode(phone, VerificationType.LOGIN);
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      phoneForm.setError('phone', error.message || '发送验证码失败');
    } finally {
      setIsSendingCode(false);
    }
  };

  // 发送邮箱验证码 - 对接后端API
  const handleSendEmailCode = async () => {
    if (!/^\S+@\S+\.\S+$/.test(registerForm.values.email)) {
      registerForm.setError('email', '请输入有效邮箱');
      return;
    }

    setIsSendingCode(true);
    try {
      await auth.sendEmailCode(registerForm.values.email, VerificationType.REGISTER);
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      registerForm.setError('email', error.message || '验证码发送失败');
    } finally {
      setIsSendingCode(false);
    }
  };

  // 注册提交 - 对接后端API
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.validate()) return;

    try {
      await auth.register({
        username: registerForm.values.nickname,
        // username: registerForm.values.email.split('@')[0],
        email: registerForm.values.email,
        password: registerForm.values.password,
        confirm_password: registerForm.values.confirmPassword,
        agree_terms: true,
        verification_code: registerForm.values.code
      });
      // alert('注册成功，请登录');

      accountForm.setValue('account', registerForm.values.email)
      accountForm.setValue('password', registerForm.values.password)
      accountForm.setValue('remember_me', true)
      setMode('login');
      setLoginStep('password');
      handleAccountLogin(e);

    } catch (error: any) {
      registerForm.setError('email', error.message || '注册失败');
    }
  };

  // 处理忘记密码成功
  const handleForgotPasswordSuccess = () => {
    setMode('login');
    setLoginStep('account');
    accountForm.reset();
    // passwordForm.reset(); // This line was removed from the new_code, so it's removed here.
  };

  // 处理返回登录
  const handleBackToLogin = () => {
    setMode('login');
    setLoginStep('account');
    accountForm.reset();
    // passwordForm.reset(); // This line was removed from the new_code, so it's removed here.
  };



  // 微信扫码相关 - 对接后端API
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrCodeId, setQrCodeId] = useState('');
  const [qrError, setQrError] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [polling, setPolling] = useState<number | null>(null);


  // 如果当前是忘记密码模式，显示忘记密码组件
  if (mode === 'forgot-password') {
    return (
      <div className="login-container">
        <div className="login-card">
          <ForgotPassword
            onBack={handleBackToLogin}
            onSuccess={handleForgotPasswordSuccess}
          />
        </div>
      </div>
    );
  }
  // 获取微信二维码 - 对接后端API
  const handleGetQr = async () => {
    setQrLoading(true);
    setQrError('');
    try {
      const res = await getWechatQRCodeAPI();
      if (res.data.code === 200) {
        setQrCodeUrl(res.data.data.qrCodeUrl);
        setQrCodeId(res.data.data.qrCodeId);
        // 开始轮询
        if (polling) clearInterval(polling);
        const timer = setInterval(async () => {
          const statusRes = await checkWechatLoginStatusAPI(res.data.data.qrCodeId);
          if (statusRes.data.code === 200 && statusRes.data.data.status === 'confirmed') {
            clearInterval(timer);
            setPolling(null);
            // 微信登录成功，更新用户信息
            globalUserStore.setUserInfo(statusRes.data.data.user, statusRes.data.data.token);
            setTimeout(() => window.close(), 300);
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
            {loginType === 'account' ? (
              <>
                {loginStep === 'account' ? (
                  <>
                    {/* 账号校验 */}
                    <form onSubmit={handleCheckAccount} className="account-login-form">
                      <Input
                        type="text"
                        placeholder="邮箱 / 手机号 / 用户名"
                        value={accountForm.values.account}
                        onChange={(value) => accountForm.setValue('account', value)}
                        error={accountForm.errors.account}
                        fullWidth
                        required
                      />
                      <Button
                        type="submit"
                        variant="primary"
                        fullWidth
                        disabled={!accountForm.isValid}
                      >
                        下一步
                      </Button>
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
                      <Button variant="secondary" fullWidth className="social-btn github-btn">
                        <span className="social-icon">🐙</span>
                        <span>使用 GitHub 登录</span>
                      </Button>
                      <Button
                        variant="secondary"
                        fullWidth
                        className="social-btn wechat-btn"
                        onClick={() => setLoginType('wechat')}
                      >
                        <span className="social-icon">💬</span>
                        <span>使用微信登录</span>
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* 密码输入 */}
                    <div className="password-step">
                      <div className="user-info">
                        <div className="user-avatar">
                          {/* userInfo?.nickname?.charAt(0) || accountForm.values.account?.charAt(0) || 'U' */}
                          {/* The userInfo state was removed, so this will now show 'U' */}
                          {accountForm.values.account?.charAt(0) || 'U'}
                        </div>
                        <div className="user-details">
                          <div className="user-name">{accountForm.values.account}</div>
                          <div className="user-email">{accountForm.values.account}</div>
                        </div>
                        <button
                          className="back-btn"
                          onClick={handleBackToAccount}
                        >
                          切换账号
                        </button>
                      </div>

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
                        <Button
                          type="submit"
                          variant="primary"
                          fullWidth
                          loading={auth.isLoading}
                          disabled={!accountForm.isValid}
                        >
                          登录
                        </Button>
                      </form>

                      <div className="password-actions">
                        <button className="action-link" onClick={() => setMode('forgot-password')}>忘记密码？</button>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <form onSubmit={handlePhoneLogin} className="phone-form">
                <Input
                  type="tel"
                  placeholder="手机号"
                  value={phoneForm.values.phone}
                  onChange={(value) => phoneForm.setValue('phone', value)}
                  error={phoneForm.errors.phone}
                  fullWidth
                  required
                />
                <div className="code-field">
                  <Input
                    type="text"
                    placeholder="验证码"
                    value={phoneForm.values.code}
                    onChange={(value) => phoneForm.setValue('code', value)}
                    error={phoneForm.errors.code}
                    fullWidth
                    maxLength={6}
                    required
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSendCode}
                    disabled={isSendingCode || countdown > 0 || !validatePhone(phoneForm.values.phone)}
                  >
                    {countdown > 0 ? `${countdown}s` : isSendingCode ? '发送中...' : '发送验证码'}
                  </Button>
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={auth.isLoading}
                  disabled={!phoneForm.isValid}
                >
                  登录
                </Button>
              </form>
            )}

            {/* 注册链接 */}
            <div className="register-link">
              <span>已有账户？</span>
              <button
                className="link-btn"
                onClick={() => {
                  setMode('login');
                  setLoginStep('account');
                  accountForm.reset();
                }}
              >
                立即登录
              </button>
            </div>
          </div>
        ) : (
          <div className="register-content">
            <form onSubmit={handleRegister} className="register-form">
              <Input
                type="email"
                placeholder="邮箱"
                value={registerForm.values.email}
                onChange={(value) => registerForm.setValue('email', value)}
                error={registerForm.errors.email}
                fullWidth
                required
              />
              <Input
                type="text"
                placeholder="昵称"
                value={registerForm.values.nickname}
                onChange={(value) => registerForm.setValue('nickname', value)}
                error={registerForm.errors.nickname}
                fullWidth
                required
              />
              <Input
                type="password"
                placeholder="密码"
                value={registerForm.values.password}
                onChange={(value) => registerForm.setValue('password', value)}
                error={registerForm.errors.password}
                fullWidth
                required
                showPasswordToggle
              />
              <Input
                type="password"
                placeholder="确认密码"
                value={registerForm.values.confirmPassword}
                onChange={(value) => registerForm.setValue('confirmPassword', value)}
                error={registerForm.errors.confirmPassword}
                fullWidth
                required
                showPasswordToggle
              />
              <div className="code-field">
                <Input
                  type="text"
                  placeholder="验证码"
                  value={registerForm.values.code}
                  onChange={(value) => registerForm.setValue('code', value)}
                  error={registerForm.errors.code}
                  fullWidth
                  maxLength={6}
                  required
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSendEmailCode}
                  disabled={isSendingCode || countdown > 0 || !/^\S+@\S+\.\S+$/.test(registerForm.values.email)}
                >
                  {countdown > 0 ? `${countdown}s` : isSendingCode ? '发送中...' : '发送验证码'}
                </Button>
              </div>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={auth.isLoading}
              >
                注册
              </Button>
            </form>

            {/* 登录链接 */}
            <div className="login-link">
              <span>已有账户？</span>
              <button
                className="link-btn"
                onClick={() => {
                  setMode('login');
                  setLoginStep('account');
                  accountForm.reset();
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
      {loginType === 'wechat' && (
        <div className="wechat-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>微信扫码登录</h3>
              <button
                className="close-btn"
                onClick={() => setLoginType('account')}
              >
                ×
              </button>
            </div>
            <div className="qr-container">
              {qrCodeUrl ? (
                <div className="qr-code-section">
                  <img src={qrCodeUrl} alt="微信二维码" />
                  <p>请使用微信扫码登录</p>
                  <Button
                    variant="secondary"
                    onClick={handleGetQr}
                    disabled={qrLoading}
                  >
                    {qrLoading ? '获取中...' : '重新获取二维码'}
                  </Button>
                </div>
              ) : (
                <div className="qr-placeholder">
                  <div className="qr-icon">📱</div>
                  <p>点击下方按钮获取二维码</p>
                  <Button
                    variant="primary"
                    onClick={handleGetQr}
                    disabled={qrLoading}
                  >
                    {qrLoading ? '获取中...' : '获取二维码'}
                  </Button>
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