import React, { useState } from 'react'
import AuthFlowRouter from './AuthFlowRouter'
import { getCurrentAppId } from '../services/appLayerManager'

interface AuthDemoProps {
    title?: string
    description?: string
    showArchitecture?: boolean
}

const AuthDemo: React.FC<AuthDemoProps> = ({
    title = '🏢 系统内用户认证演示',
    description = '演示完整的中心化用户认证系统，支持多种认证方式和子应用分层',
    showArchitecture = true
}) => {
    const [authResult, setAuthResult] = useState<any>(null)
    const [authError, setAuthError] = useState<string>('')

    const handleAuthSuccess = (user: any, token: string) => {
        console.log('🎉 认证成功:', user)
        setAuthResult({ user, token })
        setAuthError('')

        // 可以在这里添加认证成功后的逻辑
        alert(`欢迎 ${user.name || user.username}！登录成功！`)
    }

    const handleAuthError = (error: string) => {
        console.error('❌ 认证失败:', error)
        setAuthError(error)
        setAuthResult(null)
    }

    const handleLogout = () => {
        setAuthResult(null)
        setAuthError('')
        // 这里可以添加登出逻辑
        alert('已退出登录')
    }

    return (
        <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '20px',
            fontFamily: 'Arial, sans-serif'
        }}>
            {/* 标题区域 */}
            <div style={{
                textAlign: 'center',
                marginBottom: '40px',
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
            }}>
                <h1 style={{ margin: '0 0 10px 0', color: '#333' }}>{title}</h1>
                <p style={{ margin: 0, color: '#666', fontSize: '16px' }}>{description}</p>
            </div>

            {/* 认证结果显示 */}
            {authResult && (
                <div style={{
                    marginBottom: '30px',
                    padding: '20px',
                    backgroundColor: '#d4edda',
                    border: '1px solid #c3e6cb',
                    borderRadius: '8px',
                    color: '#155724'
                }}>
                    <h3 style={{ margin: '0 0 15px 0' }}>✅ 认证成功</h3>
                    <div style={{ marginBottom: '10px' }}>
                        <strong>用户ID:</strong> {authResult.user.sub || authResult.user.id}
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <strong>用户名:</strong> {authResult.user.name || authResult.user.username}
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <strong>邮箱:</strong> {authResult.user.email}
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                        <strong>Token:</strong> {authResult.token.substring(0, 20)}...
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        退出登录
                    </button>
                </div>
            )}

            {/* 错误显示 */}
            {authError && (
                <div style={{
                    marginBottom: '30px',
                    padding: '20px',
                    backgroundColor: '#f8d7da',
                    border: '1px solid #f5c6cb',
                    borderRadius: '8px',
                    color: '#721c24'
                }}>
                    <h3 style={{ margin: '0 0 15px 0' }}>❌ 认证失败</h3>
                    <p style={{ margin: 0 }}>{authError}</p>
                </div>
            )}

            {/* 架构说明 */}
            {showArchitecture && (
                <div style={{
                    marginBottom: '30px',
                    padding: '20px',
                    backgroundColor: '#e7f3ff',
                    border: '1px solid #b3d9ff',
                    borderRadius: '8px'
                }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#0066cc' }}>🔧 系统架构</h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '20px',
                        marginTop: '15px'
                    }}>
                        <div style={{
                            padding: '15px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #ddd'
                        }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>🏢 后端架构</h4>
                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
                                <li>unit-auth OAuth 2.1服务器</li>
                                <li>支持多种认证方式</li>
                                <li>标准OIDC协议</li>
                                <li>多Provider支持</li>
                            </ul>
                        </div>
                        <div style={{
                            padding: '15px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #ddd'
                        }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#28a745' }}>🎨 前端架构</h4>
                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
                                <li>统一认证UI组件</li>
                                <li>子应用分层管理</li>
                                <li>动态Provider配置</li>
                                <li>响应式设计</li>
                            </ul>
                        </div>
                        <div style={{
                            padding: '15px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #ddd'
                        }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#dc3545' }}>🔐 认证方式</h4>
                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
                                <li>本地账号认证</li>
                                <li>GitHub登录</li>
                                <li>Google登录</li>
                                <li>微信登录</li>
                            </ul>
                        </div>
                        <div style={{
                            padding: '15px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #ddd'
                        }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#ffc107' }}>📱 子应用分层</h4>
                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
                                <li>根据Appid动态配置</li>
                                <li>应用特定Provider</li>
                                <li>品牌化定制</li>
                                <li>功能开关管理</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* 认证组件 */}
            <div style={{
                border: '2px solid #007bff',
                borderRadius: '8px',
                padding: '20px',
                backgroundColor: 'white',
                boxShadow: '0 4px 6px rgba(0, 123, 255, 0.1)'
            }}>
                <h3 style={{
                    margin: '0 0 20px 0',
                    textAlign: 'center',
                    color: '#007bff',
                    borderBottom: '2px solid #007bff',
                    paddingBottom: '10px'
                }}>
                    🚀 认证系统演示
                </h3>

                <div style={{
                    marginBottom: '20px',
                    padding: '15px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '6px'
                }}>
                    <h4 style={{ margin: '0 0 10px 0' }}>📱 测试应用选择</h4>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {[
                            { id: 'default', name: '默认应用', color: '#6c757d' },
                            { id: 'user-management', name: '用户管理', color: '#007bff' },
                            { id: 'order-management', name: '订单管理', color: '#28a745' },
                            { id: 'analytics-dashboard', name: '数据分析', color: '#ffc107' }
                        ].map(app => (
                            <button
                                key={app.id}
                                onClick={() => {
                                    const url = new URL(window.location.href)
                                    url.searchParams.set('appid', app.id)
                                    window.history.replaceState({}, '', url.toString())
                                    window.location.reload()
                                }}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: app.color,
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '20px',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                {app.name}
                            </button>
                        ))}
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                        当前应用: <strong>{getCurrentAppId()}</strong>
                    </div>
                </div>

                <AuthFlowRouter
                    defaultAppId={getCurrentAppId()}
                    onAuthSuccess={handleAuthSuccess}
                    onAuthError={handleAuthError}
                />
            </div>

            {/* 功能说明 */}
            <div style={{
                marginTop: '40px',
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
            }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>📖 使用说明</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    <div>
                        <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>🎯 认证方式</h4>
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
                            <li><strong>本地账号：</strong> 用户名/邮箱/手机号 + 密码</li>
                            <li><strong>GitHub登录：</strong> OAuth 2.1 + PKCE安全认证</li>
                            <li><strong>Google登录：</strong> OpenID Connect标准协议</li>
                            <li><strong>微信登录：</strong> 微信OAuth授权</li>
                        </ul>
                    </div>
                    <div>
                        <h4 style={{ margin: '0 0 10px 0', color: '#28a745' }}>🔧 子应用分层</h4>
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
                            <li><strong>默认应用：</strong> 基础认证功能</li>
                            <li><strong>用户管理：</strong> 包含GitHub登录</li>
                            <li><strong>订单管理：</strong> 支持微信登录</li>
                            <li><strong>数据分析：</strong> 支持Google登录</li>
                        </ul>
                    </div>
                    <div>
                        <h4 style={{ margin: '0 0 10px 0', color: '#ffc107' }}>🛡️ 安全特性</h4>
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
                            <li><strong>PKCE保护：</strong> 防止授权码被窃取</li>
                            <li><strong>State参数：</strong> 防止CSRF攻击</li>
                            <li><strong>Token验证：</strong> JWT token完整性验证</li>
                            <li><strong>HTTPS支持：</strong> 安全传输加密</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AuthDemo
