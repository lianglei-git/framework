import {
    SSOConfig,
    RegisterRequest,
    SendEmailCodeRequest,
    SendPhoneCodeRequest,
    VerificationType,
    LoginResponse,
    PhoneResetPasswordRequest,
    unifiedNormalLocalLoginRequest,
} from '../types'
import { ApiService, getCommonHeaders } from './httpClient'
import { formatAuthError } from '../utils/authError'

export class AuthApiService extends ApiService {
    private ssoConfig?: SSOConfig

    constructor(baseURL?: string) {
        super(baseURL)
        this.loadSSOConfig()
    }

    /**
     * 加载SSO配置
     */
    private loadSSOConfig(): void {
        // 从环境变量加载SSO配置
        const ssoServerUrl = import.meta.env.VITE_SSO_SERVER_URL
        if (ssoServerUrl) {
            this.ssoConfig = {
                ssoServerUrl,
                clientId: import.meta.env.VITE_SSO_CLIENT_ID || '',
                clientSecret: import.meta.env.VITE_SSO_CLIENT_SECRET || '',
                redirectUri: import.meta.env.VITE_SSO_REDIRECT_URI || window.location.origin + '/auth/callback',
                scope: (import.meta.env.VITE_SSO_SCOPE || 'openid profile email').split(' '),
                responseType: (import.meta.env.VITE_SSO_RESPONSE_TYPE as 'code' | 'token' | 'id_token') || 'code',
                grantType: (import.meta.env.VITE_SSO_GRANT_TYPE as 'authorization_code' | 'implicit' | 'client_credentials') || 'authorization_code',
                sessionTimeout: parseInt(import.meta.env.VITE_SSO_SESSION_TIMEOUT || '3600'),
                autoRefresh: import.meta.env.VITE_SSO_AUTO_REFRESH !== 'false',
                storageType: (import.meta.env.VITE_SSO_STORAGE_TYPE as 'localStorage' | 'sessionStorage') || 'localStorage'
            }
        }
    }

    /**
     * 统一登录接口 - 支持邮箱/用户ID/手机号登录
     * 兼容原有API和SSO模式
     */
    async unifiedLogin(data: { account: string, password: string }): Promise<any> {
        // 如果启用了SSO，使用SSO登录
        if (this.ssoConfig) {
            return this.ssoLogin({
                username: data.account,
                password: data.password,
                login_type: 'local'
            })
        }

        // 否则使用原有API
        const response = await axios.post(`${this.baseURL}/api/v1/auth/login`, data, {
            headers: getCommonHeaders()
        })

        if (response.data.code === 200) {
            return {
                user: response.data.data.user,
                token: response.data.data.token,
                refresh_token: '', // 后端暂时没有refresh_token
                expires_in: 3600
            }
        } else {
            throw new Error(response.data.message || '登录失败')
        }
    }

    /**
     * SSO登录
     */
    async ssoLogin(request: SSOLoginRequest): Promise<SSOLoginResponse> {
        if (!this.ssoConfig) {
            throw new Error('SSO configuration not found')
        }

        // 如果是本地登录，调用原有API
        if (request.login_type === 'local' && request.username && request.password) {
            return this.localSSOLogin(request.username, request.password)
        }

        // 如果有授权码，使用授权码流程
        if (request.code) {
            return this.ssoCodeLogin(request)
        }

        // 其他情况抛出错误
        throw new Error('Invalid SSO login request')
    }

    /**
     * 本地SSO登录（兼容原有登录方式）
     */
    private async localSSOLogin(username: string, password: string): Promise<SSOLoginResponse> {
        // 导入设备指纹工具
        const { getDeviceFingerprint } = await import('../utils/deviceFingerprint')
        const deviceId = getDeviceFingerprint()

        const tokenData = {
            grant_type: 'password',
            client_id: this.ssoConfig!.clientId,
            client_secret: this.ssoConfig!.clientSecret,
            username: username,
            password: password,
            scope: this.ssoConfig!.scope?.join(' '),
            device_id: deviceId  // 添加设备ID
        }

        const response = await this.post<SSOToken>(`${this.ssoConfig!.ssoServerUrl}/api/v1/auth/oauth/token`, tokenData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })

        if (response.error) {
            throw new Error(formatAuthError(response, '登录失败'))
        }

        // 获取用户信息
        const userInfo = await this.getSSOUserInfo(response.access_token)

        // 创建SSO会话
        const session: SSOSession = {
            session_id: `sso_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            user_id: userInfo.sub,
            client_id: this.ssoConfig!.clientId,
            authenticated_at: Date.now(),
            expires_at: Date.now() + (response.expires_in * 1000),
            last_activity: Date.now(),
            is_active: true,
            remember_me: false
        }

        return {
            user: userInfo,
            token: response,
            session: session
        }
    }

    /**
     * SSO授权码登录
     */
    private async ssoCodeLogin(request: SSOLoginRequest): Promise<SSOLoginResponse> {
        if (!this.ssoConfig) {
            throw new Error('SSO configuration not found')
        }

        const tokenData = {
            grant_type: 'authorization_code',
            client_id: this.ssoConfig.clientId,
            client_secret: this.ssoConfig.clientSecret,
            code: request.code,
            redirect_uri: request.redirect_uri || this.ssoConfig.redirectUri,
            state: request.state
        }

        const response = await this.post<SSOToken>(`${this.ssoConfig.ssoServerUrl}/api/v1/auth/oauth/token`, tokenData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })

        if (response.error) {
            throw new Error(formatAuthError(response, '登录失败'))
        }

        // 获取用户信息
        const userInfo = await this.getSSOUserInfo(response.access_token)

        // 创建SSO会话
        const session: SSOSession = {
            session_id: `sso_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            user_id: userInfo.sub,
            client_id: this.ssoConfig.clientId,
            authenticated_at: Date.now(),
            expires_at: Date.now() + (response.expires_in * 1000),
            last_activity: Date.now(),
            is_active: true,
            remember_me: request.remember_me || false
        }

        return {
            user: userInfo,
            token: response,
            session: session
        }
    }

    /**
     * 获取SSO用户信息
     */
    private async getSSOUserInfo(accessToken: string): Promise<SSOUser> {
        if (!this.ssoConfig) {
            throw new Error('SSO configuration not found')
        }

        return this.get<SSOUser>(`${this.ssoConfig.ssoServerUrl}/oauth/userinfo`, undefined, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        })
    }

    // 传统邮箱登录
    async login(data: LoginRequest): Promise<LoginResponse> {
        const response = await this.post<{ code: number, data: { user: User, token: string }, message?: string }>(`${this.baseURL}/api/v1/auth/login`, {
            account: data.account,
            password: data.password
        }, {
            headers: getCommonHeaders()
        })

        if (response.code === 200) {
            return {
                user: response.data.user,
                token: response.data.token,
                refresh_token: '',
                expires_in: 3600
            }
        } else {
            throw new Error(response.message || '登录失败')
        }
    }

    // 手机验证码登录
    async phoneLogin(data: PhoneLoginRequest): Promise<LoginResponse> {
        const response = await this.post<{ code: number, data: { user: User, token: string }, message?: string }>(`${this.baseURL}/api/v1/auth/phone-login`, data, {
            headers: getCommonHeaders()
        })

        if (response.code === 200) {
            return {
                user: response.data.user,
                token: response.data.token,
                refresh_token: '',
                expires_in: 3600
            }
        } else {
            throw new Error(response.message || '登录失败')
        }
    }

    // 邮箱验证码登录
    async emailCodeLogin(data: { email: string, code: string }): Promise<LoginResponse> {
        const response = await this.post<{ code: number, data: { user: User, token: string }, message?: string }>(`${this.baseURL}/api/v1/auth/email-login`, data, {
            headers: getCommonHeaders()
        })
        if (response.code === 200) {
            return {
                user: response.data.user,
                token: response.data.token,
                refresh_token: '',
                expires_in: 3600
            }
        } else {
            throw new Error(response.message || '登录失败')
        }
    }

    // 获取OAuth授权URL（GitHub等）
    async getOAuthURL(provider: string, state?: string): Promise<string> {
        const response = await this.get<{ code: number, data: { auth_url: string }, message?: string }>(`${this.baseURL}/api/v1/auth/oauth/${provider}/url`, { state }, {
            headers: getCommonHeaders()
        })
        if (response.code === 200) {
            return response.data.auth_url
        }
        throw new Error(response.message || '获取授权链接失败')
    }

    // OAuth登录（code + state）
    async oauthLogin(provider: string, code: string, state?: string): Promise<LoginResponse> {
        const response = await this.post<{ code: number, data: { user: User, token: string }, message?: string }>(`${this.baseURL}/api/v1/auth/oauth-login`, { provider, code, state }, {
            headers: getCommonHeaders()
        })
        if (response.code === 200) {
            return {
                user: response.data.user,
                token: response.data.token,
                refresh_token: '',
                expires_in: 3600
            }
        }
        throw new Error(response.message || 'OAuth登录失败')
    }
    async unifiedNormalLocalLogin(params: unifiedNormalLocalLoginRequest): Promise<unifiedNormalLocalLoginResponse> {
        const response = await this.post(`${this.baseURL}/api/v1/auth/oauth-login`, params, {
            headers: getCommonHeaders(),
            withCredentials: true,
        })
        return response as unifiedNormalLocalLoginResponse

    }

    // 用户注册 - 支持201状态码，注册成功后返回登录信息
    async register(data: RegisterRequest): Promise<LoginResponse> {
        const response = await this.post<LoginResponse & { code?: number; message?: string; error?: string }>(
            `${this.baseURL}/api/v1/auth/register`,
            {
                email: data.email,
                username: data.username,
                nickname: data.username,
                password: data.password,
                code: data.verification_code
            },
            {
                headers: getCommonHeaders()
            }
        )

        if (response?.error || (typeof response?.code === 'number' && response.code >= 400)) {
            throw new Error(formatAuthError(response, '注册失败'))
        }

        return response
    }

    // 发送邮箱验证码
    async sendEmailCode(data: SendEmailCodeRequest): Promise<void> {
        const response = await this.post<{ code: number, message?: string }>(`${this.baseURL}/api/v1/auth/send-email-code`, {
            email: data.email,
            type: data.type
        }, {
            headers: getCommonHeaders()
        })

        if (response.code !== 200) {
            throw new Error(response.message || '发送验证码失败')
        }
    }

    // 发送手机验证码
    async sendPhoneCode(data: SendPhoneCodeRequest): Promise<void> {
        const response = await this.post<{ code: number, message?: string }>(`${this.baseURL}/api/v1/auth/send-sms-code`, {
            phone: data.phone,
            type: data.type
        }, {
            headers: getCommonHeaders()
        })

        if (response.code !== 200) {
            throw new Error(response.message || '发送验证码失败')
        }
    }

    // 邮箱重置密码
    async emailResetPassword(data: ResetPasswordRequest): Promise<void> {
        const response = await this.post<{ code: number, message?: string }>(`${this.baseURL}/api/v1/auth/reset-password`, {
            email: data.email,
            code: data.code,
            password: data.password
        }, {
            headers: getCommonHeaders()
        })

        if (response.code !== 200) {
            throw new Error(response.message || '重置密码失败')
        }
    }

    // 手机重置密码
    async phoneResetPassword(data: PhoneResetPasswordRequest): Promise<void> {
        const response = await this.post<{ code: number, message?: string }>(`${this.baseURL}/api/v1/auth/phone-reset-password`, {
            phone: data.phone,
            code: data.code,
            password: data.password
        }, {
            headers: getCommonHeaders()
        })

        if (response.code !== 200) {
            throw new Error(response.message || '重置密码失败')
        }
    }
    // 重置密码 - 邮箱方式
    async resetPassword(data: ResetPasswordRequest): Promise<void> {
        const response = await this.post<{ code: number, message?: string }>(`${this.baseURL}/api/v1/auth/reset-password`, data)
        if (response.code !== 200) {
            throw new Error(response.message || '重置密码失败')
        }
    }

    // 忘记密码
    async forgotPassword(email: string): Promise<void> {
        const response = await this.post<{ code: number, message?: string }>(`${this.baseURL}/api/v1/auth/forgot-password`, {
            email: email
        }, {
            headers: getCommonHeaders()
        })

        if (response.code !== 200) {
            throw new Error(response.message || '发送重置邮件失败')
        }
    }

    // 登出
    async logout(): Promise<void> {
        // 后端暂时没有logout接口，前端清除token即可
        localStorage.removeItem('auth_token')
    }

    async ssoLogoutPost({ id_token_hint, post_logout_redirect_uri, state }: {
        id_token_hint: string;
        post_logout_redirect_uri: string;
        state: string;
    }) {
        this.post(`${this.baseURL}/api/v1/auth/oauth/logout`, {
            id_token_hint,
            post_logout_redirect_uri,
            state
        }, {
            headers: getCommonHeaders()
        })
    }

    // // 登出
    // async ssoLogout({ id_token_hint, post_logout_redirect_uri, state }: {
    //     id_token_hint: string;
    //     post_logout_redirect_uri: string;
    //     state: string;
    // }, requestType = 'href') {
    //     if (requestType == 'href') {
    //         const querys = new URLSearchParams({
    //             id_token_hint,
    //             post_logout_redirect_uri,
    //             state
    //         })
    //         debugger
    //         const uri = `${this.baseURL}/api/v1/auth/oauth/logout?${querys.toString()}`
    //         window.location.href = uri;
    //         return;
    //     }
    //     return this.post(`/api/v1/auth/oauth/logout`, {
    //         id_token_hint,
    //     }, {
    //         headers: getCommonHeaders()
    //     })
    // }

    // 微信登录相关
    async getWechatQRCode(): Promise<any> {
        const response = await this.get<{ code: number, data: { qr_url: string, state: string, expires_at: string }, message?: string }>(`${this.baseURL}/api/v1/auth/wechat/qr-code`, undefined, {
            headers: getCommonHeaders()
        })

        if (response.code === 200) {
            return {
                qrCodeUrl: response.data.qr_url,
                qrCodeId: response.data.state,
                expiresAt: response.data.expires_at
            }
        } else {
            throw new Error(response.message || '获取二维码失败')
        }
    }

    async getAccountPreview(account: string): Promise<import('../types').AccountPreview> {
        const response = await this.post<{ code: number, data: import('../types').AccountPreview, message?: string }>(
            `${this.baseURL}/api/v1/auth/account-preview`,
            { account },
            { headers: getCommonHeaders() },
        )
        if (response.code === 200) {
            return response.data
        }
        throw new Error(response.message || '获取账号信息失败')
    }

    async checkWechatLoginStatus(state: string): Promise<any> {
        const response = await this.get<{ code: number, data: { status: string, scanned: boolean, used: boolean, user: any, token: string }, message?: string }>(`${this.baseURL}/api/v1/auth/wechat/status/${state}`, undefined, {
            headers: getCommonHeaders()
        })

        if (response.code === 200) {
            return {
                status: response.data.status,
                scanned: response.data.scanned,
                used: response.data.used,
                user: response.data.user,
                token: response.data.token
            }
        } else {
            throw new Error(response.message || '检查登录状态失败')
        }
    }

    // 兼容原有API的方法
    async loginV1(params: { username: string, password: string }): Promise<any> {
        return this.unifiedLogin({
            account: params.username,
            password: params.password
        })
    }
}

export const authApi = new AuthApiService()

export const loginAPIv1 = authApi.loginV1.bind(authApi)
export const registerAPI = authApi.register.bind(authApi)
export const wechatLoginAPI = authApi.checkWechatLoginStatus.bind(authApi)
export const getWechatQRCodeAPI = authApi.getWechatQRCode.bind(authApi)
export const checkWechatLoginStatusAPI = authApi.checkWechatLoginStatus.bind(authApi)
export const emailRegisterAPI = authApi.register.bind(authApi)
export const sendEmailCodeAPI = authApi.sendEmailCode.bind(authApi)
export const emailCodeLoginAPI = authApi.emailCodeLogin.bind(authApi)
export const getOAuthURLAPI = authApi.getOAuthURL.bind(authApi)
export const oauthLoginAPI = authApi.oauthLogin.bind(authApi)
