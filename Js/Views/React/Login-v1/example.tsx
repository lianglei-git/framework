import React from 'react'
import { LoginForm } from './src'

const App: React.FC = () => {
    const handleLoginSuccess = () => {
        console.log('登录成功！')
        // 跳转到首页或仪表板
    }

    const handleLoginError = (error: string) => {
        console.error('登录失败:', error)
        // 显示错误提示
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <LoginForm
                onSuccess={handleLoginSuccess}
                onError={handleLoginError}
            />
        </div>
    )
}

export default App 