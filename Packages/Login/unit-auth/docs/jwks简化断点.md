## 基础信息
- **Base URL**: 你的 Unit-Auth 服务地址（例如 `https://auth.example.com`）
- **Header（可选）**: `X-Genres-Type: nature_trans`（与项目映射无关时可省略）
- 本文档介绍三个互操作端点：JWKS 简化端点、Token Introspection、Token Exchange

### 1) JWKS 简化端点（HS256 指纹）
- **用途**: 在当前使用 HS256（对称密钥）时，无法提供公钥，仅提供 Secret 指纹用于标识版本；生产建议改为 RS256 提供真实公钥。
- **Method**: GET
- **Path**: `/api/v1/auth/.well-known/jwks.json`
- **Auth**: 无需鉴权（建议放在受控网段或加访问控制）

响应示例
```json
{
  "keys": [
    {
      "kty": "oct",
      "kid": "hs256",
      "alg": "HS256",
      "k_thumbprint": "tC6dH4...O5g" 
    }
  ]
}
```

curl 示例
```bash
curl -s https://auth.example.com/api/v1/auth/.well-known/jwks.json
```

注意
- 返回的是对称密钥的 SHA-256 指纹（URL-safe Base64 编码），用于校验密钥轮换与版本识别。
- 生产建议改为 RS256/ECDSA 并返回真实公钥集合。

### 2) Token Introspection
- **用途**: 第三方服务验证中心签发的 JWT 是否有效，并读取核心 Claims。
- **Method**: POST
- **Path**: `/api/v1/auth/introspect`
- **Content-Type**:
  - `application/json`，body: `{"token":"<jwt>"}`
  - 或 `application/x-www-form-urlencoded`，body: `token=<jwt>`
- **Auth**: 无需鉴权（建议放在受控网段或加访问控制）

请求示例（JSON）
```bash
curl -s -X POST https://auth.example.com/api/v1/auth/introspect \
  -H 'Content-Type: application/json' \
  -d '{"token":"<your_jwt_here>"}'
```

请求示例（Form）
```bash
curl -s -X POST https://auth.example.com/api/v1/auth/introspect \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'token=<your_jwt_here>'
```

有效响应示例
```json
{
  "active": true,
  "user_id": "6f0d9c3e-....",
  "email": "user@example.com",
  "role": "user",
  "project_key": "nature_trans",
  "local_user_id": "123456",
  "token_type": "access",
  "exp": 1736400000,
  "expires_at": "2025-01-09T10:00:00Z"
}
```

无效响应示例
```json
{ "active": false }
```

错误响应
- 400: 缺少 token 参数
- 200 + active=false: token 无效/过期

字段说明
- `project_key`、`local_user_id`：当 Token 由中心映射生成且可确定映射时才存在
- `token_type`: "access" | "remember_me"（其他类型按系统配置）

### 3) Token Exchange（示例实现）
- **用途**: 将中心的 JWT（subject_token）交换为针对某一受众（audience，例如某个项目）的短期访问令牌；同时保留 `project_key` 与 `local_user_id`。
- **Method**: POST
- **Path**: `/api/v1/auth/token/exchange`
- **Content-Type**: `application/json`
- **Auth**: 无需额外鉴权（建议放在受控网段；生产可要求客户端认证）

请求体
```json
{
  "subject_token": "<center_jwt>",
  "audience": "nature_trans"
}
```

响应示例
```json
{
  "access_token": "<new_audience_scoped_jwt>",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

curl 示例
```bash
curl -s -X POST https://auth.example.com/api/v1/auth/token/exchange \
  -H 'Content-Type: application/json' \
  -d '{"subject_token":"<center_jwt>","audience":"nature_trans"}'
```

说明
- 返回的 `access_token` 的 `aud` 将被设置为传入的 `audience`，并保留中心 Token 的 `project_key/local_user_id`。
- 该接口是示例实现，仍使用同一签名算法；生产建议按项目安全要求签发不同密钥或不同签名算法。

### 常见错误码
- 400 Bad Request
  - 参数缺失或格式错误（例如 introspect 未提供 `token`，exchange 未提供 `subject_token` 或 `audience`）
- 401 Unauthorized
  - Token Exchange: `subject_token` 无效或过期
- 500 Internal Server Error
  - 服务端内部错误（签发失败等）

### 安全与运维建议
- 生产环境建议改用非对称签名（RS256/ES256），并提供标准 JWKS 公钥集合。
- 限制 `introspect` 与 `token/exchange` 的来源（IP 白名单/网关鉴权/服务间 mTLS）。
- 配置速率限制与审计日志，避免暴露 Token 接口造成资源滥用。
- 对 Token 设置合理的过期时间与密钥轮换策略；通过 `kid` 管理密钥版本。
- CORS 与 HTTPS 均需正确配置；敏感接口建议仅服务间调用，不暴露公网。

- 概要
  - 文档覆盖了三个端点的请求方式、参数、示例与返回字段。
  - 已说明 HS256 下的 JWKS 指纹行为及生产建议（RS256）。
  - 提供了 curl 示例，便于第三方快速联调。