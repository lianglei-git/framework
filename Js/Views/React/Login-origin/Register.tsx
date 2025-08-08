import React, { useState } from 'react';
import './Login.less';
import { observer } from 'mobx-react-lite';
import bgurl from "./a06866bb87e0a8d7afff8a72faf7d86a.png"
import { registerAPI } from './api';

const Register: React.FC = observer(() => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        nickname: '',
        email: '',
        mobile: '',
        sex: '',
        birthday: '',
        remark: ''
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isLoading, setIsLoading] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // 清除对应字段的错误
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.username.trim()) {
            newErrors.username = '用户名不能为空';
        } else if (formData.username.length < 3) {
            newErrors.username = '用户名长度不能少于3个字符';
        } else if (formData.username.length > 20) {
            newErrors.username = '用户名长度不能超过20个字符';
        }

        if (!formData.password) {
            newErrors.password = '密码不能为空';
        } else if (formData.password.length < 6) {
            newErrors.password = '密码长度不能少于6个字符';
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = '两次输入的密码不一致';
        }

        if (!formData.nickname.trim()) {
            newErrors.nickname = '昵称不能为空';
        }

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = '请输入有效的邮箱地址';
        }

        if (formData.mobile && !/^1[3-9]\d{9}$/.test(formData.mobile)) {
            newErrors.mobile = '请输入有效的手机号码';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        try {
            const response = await registerAPI({
                username: formData.username,
                password: formData.password,
                nickname: formData.nickname,
                email: formData.email || undefined,
                mobile: formData.mobile || undefined,
                sex: formData.sex || undefined,
                birthday: formData.birthday || undefined,
                remark: formData.remark || undefined
            });

            if (response.data.code === 0) {
                alert('注册成功！请登录');
                // 这里可以跳转到登录页面或切换到登录模式
                window.location.reload();
            } else {
                alert(response.data.message || '注册失败');
            }
        } catch (error: any) {
            console.error('注册错误:', error);
            alert(error.response?.data?.message || '注册失败，请稍后重试');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            {/* 左侧插画部分 */}
            <div className="left-section">
                <img
                    src={bgurl}
                    alt="欢迎插画"
                />
                <h2>欢迎加入</h2>
                <p>创建您的账户以开始使用我们的服务</p>
            </div>
            {/* 右侧注册表单部分 */}
            <div className="right-section">
                <div className="form-title">
                    <h1>注册</h1>
                    <p>填写以下信息创建您的账户</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="username">用户名 *</label>
                        <div className="input-wrapper">
                            <div className="icon">
                                <i className="fas fa-user" />
                            </div>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleInputChange}
                                required
                                placeholder="请输入用户名（3-20个字符）"
                                className={errors.username ? 'error' : ''}
                            />
                        </div>
                        {errors.username && <div className="error-message">{errors.username}</div>}
                    </div>

                    <div className="input-group">
                        <label htmlFor="nickname">昵称 *</label>
                        <div className="input-wrapper">
                            <div className="icon">
                                <i className="fas fa-smile" />
                            </div>
                            <input
                                type="text"
                                id="nickname"
                                name="nickname"
                                value={formData.nickname}
                                onChange={handleInputChange}
                                required
                                placeholder="请输入昵称"
                                className={errors.nickname ? 'error' : ''}
                            />
                        </div>
                        {errors.nickname && <div className="error-message">{errors.nickname}</div>}
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">密码 *</label>
                        <div className="input-wrapper">
                            <div className="icon">
                                <i className="fas fa-lock" />
                            </div>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                required
                                placeholder="请输入密码（至少6个字符）"
                                className={errors.password ? 'error' : ''}
                            />
                        </div>
                        {errors.password && <div className="error-message">{errors.password}</div>}
                    </div>

                    <div className="input-group">
                        <label htmlFor="confirmPassword">确认密码 *</label>
                        <div className="input-wrapper">
                            <div className="icon">
                                <i className="fas fa-lock" />
                            </div>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                required
                                placeholder="请再次输入密码"
                                className={errors.confirmPassword ? 'error' : ''}
                            />
                        </div>
                        {errors.confirmPassword && <div className="error-message">{errors.confirmPassword}</div>}
                    </div>

                    <div className="input-group">
                        <label htmlFor="email">邮箱</label>
                        <div className="input-wrapper">
                            <div className="icon">
                                <i className="fas fa-envelope" />
                            </div>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="请输入邮箱地址"
                                className={errors.email ? 'error' : ''}
                            />
                        </div>
                        {errors.email && <div className="error-message">{errors.email}</div>}
                    </div>

                    <div className="input-group">
                        <label htmlFor="mobile">手机号</label>
                        <div className="input-wrapper">
                            <div className="icon">
                                <i className="fas fa-phone" />
                            </div>
                            <input
                                type="tel"
                                id="mobile"
                                name="mobile"
                                value={formData.mobile}
                                onChange={handleInputChange}
                                placeholder="请输入手机号码"
                                className={errors.mobile ? 'error' : ''}
                            />
                        </div>
                        {errors.mobile && <div className="error-message">{errors.mobile}</div>}
                    </div>

                    {/* <div className="input-group">
                        <label htmlFor="sex">性别</label>
                        <div className="input-wrapper">
                            <div className="icon">
                                <i className="fas fa-venus-mars" />
                            </div>
                            <select
                                id="sex"
                                name="sex"
                                value={formData.sex}
                                onChange={handleInputChange}
                            >
                                <option value="">请选择性别</option>
                                <option value="男">男</option>
                                <option value="女">女</option>
                                <option value="其他">其他</option>
                            </select>
                        </div>
                    </div> */}

                    {/* <div className="input-group">
                        <label htmlFor="birthday">生日</label>
                        <div className="input-wrapper">
                            <div className="icon">
                                <i className="fas fa-birthday-cake" />
                            </div>
                            <input
                                type="date"
                                id="birthday"
                                name="birthday"
                                value={formData.birthday}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div> */}

                    {/* <div className="input-group">
                        <label htmlFor="remark">个性签名</label>
                        <div className="input-wrapper">
                            <div className="icon">
                                <i className="fas fa-quote-left" />
                            </div>
                            <textarea
                                id="remark"
                                name="remark"
                                value={formData.remark}
                                onChange={handleInputChange}
                                placeholder="请输入个性签名"
                                rows={3}
                            />
                        </div>
                    </div> */}

                    <button
                        className='login'
                        type="submit"
                        disabled={isLoading}
                    >
                        {isLoading ? '注册中...' : '注 册'}
                    </button>
                </form>
                <div className="register-text">
                    <p>
                        已有账号?
                        <a href="javascript:void(0);" onClick={() => window.location.reload()}>立即登录</a>
                    </p>
                </div>
            </div>
        </div>
    );
});

export { Register }; 