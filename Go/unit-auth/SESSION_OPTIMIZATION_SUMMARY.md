# SSO Session 架构优化实施总结

**实施日期**: 2025-10-28
**目的**: 解决多设备登录时的 session 查询冲突和数据冗余问题

---

## 一、问题背景

### 已完成的基础工作 ✅
1. Refresh Token 基础功能实现
2. Refresh Token 查询优化（使用 refresh_token_hash）
3. 数据库索引优化（refresh_token_hash）
4. 定期清理机制

### 本次优化解决的问题 ⚠️
1. **同一设备重复登录产生垃圾数据**
   - 用户在同一设备多次登录会创建多个 active session
   - 导致数据库中存在大量无效记录

2. **授权码流程创建不必要的 session**
   - 每次授权码生成都创建新 session
   - 应该复用已有的设备 session

3. **缺少设备识别机制**
   - 无法区分用户的不同设备
   - 无法实现"同一设备只有一个 session"

---

## 二、架构设计理念

### 保持的设计 ✅
```
用户 + 设备 + 应用 = 一个 session

示例：
- 用户在手机 + 中心系统 → session-1 (client_id="centralized")
- 用户在手机 + 子应用A   → session-2 (client_id="app-a")
- 用户在电脑 + 中心系统 → session-3 (client_id="centralized")
```

### 为什么不统一 client_id？
1. **前端 localStorage 跨域隔离**
   - 中心系统和子应用的 localStorage 完全独立
   - 各自存储自己的 token，无法同步

2. **Refresh Token 独立轮换**
   - 中心系统刷新 token 不应影响子应用
   - 子应用刷新 token 不应影响中心系统

3. **符合 OAuth 2.0 标准**
   - client_id 是 OAuth 安全机制的核心
   - 用于授权码验证和 token 受众控制

---

## 三、实施内容

### 1. 后端优化

#### 1.1 添加设备指纹生成函数
**文件**: `handlers/unified_auth.go`

```go
func generateDeviceFingerprint(userAgent, ip string, deviceID string) string {
    // 优先使用前端传来的设备ID
    if deviceID != "" {
        return deviceID
    }
    
    // 否则基于 User-Agent 生成
    hash := sha256.Sum256([]byte(userAgent))
    return hex.EncodeToString(hash[:16])
}
```

#### 1.2 登录时检查并复用 Session
**文件**: `handlers/unified_auth.go`（3处修改）

**优化前**:
```go
sessionID := uuid.New().String()
ssoSession := &models.SSOSession{...}
db.Create(ssoSession)  // 每次都创建新记录
```

**优化后**:
```go
deviceFingerprint := generateDeviceFingerprint(userAgent, ip, req.DeviceID)

// 查找是否已存在该设备+应用的 session
db.Where("user_id = ? AND client_id = ? AND device_fingerprint = ?", ...)

if 不存在 {
    创建新 session
} else {
    更新已有 session（复用）
}
```

**修改位置**:
- 统一登录逻辑（第543-623行）
- 手机登录（第1003-1081行）
- 双重验证模式（第1265-1343行）

#### 1.3 优化授权码流程
**文件**: `handlers/sso.go`

**优化前**:
```go
sessionID = uuid.New().String()
ssoSession.ID = sessionID  // 修改ID
db.Create(&ssoSession)     // 创建新记录
```

**优化后**:
```go
deviceFingerprint := generateDeviceFingerprint(userAgent, ip, "")

// 查找子应用的 session
db.Where("user_id = ? AND client_id = ? AND device_fingerprint = ?", ...)

if 不存在 {
    创建子应用 session
} else {
    更新授权码信息（不创建新记录）
}
```

#### 1.4 Request 结构体添加 DeviceID 字段
**文件**: `models/sso_client.go`

```go
type UnifiedOAuthLoginRequest struct {
    // ... 其他字段
    DeviceID string `json:"device_id,omitempty"` // 新增
}
```

#### 1.5 数据库索引优化
**文件**: `migrations/007_add_device_fingerprint_index.sql`

```sql
CREATE INDEX idx_user_client_device 
ON sso_sessions (user_id, client_id, device_fingerprint, status);
```

**用途**: 加速 "用户+应用+设备+状态" 的查询

---

### 2. 前端优化

#### 2.1 设备指纹生成工具
**文件**: `Js/.../utils/deviceFingerprint.ts`（新建）

```typescript
export function getDeviceFingerprint(): string {
    // 从 localStorage 读取或生成新ID
    let deviceId = localStorage.getItem('device_fingerprint')
    if (!deviceId) {
        deviceId = 'device_' + crypto.randomUUID()
        localStorage.setItem('device_fingerprint', deviceId)
    }
    return deviceId
}
```

#### 2.2 登录时传递设备ID
**文件**: `Js/.../services/api.ts`

```typescript
private async localSSOLogin(username: string, password: string) {
    const { getDeviceFingerprint } = await import('../utils/deviceFingerprint')
    const deviceId = getDeviceFingerprint()
    
    const tokenData = {
        // ... 其他字段
        device_id: deviceId  // 新增
    }
    
    // POST 到后端
}
```

---

## 四、最终效果

### 数据库 Session 记录

**优化前**（同一设备多次登录）:
```
| id      | user_id | client_id    | device_fp | created_at          |
|---------|---------|--------------|-----------|---------------------|
| sess-1  | user-1  | centralized  | (空)      | 2024-01-01 10:00:00 |
| sess-2  | user-1  | centralized  | (空)      | 2024-01-01 10:05:00 | ← 重复
| sess-3  | user-1  | centralized  | (空)      | 2024-01-01 10:10:00 | ← 重复
```

**优化后**（设备去重）:
```
| id      | user_id | client_id    | device_fp     | created_at          |
|---------|---------|--------------|---------------|---------------------|
| sess-1  | user-1  | centralized  | mobile-abc123 | 2024-01-01 10:00:00 | ← 复用
| sess-2  | user-1  | app-a        | mobile-abc123 | 2024-01-01 10:05:00 |
| sess-3  | user-1  | centralized  | desktop-def456| 2024-01-01 10:10:00 |
```

### Token 刷新独立性

```
T0: 用户在手机登录中心系统
    → 创建 sess-1 (client_id=centralized, device=mobile)

T1: 用户访问子应用 A
    → 创建 sess-2 (client_id=app-a, device=mobile)

T2: 中心系统 refresh_token 过期，刷新
    → 更新 sess-1.refresh_token_hash
    → ✅ sess-2 不受影响

T3: 子应用 A refresh_token 过期，刷新
    → 更新 sess-2.refresh_token_hash
    → ✅ sess-1 不受影响
```

---

## 五、部署步骤

### 1. 运行数据库迁移
```bash
cd Go/unit-auth
./run_migration.sh
```

### 2. 重启后端服务
```bash
# 应用会自动使用新的设备去重逻辑
```

### 3. 清理已有的重复 Session（可选）
```sql
-- 查看重复的 session
SELECT user_id, client_id, COUNT(*) as count
FROM sso_sessions
WHERE status = 'active'
GROUP BY user_id, client_id
HAVING count > 1;

-- 保留最新的，删除旧的（谨慎操作！）
-- 建议手动处理或等待自然过期
```

---

## 六、监控指标

### 关键日志输出
```
✅ 创建新session: {session_id} (user={user_id}, client={client_id}, device={fingerprint})
✅ 复用已有session: {session_id} (user={user_id}, client={client_id}, device={fingerprint})
✅ 为子应用创建session: {session_id} (device={fingerprint})
✅ 更新子应用session: {session_id} (device={fingerprint})
```

### 数据库查询性能
```sql
-- 查询效率（应该使用索引）
EXPLAIN SELECT * FROM sso_sessions 
WHERE user_id='xxx' AND client_id='xxx' AND device_fingerprint='xxx' AND status='active';

-- 应显示: Using index (idx_user_client_device)
```

---

## 七、注意事项

### 已知限制
1. **设备指纹基于 User-Agent**
   - 如果用户更换浏览器，会被识别为新设备
   - 前端传递 device_id 可以解决此问题

2. **向后兼容**
   - 旧的 session 记录（device_fingerprint 为空）仍然有效
   - 会在下次登录时自动补充设备指纹

3. **Privacy 考虑**
   - 设备指纹存储在 localStorage，用户可以手动清除
   - 不涉及敏感信息收集

---

## 八、回滚方案

如果出现问题，可以快速回滚：

1. **数据库索引保留**（不影响功能）
2. **恢复代码**：
   ```bash
   git revert <commit-hash>
   ```

---

## 九、未来优化方向

### 可选增强（P2）
1. **设备管理界面**
   - 用户查看所有登录设备
   - 踢出指定设备

2. **设备数量限制**
   - 限制用户最多同时在 N 个设备登录
   - 超过限制时踢出最旧的设备

3. **设备信息丰富化**
   - 记录设备型号、操作系统
   - 记录登录地理位置（IP to Location）

4. **异常登录检测**
   - 检测异地登录
   - 检测设备突变（User-Agent 大幅变化）

---

## 十、技术总结

### 架构亮点 ✨
1. **保持 OAuth 标准**：client_id 仍然发挥重要作用
2. **兼顾前端隔离**：各应用的 token 独立存储
3. **最小改动**：只增加设备去重，不改变核心流程
4. **向后兼容**：旧 session 仍可正常使用

### 性能提升 📊
- **减少数据冗余**: 同设备登录不再产生新记录
- **查询加速**: 复合索引提升设备查询性能
- **存储优化**: 定期清理 + 设备去重 = 更清洁的数据库

### 用户体验 🎯
- **透明化**: 用户无感知，登录体验不变
- **多设备支持**: 手机、电脑可以同时登录
- **Token 独立**: 各应用的 token 互不干扰

---

**实施完成日期**: 2025-10-28
**实施人员**: AI Assistant
**审核状态**: 待验证

