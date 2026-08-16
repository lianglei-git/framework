import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isLoginCenterHost } from './isLoginCenterHost.ts'

describe('isLoginCenterHost', () => {
    it('treats local 3033 as the login center', () => {
        assert.equal(isLoginCenterHost({
            origin: 'http://localhost:3033',
            port: '3033',
            hostname: 'localhost',
        }), true)
    })

    it('treats auth.znewbie.com as the login center', () => {
        assert.equal(isLoginCenterHost({
            origin: 'https://auth.znewbie.com',
            port: '',
            hostname: 'auth.znewbie.com',
        }), true)
    })

    it('does not treat a sub-project host as the login center', () => {
        assert.equal(isLoginCenterHost({
            origin: 'http://localhost:5184',
            port: '5184',
            hostname: 'localhost',
        }), false)
    })
})
