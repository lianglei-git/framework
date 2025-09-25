import React from 'react'
import { useSubProjectSSO } from '../hooks'

/**
 * 子项目集成演示组件
 * 展示如何在实际项目中使用SSO功能
 */
export const SubProjectIntegrationDemo: React.FC = () => {
    // 示例1: 基础集成
    const basicSSO = useSubProjectSSO({
        subProjectId: 'demo-app',
        onSuccess: (user, token, session) => {
            console.log('基础认证成功:', { user, token, session })
        },
        onError: (error) => {
            console.error('基础认证失败:', error)
        }
    })

    // 示例2: 自定义配置
    const customSSO = useSubProjectSSO({
        customConfig: {
            id: 'custom-demo',
            name: '自定义演示应用',
            description: '展示自定义配置的SSO集成',
            homepageUrl: 'https://demo.example.com',
            clientId: 'custom-client',
            clientSecret: 'custom-secret',
            redirectUris: ['https://demo.example.com/auth/callback'],
            allowedScopes: ['openid', 'profile', 'email', 'custom.read'],
            branding: {
                primaryColor: '#722ed1',
                backgroundColor: '#f9f0ff',
                logo: 'https://demo.example.com/logo.png'
            },
            features: {
                autoRefresh: true,
                rememberMe: true,
                socialLogin: true,
                passwordReset: true,
                multiFactorAuth: false
            },
            security: {
                requireHttps: true,
                allowedDomains: ['example.com', 'demo.example.com'],
                blockedDomains: [],
                sessionTimeout: 1800
            }
        },
        onSuccess: (user, token, session) => {
            console.log('自定义配置认证成功:', { user, token, session })
        }
    })

    // 示例3: 电商应用集成
    const ecommerceSSO = useSubProjectSSO({
        subProjectId: 'ecommerce-demo',
        onSuccess: (user, token, session) => {
            // 电商应用特定的登录成功处理
            console.log('电商应用登录成功，用户可以访问购物车和订单')

            // 这里可以调用电商应用的API
            // fetchUserCart(token.access_token)
            // loadUserOrders(token.access_token)
        },
        onError: (error) => {
            console.error('电商应用登录失败:', error)
        }
    })

    return (
        <div style={{
            padding: '24px',
            maxWidth: '1200px',
            margin: '0 auto',
            fontFamily: 'Arial, sans-serif'
        }}>
            <h1 style={{ color: '#1890ff', marginBottom: '32px' }}>
                子项目SSO集成演示
            </h1>

            {/* 基础集成示例 */}
            <div style={{
                border: '1px solid #d9d9d9',
                borderRadius: '8px',
                padding: '24px',
                marginBottom: '32px',
                backgroundColor: '#fafafa'
            }}>
                <h2 style={{ color: '#1890ff', marginBottom: '16px' }}>
                    📱 基础集成示例
                </h2>
                <p style={{ marginBottom: '16px', color: '#666' }}>
                    最简单的SSO集成方式，适用于大多数应用场景。
                </p>

                <div style={{ marginBottom: '16px' }}>
                    <strong>状态:</strong>
                    <span style={{ marginLeft: '8px', color: basicSSO.isAuthenticated ? '#52c41a' : '#ff4d4f' }}>
                        {basicSSO.isAuthenticated ? '已认证' : '未认证'}
                    </span>
                    {basicSSO.isLoading && <span style={{ marginLeft: '8px', color: '#1890ff' }}>加载中...</span>}
                </div>

                {basicSSO.error && (
                    <div style={{
                        color: '#ff4d4f',
                        backgroundColor: '#fff2f0',
                        padding: '8px',
                        borderRadius: '4px',
                        marginBottom: '16px'
                    }}>
                        错误: {basicSSO.error.message}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => basicSSO.login({ redirect: true })}
                        disabled={basicSSO.isLoading || basicSSO.isAuthenticated}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: basicSSO.isAuthenticated ? '#52c41a' : '#1890ff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: basicSSO.isLoading || basicSSO.isAuthenticated ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {basicSSO.isAuthenticated ? '已登录' : '登录'}
                    </button>

                    <button
                        onClick={basicSSO.logout}
                        disabled={basicSSO.isLoading || !basicSSO.isAuthenticated}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#ff4d4f',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: basicSSO.isLoading || !basicSSO.isAuthenticated ? 'not-allowed' : 'pointer'
                        }}
                    >
                        登出
                    </button>

                    <button
                        onClick={basicSSO.refreshToken}
                        disabled={basicSSO.isLoading || !basicSSO.isAuthenticated}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#fa8c16',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: basicSSO.isLoading || !basicSSO.isAuthenticated ? 'not-allowed' : 'pointer'
                        }}
                    >
                        刷新令牌
                    </button>
                </div>

                {basicSSO.user && (
                    <div style={{
                        marginTop: '16px',
                        padding: '12px',
                        backgroundColor: '#f6ffed',
                        borderRadius: '4px'
                    }}>
                        <h4>用户信息:</h4>
                        <pre style={{
                            margin: '8px 0',
                            backgroundColor: '#fff',
                            padding: '8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            overflow: 'auto'
                        }}>
                            {JSON.stringify(basicSSO.user, null, 2)}
                        </pre>
                    </div>
                )}
            </div>

            {/* 自定义配置示例 */}
            <div style={{
                border: '1px solid #d9d9d9',
                borderRadius: '8px',
                padding: '24px',
                marginBottom: '32px',
                backgroundColor: '#fff7e6'
            }}>
                <h2 style={{ color: '#fa8c16', marginBottom: '16px' }}>
                    ⚙️ 自定义配置示例
                </h2>
                <p style={{ marginBottom: '16px', color: '#666' }}>
                    展示如何使用自定义配置创建个性化的SSO体验。
                </p>

                <div style={{ marginBottom: '16px' }}>
                    <strong>项目名称:</strong> {customSSO.config?.name || '加载中...'}
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <strong>品牌色:</strong>
                    <span style={{
                        display: 'inline-block',
                        width: '20px',
                        height: '20px',
                        backgroundColor: customSSO.config?.branding.primaryColor || '#722ed1',
                        marginLeft: '8px',
                        borderRadius: '50%',
                        verticalAlign: 'middle'
                    }}></span>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => customSSO.login({ redirect: true })}
                        disabled={customSSO.isLoading || customSSO.isAuthenticated}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: customSSO.config?.branding.primaryColor || '#722ed1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: customSSO.isLoading || customSSO.isAuthenticated ? 'not-allowed' : 'pointer'
                        }}
                    >
                        自定义登录
                    </button>

                    <button
                        onClick={() => customSSO.login({ redirect: true, provider: 'github' })}
                        disabled={customSSO.isLoading || customSSO.isAuthenticated}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#333',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: customSSO.isLoading || customSSO.isAuthenticated ? 'not-allowed' : 'pointer'
                        }}
                    >
                        GitHub登录
                    </button>
                </div>
            </div>

            {/* 电商应用示例 */}
            <div style={{
                border: '1px solid #d9d9d9',
                borderRadius: '8px',
                padding: '24px',
                marginBottom: '32px',
                backgroundColor: '#f6ffed'
            }}>
                <h2 style={{ color: '#52c41a', marginBottom: '16px' }}>
                    🛒 电商应用集成示例
                </h2>
                <p style={{ marginBottom: '16px', color: '#666' }}>
                    展示在实际业务场景中如何使用SSO功能。
                </p>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => ecommerceSSO.login({ redirect: true })}
                        disabled={ecommerceSSO.isLoading || ecommerceSSO.isAuthenticated}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#52c41a',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: ecommerceSSO.isLoading || ecommerceSSO.isAuthenticated ? 'not-allowed' : 'pointer'
                        }}
                    >
                        🛒 进入商城
                    </button>

                    {ecommerceSSO.isAuthenticated && (
                        <>
                            <button
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#1890ff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                查看购物车
                            </button>

                            <button
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#722ed1',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                我的订单
                            </button>
                        </>
                    )}
                </div>

                {ecommerceSSO.isAuthenticated && (
                    <div style={{
                        marginTop: '16px',
                        padding: '12px',
                        backgroundColor: '#f6ffed',
                        borderRadius: '4px'
                    }}>
                        <h4>🎉 电商功能已解锁!</h4>
                        <p>现在您可以访问购物车、订单、个人中心等功能。</p>
                    </div>
                )}
            </div>

            {/* 代码示例 */}
            <div style={{
                border: '1px solid #d9d9d9',
                borderRadius: '8px',
                padding: '24px',
                backgroundColor: '#f0f2f5'
            }}>
                <h2 style={{ color: '#1890ff', marginBottom: '16px' }}>
                    💻 集成代码示例
                </h2>

                <div style={{
                    backgroundColor: '#fff',
                    padding: '16px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    overflow: 'auto'
                }}>
                    <pre>{`// 在你的React应用中使用
import { useSubProjectSSO } from '@sparrow-sso/sdk'

function YourApp() {
    const {
        isAuthenticated,
        user,
        login,
        logout,
        isLoading
    } = useSubProjectSSO({
        subProjectId: 'your-project-id',
        onSuccess: (user, token, session) => {
            // 处理登录成功
            console.log('登录成功:', user)
            // 更新应用状态
            setCurrentUser(user)
        },
        onError: (error) => {
            // 处理登录失败
            console.error('登录失败:', error)
        }
    })

    return (
        <div>
            {isLoading ? (
                <div>加载中...</div>
            ) : isAuthenticated ? (
                <div>
                    <h1>欢迎, {user?.name}!</h1>
                    <button onClick={logout}>登出</button>
                </div>
            ) : (
                <button onClick={() => login({ redirect: true })}>
                    登录
                </button>
            )}
        </div>
    )
}

export default YourApp`}</pre>
                </div>
            </div>
        </div>
    )
}

export default SubProjectIntegrationDemo
