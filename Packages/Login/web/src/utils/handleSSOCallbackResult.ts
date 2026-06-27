import { SSOService } from "../services/sso";

const getSubAppInfoForSessionStorage = () => {
    const appid = localStorage.getItem('app_id') || 'centeral_auth';
    const origin_app_uri = localStorage.getItem('origin_app_uri');
    const app_redirect_uri = localStorage.getItem('redirect_uri');
    return { appid, app_redirect_uri, origin_app_uri }
}


// 处理SSO回调结果
export const handleSSOCallbackResult = async (result: any) => {

    const { app_redirect_uri, appid, origin_app_uri } = getSubAppInfoForSessionStorage()

    console.log("origin_app_uri::", origin_app_uri)
    if (!origin_app_uri) {
        return
    }
    localStorage.removeItem('origin_app_uri');
    // 
    // const { sessionId } = getSessionFromCookies();
    // // 需要使用sessionId从cookie中发送替代token模式
    // const res = await ssoService?.get('/api/v1/auth/oauth/authorize' + origin_app_uri)
    // console.log(res, "resres")
    window.location.href = origin_app_uri
    return;

    // return;

    // 从URL参数中获取重定向URI
    // const urlParams = new URLSearchParams(window.location.search)
    // const redirectUri = urlParams.get('redirect_uri') || urlParams.get('return_url') || app_redirect_uri
    const redirectUri = app_redirect_uri

    if (!redirectUri) {
        console.warn('⚠️ redirectUri is not set')
        window.location.reload()
        return
    }
    console.log('检测到重定向URI:', redirectUri)

    // 清理当前URL中的SSO参数
    const cleanUrl = new URL(window.location.href)
    cleanUrl.searchParams.delete('code')
    cleanUrl.searchParams.delete('state')
    cleanUrl.searchParams.delete('error')
    cleanUrl.searchParams.delete('error_description')
    cleanUrl.searchParams.delete('redirect_uri')
    cleanUrl.searchParams.delete('return_url')

    // 更新URL而不触发页面重载
    window.history.replaceState({}, document.title, cleanUrl.toString())

    // 构建最终重定向URL，添加认证成功信息
    const finalRedirectUrl = new URL(redirectUri)
    finalRedirectUrl.searchParams.set('user', encodeURIComponent(result.user?.name || result.user?.email || 'User'))

    console.log('重定向到:', finalRedirectUrl.toString())
    window.location.href = finalRedirectUrl.toString()

}