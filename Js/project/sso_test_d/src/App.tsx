import { useSubProjectSSO } from '@sparrow/login/hooks'
import { appConfig } from './sso'
import { TestPanel } from './TestPanel'

export default function App() {
    const sso = useSubProjectSSO({ customConfig: appConfig })
    const { isAuthenticated, login, isLoading, error } = sso

    if (isLoading) {
        return (
            <div className="page-center">
                <div className="spinner" />
                <p>初始化中…</p>
            </div>
        )
    }

    if (!isAuthenticated) {
        return (
            <div className="page-center">
                <h1 className="app-title">sso_test_d</h1>
                <p className="hint">SSO 完整测试台 · 前端 :5176 · BFF :5558</p>
                {error && <p className="err">{error.message}</p>}
                <button type="button" className="btn btn-primary btn-lg" onClick={() => login({ redirect: true })}>
                    SSO 登录
                </button>
            </div>
        )
    }

    return (
        <div className="app-root">
            <header className="app-header">
                <span className="app-title">sso_test_d · SSO 测试台</span>
                <span className="hint">前端 :5176 · BFF :5558 · IdP :8080</span>
            </header>
            <TestPanel sso={sso} />
        </div>
    )
}
