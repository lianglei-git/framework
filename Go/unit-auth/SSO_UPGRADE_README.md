# Unit Auth SSO升级指南

## 🎯 升级概述

本次升级将您的Unit Auth系统从传统的认证服务升级为功能完整的SSO（Single Sign-On）系统，支持OAuth 2.0和OpenID Connect协议标准。

## ✨ 新增功能

### 1. 🚀 完整的OAuth 2.0/OpenID Connect支持
- **授权端点**: `/oauth/authorize`
- **令牌端点**: `/oauth/token`
- **用户信息端点**: `/oauth/userinfo`
- **登出端点**: `/oauth/logout`
- **令牌撤销端点**: `/oauth/revoke`
- **令牌内省端点**: `/oauth/introspect`

### 2. 🔐 RSA密钥支持
- 升级从HS256到RS256签名算法
- 支持JWK (JSON Web Key)标准
- 自动生成和管理RSA密钥对

### 3. 📋 OpenID Connect服务发现
- **服务发现端点**: `/.well-known/openid_configuration`
- **JWK端点**: `/.well-known/jwks.json`
- 自动生成标准的OIDC配置

### 4. 👥 SSO客户端管理
- 创建和管理OAuth客户端
- 支持多种授权类型和响应类型
- 客户端密钥管理
- 重定向URI验证

### 5. 🔄 增强的令牌管理
- 支持访问令牌、刷新令牌、记住我令牌
- 自动令牌刷新机制
- 令牌黑名单管理
- PKCE (Proof Key for Code Exchange)支持

### 6. 🛡️ 安全增强
- CSRF保护
- 令牌撤销机制
- 安全事件记录
- 跨站请求伪造防护

## 📁 新增文件

```
handlers/
├── sso.go              # SSO核心处理器
├── sso_client.go       # SSO客户端管理处理器

models/
├── sso_client.go       # SSO客户端数据模型

migrations/
├── 003_add_sso_support.sql  # SSO数据库迁移

config/
├── config.go           # 更新配置结构
├── env.example         # 更新环境变量配置
```

## 🔧 配置说明

### 1. 环境变量配置

```bash
# RSA密钥配置（用于OAuth 2.0/OpenID Connect）
RSA_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----
RSA_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----

# OAuth 2.0配置
OAUTH_ISSUER=https://sso.yourcompany.com
OAUTH_AUTHORIZATION_ENDPOINT=/oauth/authorize
OAUTH_TOKEN_ENDPOINT=/oauth/token
OAUTH_USERINFO_ENDPOINT=/oauth/userinfo
OAUTH_REVOCATION_ENDPOINT=/oauth/revoke
OAUTH_INTROSPECTION_ENDPOINT=/oauth/introspect

# 默认SSO客户端配置
SSO_CLIENT_ID=default-client
SSO_CLIENT_SECRET=default-client-secret

# OAuth提供者配置
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret
```

### 2. 数据库迁移

执行数据库迁移以添加SSO支持：

```bash
# 运行迁移脚本
mysql -u your_user -p your_database < migrations/003_add_sso_support.sql
```

迁移将创建以下表：
- `sso_clients` - SSO客户端管理
- `sso_sessions` - SSO会话管理
- `token_blacklist` - 令牌黑名单

## 🔌 API接口

### 1. 服务发现端点

#### OpenID Connect配置
```http
GET /.well-known/openid_configuration
```

#### JWK密钥集
```http
GET /.well-known/jwks.json
```

### 2. OAuth 2.0端点

#### 授权端点
```http
GET /oauth/authorize?client_id=xxx&redirect_uri=xxx&response_type=code&scope=openid
```

#### 令牌端点
```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&client_id=xxx&client_secret=xxx&code=xxx&redirect_uri=xxx
```

#### 用户信息端点
```http
GET /oauth/userinfo
Authorization: Bearer {access_token}
```

#### 登出端点
```http
POST /oauth/logout
Content-Type: application/x-www-form-urlencoded

client_id=xxx&client_secret=xxx&token=xxx
```

#### 令牌撤销端点
```http
POST /oauth/revoke
Content-Type: application/x-www-form-urlencoded

token=xxx&client_id=xxx&client_secret=xxx
```

### 3. 管理接口

#### 创建SSO客户端
```http
POST /api/v1/admin/sso-clients
Content-Type: application/json

{
  "name": "My Application",
  "description": "My awesome application",
  "redirect_uris": ["https://myapp.com/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "scope": ["openid", "profile", "email"]
}
```

#### 获取SSO客户端
```http
GET /api/v1/admin/sso-clients/{client_id}
```

#### 更新SSO客户端
```http
PUT /api/v1/admin/sso-clients/{client_id}
Content-Type: application/json

{
  "name": "Updated Application Name",
  "is_active": true
}
```

## 🛠️ 升级步骤

### 1. 备份现有数据
```bash
mysqldump -u your_user -p your_database > backup_before_sso_upgrade.sql
```

### 2. 停止服务
```bash
systemctl stop unit-auth
# 或
killall unit-auth
```

### 3. 更新环境变量
编辑您的 `.env` 文件，添加新的SSO配置项。

### 4. 运行数据库迁移
```bash
mysql -u your_user -p your_database < migrations/003_add_sso_support.sql
```

### 5. 重新编译和启动服务
```bash
go build -o unit-auth main.go
./unit-auth
```

### 6. 验证升级
```bash
# 检查健康状态
curl http://localhost:8080/health

# 检查OpenID配置
curl http://localhost:8080/.well-known/openid_configuration

# 检查JWK端点
curl http://localhost:8080/.well-known/jwks.json
```

## 🔄 兼容性说明

### 向后兼容
- ✅ 所有现有的认证接口保持不变
- ✅ 现有的JWT令牌格式仍然有效
- ✅ 现有的用户数据结构保持兼容

### 新增功能
- ✅ 完整的OAuth 2.0/OpenID Connect支持
- ✅ RSA签名支持（与HS256并存）
- ✅ SSO客户端管理
- ✅ 增强的令牌管理

## 🧪 测试升级

### 1. 基本功能测试
```bash
# 测试健康检查
curl http://localhost:8080/health

# 测试服务发现
curl http://localhost:8080/.well-known/openid_configuration | jq .

# 测试JWK端点
curl http://localhost:8080/.well-known/jwks.json | jq .
```

### 2. OAuth流程测试

#### 1. 创建测试客户端
```bash
curl -X POST http://localhost:8080/api/v1/admin/sso-clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Client",
    "redirect_uris": ["http://localhost:3000/callback"],
    "grant_types": ["authorization_code"],
    "scope": ["openid", "profile"]
  }'
```

#### 2. 测试授权流程
```bash
# 启动一个简单的HTTP服务器来处理回调
python3 -m http.server 3000
```

#### 3. 发起授权请求
```bash
curl "http://localhost:8080/oauth/authorize?\
client_id=test-client-id&\
redirect_uri=http://localhost:3000/callback&\
response_type=code&\
scope=openid%20profile"
```

## 📊 监控和日志

### 1. 启用详细日志
```bash
export LOG_LEVEL=debug
export GIN_MODE=debug
```

### 2. 监控指标
- SSO客户端数量
- 活跃会话数量
- 令牌刷新频率
- OAuth认证成功率

### 3. 安全事件监控
- 失败的登录尝试
- 令牌撤销事件
- 可疑的API调用

## 🔒 安全注意事项

### 1. RSA密钥安全
- **生产环境必须**设置自定义RSA密钥
- 定期轮换RSA密钥对
- 保护私钥文件的安全

### 2. HTTPS要求
- **必须**在生产环境中使用HTTPS
- 配置适当的SSL证书
- 启用HSTS头

### 3. 令牌安全
- 使用短过期时间的访问令牌
- 实施令牌刷新机制
- 定期清理过期的令牌

### 4. 客户端管理
- 定期审查SSO客户端
- 使用强客户端密钥
- 限制重定向URI

## 🚨 故障排除

### 1. RSA密钥问题
**问题**: `Failed to generate RSA key pair`
**解决**: 检查RSA_PRIVATE_KEY环境变量是否正确设置

### 2. 数据库迁移问题
**问题**: 迁移脚本执行失败
**解决**: 确保数据库用户有足够的权限，检查SQL语法

### 3. OAuth回调问题
**问题**: 授权码验证失败
**解决**: 检查客户端ID、重定向URI和授权码的正确性

### 4. 令牌验证问题
**问题**: JWT签名验证失败
**解决**: 确保RSA公钥正确配置，检查令牌格式

## 🔄 回滚计划

如果升级出现问题，可以按以下步骤回滚：

### 1. 停止服务
```bash
systemctl stop unit-auth
```

### 2. 恢复数据库
```bash
mysql -u your_user -p your_database < backup_before_sso_upgrade.sql
```

### 3. 恢复配置文件
```bash
git checkout HEAD -- config/config.go
git checkout HEAD -- env.example
```

### 4. 重新编译和启动
```bash
go build -o unit-auth main.go
./unit-auth
```

## 📚 相关文档

- [OAuth 2.0 规范](https://tools.ietf.org/html/rfc6749)
- [OpenID Connect 规范](https://openid.net/connect/)
- [JWT 规范](https://tools.ietf.org/html/rfc7519)
- [JWK 规范](https://tools.ietf.org/html/rfc7517)
- [PKCE 规范](https://tools.ietf.org/html/rfc7636)

## 🤝 支持

如需技术支持，请联系：
- 邮箱: support@yourcompany.com
- 文档: https://docs.yourcompany.com/sso
- GitHub: https://github.com/yourcompany/unit-auth

---

**注意**: 升级前请务必备份数据，建议在测试环境先进行升级验证。
