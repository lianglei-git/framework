# Packages/Login 测试执行报告

执行时间：2026-06-28  
范围：unit-auth (:8080)、login-web (:3033)、admin-web (:3040)，**不含子项目接入**

## 自动化结果

| 套件 | 结果 |
|------|------|
| `unit-auth/scripts/smoke-test.sh` | PASS |
| `go test ./utils/ -run TestValidateEnhancedToken` | PASS |
| `web` → `pnpm test:integration` | PASS |
| `admin-web/scripts/smoke-admin.mjs` (zayne/zayne) | PASS |
| `scripts/run-backend-api-tests.sh` (B 段) | PASS (20/20) |
| `scripts/run-cross-module-tests.sh` (X 段) | PASS (6/6, X-05 暂缓) |

一键执行：`bash Packages/Login/scripts/run-all-tests.sh`

## 浏览器手工验证

### admin-web (:3040)

| 编号 | 结果 | 说明 |
|------|------|------|
| A-01 | PASS | 未登录访问 `/dashboard` → `/login` |
| A-02 | PASS | zayne/zayne 登录 → 仪表盘 |
| A-10~A-13 | PASS | 仪表盘加载、刷新按钮 |
| A-20 | PASS | 用户列表 3 条 |
| A-30 | PASS | 登录日志 39+ 条 |
| A-40 | PASS | SSO 客户端页可访问 |
| A-50 | PASS | 侧边栏四项导航 |

### login-web (:3033)

| 编号 | 结果 | 说明 |
|------|------|------|
| W-01 | PASS | 登录页正常 |
| W-10 | PASS | zayne@qq.com + zayne 登录成功 |
| W-12 | PASS | 纯用户名 `zayne` 被前端拦截（已知限制） |
| W-15 | PASS | 刷新后保持已登录 |
| W-50 | PASS | GitHub/Google/WeChat 按钮可见 |
| W-61 | PASS | `?logout=true` 清空登录态 |
| W-62 | PASS | 登出落地后重新登录，刷新仍保持登录 |

## 测试中发现并修复的问题

1. **`GET /api/v1/stats/daily` 500**：`user_stats.date` 时区导致重复插入 → 已修复 [`services/stats.go`](unit-auth/services/stats.go)
2. **`smoke-admin.mjs` 默认账号**：已改为 `zayne/zayne` 与种子用户一致

## 子项目接入 (a_sso / b_sso)

| 编号 | 结果 | 说明 |
|------|------|------|
| X-05 | PASS | authorize → token → userinfo → refresh（A + B BFF） |
| W-90 | PASS | a_sso 5173 → 3033 登录页 → 回跳（浏览器/自动化） |
| W-91 | PASS | b_sso 5174 独立 client_id，redirect 5174 |
| W-92 | PASS | A 登录后 B 经 session-check / silent authorize 免登（自动化） |
| W-93 | PASS | 子应用登出跳转 3033 |

一键子项目栈：`bash Packages/Login/scripts/start-subproject-dev.sh`  
OIDC 自动化：`bash Packages/Login/scripts/run-subproject-oidc-test.sh`  
W-92 跨应用免登：`bash Packages/Login/scripts/run-w92-cross-app-sso-test.sh`

## 暂缓（按计划不验收）
- B-42、W-52~W-54：第三方 OAuth 需真实 IdP 配置

## 已知遗留（未阻塞本次验收）

- 3033 前端不支持纯用户名登录（需邮箱/手机号）
- `regenerate-secret` 可能不返回新 secret
- 注册密码 6 位 vs `validatePassword` 8 位规则不一致
