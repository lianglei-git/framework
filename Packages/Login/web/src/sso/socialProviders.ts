import type { SSOProvider } from '../types'

/** 在页面上展示的第三方登录方式 */
export const SOCIAL_PROVIDER_IDS = ['github', 'google', 'wechat'] as const

export type SocialProviderId = (typeof SOCIAL_PROVIDER_IDS)[number]

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

export function pickSocialProviders(providers?: SSOProvider[] | null): SSOProvider[] {
    const source = providers?.length ? providers : DEFAULT_SOCIAL_PROVIDERS
    return source.filter(isSocialProvider)
}
