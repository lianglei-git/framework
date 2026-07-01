# Packages/Login — Sparrow 中心化登录套件

本目录是 **Sparrow SSO 登录体系** 的完整实现，包含 IdP 后端、登录中心、管理后台三端。**不包含** `Js/project/*` 等示例子项目。

## 组件一览

| 目录 | 角色 | 典型公网域名 | 说明 |
|------|------|--------------|------|
| `unit-auth/` | **IdP 认证服务** | `https://sso.example.com` | OAuth2/OIDC、会话、用户 API；Go + MySQL + Redis |
| `web/` | **登录中心** | `https://login.example.com` | 用户登录、账户中心；React 静态站 |
| `admin-web/` | **管理后台** | `https://admin.example.com` | 用户管理、**SSO 客户端注册**、统计；React 静态站 |

## 架构关系

```
                    ┌─────────────────┐
                    │  管理后台        │  管理员在此注册 SSO 客户端
                    │  admin.example  │  （子项目接入的前置条件）
                    └────────┬────────┘
                             │ HTTPS API
                             ▼
┌──────────────┐      ┌─────────────────┐      ┌──────────────┐
│ 登录中心      │─────▶│  unit-auth IdP   │◀─────│ 外部子项目    │
│ login.example│      │  sso.example     │      │ (自备 BFF)   │
└──────────────┘      └────────┬────────┘      └──────────────┘
                               │
                               ▼
                          MySQL + Redis
```

**重要原则**

1. **外部业务系统（子项目）接入 SSO 前，必须先在管理后台注册 SSO 客户端**（`client_id`、`redirect_uri`、`app_id` 等）。未注册的 `client_id` 无法完成 authorize。
2. **登录中心本身**也需要在 IdP 中有一条客户端记录，`redirect_uri` 等于登录中心公网地址。
3. 子项目的 `client_secret` **只能放在子项目自己的 BFF**，不要写进登录中心或管理后台前端。
4. 全局单会话：同一账号在新设备登录会撤销其他 IdP session，旧端收到 `SESSION_REVOKED` 并强制退出。

## 生产打包

```bash
cd Packages/Login

# 1. 复制并编辑生产域名
cp release.env.example release.env

# 2. 执行打包（输出到 release/login-release-<版本>/）
chmod +x scripts/build-release.sh
./scripts/build-release.sh --config release.env --version 1.0.0
```

产物包含：`unit-auth` 二进制、两个前端静态目录、Nginx/systemd 示例、**DEPLOY.md**。

详细部署步骤见 **[DEPLOY.md](./DEPLOY.md)**。

## 开发启动（本地）

```bash
# 后端
cd unit-auth && go run .

# 登录中心
cd web && pnpm start          # :3033

# 管理后台
cd admin-web && pnpm dev      # :3040
```

## 相关文档

| 文档 | 内容 |
|------|------|
| [DEPLOY.md](./DEPLOY.md) | **公网 + Nginx 部署指南** |
| [web/README.md](./web/README.md) | 登录中心 SDK 与 env |
| [admin-web/README.md](./admin-web/README.md) | 管理后台 API |
| [unit-auth/README.md](./unit-auth/README.md) | IdP API、Docker |
| [子项目SSO接入指南.md](./子项目SSO接入指南.md) | 外部子项目如何对接（不含本仓库 demo 项目） |
