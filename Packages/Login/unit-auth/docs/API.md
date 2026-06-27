# unit-auth API 契约（SDK 最小集）

Base URL 默认：`http://localhost:8080`

## 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 服务存活 |

## 本地认证

| 方法 | 路径 | 说明 | SDK |
|------|------|------|-----|
| POST | `/api/v1/auth/login` | 邮箱/账号密码登录 | 是 |
| POST | `/api/v1/auth/register` | 注册 | 是 |
| POST | `/api/v1/auth/refresh` | 刷新 access token | 是 |
| POST | `/api/v1/auth/send-email-code` | 发送邮箱验证码 | 是 |
| POST | `/api/v1/auth/phone-login` | 手机验证码登录 | 是 |

## OAuth 2.1 / OIDC

| 方法 | 路径 | 说明 | SDK |
|------|------|------|-----|
| GET | `/api/v1/auth/oauth/authorize` | 授权端点 | 是 |
| POST | `/api/v1/auth/oauth/token` | 授权码换 token | 是 |
| POST | `/api/v1/auth/oauth-login` | 统一 OAuth 登录 | 是 |
| GET | `/api/v1/auth/oauth/:provider/url` | 第三方授权 URL | 是 |
| GET | `/api/v1/auth/oauth/userinfo` | 用户信息 | 是 |
| POST | `/api/v1/auth/oauth/logout` | 登出 | 是 |
| POST | `/api/v1/auth/introspect` | Token 内省 | SDK |
| GET | `/api/v1/openid-configuration` | OIDC 发现文档 | SDK |
| GET | `/api/v1/auth/jwks-json` | JWKS 公钥 | SDK |

## 提供商

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/auth/providers` | 可用登录方式 |
| GET | `/api/v1/sso/providers` | SSO 提供商列表 |

## 用户

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/user/profile` | 当前用户资料 |
| PUT | `/api/v1/user/profile` | 更新资料 |
| POST | `/api/v1/user/change-password` | 修改密码 |

## 子项目 / 客户端

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/projects/public` | 公开项目列表 |
| GET | `/api/v1/projects/integration-docs` | 集成文档 |

## 后续 Go SDK（占位）

计划在 `unit-auth/sdk/go` 提供：

- `ParseJWT(token string) (claims, error)`
- `ValidateExpiry(claims) bool`
- `Introspect(token string) (*IntrospectionResponse, error)`
