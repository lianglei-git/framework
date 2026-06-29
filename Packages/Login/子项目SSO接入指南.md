# 子项目 SSO 接入指南

新增一个走中心化登录的子项目，需要配置 **4 层**：IdP 客户端、BFF 后端、前端 SDK、本地端口。推荐以 `Js/project/c_sso` 为模板复制改造。

## 架构一览

```
子项目前端 (:517x)
    │  createAuthConfig + useSubProjectSSO
    ▼
子项目 BFF (:555x)          ← client_secret 只放这里
    │  /api/v1/auth/oauth/*
    ▼
unit-auth IdP (:8080)       ← 登录、authorize、session
    │
    ▼
登录中心 (:3033)            ← 用户输入账号密码
```

**原则**

- 前端只配 `client_id`，**不要**在前端写 `client_secret`。
- 换 token、refresh 必须走 **BFF**，不要直连 `8080`（discovery 里的地址会被 SDK 自动忽略）。
- `redirect_uri` 必须与 IdP 里登记的完全一致（含端口）。

---

## 配置清单（新建子项目时逐项打勾）

| # | 配置项 | 放哪里 | 示例 |
|---|--------|--------|------|
| 1 | `app_id` | IdP + 前端 `id` | `sso_test_d` |
| 2 | `client_id` | IdP + BFF + 前端 | UUID |
| 3 | `client_secret` | **仅 BFF** `config.json` | `client_secret_...` |
| 4 | `redirect_uri` | IdP + BFF + 前端 | `http://localhost:5176` |
| 5 | BFF 端口 | BFF `config.json` | `5558` |
| 6 | 前端 dev 端口 | `vite.config.ts` | `5176` |
| 7 | `ssoServerUrl` | 前端 → BFF 地址 | `http://localhost:5558` |
| 8 | `ssoHomeUrl` | 前端 → 登录中心 | `http://localhost:3033` |

### 本地端口约定（避免冲突）

| 子项目 | 前端 | BFF | 说明 |
|--------|------|-----|------|
| a_sso | 5173 | 5555 | 共用 `unit-auth/examples/bff` |
| b_sso | 5174 | 5556 | 同上 |
| c_sso | 5175 | 5557 | 独立 `c_sso/server`（推荐模板） |
| **新项目** | 5176+ | 5558+ | 自行递增 |

---

## 步骤 1：在 unit-auth 注册 SSO 客户端

在管理后台或数据库中创建客户端，至少包含：

- `app_id`：业务应用标识
- `client_id` / `client_secret`
- `redirect_uris`：子项目前端地址，如 `http://localhost:5176`
- `is_active`: true
- `scopes`：`openid profile email`（按需）

本地联调可执行（并仿照添加新 client）：

```bash
Packages/Login/scripts/ensure-sso-clients.sh
```

---

## 步骤 2：子项目 BFF 后端

**推荐**：复制 `Js/project/c_sso/server/`，改 `config.json`：

```json
{
  "port": "5558",
  "unit_auth_url": "http://localhost:8080",
  "client_id": "<你的 client_id>",
  "client_secret": "<你的 client_secret>",
  "redirect_uri": "http://localhost:5176",
  "app_id": "sso_test_d"
}
```

启动：

```bash
cd Js/project/d_sso/server && go run .
# 或 package.json: "server": "cd server && go run ."
```

BFF 需提供（`c_sso/server` 已包含）：

| 路由 | 作用 |
|------|------|
| `GET /health` | 健康检查 |
| `GET /api/v1/auth/oauth/:provider/url` | 生成 authorize URL |
| `POST /api/v1/auth/oauth/token` | code 换 token（注入 secret） |
| `POST /api/v1/auth/oauth/refresh` | 刷新 token |
| `GET /api/v1/auth/oauth/userinfo` | 用户信息 |
| `POST /api/v1/auth/oauth/session-check` | 跨应用免登 |
| `GET /api/v1/openid-configuration` | 代理到 8080（可选） |
| `GET /api/v1/sso/providers` | 代理到 8080（可选） |

---

## 步骤 3：子项目前端

### 3.1 依赖与别名

`vite.config.ts` 中指向 Login SDK：

```ts
resolve: {
  alias: {
    '@sparrow/login': path.resolve(__dirname, '../../../Packages/Login/web/src'),
  },
},
server: { port: 5176, strictPort: true },
```

### 3.2 SSO 配置 `src/sso.ts`

在应用入口**最早**引入（见 `main.tsx`：`import './sso'`）：

```ts
import { createAuthConfig } from '@sparrow/login/core'

export const appConfig = {
  id: 'sso_test_d',                              // app_id
  ssoServerUrl: 'http://localhost:5558',         // BFF，不是 8080
  ssoHomeUrl: 'http://localhost:3033',             // 登录中心
  clientId: '<client_id>',
  redirectUri: 'http://localhost:5176',
  redirectUris: ['http://localhost:5176'],
  allowedScopes: ['openid', 'profile', 'email'],
  // 子项目务必显式指定 OAuth 端点（相对 BFF 路径）
  tokenEndpoint: '/api/v1/auth/oauth/token',
  authorizationUrl: '/api/v1/auth/oauth/authorize',
  tokenUrl: '/api/v1/auth/oauth/token',
  userInfoUrl: '/api/v1/auth/oauth/userinfo',
  logoutUrl: '/api/v1/auth/oauth/logout',
}

createAuthConfig({ ...appConfig, autoRefresh: false })
```

也可用环境变量：`VITE_SSO_SERVER_URL`、`VITE_SSO_CLIENT_ID`、`VITE_SSO_REDIRECT_URI`、`VITE_SSO_HOME_URL`。

### 3.3 页面中使用

```tsx
import { useSubProjectSSO } from '@sparrow/login/hooks'
import { appConfig } from './sso'

const { isAuthenticated, user, login, logout, isLoading, error } =
  useSubProjectSSO({ customConfig: appConfig })

// 登录：login({ redirect: true })
// 登出：logout()
```

---

## 步骤 4：启动与验证

```bash
# 1. IdP
cd Packages/Login/unit-auth && go run .

# 2. 登录中心
cd Packages/Login/web && pnpm start    # :3033

# 3. 子项目 BFF
cd Js/project/<your_project>/server && go run .

# 4. 子项目前端
cd Js/project/<your_project> && pnpm dev
```

或一键（含 a/b/c 示例）：

```bash
Packages/Login/scripts/start-subproject-dev.sh
```

**验收流程**

1. 打开子项目前端 → 点「SSO 登录」
2. 跳转到 `3033` 登录页（不应死循环）
3. 登录后经 `8080/oauth/authorize` 回到子项目 `?code=...`
4. 控制台应出现：`POST http://localhost:555x/api/v1/auth/oauth/token` 成功
5. 页面显示已登录用户信息

---

## 常见问题

| 现象 | 原因 | 处理 |
|------|------|------|
| `oauth-login` 404 | 误用登录中心接口换 token | 前端 `tokenEndpoint` 设为 `/api/v1/auth/oauth/token` |
| `8080/oauth/token` 404 | discovery 覆盖了 BFF 地址 | 子项目 `ssoServerUrl` 指向 BFF；SDK 已忽略非同源 discovery |
| 3033 ↔ 8080 死循环 | 未登录就跳 authorize | 确保登录成功后再回跳（`afterLogin: true`） |
| `invalid_grant` / code 失效 | PKCE verifier 被清掉或 code 用过 | 清空 localStorage，重新点登录 |
| redirect_uri 不匹配 | 三处不一致 | 核对 IdP、BFF、前端 `redirectUri` |

---

## 最小文件结构（参考 c_sso）

```
Js/project/my_sso/
├── src/
│   ├── main.tsx          # import './sso'
│   ├── sso.ts            # createAuthConfig
│   └── App.tsx           # useSubProjectSSO
├── server/
│   ├── main.go           # Gin BFF（可复制 c_sso/server）
│   ├── config.json
│   └── go.mod            # replace unit-auth => ../../../../Packages/Login/unit-auth
├── vite.config.ts
└── package.json
```

---

## 相关路径

- SDK 源码：`Packages/Login/web/src`
- Go SDK（BFF 用）：`Packages/Login/unit-auth/sdk`
- 示例子项目：`Js/project/c_sso`（最简）、`a_sso` / `b_sso`
- 联调脚本：`Packages/Login/scripts/start-subproject-dev.sh`
- API 说明：`Packages/Login/unit-auth/docs/API.md`
