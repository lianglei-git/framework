# 微信扫码登录使用指南

## 概述

微信扫码登录是基于微信开放平台的OAuth2.0认证流程，用户可以通过扫描二维码快速登录系统，无需输入用户名和密码。

## 功能特性

- ✅ **二维码生成** - 自动生成微信授权二维码
- ✅ **状态轮询** - 实时检查扫码和登录状态
- ✅ **自动登录** - 扫码确认后自动完成登录
- ✅ **安全验证** - State参数防CSRF攻击
- ✅ **会话管理** - 二维码有效期和状态跟踪
- ✅ **用户信息** - 自动获取微信用户基本信息

## 技术架构

### 流程图

```
用户访问 → 生成二维码 → 微信扫码 → 授权确认 → 获取Token → 登录成功
    ↓           ↓           ↓           ↓           ↓           ↓
  前端页面   后端生成    微信APP    用户确认    后端处理    返回JWT
    ↓           ↓           ↓           ↓           ↓           ↓
  轮询状态   保存Session  回调URL    获取用户信息  创建用户    前端跳转
```

### 核心组件

1. **WeChatProvider** - 微信OAuth提供者
2. **WeChatAuthHandler** - 微信认证处理器
3. **WeChatQRSession** - 二维码会话管理
4. **前端轮询** - 状态检查机制

## 配置步骤

### 1. 微信开放平台配置

1. 登录 [微信开放平台](https://open.weixin.qq.com/)
2. 创建网站应用
3. 获取 AppID 和 AppSecret
4. 配置授权回调域名

### 2. 环境变量配置

```bash
# 微信OAuth配置
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret
WECHAT_REDIRECT_URI=http://your-domain.com/api/v1/auth/wechat/callback
```

### 3. 数据库表结构

系统会自动创建以下表：

```sql
-- 用户表扩展
ALTER TABLE users ADD COLUMN wechat_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN union_id VARCHAR(255);

-- 微信二维码会话表
CREATE TABLE wechat_qr_sessions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    state VARCHAR(255) UNIQUE NOT NULL,
    wechat_id VARCHAR(255),
    ip VARCHAR(45),
    user_agent TEXT,
    scanned BOOLEAN DEFAULT FALSE,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API接口详解

### 1. 获取二维码

**接口**: `GET /api/v1/auth/wechat/qr-code`

**响应示例**:
```json
{
  "code": 200,
  "message": "QR code generated successfully",
  "data": {
    "qr_url": "https://open.weixin.qq.com/connect/qrconnect?appid=xxx&redirect_uri=xxx&response_type=code&scope=snsapi_login&state=xxx#wechat_redirect",
    "state": "a1b2c3d4e5f6g7h8",
    "expires_at": "2024-01-15T10:35:00Z"
  }
}
```

### 2. 检查登录状态

**接口**: `GET /api/v1/auth/wechat/status/{state}`

**响应示例**:
```json
{
  "code": 200,
  "message": "QR code scanned, waiting for confirmation",
  "data": {
    "status": "pending",
    "scanned": false,
    "used": false
  }
}
```

**状态说明**:
- `pending` - 等待扫码
- `scanned` - 已扫码，等待确认
- `confirmed` - 已确认，登录成功
- `expired` - 二维码已过期

### 3. 微信回调处理

**接口**: `GET /api/v1/auth/wechat/callback`

**参数**:
- `code` - 微信授权码
- `state` - 状态参数

**响应示例**:
```json
{
  "code": 200,
  "message": "WeChat login successful",
  "data": {
    "user": {
      "id": "uuid",
      "username": "wx_12345678",
      "nickname": "微信用户",
      "avatar": "https://thirdwx.qlogo.cn/...",
      "wechat_id": "oH_TDuJ8Qs9JY4f1Abc123",
      "role": "user",
      "status": "active"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## 前端集成

### 1. 基本使用

```javascript
// 生成二维码
async function generateQRCode() {
  const response = await fetch('/api/v1/auth/wechat/qr-code');
  const data = await response.json();
  
  if (data.code === 200) {
    const { qr_url, state, expires_at } = data.data;
    // 显示二维码
    displayQRCode(qr_url);
    // 开始轮询状态
    startStatusPolling(state);
  }
}

// 轮询状态
function startStatusPolling(state) {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/v1/auth/wechat/status/${state}`);
    const data = await response.json();
    
    if (data.code === 200) {
      if (data.data.status === 'confirmed') {
        // 登录成功
        clearInterval(interval);
        handleLoginSuccess(data.data.token, data.data.user);
      } else if (data.data.status === 'expired') {
        // 二维码过期
        clearInterval(interval);
        handleQRExpired();
      }
    }
  }, 2000); // 每2秒检查一次
}
```

### 2. 完整示例

参考 `examples/wechat_login.html` 文件，包含完整的UI和交互逻辑。

## 安全考虑

### 1. State参数验证

- 每个二维码都有唯一的state参数
- 验证回调中的state与生成时一致
- 防止CSRF攻击

### 2. 会话管理

- 二维码5分钟自动过期
- 使用后立即标记为已使用
- 定期清理过期会话

### 3. 用户信息保护

- 只获取必要的用户信息
- 不存储敏感数据
- 遵守微信开放平台规范

## 错误处理

### 常见错误码

| 错误码 | 说明 | 处理方式 |
|--------|------|----------|
| 400 | 参数错误 | 检查请求参数 |
| 401 | 认证失败 | 重新生成二维码 |
| 410 | 二维码过期 | 刷新二维码 |
| 500 | 服务器错误 | 稍后重试 |

### 错误响应示例

```json
{
  "code": 401,
  "message": "WeChat login failed: invalid authorization code"
}
```

## 测试

### 1. 使用测试脚本

```bash
./test_wechat.sh
```

### 2. 手动测试

```bash
# 1. 生成二维码
curl -X GET "http://localhost:8080/api/v1/auth/wechat/qr-code"

# 2. 检查状态
curl -X GET "http://localhost:8080/api/v1/auth/wechat/status/{state}"

# 3. 模拟回调（需要真实的code）
curl -X GET "http://localhost:8080/api/v1/auth/wechat/callback?code=xxx&state=xxx"
```

## 部署注意事项

### 1. 域名配置

- 确保回调域名在微信开放平台正确配置
- 使用HTTPS协议（生产环境）
- 域名必须备案（中国大陆）

### 2. 服务器配置

- 确保服务器能访问微信API
- 配置防火墙允许微信回调
- 设置合适的超时时间

### 3. 监控告警

- 监控二维码生成成功率
- 监控登录成功率
- 设置异常告警

## 扩展功能

### 1. 用户信息同步

```javascript
// 定期同步用户信息
async function syncUserInfo(userId) {
  const response = await fetch(`/api/v1/user/profile`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  // 更新本地用户信息
}
```

### 2. 多端登录

```javascript
// 检查登录状态
async function checkLoginStatus() {
  const token = localStorage.getItem('auth_token');
  if (token) {
    const response = await fetch('/api/v1/user/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      // 用户已登录
      return true;
    }
  }
  return false;
}
```

## 常见问题

### Q: 二维码显示不出来怎么办？
A: 检查网络连接，确保能访问微信开放平台API。

### Q: 扫码后没有反应？
A: 检查回调域名配置，确保微信能正确回调到服务器。

### Q: 登录成功后跳转失败？
A: 检查前端路由配置，确保跳转地址正确。

### Q: 用户信息获取失败？
A: 检查AppSecret是否正确，确保有足够的权限。

## 技术支持

如有问题，请参考：
- [微信开放平台文档](https://developers.weixin.qq.com/doc/)
- [项目README](../README.md)
- [API文档](../README.md#api接口) 