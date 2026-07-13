# My SSO App

由 admin-web 子项目脚手架生成。BFF 核心：

```go
auth := unitauthsdk.New(...)
unitauthsdk.MountBFF(r, auth, unitauthsdk.MountBFFConfig{AppID: cfg.AppID})
r.GET("/api/v1/demo/whoami", mw, ...)
```

`MountBFF` 已包含 oauth / openid-configuration / sso/providers。

## 启动

```bash
# BFF
cd server && GOWORK=off go run .

# 前端（若在 monorepo 根有 pnpm workspace，用 --ignore-workspace）
pnpm install --ignore-workspace && pnpm dev
```

- 前端: http://localhost:5176
- BFF: http://localhost:5558
- 登录中心: http://localhost:3033

参考样板：`Js/project/unitauthsdk_demo/`  
详见 Packages/Login/子项目SSO接入指南.md
