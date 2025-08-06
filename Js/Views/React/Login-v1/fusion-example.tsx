import React from 'react'
import { observer } from 'mobx-react-lite'
import { Login } from './Login'
import { Register } from './Register'
import { globalUserStore } from './src'

const FusionExample: React.FC = observer(() => {
    const [currentView, setCurrentView] = React.useState<'login' | 'register'>('login')

    const handleLoginSuccess = () => {
        console.log('登录成功！')
        console.log('用户信息:', globalUserStore.info)
        console.log('用户昵称:', globalUserStore.nickName)
        console.log('用户角色:', globalUserStore.role)
        console.log('是否为管理员:', globalUserStore.isAdmin)
    }

    const handleLoginError = (error: string) => {
        console.error('登录失败:', error)
    }

    const handleRegisterSuccess = () => {
        console.log('注册成功！')
        setCurrentView('login')
    }

    const handleRegisterError = (error: string) => {
        console.error('注册失败:', error)
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 导航栏 */}
            <nav className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-semibold text-gray-900">
                                模块化认证系统示例
                            </h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => setCurrentView('login')}
                                className={`px-3 py-2 rounded-md text-sm font-medium ${currentView === 'login'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                登录
                            </button>
                            <button
                                onClick={() => setCurrentView('register')}
                                className={`px-3 py-2 rounded-md text-sm font-medium ${currentView === 'register'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                注册
                            </button>
                            {globalUserStore.isLogin && (
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-700">
                                        欢迎，{globalUserStore.nickName}
                                    </span>
                                    <button
                                        onClick={() => globalUserStore.logout()}
                                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                                    >
                                        登出
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* 主要内容 */}
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    {/* 状态信息 */}
                    <div className="bg-white shadow rounded-lg p-6 mb-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">系统状态</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="text-sm font-medium text-blue-600">登录状态</div>
                                <div className="text-2xl font-bold text-blue-900">
                                    {globalUserStore.isLogin ? '已登录' : '未登录'}
                                </div>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                                <div className="text-sm font-medium text-green-600">用户昵称</div>
                                <div className="text-2xl font-bold text-green-900">
                                    {globalUserStore.nickName || '未设置'}
                                </div>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg">
                                <div className="text-sm font-medium text-purple-600">用户角色</div>
                                <div className="text-2xl font-bold text-purple-900">
                                    {globalUserStore.role === 0 ? '超级用户' :
                                        globalUserStore.role === 1 ? '开发者' : '普通用户'}
                                </div>
                            </div>
                            <div className="bg-orange-50 p-4 rounded-lg">
                                <div className="text-sm font-medium text-orange-600">管理员权限</div>
                                <div className="text-2xl font-bold text-orange-900">
                                    {globalUserStore.isAdmin ? '是' : '否'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 功能演示 */}
                    <div className="bg-white shadow rounded-lg p-6 mb-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">功能演示</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="border border-gray-200 rounded-lg p-4">
                                <h3 className="text-md font-medium text-gray-900 mb-2">模块化架构</h3>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>• 类型定义层 (types/)</li>
                                    <li>• 工具层 (utils/)</li>
                                    <li>• 服务层 (services/)</li>
                                    <li>• Hooks层 (hooks/)</li>
                                    <li>• 组件层 (components/)</li>
                                    <li>• 样式层 (styles/)</li>
                                </ul>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-4">
                                <h3 className="text-md font-medium text-gray-900 mb-2">认证功能</h3>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>• 邮箱/手机号/用户名登录</li>
                                    <li>• 手机验证码登录</li>
                                    <li>• 微信扫码登录</li>
                                    <li>• 用户注册</li>
                                    <li>• 密码重置</li>
                                    <li>• 表单验证</li>
                                </ul>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-4">
                                <h3 className="text-md font-medium text-gray-900 mb-2">技术特性</h3>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>• TypeScript 类型安全</li>
                                    <li>• Less 样式系统</li>
                                    <li>• React Hooks</li>
                                    <li>• 响应式设计</li>
                                    <li>• 主题支持</li>
                                    <li>• 移动端适配</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* 认证组件 */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">
                            {currentView === 'login' ? '用户登录' : '用户注册'}
                        </h2>
                        <div className="flex justify-center">
                            {currentView === 'login' ? (
                                <Login />
                            ) : (
                                <Register />
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* 页脚 */}
            <footer className="bg-white border-t">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="text-center text-sm text-gray-500">
                        <p>模块化认证系统 - 融合现有逻辑与新的架构</p>
                        <p className="mt-1">
                            支持多种登录方式、表单验证、状态管理和主题系统
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
})

export {
    FusionExample
}  