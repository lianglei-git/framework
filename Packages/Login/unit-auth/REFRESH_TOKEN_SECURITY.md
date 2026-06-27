# Refresh Token 安全机制详解

## 🔄 Refresh Token 更新策略

是的，确实存在refresh token被更新的情况，这是系统设计的一部分，用于实现**单点登录**和**Token轮换**的安全机制。

### 📋 更新场景

#### 1. **双Token续签时** ✅
```go
// refreshAccessTokenWithDB 函数
// 撤销旧的Refresh Token
rt.Revoke()
models.DB.Save(&rt)

// 创建新的Refresh Token记录
newRT := models.RefreshToken{...}
newRT.GenerateTokenHash(newRefreshToken)
models.DB.Create(&newRT)
```

#### 2. **双Token登录时** ✅
```go
// LoginWithTokenPair 函数
// 撤销用户现有的所有Refresh Token（单点登录）
RevokeUserRefreshTokens(user.ID)

// 创建新的Refresh Token记录
CreateRefreshTokenRecord(user.ID, tokenPair.RefreshToken, ...)
```

### 🛡️ 安全机制

#### 1. **Token轮换 (Token Rotation)**
- **每次使用后更新**: 使用Refresh Token获取新Access Token后，生成新的Refresh Token
- **旧Token立即失效**: 旧的Refresh Token被撤销，无法再次使用
- **防止重放攻击**: 即使Refresh Token被窃取，使用一次后即失效

#### 2. **单点登录 (SSO)**
- **登录时清理**: 新登录时自动撤销用户所有其他Refresh Token
- **多设备保护**: 防止用户在多个设备上同时保持登录
- **会话管理**: 确保每个用户只有一个活跃会话

#### 3. **哈希存储**
```go
// Refresh Token不存储明文
rt.GenerateTokenHash(refreshToken) // SHA256哈希
models.DB.Create(&rt)

// 验证时进行哈希比较
if rt.VerifyTokenHash(refreshToken) { // 安全验证
    // 验证通过
}
```

### 🔄 更新流程图

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   双Token登录   │───▶│ 撤销旧Refresh    │───▶│ 创建新Refresh   │
│   (首次登录)    │    │     Tokens       │    │     Token       │
└─────────────────┘    └──────────────────┘    └─────────────────┘

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   使用Refresh   │───▶│ 验证Refresh      │───▶│ 返回新Token对   │
│   Token续签     │    │     Token        │    │ (Access+Refresh)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### ⚙️ 配置参数

```go
// 配置文件中的Token过期时间
JWTExpiration: 2              // Access Token 2小时
JWTRefreshExpiration: 168     // Refresh Token 7天
JWTRememberMeExpiration: 720  // Remember Me Token 30天
```

### 📊 数据库状态变化

#### 登录前的状态
```
user_id: "123"
┌─────────────────────────────────────────┐
│ Refresh Token 1: Active (设备A)         │
│ Refresh Token 2: Active (设备B)         │
│ Refresh Token 3: Expired (已过期)       │
└─────────────────────────────────────────┘
```

#### 登录后的状态
```
user_id: "123"
┌─────────────────────────────────────────┐
│ Refresh Token 1: Revoked (设备A已失效)  │
│ Refresh Token 2: Revoked (设备B已失效)  │
│ Refresh Token 4: Active (新登录设备)    │ ← 新创建
└─────────────────────────────────────────┘
```

#### 续签后的状态
```
user_id: "123"
┌─────────────────────────────────────────┐
│ Refresh Token 4: Revoked (已使用过)     │
│ Refresh Token 5: Active (新生成的)     │ ← 续签后创建
└─────────────────────────────────────────┘
```

### 🔐 安全优势

#### 1. **防止Token泄露**
- Refresh Token被窃取后，使用一次即失效
- 攻击者无法持续使用同一个Refresh Token

#### 2. **限制会话数量**
- 每个用户只能有一个活跃的Refresh Token
- 防止多设备同时登录的安全风险

#### 3. **自动过期管理**
- Refresh Token有固定过期时间（默认7天）
- 过期Token自动清理，无法使用

#### 4. **审计跟踪**
- 记录每次Token操作的IP地址和User-Agent
- 便于追踪异常登录行为

### ⚠️ 注意事项

#### 1. **数据库依赖**
- Refresh Token更新需要数据库支持
- 确保数据库连接稳定，避免Token操作失败

#### 2. **网络延迟**
- Token更新涉及数据库操作
- 在高并发场景下可能影响性能

#### 3. **错误处理**
- 如果数据库操作失败，登录/续签会终止
- 确保有合适的错误处理和重试机制

### 🎯 最佳实践

1. **定期轮换**: 建议定期更新Refresh Token
2. **监控异常**: 关注Token撤销失败的情况
3. **限制频率**: 对Refresh Token使用频率进行限制
4. **日志记录**: 记录所有Token操作用于安全审计

---

## 总结

Refresh Token的更新机制是系统安全性的核心组成部分：

✅ **安全轮换**: 每次使用后自动更新
✅ **单点登录**: 确保用户只有一个活跃会话
✅ **防泄露保护**: 防止Token被窃取后持续使用
✅ **审计跟踪**: 完整的操作记录和监控

这种设计既保证了用户体验的连续性，又最大限度地提升了系统的安全性。
