import type { SSOProvider } from '../types'

/** 在页面上展示的第三方登录方式 */
export const SOCIAL_PROVIDER_IDS = ['github', 'google', 'wechat'] as const

export type SocialProviderId = (typeof SOCIAL_PROVIDER_IDS)[number]

/** 第一方 SSO（子项目 / 本地账号），换票走 oauth/token，不是 oauth-login */
export const FIRST_PARTY_PROVIDER_IDS = ['sub_job', 'local'] as const

export type FirstPartyProviderId = (typeof FIRST_PARTY_PROVIDER_IDS)[number]

/** SSO 服务尚未加载完成时的默认展示列表 */
export const DEFAULT_SOCIAL_PROVIDERS: SSOProvider[] = [
    {
        id: 'github',
        name: 'github',
        displayName: 'GitHub',
        authorizationUrl: '',
        enabled: true,
    },
    {
        id: 'google',
        name: 'google',
        displayName: 'Google',
        authorizationUrl: '',
        enabled: true,
    },
    {
        id: 'wechat',
        name: 'wechat',
        displayName: '微信',
        authorizationUrl: '',
        enabled: true,
    },
]

export function isSocialProvider(provider: { id: string; enabled?: boolean }): boolean {
    return SOCIAL_PROVIDER_IDS.includes(provider.id as SocialProviderId) && provider.enabled !== false
}

/** GitHub/Google/微信等第三方 OAuth 回调应走 oauth-login，而非 oauth/token */
export function isSocialProviderId(provider?: string | null): provider is SocialProviderId {
    return !!provider && SOCIAL_PROVIDER_IDS.includes(provider as SocialProviderId)
}

export function isFirstPartyProviderId(provider?: string | null): provider is FirstPartyProviderId {
    return !!provider && (FIRST_PARTY_PROVIDER_IDS as readonly string[]).includes(provider)
}

/**
 * 拿授权地址：社交和 sub_job 都走 GET /api/v1/auth/oauth/:provider/url。
 * 这和换票是否走 oauth-login 不是同一件事。
 */
export function shouldFetchProviderAuthorizeUrl(provider?: string | null): boolean {
    return isSocialProviderId(provider) || provider === 'sub_job'
}

/**
 * oauth-login 只给登录中心的 GitHub/Google/微信。
 * 子项目即使用户本地残留了 login_provider=github，回来的也是第一方 code，必须走 oauth/token。
 */
export function shouldUseSocialOAuthLogin(
    provider?: string | null,
    isSubProjectApp = false,
): boolean {
    if (isSubProjectApp || isFirstPartyProviderId(provider)) return false
    return isSocialProviderId(provider)
}

export function pickSocialProviders(providers?: SSOProvider[] | null): SSOProvider[] {
    const source = providers?.length ? providers : DEFAULT_SOCIAL_PROVIDERS
    return source.filter(isSocialProvider)
}
