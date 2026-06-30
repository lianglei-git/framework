#!/usr/bin/env node
/**
 * Admin API 冒烟测试脚本
 * 用法: node scripts/smoke-admin.mjs [username] [password]
 * 默认账号: ADMIN_USER / ADMIN_PASS 环境变量，或 Sparrow@Admin2026
 */

const BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:8080'
const USERNAME = process.argv[2] || process.env.ADMIN_USER || process.env.ADMIN_USERNAME || 'zayne'
const PASSWORD = process.argv[3] || process.env.ADMIN_PASS || process.env.ADMIN_INITIAL_PASSWORD || 'Sparrow@Admin2026'

let accessToken = ''

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  return { status: res.status, data }
}

function pass(msg) { console.log(`  ✅ ${msg}`) }
function fail(msg) { console.error(`  ❌ ${msg}`); process.exitCode = 1 }
function section(title) { console.log(`\n📋 ${title}`) }

async function main() {
  console.log(`\n🔥 Admin API 冒烟测试`)
  console.log(`   Base URL: ${BASE_URL}`)
  console.log(`   Account:  ${USERNAME}`)

  // ---- 1. Login ----
  section('1. 管理员登录')
  const loginRes = await request('POST', '/api/v1/auth/oauth-login', {
    provider: 'local',
    username: USERNAME,
    password: PASSWORD,
  })
  if (loginRes.status === 200 && loginRes.data.access_token) {
    accessToken = loginRes.data.access_token
    const role = loginRes.data.user?.role
    pass(`登录成功，用户角色: ${role}`)
    if (role !== 'admin') {
      fail(`用户角色不是 admin，后续 admin 接口可能返回 403`)
    }
  } else {
    fail(`登录失败: ${loginRes.status} - ${JSON.stringify(loginRes.data)}`)
    return
  }

  // ---- 2. User Stats ----
  section('2. 用户统计')
  const statsRes = await request('GET', '/api/v1/admin/stats/users')
  if (statsRes.status === 200 && statsRes.data.code === 200) {
    const d = statsRes.data.data
    pass(`总用户: ${d.total_users}, 活跃: ${d.active_users}, 今日新增: ${d.new_users_today}`)
  } else {
    fail(`获取统计失败: ${JSON.stringify(statsRes.data)}`)
  }

  // ---- 3. User List ----
  section('3. 用户列表')
  const usersRes = await request('GET', '/api/v1/admin/users?page=1&page_size=5')
  if (usersRes.status === 200 && usersRes.data.code === 200) {
    const { users, pagination } = usersRes.data.data
    pass(`用户列表: ${users?.length || 0} 条 / 共 ${pagination?.total || 0} 条`)
  } else {
    fail(`获取用户列表失败: ${JSON.stringify(usersRes.data)}`)
  }

  // ---- 4. Login Logs ----
  section('4. 登录日志')
  const logsRes = await request('GET', '/api/v1/admin/stats/login-logs?page=1&page_size=5')
  if (logsRes.status === 200 && logsRes.data.code === 200) {
    const { logs, pagination } = logsRes.data.data
    pass(`日志列表: ${logs?.length || 0} 条 / 共 ${pagination?.total || 0} 条`)
  } else {
    fail(`获取登录日志失败: ${JSON.stringify(logsRes.data)}`)
  }

  // ---- 5. SSO Clients ----
  section('5. SSO 客户端列表')
  const ssoRes = await request('GET', '/api/v1/admin/sso-clients')
  if (ssoRes.status === 200 && ssoRes.data.code === 200) {
    const clients = ssoRes.data.data || []
    pass(`SSO 客户端数量: ${clients.length}`)
  } else {
    fail(`获取 SSO 客户端失败: ${JSON.stringify(ssoRes.data)}`)
  }

  // ---- 6. Create SSO Client ----
  section('6. 创建 SSO 客户端（测试）')
  const createRes = await request('POST', '/api/v1/admin/sso-clients', {
    name: 'smoke-test-client',
    description: '冒烟测试临时客户端',
    redirect_uris: ['http://localhost:9999/callback'],
    grant_types: ['authorization_code'],
    response_types: ['code'],
    scope: ['openid', 'profile'],
    auto_approve: false,
  })
  let createdId = null
  if ((createRes.status === 200 || createRes.status === 201) &&
      (createRes.data.code === 200 || createRes.data.code === 201)) {
    createdId = createRes.data.data?.id
    pass(`创建成功，ID: ${createdId}，Secret: ${createRes.data.data?.secret ? '已返回' : '未返回'}`)
  } else {
    fail(`创建失败: ${JSON.stringify(createRes.data)}`)
  }

  // ---- 7. Delete SSO Client ----
  if (createdId) {
    section('7. 删除测试 SSO 客户端')
    const delRes = await request('DELETE', `/api/v1/admin/sso-clients/${createdId}`)
    if (delRes.status === 200 && delRes.data.code === 200) {
      pass(`测试客户端已删除`)
    } else {
      fail(`删除失败: ${JSON.stringify(delRes.data)}`)
    }
  }

  console.log('\n🎉 冒烟测试完成\n')
}

main().catch((err) => {
  console.error('❌ 测试异常:', err.message)
  process.exitCode = 1
})
