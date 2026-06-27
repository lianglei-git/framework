/**
 * Token 错误处理集成示例
 * 展示如何在实际应用中使用统一的 Token 错误处理
 */

import React, { useState } from 'react'
import { Button, Card, Space, Alert, Divider, message } from 'antd'
import { TokenErrorResponse, TokenErrorCode } from '../types/token'
import { handleTokenError } from '../utils/tokenErrorHandler'
import { useTokenErrorHandler } from '../hooks/useTokenErrorHandler'

/**
 * 示例组件：展示不同错误场景的处理
 */
export function TokenErrorHandlingExample() {
    const { handleError } = useTokenErrorHandler()
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<string>('')

    /**
     * 模拟不同的错误响应
     */
    const mockErrors: Record<string, TokenErrorResponse> = {
        'refresh_token_expired': {
            error: 'invalid_grant',
            error_code: TokenErrorCode.REFRESH_TOKEN_EXPIRED,
            error_description: 'Refresh token has expired',
            suggest_action: 'check_session'
        },
        'session_revoked': {
            error: 'invalid_grant',
            error_code: TokenErrorCode.SESSION_REVOKED,
            error_description: 'Session has been revoked (forced logout)',
            suggest_action: 'relogin'
        },
        'token_user_mismatch': {
            error: 'invalid_grant',
            error_code: TokenErrorCode.TOKEN_USER_MISMATCH,
            error_description: 'Token user mismatch',
            suggest_action: 'relogin'
        },
        'client_inactive': {
            error: 'invalid_client',
            error_code: TokenErrorCode.CLIENT_INACTIVE,
            error_description: 'Client is not active',
            suggest_action: 'contact_admin'
        },
        'auth_code_expired': {
            error: 'invalid_grant',
            error_code: TokenErrorCode.AUTH_CODE_EXPIRED,
            error_description: 'Authorization code has expired',
            suggest_action: 'retry_auth'
        },
        'database_error': {
            error: 'server_error',
            error_code: TokenErrorCode.DATABASE_ERROR,
            error_description: 'Database operation failed',
            suggest_action: 'retry'
        }
    }

    /**
     * 测试特定错误场景
     */
    const testErrorScenario = async (scenarioKey: string) => {
        setLoading(true)
        setResult('')

        try {
            const errorResponse = mockErrors[scenarioKey]
            
            console.group(`🧪 测试场景: ${scenarioKey}`)
            console.log('错误响应:', errorResponse)
            
            // 使用统一错误处理器
            const handled = await handleError(errorResponse)
            
            console.log('处理结果:', handled ? '已处理' : '未处理')
            console.groupEnd()
            
            setResult(handled ? '✅ 错误已被成功处理' : '⚠️ 错误未被处理')
        } catch (error: any) {
            console.error('处理失败:', error)
            setResult(`❌ 处理失败: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    /**
     * 测试自定义处理器
     */
    const testCustomHandlers = async () => {
        setLoading(true)
        setResult('')

        try {
            const errorResponse = mockErrors['refresh_token_expired']
            
            // 使用自定义处理器
            const handled = await handleTokenError(errorResponse, {
                onCheckSession: async () => {
                    message.info('正在尝试恢复 session...')
                    await new Promise(resolve => setTimeout(resolve, 1000))
                    message.success('Session 恢复成功！')
                },
                
                onRelogin: () => {
                    message.warning('需要重新登录')
                },
                
                onShowError: (msg, severity) => {
                    message[severity](msg)
                }
            })
            
            setResult(handled ? '✅ 自定义处理器执行成功' : '⚠️ 未处理')
        } catch (error: any) {
            setResult(`❌ 处理失败: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
            <Card title="🔐 Token 错误处理集成示例">
                <Alert
                    message="测试说明"
                    description="点击下方按钮测试不同的错误场景。每个场景会触发相应的错误处理流程，观察控制台输出以了解详细处理过程。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 24 }}
                />

                <Divider orientation="left">场景 1: 可恢复错误（session_id 恢复）</Divider>
                <Space wrap>
                    <Button
                        onClick={() => testErrorScenario('refresh_token_expired')}
                        loading={loading}
                    >
                        测试: Refresh Token 过期
                    </Button>
                    <Button
                        onClick={() => testErrorScenario('token_hash_mismatch')}
                        loading={loading}
                    >
                        测试: Token Hash 不匹配
                    </Button>
                </Space>
                <div style={{ marginTop: 8, color: '#666' }}>
                    <small>
                        这些错误会触发 <code>suggest_action: "check_session"</code>，
                        前端会尝试用 session_id 恢复登录。
                    </small>
                </div>

                <Divider orientation="left">场景 2: 强制登出</Divider>
                <Space wrap>
                    <Button
                        onClick={() => testErrorScenario('session_revoked')}
                        loading={loading}
                        danger
                    >
                        测试: Session 被撤销
                    </Button>
                    <Button
                        onClick={() => testErrorScenario('token_user_mismatch')}
                        loading={loading}
                        danger
                    >
                        测试: 用户不匹配
                    </Button>
                </Space>
                <div style={{ marginTop: 8, color: '#666' }}>
                    <small>
                        这些错误会触发 <code>suggest_action: "relogin"</code>，
                        清除本地数据并跳转登录页。
                    </small>
                </div>

                <Divider orientation="left">场景 3: 配置错误</Divider>
                <Space wrap>
                    <Button
                        onClick={() => testErrorScenario('client_inactive')}
                        loading={loading}
                        type="primary"
                        ghost
                    >
                        测试: 客户端未激活
                    </Button>
                </Space>
                <div style={{ marginTop: 8, color: '#666' }}>
                    <small>
                        触发 <code>suggest_action: "contact_admin"</code>，
                        显示联系管理员提示。
                    </small>
                </div>

                <Divider orientation="left">场景 4: 其他错误</Divider>
                <Space wrap>
                    <Button
                        onClick={() => testErrorScenario('auth_code_expired')}
                        loading={loading}
                    >
                        测试: 授权码过期
                    </Button>
                    <Button
                        onClick={() => testErrorScenario('database_error')}
                        loading={loading}
                    >
                        测试: 数据库错误
                    </Button>
                </Space>

                <Divider orientation="left">高级测试</Divider>
                <Space wrap>
                    <Button
                        onClick={testCustomHandlers}
                        loading={loading}
                        type="primary"
                    >
                        测试: 自定义处理器
                    </Button>
                </Space>
                <div style={{ marginTop: 8, color: '#666' }}>
                    <small>
                        使用自定义的错误处理回调函数。
                    </small>
                </div>

                {result && (
                    <>
                        <Divider />
                        <Alert
                            message="处理结果"
                            description={result}
                            type={
                                result.includes('✅') ? 'success' :
                                result.includes('❌') ? 'error' : 'warning'
                            }
                            showIcon
                        />
                    </>
                )}

                <Divider />
                <Alert
                    message="开发提示"
                    description={
                        <div>
                            <p>1. 打开浏览器控制台查看详细的处理流程</p>
                            <p>2. 在实际应用中，这些错误会由后端 API 返回</p>
                            <p>3. 错误处理逻辑会自动在 Axios 拦截器中执行</p>
                            <p>4. 参考 <code>FRONTEND_INTEGRATION_GUIDE.md</code> 了解完整集成方法</p>
                        </div>
                    }
                    type="warning"
                />
            </Card>

            <Card title="📊 错误码映射表" style={{ marginTop: 24 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f0f0f0' }}>
                            <th style={{ padding: 8, border: '1px solid #ddd' }}>错误码</th>
                            <th style={{ padding: 8, border: '1px solid #ddd' }}>建议操作</th>
                            <th style={{ padding: 8, border: '1px solid #ddd' }}>前端处理</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}>
                                <code>REFRESH_TOKEN_EXPIRED</code>
                            </td>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}>
                                <code>check_session</code>
                            </td>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}>
                                尝试 session 恢复
                            </td>
                        </tr>
                        <tr>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}>
                                <code>SESSION_REVOKED</code>
                            </td>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}>
                                <code>relogin</code>
                            </td>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}>
                                清除数据，跳转登录
                            </td>
                        </tr>
                        <tr>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}>
                                <code>CLIENT_INACTIVE</code>
                            </td>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}>
                                <code>contact_admin</code>
                            </td>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}>
                                显示联系管理员
                            </td>
                        </tr>
                    </tbody>
                </table>
            </Card>
        </div>
    )
}

export default TokenErrorHandlingExample

