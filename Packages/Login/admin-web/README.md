# 账户管理后台（Admin Console）

基于 React 18 + Vite + TypeScript + Ant Design 构建的独立账户后台管理系统，对接 `unit-auth`（:8080）的 `/api/v1/admin/*` API。

## 功能模块

- **仪表盘**：用户统计卡片 + 趋势图
- **用户管理**：列表/搜索/筛选/分页、查看详情、编辑（抽屉）、删除、批量操作
- **登录日志**：分页查看、时间范围筛选、成功/失败筛选
- **SSO 客户端**：完整 CRUD + 重置密钥（密钥仅在创建时一次性展示）

## 启动方式

### 1. 先启动后端（unit-auth）

```bash
cd Packages/Login/unit-auth
go run .
# 默认监听 :8080
```

### 2. 安装依赖并启动管理后台

```bash
cd Packages/Login/admin-web

# 复制环境变量
cp .env.example .env

# 安装依赖
pnpm install

# 开发模式（端口 3040）
pnpm dev
```

然后访问 http://localhost:3040

### 3. 生产构建

```bash
pnpm build
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_API_BASE_URL` | `http://localhost:8080` | unit-auth 后端地址 |
| `VITE_APP_TITLE` | `账户管理后台` | 页面标题 |
| `VITE_LOGIN_REDIRECT_URI` | `http://localhost:3040` | 登录回调 |

## 测试账号

需要数据库中存在 `role = 'admin'` 的用户。若无，可注册后手动修改：

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

## API 依赖

- 登录：`POST /api/v1/auth/oauth-login`（provider=local）
- 用户管理：`GET|PUT|DELETE /api/v1/admin/users/*`
- 统计：`GET /api/v1/admin/stats/users`
- 登录日志：`GET /api/v1/admin/stats/login-logs`
- SSO 客户端：`GET|POST|PUT|DELETE /api/v1/admin/sso-clients/*`

## 权限说明

- 仅 `role === 'admin'` 账号可登录后台
- 其他角色登录后会被重定向到"无权限"页
- 所有 admin API 请求自动携带 JWT Bearer Token
- Token 失效（401）自动跳转登录页

## 冒烟测试

```bash
# 确保 unit-auth 已启动
node scripts/smoke-admin.mjs
```

## 技术栈

- React 18 + TypeScript
- Vite 5 (端口 3040)
- Ant Design 5
- react-router-dom v6
- axios
- ECharts (echarts-for-react)
- dayjs
