import React, { useState } from 'react'
import { useSubProjectSSO } from '../hooks'
import { getSubProjectConfig, getAllSubProjectConfigs } from '../config/subproject-integration'
import type { SubProjectConfig } from '../config/subproject-integration'
import { Loading } from './common/Loading'
import { Button } from './common'

interface SubProjectIntegrationExampleProps {
    subProjectId?: string
}

/**
 * 子项目集成示例组件
 * 展示如何在React应用中集成SSO功能
 */
export const SubProjectIntegrationExample: React.FC<SubProjectIntegrationExampleProps> = ({
    subProjectId = 'user-management'
}) => {
    const [selectedProject, setSelectedProject] = useState<string>(subProjectId)

    // 使用子项目SSO Hook
    const {
        isInitialized,
        isLoading,
        isAuthenticated,
        error,
        user,
        token,
        session,
        config,
        login,
        logout,
        getLoginUrl,
        refreshToken,
        isInCallback,
        getSubProjectInfo
    } = useSubProjectSSO({
        subProjectId: selectedProject,
        autoInit: true,
        onSuccess: (user, token, session) => {
            console.log('SSO登录成功:', { user, token, session })
        },
        onError: (error) => {
            console.error('SSO登录失败:', error)
        },
        onLogout: () => {
            console.log('用户已登出')
        }
    })

    // 处理项目切换
    const handleProjectChange = (projectId: string) => {
        setSelectedProject(projectId)
        // 这里会重新初始化SSO服务
    }

    // 处理登录
    const handleLogin = async (provider?: string) => {
        try {
            await login({ redirect: true, provider })
        } catch (error) {
            console.error('登录失败:', error)
        }
    }

    // 处理刷新令牌
    const handleRefreshToken = async () => {
        try {
            await refreshToken()
        } catch (error) {
            console.error('令牌刷新失败:', error)
        }
    }

    // 处理登出
    const handleLogout = async () => {
        try {
            await logout()
        } catch (error) {
            console.error('登出失败:', error)
        }
    }

    // 获取所有可用的子项目
    const availableProjects = getAllSubProjectConfigs()

    if (error) {
        return (
            <div style={{
                padding: '20px',
                border: '1px solid #ff4d4f',
                borderRadius: '8px',
                backgroundColor: '#fff2f0',
                color: '#ff4d4f'
            }}>
                <h3>SSO配置错误</h3>
                <p>{error.message}</p>
                <p>请检查子项目配置和网络连接</p>
            </div>
        )
    }

    return (
        <div style={{
            maxWidth: '800px',
            margin: '20px auto',
            padding: '24px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
            <h2 style={{ marginBottom: '24px', color: '#1890ff' }}>
                子项目SSO集成示例
            </h2>

            {/* 项目选择器 */}
            <div style={{ marginBottom: '24px' }}>
                <h3>选择子项目:</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {availableProjects.map((project) => (
                        <Button
                            key={project.id}
                            type={selectedProject === project.id ? 'primary' : 'default'}
                            onClick={() => handleProjectChange(project.id)}
                            disabled={isLoading}
                        >
                            {project.name}
                        </Button>
                    ))}
                </div>
            </div>

            {/* 状态显示 */}
            <div style={{
                padding: '16px',
                backgroundColor: '#f6ffed',
                borderRadius: '6px',
                marginBottom: '24px'
            }}>
                <h4>当前状态:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>已初始化: <strong>{isInitialized ? '✅' : '❌'}</strong></div>
                    <div>加载中: <strong>{isLoading ? '⏳' : '✅'}</strong></div>
                    <div>已认证: <strong>{isAuthenticated ? '✅' : '❌'}</strong></div>
                    <div>在回调模式: <strong>{isInCallback() ? '✅' : '❌'}</strong></div>
                </div>
                {config && (
                    <div style={{ marginTop: '12px' }}>
                        <div>项目名称: <strong>{config.name}</strong></div>
                        <div>项目描述: <strong>{config.description}</strong></div>
                    </div>
                )}
            </div>

            {/* 用户信息 */}
            {user && (
                <div style={{
                    padding: '16px',
                    backgroundColor: '#f0f2f5',
                    borderRadius: '6px',
                    marginBottom: '24px'
                }}>
                    <h4>用户信息:</h4>
                    <pre style={{
                        backgroundColor: '#fff',
                        padding: '12px',
                        borderRadius: '4px',
                        overflow: 'auto'
                    }}>
                        {JSON.stringify(user, null, 2)}
                    </pre>
                </div>
            )}

            {/* 令牌信息 */}
            {token && (
                <div style={{
                    padding: '16px',
                    backgroundColor: '#fff7e6',
                    borderRadius: '6px',
                    marginBottom: '24px'
                }}>
                    <h4>令牌信息:</h4>
                    <div style={{ marginBottom: '12px' }}>
                        <div>访问令牌: <code>{token.access_token.substring(0, 50)}...</code></div>
                        <div>令牌类型: <strong>{token.token_type}</strong></div>
                        <div>过期时间: <strong>{new Date((token.expires_at || 0) * 1000).toLocaleString()}</strong></div>
                    </div>
                </div>
            )}

            {/* 操作按钮 */}
            <div style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                marginBottom: '24px'
            }}>
                <Button
                    type="primary"
                    onClick={() => handleLogin()}
                    loading={isLoading}
                    disabled={!isInitialized || isAuthenticated}
                >
                    登录 (重定向)
                </Button>

                <Button
                    onClick={() => handleLogin('local')}
                    loading={isLoading}
                    disabled={!isInitialized || isAuthenticated}
                >
                    直接登录
                </Button>

                <Button
                    onClick={handleRefreshToken}
                    loading={isLoading}
                    disabled={!isInitialized || !isAuthenticated}
                >
                    刷新令牌
                </Button>

                <Button
                    type="danger"
                    onClick={handleLogout}
                    loading={isLoading}
                    disabled={!isInitialized || !isAuthenticated}
                >
                    登出
                </Button>
            </div>

            {/* 获取登录URL示例 */}
            {isInitialized && (
                <div style={{
                    padding: '16px',
                    backgroundColor: '#f0f8ff',
                    borderRadius: '6px',
                    marginBottom: '24px'
                }}>
                    <h4>登录URL示例:</h4>
                    <div style={{ marginBottom: '8px' }}>
                        <strong>本地登录:</strong>
                        <code style={{
                            backgroundColor: '#fff',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            marginLeft: '8px'
                        }}>
                            {getLoginUrl('local')}
                        </code>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                        <strong>GitHub登录:</strong>
                        <code style={{
                            backgroundColor: '#fff',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            marginLeft: '8px'
                        }}>
                            {getLoginUrl('github')}
                        </code>
                    </div>
                    <div>
                        <strong>Google登录:</strong>
                        <code style={{
                            backgroundColor: '#fff',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            marginLeft: '8px'
                        }}>
                            {getLoginUrl('google')}
                        </code>
                    </div>
                </div>
            )}

            {/* 使用说明 */}
            <div style={{
                padding: '16px',
                backgroundColor: '#fafafa',
                borderRadius: '6px',
                border: '1px solid #d9d9d9'
            }}>
                <h4>使用说明:</h4>
                <ol>
                    <li><strong>选择子项目:</strong> 从上面的按钮中选择要集成的子项目</li>
                    <li><strong>登录:</strong> 点击"登录 (重定向)"按钮进行SSO登录</li>
                    <li><strong>回调处理:</strong> 登录成功后会自动返回并处理认证信息</li>
                    <li><strong>令牌管理:</strong> 系统会自动处理令牌刷新</li>
                </ol>

                <h5>在你的项目中集成:</h5>
                <pre style={{
                    backgroundColor: '#f6f8fa',
                    padding: '12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    overflow: 'auto'
                }}>
                    {`// 在你的React组件中
import { useSubProjectSSO } from 'your-sso-sdk'

function YourComponent() {
    const {
        isAuthenticated,
        user,
        login,
        logout,
        isLoading
    } = useSubProjectSSO({
        subProjectId: 'your-project-id',
        onSuccess: (user, token, session) => {
            console.log('登录成功:', user)
        }
    })

    if (isLoading) return <div>加载中...</div>

    return (
        <div>
            {isAuthenticated ? (
                <div>
                    <p>欢迎, {user?.name}!</p>
                    <button onClick={logout}>登出</button>
                </div>
            ) : (
                <button onClick={() => login({ redirect: true })}>
                    登录
                </button>
            )}
        </div>
    )
}`}
                </pre>
            </div>
        </div>
    )
}

export default SubProjectIntegrationExample
