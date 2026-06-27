# Token 响应规范 - 剩余待办事项

## ✅ 已完成

- ✅ `handleRefreshTokenGrant` - Refresh token 刷新
- ✅ `GetOAuthUserinfo` - 用户信息端点
- ✅ `unified_auth.go` 中的登录响应
- ✅ `GetOAuthAuthorize` - OAuth 授权端点（8处错误已修复）
- ✅ `handleAuthorizationCodeGrant` - 授权码换取token（9处错误已修复）
- ✅ `handleCodeVerifierGrant` - PKCE 验证流程（8处错误已修复）

## ⚠️ 待修复函数列表

以下函数仍在使用 `gin.H{"error": ...}` 格式，需要改为统一的错误响应：

### 高优先级（常用端点）

#### 1. `GetOAuthAuthorize` (Line 415-580)
**错误数量**: 8 处
**影响**: OAuth 授权端点
**待修复错误**:
- Line 431: `invalid_request` - Missing required parameters
- Line 437: `unsupported_response_type`
- Line 447: `invalid_client`
- Line 453: `invalid_request` - Invalid redirect URI
- Line 484: `invalid_session`
- Line 494: `user_not_found`
- Line 543: `server_error` - Failed to save authorization code
- Line 551, 571: `server_error` - Session related

#### 2. `handleAuthorizationCodeGrant` (Line 657-810)
**错误数量**: 9 处
**影响**: 授权码换取 token
**待修复错误**:
- Line 670: `invalid_client`
- Line 680: `invalid_grant` - Auth code validation
- Line 688: `invalid_grant` - PKCE validation
- Line 716: `server_error` - Invalid user ID
- Line 723: `user_not_found`
- Line 736: `server_error` - Update user failed
- Line 785: `server_error` - Token generation failed
- Line 792: `server_error` - Refresh token generation failed
- Line 801: `server_error` - Session update failed

#### 3. `handleCodeVerifierGrant` (Line 1911-1970)
**错误数量**: 8 处
**影响**: PKCE 验证流程
**待修复错误**:
- Line 1906: `invalid_client`
- Line 1913: `invalid_grant`
- Line 1920: `server_error` - Invalid user ID
- Line 1927: `user_not_found`
- Line 1937: `server_error` - Update user failed
- Line 1957: `server_error` - Token generation failed
- Line 1964: `server_error` - Refresh token generation failed

### 中优先级

#### 4. `GetOAuthRevoke` (Line 1202-1245)
**错误数量**: 2 处
**影响**: Token 撤销端点
**待修复错误**:
- Line 1224: `invalid_request` - token is required
- Line 1231: `invalid_client`

#### 5. `handlePasswordGrant` (Line 1519-1608)
**错误数量**: 6 处
**影响**: 密码授权模式
**待修复错误**:
- Line 1532: `invalid_client`
- Line 1540, 1559: `invalid_grant` - Invalid credentials
- Line 1569: `server_error` - Update user failed
- Line 1588: `invalid_request` - Invalid JSON
- Line 1595, 1602: `server_error` - Token generation failed

#### 6. `handleClientCredentialsGrant` (Line 1615-1642)
**错误数量**: 2 处
**影响**: 客户端凭据授权
**待修复错误**:
- Line 1623: `invalid_client`
- Line 1630: `server_error` - Token generation failed

---

## 🔧 修复指南

### 错误映射表

| 旧格式 (gin.H) | 新格式 (utils函数) |
|--------------|-----------------|
| `gin.H{"error": "invalid_request", ...}` | `utils.ReturnInvalidRequest(c, description)` |
| `gin.H{"error": "invalid_client", ...}` | `utils.ReturnClientSecretInvalid(c)` |
| `gin.H{"error": "invalid_grant", ...}` | `utils.ReturnAuthCodeInvalid(c)` 或其他 |
| `gin.H{"error": "user_not_found", ...}` | `utils.ReturnUserNotFound(c)` |
| `gin.H{"error": "server_error", ...}` | `utils.ReturnTokenGenerationFailed(c)` 或 `utils.ReturnDatabaseError(c)` |

### 修复模板

#### Before (旧代码):
```go
if clientID == "" || redirectURI == "" {
    c.JSON(http.StatusBadRequest, gin.H{
        "error": "invalid_request", 
        "error_description": "Missing required parameters"
    })
    return
}
```

#### After (新代码):
```go
if clientID == "" || redirectURI == "" {
    utils.ReturnInvalidRequest(c, "Missing required parameters")
    return
}
```

---

## 📊 统计

| 函数 | 错误数量 | 状态 |
|-----|---------|-----|
| `handleRefreshTokenGrant` | 6 | ✅ 已完成 |
| `GetOAuthUserinfo` | 3 | ✅ 已完成 |
| `GetOAuthAuthorize` | 8 | ✅ 已完成 |
| `handleAuthorizationCodeGrant` | 9 | ✅ 已完成 |
| `handleCodeVerifierGrant` | 8 | ✅ 已完成 |
| `GetOAuthRevoke` | 2 | ⚠️ 待修复 |
| `handlePasswordGrant` | 6 | ⚠️ 待修复 |
| `handleClientCredentialsGrant` | 2 | ⚠️ 待修复 |
| **总计** | **44** | **34 已完成 / 10 待修复** |

---

## 🚀 修复优先级建议

### Phase 1: 核心流程 ✅ **已完成**
1. ✅ `handleRefreshTokenGrant` - 已完成
2. ✅ `GetOAuthUserinfo` - 已完成
3. ✅ `handleAuthorizationCodeGrant` - 已完成
4. ✅ `GetOAuthAuthorize` - 已完成

### Phase 2: 扩展功能（可选）
5. ✅ `handleCodeVerifierGrant` - PKCE 流程 - 已完成
6. ⚠️ `handlePasswordGrant` - 密码模式（低优先级，不推荐使用）
7. ⚠️ `GetOAuthRevoke` - 撤销端点（中等优先级）
8. ⚠️ `handleClientCredentialsGrant` - 客户端模式（中等优先级）

---

## 💡 批量修复脚本示例

如果要批量修复，可以使用以下模式：

```bash
# 查找所有需要修复的行
grep -n 'gin.H{"error"' Go/unit-auth/handlers/sso.go

# 逐个修复（建议手动检查每一处）
```

---

## ✅ 验证清单

修复完成后，请验证：

- [ ] 所有错误响应都包含 `error_code`
- [ ] 所有错误响应都包含 `suggest_action`
- [ ] 错误消息是用户友好的
- [ ] HTTP 状态码正确
- [ ] 前端能正确处理新的错误格式
- [ ] 向后兼容性（保留 `error` 和 `error_description` 字段）

---

**创建日期**: 2025-10-29  
**最后更新**: 2025-10-29  
**当前状态**: ✅ Phase 1 全部完成，Phase 2 部分完成（PKCE流程已完成）  
**已完成工作量**: 约77% (34/44 错误已修复)  
**剩余待修复**: 10 个错误（均为低/中优先级功能）

