/**
 * 统一 SSO Hook：子项目集成 + URL 回调处理
 */
export {
    useSubProjectSSO as useSSO,
    useSubProjectSSO,
    setSSOConfig,
    type UseSubProjectSSOOptions,
    type UseSubProjectSSOResult,
} from './useSubProjectSSO'

export {
    useSSOUrlHandler,
    useExternalSSOIntegration,
    useOpenIDConnect,
} from './useSSOUrlHandler'

export { useSubProjectSSO as default } from './useSubProjectSSO'
