// 认证Hooks
export {
    useAuth,
    useAuthEvents,
    useAuthState,
    useUser,
    useRequireAuth,
    useRequireRole
} from './useAuth'

// 表单Hooks
export { useForm, useSimpleForm, useField } from './useForm'

// Token刷新Hooks - 供其他项目集成使用
export {
    useTokenRefresh,
    useTokenRefreshEvents,
    useTokenStatus,
    useSSOTokenRefresh,
    useTokenPairLogin,
    type TokenRefreshResult,
    type TokenStatus,
    type UseTokenRefreshReturn
} from './useTokenRefresh'

// SSO Hooks（统一入口 useSSO + 兼容导出）
export {
    useSSO,
    useSubProjectSSO,
    useSSOUrlHandler,
    useExternalSSOIntegration,
    useOpenIDConnect,
    setSSOConfig,
    type UseSubProjectSSOOptions,
    type UseSubProjectSSOResult,
} from './useSSO' 