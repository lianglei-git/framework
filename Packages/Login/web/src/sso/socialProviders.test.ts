import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { shouldFetchProviderAuthorizeUrl, shouldUseSocialOAuthLogin } from './socialProviders.ts'

describe('shouldUseSocialOAuthLogin', () => {
    it('never uses oauth-login for sub-project apps', () => {
        assert.equal(shouldUseSocialOAuthLogin('github', true), false)
        assert.equal(shouldUseSocialOAuthLogin('sub_job', true), false)
        assert.equal(shouldUseSocialOAuthLogin(null, true), false)
    })

    it('never uses oauth-login for first-party providers', () => {
        assert.equal(shouldUseSocialOAuthLogin('sub_job', false), false)
        assert.equal(shouldUseSocialOAuthLogin('local', false), false)
    })

    it('uses oauth-login only on the login center for social providers', () => {
        assert.equal(shouldUseSocialOAuthLogin('github', false), true)
        assert.equal(shouldUseSocialOAuthLogin('google', false), true)
        assert.equal(shouldUseSocialOAuthLogin('wechat', false), true)
    })
})

describe('shouldFetchProviderAuthorizeUrl', () => {
    it('fetches /oauth/:provider/url for sub_job and social', () => {
        assert.equal(shouldFetchProviderAuthorizeUrl('sub_job'), true)
        assert.equal(shouldFetchProviderAuthorizeUrl('github'), true)
        assert.equal(shouldFetchProviderAuthorizeUrl('google'), true)
        assert.equal(shouldFetchProviderAuthorizeUrl('wechat'), true)
    })

    it('does not fetch /url for local', () => {
        assert.equal(shouldFetchProviderAuthorizeUrl('local'), false)
        assert.equal(shouldFetchProviderAuthorizeUrl(null), false)
    })
})
