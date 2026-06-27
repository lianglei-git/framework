# Packages/Login Architecture

独立 SSO 身份平台：一次注册，多项目（A/B/C/D）共用账号。

## 组成

| 部分 | 路径 | 职责 |
|------|------|------|
| 后端 IdP | `unit-auth/` | OAuth 2.1 / OIDC、JWT、插件化登录（邮箱/手机/GitHub/Google/微信） |
| 登录页 | `web/` | 固定 Login 页面 + React SDK |
| 子项目 SDK | `web/packages/auth-sdk` | 供外部项目 headless 集成 |

## 目录结构（web）

```
web/src/
├── core/       # HTTP 客户端、authApi、userApi、storage、token 刷新
├── sso/        # OAuth 流程、PKCE、callback、session/token 管理
├── ui/         # LoginPage 与认证相关组件
├── hooks/      # useAuth、useTokenRefresh、useSSO
├── types/      # TypeScript 类型
├── stores/     # MobX UserStore（唯一状态源）
└── config/     # SSO 与环境配置
```

## 认证流程

1. 子项目通过 `useSSO` / `useSubProjectSSO` 重定向到 Login 页（端口 3033）
2. 用户在 Login 页完成本地或第三方登录
3. `unit-auth`（端口 8080）签发 access + refresh token
4. 回调子项目 `redirect_uri`，子项目保存 token 并调用业务 API

## 双 Token

- Access Token：短期，附在 `Authorization: Bearer`
- Refresh Token：长期，用于静默续签
- 前端 `useTokenRefresh` + `tokenRefreshService` 负责监控与刷新

## 对外 Hooks

- `useAuth()` — 登录态（读写 `globalUserStore`）
- `useTokenRefresh()` — 双 Token 续签
- `useSSO()` — SSO / 子项目 / URL 回调（合并原 useSSOUrlHandler、useSubProjectSSO）

## 子项目集成

```typescript
import { useSSO } from '@sparrow/login/core'

const { isAuthenticated, user, login, logout } = useSSO({
  subProjectId: 'your-project-id',
})
```

## 启动

```bash
# 后端
cd Packages/Login/unit-auth && ./start.sh

# 前端
cd Packages/Login/web && pnpm start
```

## API 契约

见 `unit-auth/docs/API.md`。
