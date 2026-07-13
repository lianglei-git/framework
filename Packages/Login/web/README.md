# @zayne/login

Sparrow SSO 登录页与 SDK（`Packages/Login/web`）。

## 生产登录链路

```
app.tsx → LoginPage → useAuth → SSOService.getInstance() → core/httpClient
                                              ↓
                                   oauthRefreshOn401 (401 自动刷新)
```

开发启动：

```bash
pnpm start   # http://localhost:3033
pnpm build   # 输出 auth_dist/
```

环境变量（`.env`）：

- `VITE_SSO_SERVER_URL` — unit-auth / BFF 地址
- `VITE_SSO_REDIRECT_URI` — OAuth 回调地址

## 子项目集成

最小示例（见 `Js/project/sso_test_d`）：

```ts
import { createAuthConfig } from '@zayne/login/core'
import { useSubProjectSSO } from '@zayne/login/hooks'

createAuthConfig({
  id: 'my_app',
  clientId: '...',
  ssoServerUrl: 'http://localhost:5555',
  redirectUri: 'http://localhost:5176',
})

const sso = useSubProjectSSO({ customConfig: appConfig })
```

常用子路径导出：

| 路径 | 用途 |
|------|------|
| `@zayne/login/core` | `createAuthConfig`, `authApi`, `httpClient` |
| `@zayne/login/sso` | `SSOService`, token/session 管理 |
| `@zayne/login/hooks` | `useAuth`, `useSubProjectSSO` |
| `@zayne/login/utils` | `storage`, `oauthRefreshOn401`, session cookie |

## 已移除（Breaking）

以下 Demo / Legacy API 已在重构中删除，请勿再引用：

- Demo 壳：`App.tsx`, `AuthFlowRouter`, `SystemAuthUI`, `TestTokenRefresh`, `TokenStatus`
- 组件：`LoginForm`, `ThirdPartyLogin`（第三方登录由 `AuthLogin` 内 provider 列表处理）
- Hooks：`useTokenRefresh*`, `useSSOUrlHandler`, `useExternalSSOIntegration`, `useOpenIDConnect`
- 服务：`tokenRefreshService`, `axiosInterceptor`, `SSOConfigManager`, `_ssoServer`
- 包：`packages/auth-sdk`（请使用 `@zayne/login/sso`）

## 测试

```bash
node scripts/integration-smoke.mjs   # 需 unit-auth 在跑
pnpm build
```
