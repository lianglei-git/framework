## 用户中心服务器后台管理系统 PRD（Product Requirements Document）

### 1. 背景与目标
- 背景：基于 `unit-auth` 统一认证与用户中心，建设一套面向运营、客服、审计与技术团队的后台管理系统，统一完成用户管理、统计分析、监控运维、数据备份与安全合规等工作。
- 目标：
  - 为日常运营提供高效、稳定、可审计的操作台。
  - 为决策提供稳定的用户增长、登录行为、活跃度等数据视角。
  - 为技术与安全提供可观测、可回溯、可恢复的基础能力。

### 2. 角色与权限
- 角色定义（阶段一）
  - 超级管理员（Admin）：拥有所有管理权限（现状：`AdminMiddleware` 基于 `role=admin` 拦截）。
- 角色定义（阶段二，RBAC）
  - 运营（Operator）：可查看/编辑用户信息、发起备份导出、查看统计图表。
  - 客服（Support）：可查看用户基本信息、登录日志，不可编辑敏感字段。
  - 审计员（Auditor）：可查看操作审计与系统指标，不可变更数据。
  - 安全（Security）：可进行验证码清理、查看异常登录、配置安全策略。
- 权限矩阵（阶段二示例，资源-动作-项目）
  - 用户：read/update/delete/list/export
  - 登录日志：read/list/export
  - 统计/图表：read
  - 备份：export/import/validate/read
  - 验证码：read/cleanup
  - 监控指标：read/export
  - 角色/权限：create/read/update/delete/grant/assign
  - 审计日志：read/list/export

注：阶段二基于 `models/permission.go` 的 `Role/Permission/UserRole/RolePermission/AccessControl` 完整实现。

### 3. 术语说明
- DAU/MAU：日/月活跃用户。
- Provider：登录方式（email/phone/google/github/wechat）。
- pid/luid：项目标识与项目内本地用户ID（JWT Claims）。
- 备份：导出包含 Users、LoginLogs、UserStats、Verifications、WeChatQRSessions 等数据的 ZIP。

### 4. 模块需求与用户故事（含验收标准与接口映射）

#### 4.1 登录与鉴权
- 用户故事
  - 作为管理员，我可以使用账号登录后台，并在会话即将过期时自动续签。
- 验收标准
  - 登录成功返回 Token，后续请求携带 Bearer Token。
  - 可查询 Token 状态与过期时间；在活动期自动续签（响应头 `X-New-Token`）。
- API 映射
  - POST `/api/v1/auth/login`、`/auth/unified-login`（任选其一作为后台登录）
  - POST `/api/v1/auth/refresh-token`、`/auth/refresh-with-refresh-token`
  - GET `/api/v1/auth/token-status`、GET `/metrics`（可观测）

#### 4.2 仪表盘（Dashboard）
- 用户故事
  - 作为管理员，我希望在首页快速看到关键指标：总用户、今日新增、今日活跃、今日登录次数、登录成功率、登录方式分布、用户增长趋势、系统资源概览。
- 验收标准
  - 仪表盘加载<2s（不含网络），所有卡片均有数据，图表支持近7/30天切换。
  - 接口出错时前端容错并显示占位/错误提示。
- API 映射
  - 统计：GET `/api/v1/stats/overall`、`/api/v1/stats/daily`、`/api/v1/stats/weekly`、`/api/v1/stats/monthly/:y/:m`
  - 图表：GET `/api/v1/admin/charts/dashboard`、`/charts/user-growth`、`/charts/login-behavior`、`/charts/user-activity`
  - 系统指标：GET `/metrics`、`/api/monitoring/summary`、`/api/monitoring/health`

#### 4.3 用户账户管理
- 用户故事
  - 作为运营/客服，我可以按用户名/邮箱/手机搜索用户，查看详情、编辑基础信息、调整角色与状态、批量启用/停用/删除。
  - 作为运营，我可以查看某用户的登录日志与登录方式分布。
- 验收标准
  - 列表分页、排序、过滤（状态/角色）；详情页展示基础信息、认证状态、登录统计。
  - 编辑校验（唯一性、格式化、必填项）；批量操作给出结果统计。
  - 操作成功/失败均有统一提示文案；后台返回标准响应结构。
- API 映射
  - 列表：GET `/api/v1/admin/users`
  - 详情：GET `/api/v1/admin/users/:id`
  - 编辑：PUT `/api/v1/admin/users/:id`
  - 删除：DELETE `/api/v1/admin/users/:id`
  - 批量：POST `/api/v1/admin/users/bulk-update`
  - 登录日志：GET `/api/v1/admin/stats/login-logs`（支持 user_id、provider、日期范围）
- 缺口与建议（需新增）
  - 强制登出（使用户所有会话失效）：新增 Token 黑名单或版本号机制（建议：在 JWT 加入 version，用户更新 version 后旧 token 失效）。
  - 列表导出 CSV：新增轻量导出接口（服务端分页导出或任务异步导出）。

#### 4.4 验证码与安全
- 用户故事
  - 作为安全人员，我可以查看验证码（邮箱/短信）统计，并一键清理过期/已使用记录。
- 验收标准
  - 统计数据准确；清理操作幂等且可追踪（写入审计日志，阶段二）。
- API 映射
  - GET `/api/v1/admin/verification-stats`
  - POST `/api/v1/admin/cleanup-verifications`

#### 4.5 统计与分析
- 用户故事
  - 作为产品/运营，我可以查看用户增长、登录行为、活跃度分布的趋势与对比。
- 验收标准
  - 支持 7/30/90 天与 1 年区间；按日/周/月聚合；支持 provider 过滤。
- API 映射
  - Analytics：GET `/api/v1/admin/analytics/user-growth`、`/analytics/login-behavior`、`/analytics/user-behavior`、`/analytics/system-performance`、`/analytics/real-time`

#### 4.6 监控与运维
- 用户故事
  - 作为技术人员，我可以查看 Prometheus 指标、自定义活跃度统计、系统健康状态与历史指标。
- 验收标准
  - 指标端点稳定；自定义监控具备缓存与历史查询；导出指标可入库。
- API 映射
  - GET `/metrics`（Prometheus）
  - GET `/api/monitoring/*`（活跃度、健康、汇总、按区间、历史、导出）

#### 4.7 数据备份与恢复
- 用户故事
  - 作为管理员，我可以导出/导入/验证备份包，并查看备份数据规模。
- 验收标准
  - 导出包含 `backup.json + README.txt`；导入严格校验、事务处理、失败可回滚；校验返回结构化统计。
- API 映射
  - POST `/api/v1/admin/backup/export`、`/admin/backup/import`、`/admin/backup/validate`
  - GET `/api/v1/admin/backup/info`

#### 4.8 配置管理（阶段二）
- 用户故事
  - 作为管理员，我可以在后台安全地查看/更新部分第三方集成与全局配置（带权限与审计）。
- 验收标准
  - 敏感字段加密存储；变更需审计；支持只读/掩码展示；可回滚。
- 缺口与建议
  - 新增配置模型与 API（分组、版本、审计）；高风险操作需二次确认与 MFA（可选）。

#### 4.9 通知与内容（阶段二）
- 用户故事
  - 作为运营，我可以对分群用户发送邮件/短信/站内信并查看效果。
- 验收标准
  - 模板化、变量化、灰度发布、任务可重试与统计。
- 缺口与建议
  - 新增消息任务、模板、发送日志模型与 API；对接现有 Mailer/SMS Service。

#### 4.10 RBAC 细粒度权限（阶段二）
- 用户故事
  - 作为超级管理员，我可以创建角色、配置权限、为用户分配角色，限制资源访问。
- 验收标准
  - 可按资源/动作/项目授权；支持过期时间、停用；接口与中间件生效。
- 依赖与实现
  - 直接使用 `models/permission.go` 中的模型，补充管理 API 与鉴权中间件。

#### 4.11 审计日志（阶段二）
- 用户故事
  - 作为审计员，我可以查询后台高风险/敏感操作记录（谁、何时、做了什么、对象、结果）。
- 验收标准
  - 后台所有写操作落库到 `AuditLog`；查询支持过滤与导出。

#### 4.12 会话与设备管理（阶段二）
- 用户故事
  - 作为管理员，我可以查看某用户的活跃会话并强制踢出。
- 验收标准
  - Token 可被失效：黑名单或版本化；可按设备维度展示（需新增设备指纹采集）。

### 5. 页面与菜单（建议信息架构）
- Dashboard（仪表盘）
- 用户管理
  - 用户列表 / 用户详情
  - 登录日志
- 统计与分析
  - 用户增长 / 登录行为 / 用户行为 / 实时指标
  - 图表看板
- 监控与运维
  - 指标概览 / 系统健康 / 活跃度统计 / 指标历史
- 数据备份
  - 导出 / 导入 / 校验 / 概览
- 安全与验证码
  - 验证码统计 / 清理
- 系统配置（阶段二）
- 角色与权限（阶段二）
- 审计日志（阶段二）

### 6. 接口差距清单（需补充开发）
- 强制登出/会话失效：新增 token 版本化与黑名单机制 + 管理端 API。
- 用户/日志 CSV 导出：新增导出接口（异步任务优先）。
- 配置中心：模型与 API（敏感加密、版本、审计）。
- 通知中心：任务、模板、发送日志模型与 API。
- RBAC 管理 API：角色/权限 CRUD、授权与分配，中间件鉴权。
- 审计日志：统一拦截与落库机制 + 查询接口。
- 设备/会话列表：设备指纹与会话存储方案（需要 Redis 或持久化表）。

### 7. 非功能需求（NFR）
- 安全：HTTPS、JWT 强密钥、敏感信息加密、最小权限原则、操作审计、速率限制、IP 黑名单。
- 性能：核心查询 < 200ms（P95），图表接口 < 500ms（P95）。
- 可用性：故障可恢复（备份/导入能力）、指标告警。
- 兼容性：API 版本化，前端兼容多浏览器。
- 可观测性：Prometheus 指标、请求日志、错误率监控。

### 8. 里程碑与路线图
- MVP（Phase 1，可直接落地）
  - 仪表盘、用户管理（列表/详情/编辑/批量/删除）、登录日志
  - 基础统计与图表、监控与健康、验证码统计与清理
  - 备份导出/导入/校验/信息
  - 管理权限以 `admin` 为准
- Phase 2（增强）
  - RBAC 细粒度权限、审计日志、会话管理（强制登出）
  - 配置中心、通知中心、CSV 导出
  - 真实 Prometheus 指标值采集、APM（可选）
- Phase 3（拓展）
  - 用户分群、运营自动化、AB 实验、数据地图与数据权限

### 9. 验收与成功指标（Success Metrics）
- 后台关键页面首屏 < 2s；操作错误率 < 1%；导入导出成功率 > 99%。
- 运营侧：通过后台完成 > 90% 的常见工单；日活运营人员满意度（主观指标）。
- 技术侧：问题定位平均时长下降 > 30%。

### 10. 依赖与风险
- 依赖：MySQL、（建议）Redis、SMTP、Prometheus/Grafana。
- 风险：RBAC 增强涉及模型与中间件联动；会话失效需权衡性能与复杂度；配置中心涉及敏感信息管理与审计。

---
附：接口与能力基于《ADMIN_REQUIREMENTS_FROM_UNIT_AUTH.md》，本文为面向产品与研发的更高层 PRD，用于指导前后端实现与排期。

### 11. 页面级规格（Page Specs）

#### 11.1 仪表盘
- 指标卡片：总用户、今日新增、今日活跃、今日登录次数、登录成功率
- 图表：用户增长（7/30/90/365 天），登录方式分布，活跃度分布，系统资源（CPU/内存/磁盘）
- 交互：时间范围切换、Provider 过滤、空数据占位、错误提示

#### 11.2 用户列表
- 列表字段：用户ID、用户名、邮箱、手机、角色、状态、最后登录、登录次数、创建时间
- 过滤：关键词（用户名/邮箱/昵称）、角色、状态、时间范围（创建、最后登录）
- 操作：查看详情、编辑、删除（软删）、批量启用/停用/删除、导出（阶段二）
- 校验与反馈：批量操作结果统计（成功/失败数量）

#### 11.3 用户详情/编辑
- 展示：基础信息、认证状态（邮箱/手机）、第三方绑定（google/github/wechat）、登录统计（近 30 天）
- 可编辑字段：用户名、昵称、邮箱、手机、角色、状态、Meta（JSON 可视化编辑）
- 验证：唯一性（用户名/邮箱/手机）、格式（邮箱/手机）、角色合法性、状态合法性

#### 11.4 登录日志
- 字段：时间、Provider、是否成功、IP、UA、错误信息（失败时）
- 过滤：用户ID、Provider、成功/失败、日期范围
- 导出：CSV（阶段二）

#### 11.5 数据备份
- 操作：导出（可选是否包含登录日志）、导入、校验、查看概览
- 约束：导入单文件 ≤ 50MB，事务处理，失败回滚

#### 11.6 验证码与安全
- 指标：邮箱验证码数、短信验证码数、已过期、已使用
- 动作：清理过期/已使用验证码（需二次确认）

#### 11.7 监控
- 指标：Prometheus 指标汇总、自定义活跃度统计、系统健康
- 视图：日活、月活趋势、最近登录活动 Top 列表

### 12. 关键流程（Flows）
- 登录与续签：登录 -> 获取 Token -> 活动期自动续签（响应头返回新 Token）-> Token 状态页可见过期时间
- 批量停用用户：选择用户 -> 批量停用 -> 返回更新数量 -> 列表刷新
- 强制登出（阶段二）：更新用户 token_version -> 旧 Token 全部失效
- 备份导入：上传 ZIP -> 校验 -> 导入（事务）-> 返回导入统计 -> 可回滚（DB 层事务完成）
- 验证码清理：点击清理 -> 二次确认 -> 执行 -> 返回清理数量

### 13. API 合同（Contracts，示例）

1) 用户列表
- 请求：GET `/api/v1/admin/users?page=1&page_size=20&search=abc&status=active&role=user&sort_by=created_at&sort_order=desc`
- 响应：
```json
{
  "code": 200,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "phone": "",
        "username": "alice",
        "nickname": "Alice",
        "role": "user",
        "status": "active",
        "email_verified": true,
        "phone_verified": false,
        "login_count": 12,
        "last_login_at": "2025-09-01T10:00:00Z",
        "created_at": "2025-08-01T10:00:00Z",
        "updated_at": "2025-09-01T10:00:00Z"
      }
    ],
    "pagination": {"page":1,"page_size":20,"total":100,"total_pages":5}
  }
}
```

2) 更新用户
- 请求：PUT `/api/v1/admin/users/:id`
```json
{
  "username": "alice",
  "nickname": "Alice",
  "email": "user@example.com",
  "phone": "13800138000",
  "role": "user",
  "status": "active",
  "email_verified": true,
  "phone_verified": false,
  "meta": {"avatar":"https://..."}
}
```
- 响应：`200` 标准响应，含 `user`。

3) 登录日志
- 请求：GET `/api/v1/admin/stats/login-logs?page=1&page_size=20&user_id=uuid&provider=phone&start_date=2025-09-01&end_date=2025-09-20`
- 响应：标准分页，`logs` 为 `LoginLog` 列表。

4) 备份导出
- 请求：POST `/api/v1/admin/backup/export`
```json
{"description":"月度备份","include_logs":true}
```
- 响应：`Content-Type: application/zip`，文件名 `user_backup_YYYYMMDD_HHMMSS.zip`

5) 备份导入
- 请求：`multipart/form-data`，字段 `backup_file`
- 响应：导入统计（导入用户数、日志数、版本、日期）。

6) 验证码统计与清理
- GET `/api/v1/admin/verification-stats`
- POST `/api/v1/admin/cleanup-verifications`

### 14. 权限矩阵与审计规则
- 阶段一：`admin` 可访问全部管理端接口。
- 阶段二（示例）：
  - Operator：用户 read/update/list/bulk、日志 read/list、统计 read、备份 export、验证码 read
  - Support：用户 read/list、日志 read/list
  - Auditor：审计 read/list/export、监控 read
  - Security：验证码 read/cleanup、异常登录 read
- 审计规则（阶段二）：
  - 落库动作：用户更新/删除/批量更新、备份导入/导出、验证码清理、角色/权限变更、配置变更
  - 字段：user_id、action、resource、resource_id、project、ip、ua、状态、错误信息、时间

### 15. 错误码与提示规范
- 结构：`{ code, message, data? }`
- 常用：
  - 200 OK；400 Bad Request；401 Unauthorized；403 Forbidden；404 Not Found；409 Conflict（唯一性冲突）；422 Unprocessable（校验失败）；429 Too Many Requests；500 Internal Error
- 文案：面向用户简洁明确；技术详情仅在日志/审计保留。

### 16. 会话与强制登出设计（阶段二）
- Token 版本化：在 `users` 增加 `token_version`（int，默认 1），JWT claims 写入 `tv`。当管理员执行强制登出时，`token_version++`，旧 Token 校验不通过。
- 可选黑名单：短期封禁 JWT ID（jti）到 Redis，适合立即生效的临时拉黑。

### 17. 导出规范（阶段二）
- 用户列表 CSV 列：id, username, email, phone, role, status, login_count, last_login_at, created_at
- 登录日志 CSV 列：created_at, user_id, provider, success, ip, user_agent, error_msg
- 文件：UTF-8、首行表头、UTC 时间、分批导出（>10万行建议异步任务）。

### 18. 配置中心与通知中心设计（阶段二）
- 配置中心：配置表（分组、键、值、版本、掩码、加密、审计）；接口（读/写/版本回滚）；高危操作二次确认。
- 通知中心：模板（变量化）、任务（人群/定时/速率限制/重试/统计）、发送日志；复用现有 Mailer/SMS Service。

### 19. 可观测性与 SLO
- SLO：
  - 管理接口 P95 < 300ms；图表与分析接口 P95 < 700ms
  - 可用性 99.9%；错误率 < 1%
- 指标与告警：登录成功率、请求错误率、响应时间、DAU/MAU 变化、备份失败告警
- 日志：结构化，含 request_id、user_id、action、resource、耗时

### 20. 测试用例（验收）
- 用户管理：创建/编辑/唯一性冲突/批量启停/删除/权限拦截
- 登录日志：按用户/时间/Provider 过滤；分页正确；失败日志包含错误信息
- 仪表盘：各卡片与图表在无数据与有数据时表现正确
- 备份：导出包包含预期文件；导入前后数据一致；校验错误能定位
- 验证码：统计准确；清理仅影响过期/已使用
- 鉴权：无 Token/过期 Token/非 admin 访问管理端应被拦截
- 监控：Prometheus 端点可抓取；自定义接口返回结构正确


