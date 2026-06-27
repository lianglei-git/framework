#!/usr/bin/env node
/**
 * Integration smoke test for unit-auth + login web config
 * Usage: BASE_URL=http://localhost:8080 node scripts/integration-smoke.mjs
 */
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080'

async function get(path) {
    const res = await fetch(`${BASE_URL}${path}`)
    if (!res.ok) throw new Error(`${path} => ${res.status}`)
    return res.json().catch(() => res.text())
}

async function main() {
    console.log('==> health')
    await get('/health')

    console.log('==> auth providers')
    await get('/api/v1/auth/providers')

    console.log('==> sso providers')
    await get('/api/v1/sso/providers')

    console.log('==> openid-configuration')
    await get('/api/v1/openid-configuration')

    console.log('Integration smoke passed.')
}

main().catch((err) => {
    console.error('Integration smoke failed:', err.message)
    process.exit(1)
})
