import { createAuthConfig } from '../core/createAuthConfig'
import { SSOService } from './SSOService'

let bootstrapPromise: Promise<SSOService> | null = null

/** 应用级单次 SSO 初始化，避免多组件并发 getInstance */
export function ensureSSOService(): Promise<SSOService> {
    if (SSOService.instance instanceof SSOService) {
        return Promise.resolve(SSOService.instance)
    }
    if (!bootstrapPromise) {
        bootstrapPromise = SSOService.getInstance(createAuthConfig()).catch((err) => {
            bootstrapPromise = null
            throw err
        })
    }
    return bootstrapPromise
}

export function resetSSOBootstrapForTests(): void {
    bootstrapPromise = null
}
