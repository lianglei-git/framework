import { cleanOAuthParamsFromUrl } from "./oauthLoading"
import {
    consumeOriginAppUri,
    getOriginAppUri,
    isValidAuthorizeUrl,
    redirectToOriginAppUriIfPresent,
    saveOriginAppUriFromUrl,
} from "./ssoOriginRedirect"

export { saveOriginAppUriFromUrl, getOriginAppUri, redirectToOriginAppUriIfPresent, isValidAuthorizeUrl }

// 处理SSO回调结果
export const handleSSOCallbackResult = async (_result?: unknown) => {
    saveOriginAppUriFromUrl()

    const origin_app_uri = consumeOriginAppUri()
    console.log("origin_app_uri::", origin_app_uri)

    if (!origin_app_uri) {
        cleanOAuthParamsFromUrl()
        return false
    }

    if (!isValidAuthorizeUrl(origin_app_uri)) {
        console.warn('⚠️ origin_app_uri 缺少 OAuth 参数，取消回跳:', origin_app_uri)
        cleanOAuthParamsFromUrl()
        return false
    }

    window.location.href = origin_app_uri
    return true
}
