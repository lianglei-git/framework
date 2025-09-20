## 用户中心后台管理系统需求（基于 unit-auth 现状与可实现范围）

本文档根据 `unit-auth` 项目现有能力与接口，结合《user_admin_system_require.md》中的目标后台功能，梳理可直接实现与需补充的后台管理需求清单，供前后端实现与排期参考。

### 一、总体目标
- **定位**：围绕统一用户中心（注册、登录、OAuth/短信/邮箱验证码登录、JWT、统计、监控、备份）的后台管理系统。
- **边界**：后端以 `unit-auth` 暴露的管理员接口为主，权限粒度先以角色级（admin）为准，后续再扩展到 RBAC 细粒度。

### 二、已有能力映射（可直接接入后台）

1) 认证与用户
- 统一登录：`POST /api/v1/auth/login`、`/auth/unified-login`、`/auth/phone-login`、`/auth/email-login`、`/auth/oauth-login`
- Token：`/auth/refresh-token`、`/auth/refresh-with-refresh-token`、`/auth/token-status`、`/.well-known/jwks.json`、`/auth/introspect`、`/auth/token/exchange`
- 用户自助：`/api/v1/user/profile [GET/PUT]`、`/change-password`

2) 管理端用户管理（需 admin 权限）
- 列表/检索：`GET /api/v1/admin/users?page=&page_size=&search=&status=&role=&sort_by=&sort_order=`
- 查看：`GET /api/v1/admin/users/:id`
- 编辑：`PUT /api/v1/admin/users/:id`（用户名、昵称、邮箱/手机、角色、状态、认证状态、Meta）
- 删除：`DELETE /api/v1/admin/users/:id`（软删）
- 批量操作：`POST /api/v1/admin/users/bulk-update`（activate/deactivate/delete）
- 登录日志：`GET /api/v1/admin/stats/login-logs`（分页、provider、日期范围）

3) 统计与分析
- 基础统计：`/api/v1/stats/overall`、`/daily/:date | /daily`、`/weekly`、`/monthly/:year/:month`、`/range`
- 管理端统计：`/api/v1/admin/stats/users`、`/api/v1/admin/stats/login-logs`
- 高级分析：`/api/v1/admin/analytics/*`（用户增长、登录行为、用户行为、系统性能、实时指标）
- 图表数据：`/api/v1/admin/charts/*`（用户增长、登录方式分布、活跃度、系统性能、Dashboard 汇总）

4) 监控与可观测
- 指标接口：`GET /metrics`（Prometheus），`/api/monitoring/*` 自定义监控与统计（活跃用户、系统健康、导出等）
- 中间件：请求日志、请求ID、限流、项目标识注入、自动续签、记住我、增强认证、登录/注册活动记录等。

5) 数据备份与恢复
- 导出：`POST /api/v1/admin/backup/export`（ZIP内含 backup.json + README）
- 导入：`POST /api/v1/admin/backup/import`（清空并导入多表）
- 校验：`POST /api/v1/admin/backup/validate`
- 信息：`GET /api/v1/admin/backup/info`

6) 项目注册/映射（中心化用户 -> 各业务项目）
- 通过 `Project`、`ProjectMapping`、`services.RegisterUser`、`EnsureProjectMapping` 等机制，支持在登录/注册时写入 pid/luid 到 Token claims。

### 三、后台管理系统功能清单（首批可落地）

1) 仪表盘
- 今日/本周新增用户、活跃用户、登录次数、成功率
- 登录方式分布（邮箱/手机/OAuth）
- 用户增长趋势图、活跃度分布、系统资源概览（来自 charts 与 analytics 接口）

2) 用户账户管理
- 用户列表（分页、搜索、过滤：状态、角色）
- 用户详情（基础资料、认证状态、登录统计）
- 编辑信息（用户名、昵称、邮箱/手机、角色、状态、Meta）
- 批量启用/停用/删除
- 登录日志查看（按时间、方式、是否成功）
- 强制登出：后续扩展（当前未提供失效所有会话的接口，需新增）

3) 权限与角色管理（阶段一占位，阶段二实现）
- 阶段一：仅保留 `admin` 门槛拦截（`AdminMiddleware`）。
- 阶段二（需实现）：基于 `models/permission.go` 的 `Role/Permission/UserRole/RolePermission/AccessControl` 完整 RBAC：
  - 角色 CRUD、权限 CRUD、角色授权、用户分配角色、按资源/动作/项目校验。
  - 管理端 API 与中间件集成，替换/补充单一 admin 判定。

4) 安全与风控
- 审计：登录日志已具备；后台操作审计需基于 `AuditLog` 落库并在各管理接口写入。
- 频控：已有简单限流中间件；生产建议接入 Redis 限流。
- 验证码管理：验证码统计与清理（`/admin/verification-stats`、`/admin/cleanup-verifications`）。
- 异常登录监控：可基于登录日志扩展（异地、新设备等），阶段二。

5) 内容与通信管理（阶段二）
- 邮件/短信群发、公告中心：当前仅有验证码/欢迎邮件能力；需要新增模板与任务模型及 API。

6) 数据与报表
- 导出用户/日志/统计（备份导出可用；列表 CSV 导出需新增轻量导出接口）。
- 自定义报表：基于 analytics 组合查询，前端拼装即可；复杂需求阶段二扩展。

7) 运维与系统设置
- 第三方集成配置：通过 `.env` 与 `config`，后台需要新增读取/更新接口（谨慎暴露）。
- 系统健康状态：`/health`、`/api/monitoring/health`、`/metrics` 已具备。
- 全局设置（站点名、Logo 等）：需新增配置表与 API。

### 四、数据模型与接口约束
- 用户模型 `models.User`：邮箱/手机号为可空指针；角色、状态、认证字段完备；Meta JSON 存放扩展信息。
- 登录日志 `LoginLog`、统计 `UserStats`、验证码 `EmailVerification/SMSVerification`、备份结构 `BackupData` 完整。
- JWT：支持统一 Token、记住我、双 Token、项目映射 claims（pid/luid）、状态检查与自动续签。

### 五、第一阶段落地清单（后端无需大改）
- 接入现有 admin 用户接口与统计/图表/分析接口，完成：仪表盘、用户列表/检索、用户详情/编辑、批量操作、登录日志查看、备份导入导出、验证码统计与清理、监控页。
- 基于单角色 `admin` 的菜单/路由保护。

### 六、第二阶段增强（需补充开发）
- RBAC 细粒度权限：角色/权限/分组/访问控制管理 API 与中间件判定；审计日志落库。
- 会话管理：强制登出（失效用户所有 token）、设备管理。
- 通知中心：邮件/短信/站内信任务、模板、群发与效果统计。
- 配置中心：第三方密钥与全局设置的安全管理（加密存储、只读/变更审计）。
- 导出能力：用户列表/日志 CSV 导出接口。
- 监控：接入真实 Prometheus 指标值、APM（可选）。

### 七、前端对接要点
- 统一鉴权：登录后持有 Bearer Token；调用 `token-status` 判断续签策略或依赖响应头 `X-New-Token`。
- 所有管理接口需带管理员 Token，后端有 `AdminMiddleware` 校验。
- 图表组件可直接使用后端返回的 `ChartDataResponse` 结构。

### 八、环境与部署
- 依赖：MySQL、可选 Redis（建议用于限流/会话）、SMTP、Prometheus（可选）。
- 通过 `.env` 配置数据库、JWT、SMTP、OAuth 信息；生产启用 HTTPS、强密钥、日志聚合与告警。

---

如需我生成前端菜单/页面路由与接口对接清单，可在此文档基础上继续细化。


