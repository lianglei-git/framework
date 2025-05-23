import React, { useState } from 'react';
import './Login.less';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('登录信息:', {
      username,
      password,
      rememberMe
    });
    alert('登录成功!');
  };

  return (
    <div className="login-container">
      {/* 左侧插画部分 */}
      <div className="left-section">
        <img
          src="https://aidev.gemcoder.com/staticResource/echoAiSystemImages/a06866bb87e0a8d7afff8a72faf7d86a.png"
          alt="欢迎插画"
        />
        <h2>欢迎回来</h2>
        <p>请登录以继续使用我们的服务</p>
      </div>
      {/* 右侧登录表单部分 */}
      <div className="right-section">
        <div className="form-title">
          <h1>登录</h1>
          <p>输入您的凭据以继续</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">用户名</label>
            <div className="input-wrapper">
              <div className="icon">
                <i className="fas fa-user" />
              </div>
              <input
                type="text"
                id="username"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="请输入用户名"
              />
            </div>
          </div>
          <div className="input-group">
            <label htmlFor="password">密码</label>
            <div className="input-wrapper">
              <div className="icon">
                <i className="fas fa-lock" />
              </div>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="请输入密码"
              />
            </div>
          </div>
          <div className="remember-forgot">
            <div className="remember-me">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember-me">记住密码</label>
            </div>
            <div className="forgot-password">
              <a href="javascript:void(0);">忘记密码?</a>
            </div>
          </div>
          <button type="submit">登 录</button>
        </form>
        <div className="register-text">
          <p>
            还没有账号?
            <a href="javascript:void(0);">立即注册</a>
          </p>
        </div>
        <div className="language-select">
          <a href="javascript:void(0);">
            <i className="fas fa-globe-americas text-xl" />
          </a>
          <a href="javascript:void(0);">
            <i className="fas fa-globe-asia text-xl" />
          </a>
          <a href="javascript:void(0);">
            <i className="fas fa-globe-europe text-xl" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;