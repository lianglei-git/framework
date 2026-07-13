# unitauthsdk_demo

最少代码证明 `unitauthsdk`：`MountBFF` + 一条 `NewMiddleware` 受保护路由。

## 端口

| 层 | 端口 |
|---|---|
| Frontend | 5179 |
| BFF | 5560 |
| unit-auth | 8080 |
| Login Web | 3033 |

## BFF 核心

```go
auth := unitauthsdk.New(...)
unitauthsdk.MountBFF(r, auth, unitauthsdk.MountBFFConfig{AppID: cfg.AppID})
r.GET("/api/v1/demo/whoami", mw, handler) // mw = NewMiddleware(standalone)
```

`MountBFF` 已包含 oauth / openid-configuration / sso/providers，子项目不必手写。

## 启动

```bash
# IdP + Login（若未起）
cd Packages/Login/unit-auth && ./start.sh
cd Packages/Login/web && pnpm start

# BFF
cd Js/project/unitauthsdk_demo/server && GOWORK=off go run .

# Frontend
cd Js/project/unitauthsdk_demo
pnpm install --ignore-workspace && pnpm dev
```

打开 http://localhost:5179 → SSO 登录 → `GET /demo/whoami`。
