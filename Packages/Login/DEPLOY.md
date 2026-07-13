# Sparrow Login 公网部署指南（Nginx）

本文说明如何将 `Packages/Login` 三端部署到公网：**unit-auth**、**登录中心**、**管理后台**。适用于 `./scripts/build-release.sh` 打出的 release 包。

---

## 一、打包

### 1. 准备配置

```bash
cd Packages/Login
cp release.env.example release.env
```

编辑 `release.env`（**全部使用 HTTPS 公网地址，无尾部斜杠**）：

```bash
SSO_PUBLIC_URL=https://sso.yourdomain.com
LOGIN_PUBLIC_URL=https://login.yourdomain.com
ADMIN_PUBLIC_URL=https://admin.yourdomain.com
```

> 登录中心前端**不需要**配置 `client_id` / `client_secret`；OAuth 客户端仅在管理后台数据库中登记，子应用回跳时通过 URL 传入 `client_id`。

### 2. 执行打包

```bash
chmod +x scripts/build-release.sh
./scripts/build-release.sh --config release.env --version 1.0.0
```

输出：

```
release/login-release-1.0.0/          # 解压即用目录
release/login-release-1.0.0.tar.gz    # 可选压缩包
```

| 子目录 | 内容 |
|--------|------|
| `unit-auth/` | `unit-auth` 二进制、`.env.production.example` |
| `login-web/` | 登录中心静态文件 |
| `admin-web/` | 管理后台静态文件 |
| `config/nginx/` | 三份 Nginx 示例 |
| `config/systemd/` | unit-auth systemd 示例 |
| `docs/DEPLOY.md` | 本文档副本 |

> **注意**：Vite 环境变量在 **构建时** 写入 JS。修改域名后必须重新执行 `build-release.sh`。

---

## 二、服务器准备

### 依赖

- Linux x86_64（与打包时 `GOOS=linux GOARCH=amd64` 一致）
- **MySQL 8+**、**Redis**
- **Nginx** + **Let's Encrypt**（或自有证书）
- DNS 三条 A/AAAA 记录指向同一台或不同机器：
  - `sso.yourdomain.com`
  - `login.yourdomain.com`
  - `admin.yourdomain.com`

### 上传 release 包

```bash
scp release/login-release-1.0.0.tar.gz user@server:/opt/
ssh user@server
cd /opt && tar -xzf login-release-1.0.0.tar.gz
mv login-release-1.0.0 sparrow-login
```

建议目录：

```
/opt/sparrow-login/
  unit-auth/unit-auth          # 二进制
  unit-auth/.env               # 从 .env.production.example 复制后修改
  login-web/                   # Nginx root
  admin-web/                   # Nginx root
```

---

## 三、首次初始化（顺序很重要）

### 步骤 1：配置并启动 unit-auth

```bash
cd /opt/sparrow-login/unit-auth
cp .env.production.example .env
# 编辑 .env：DB_*、JWT_SECRET、Redis、SMTP 等
```

`.env` 中以下项必须与 `release.env` 一致：

```bash
LOGIN_WEB_URL=https://login.yourdomain.com
WEB_CENTER_URL=https://login.yourdomain.com
SSO_SERVER_URL=https://sso.yourdomain.com
OAUTH_ISSUER=https://sso.yourdomain.com
GIN_MODE=release
RATE_LIMIT_SKIP_LOCALHOST=false
```

数据库迁移（如有脚本）：

```bash
chmod +x run_migration.sh
./run_migration.sh
```

使用 systemd（示例见 `config/systemd/unit-auth.service.example`）或前台测试：

```bash
./unit-auth    # 监听 :8080
```

验证：

```bash
curl -s https://sso.yourdomain.com/health
```

### 步骤 2：创建管理员账号

若数据库尚无 `role = admin` 的用户：

1. 先通过 API 注册普通用户，或执行种子逻辑（见 `unit-auth/env.example` 中 `ADMIN_*`）
2. 在 MySQL 中提升权限：

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

### 步骤 3：部署管理后台静态站 + 登录

Nginx 配置见 `config/nginx/admin-web.conf.example`，将 `YOUR_DOMAIN` 替换为真实域名，`root` 指向 `/opt/sparrow-login/admin-web`。

访问 `https://admin.yourdomain.com`，使用管理员账号登录。

### 步骤 4：在管理后台注册 SSO 客户端

进入 **「SSO 客户端」** 菜单，至少创建 **两条** 记录：

#### A. 登录中心客户端（必须）

| 字段 | 值 |
|------|-----|
| app_id | `login_center`（自定，需唯一） |
| client_id | 自行定义（子应用回跳 URL 会携带） |
| client_secret | 若子应用有 BFF 可填写；**不要**写入登录中心前端 |
| redirect_uris | `https://login.yourdomain.com`（**完全一致**） |
| scopes | `openid profile email` |
| is_active | 是 |

> 登录中心账号密码登录走 `/api/v1/auth/oauth-login`，不依赖前端 env 中的 `client_id`。此处登记主要用于子应用 SSO 回跳与 OAuth authorize 校验。

#### B. 外部子项目客户端（业务接入时）

每接入一个外部系统，在管理后台新建一条客户端，例如：

| 字段 | 示例 |
|------|------|
| app_id | `my_product_web` |
| redirect_uris | `https://app.yourdomain.com` |
| client_secret | 仅交给该子项目 **BFF 后端** |

> **未在管理后台注册的 client_id，authorize 将失败。** 这是接入 SSO 的强制门槛。

管理后台本身的 OAuth 客户端（若需要独立 client）也可在此创建，`redirect_uri` = `https://admin.yourdomain.com`。

### 步骤 5：部署登录中心静态站

Nginx 见 `config/nginx/login-web.conf.example`，`root` → `/opt/sparrow-login/login-web`。

访问 `https://login.yourdomain.com`，测试邮箱/手机登录与账户中心 `/account`。

---

## 四、Nginx 配置摘要

三台 `server` 块（或三台机器各一份）：

| 文件 | server_name | 类型 |
|------|-------------|------|
| `sso-api.conf.example` | `sso.*` | 反代 `127.0.0.1:8080` |
| `login-web.conf.example` | `login.*` | 静态 + `try_files` SPA |
| `admin-web.conf.example` | `admin.*` | 静态 + `try_files` SPA |

启用：

```bash
sudo cp config/nginx/*.example /etc/nginx/sites-available/
# 编辑域名与证书路径
sudo ln -sf /etc/nginx/sites-available/sso-api.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/login-web.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/admin-web.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

证书（Let's Encrypt 示例）：

```bash
sudo certbot --nginx -d sso.yourdomain.com -d login.yourdomain.com -d admin.yourdomain.com
```

---

## 五、配置对照表

部署完成后，以下 URL **必须一致**：

| 配置位置 | 键 | 应等于 |
|----------|-----|--------|
| `unit-auth/.env` | `LOGIN_WEB_URL` | `https://login.yourdomain.com` |
| `unit-auth/.env` | `WEB_CENTER_URL` | 同上 |
| `unit-auth/.env` | `OAUTH_ISSUER` | `https://sso.yourdomain.com` |
| 管理后台 SSO 客户端 | `redirect_uris` | 各前端公网 origin |
| 打包 `release.env` | `LOGIN_PUBLIC_URL` | 登录中心 URL |
| 打包 `release.env` | `SSO_PUBLIC_URL` | IdP URL |
| 登录中心 `BUILD_ENV.txt` | `VITE_SSO_REDIRECT_URI` | 与 IdP 登记一致 |

---

## 六、外部子项目如何接入（概念说明）

本 release 包 **不包含** 示例子项目。外部系统接入流程：

1. 在 **管理后台** 注册 SSO 客户端（`app_id`、`client_id`、`redirect_uri`）
2. 外部系统部署自己的 **BFF**，保存 `client_secret`，代理 `/oauth/token` 等
3. 外部前端使用 `@zayne/login` SDK 或自建 OAuth，**只配置 `client_id`**，`ssoServerUrl` 指向 BFF
4. 未登录时 IdP 将用户重定向到 `LOGIN_WEB_URL`（登录中心）

详细字段说明见仓库内 `子项目SSO接入指南.md`（不涉及本仓库 `Js/project` demo）。

---

## 七、Token 时效配置

在 `unit-auth/.env` 中统一配置（修改后重启服务）：

| 变量 | 默认 | 说明 |
|------|------|------|
| `ACCESS_TOKEN_EXPIRATION_MINUTES` | `15` | **Access Token 唯一入口**（JWT `exp` = API `expires_in`） |
| `JWT_REFRESH_EXPIRATION_HOURS` | `720` | Refresh Token（30 天） |
| `JWT_REMEMBER_ME_EXPIRATION_HOURS` | `720` | 记住我 |
| `SSO_SESSION_EXPIRATION_DAYS` | `365` | IdP session 记录 |
| `AUTH_CODE_EXPIRATION_MINUTES` | `10` | OAuth 授权码 |
| `SSO_MAX_INACTIVE_DAYS` | `90` | 不活跃 session 清理 |

旧变量 `JWT_EXPIRATION`（小时）仅作兼容：未设置 `ACCESS_TOKEN_EXPIRATION_MINUTES` 时自动换算。

---

## 八、运维检查清单

- [ ] 三域名均 HTTPS
- [ ] `unit-auth` 健康检查通过
- [ ] 管理后台可登录且角色为 `admin`
- [ ] 登录中心客户端已在后台注册且 `redirect_uri` 匹配
- [ ] 登录、登出、账户中心 `/account` 正常
- [ ] 修改公网 URL 后已重新执行 `build-release.sh`
- [ ] 生产 `JWT_SECRET`、数据库密码已更换默认值
- [ ] `RATE_LIMIT_SKIP_LOCALHOST=false`

---

## 九、常见问题

**Q: 登录后 authorize 报 redirect_uri 不匹配？**  
A: 管理后台里该客户端的 `redirect_uris` 必须与前端构建时的 `VITE_SSO_REDIRECT_URI` 字符级一致。

**Q: 改了 `.env` 前端不生效？**  
A: 前端变量在构建时打入，需重新打包，不能只改服务器上的 `.env`。

**Q: 子项目报 client 不存在？**  
A: 必须在管理后台「SSO 客户端」中创建并启用该 `client_id`。

**Q: 跨子域 cookie 不共享？**  
A: 生产建议使用同一 registrable domain（如 `*.yourdomain.com`），并确保各服务 URL 策略一致；IP 混用会导致 session 无法共享。

---

## 十、脚本参考

```bash
# 仅重打前端（后端已存在）
./scripts/build-release.sh --config release.env --skip-backend

# 仅编译后端
./scripts/build-release.sh --config release.env --skip-frontend

# 不生成 tar.gz
./scripts/build-release.sh --config release.env --no-archive
```
