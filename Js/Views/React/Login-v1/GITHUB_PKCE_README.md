# GitHub PKCE配置说明

## 问题描述

在使用GitHub登录时，遇到了以下PKCE相关的错误：

```
When utilizing PKCE (RFC 7636), supply both a code_challenge_method and a code_challenge. The code_challenge_method is expected to be 'S256'. (code_challenge_method 'plain' is not supported.) The code_challenge is expected to be 43 characters in length (typical of the S256 method).
```

## 问题原因

1. **SHA256实现错误**：`sha256Sync`函数没有正确实现SHA256哈希计算
2. **GitHub配置问题**：GitHub配置中包含了clientSecret，但GitHub是公共客户端
3. **PKCE参数缺失**：没有正确生成PKCE参数

## 修复内容

### 1. 修复SHA256实现
```typescript
// 修复前
private sha256Sync(message: string): ArrayBuffer {
    const buffer = new TextEncoder().encode(message)
    return buffer // ❌ 错误：这不是SHA256
}

// 修复后
private sha256Sync(message: string): ArrayBuffer {
    const msgBuffer = new TextEncoder().encode(message)
    return crypto.subtle.digest('SHA-256', msgBuffer) // ✅ 正确使用Web Crypto API
}
```

### 2. 修复GitHub配置
```javascript
// 修复前
github: {
    clientId: 'Ov23li5H25mAnW2AWrr1',
    clientSecret: '7e3c4cb2f31954819e2cc88a60938c77baf9cd13', // ❌ GitHub公共客户端不应该有secret
    // ...
}

// 修复后
github: {
    clientId: 'Ov23li5H25mAnW2AWrr1',
    clientSecret: '', // ✅ GitHub是公共客户端
    requirePKCE: true, // ✅ 强制使用PKCE
    // ...
}
```

### 3. 增强PKCE处理逻辑
```typescript
// 修复前
} else if (!this.config.clientSecret && finalOptions.response_type === 'code') {

// 修复后
const shouldUsePKCE = (finalOptions.code_challenge && finalOptions.code_challenge_method) ||
                      (!providerConfig?.client_secret && !this.config.clientSecret && finalOptions.response_type === 'code') ||
                      (providerConfig?.requirePKCE && finalOptions.response_type === 'code')
```

## 配置步骤

### 1. 设置环境变量
```bash
# .env文件
VITE_SSO_PROVIDER_GITHUB_ENABLED=true
VITE_SSO_PROVIDER_GITHUB_CLIENT_ID=你的GitHub应用客户端ID
# 注意：不要设置VITE_SSO_PROVIDER_GITHUB_CLIENT_SECRET
VITE_SSO_PROVIDER_GITHUB_REDIRECT_URI=http://localhost:5173/auth/callback
VITE_SSO_PROVIDER_GITHUB_SCOPE=user:email read:user
```

### 2. 创建GitHub OAuth应用
1. 访问 https://github.com/settings/applications/new
2. 填写应用信息
3. 设置Authorization callback URL为你的重定向URI
4. 复制Client ID到环境变量中

### 3. 验证配置
运行测试脚本验证PKCE参数是否正确生成：
```bash
node test-github-pkce.js
```

## 验证结果

正确配置后，GitHub授权URL应该包含：
- `code_challenge`: 43个字符的Base64URL编码字符串
- `code_challenge_method`: S256
- 正确的client_id和scope参数

## 技术细节

### PKCE工作原理
1. 客户端生成一个128位的随机字符串作为`code_verifier`
2. 使用SHA256哈希`code_verifier`得到`code_challenge`
3. 使用Base64URL编码`code_challenge`
4. 在授权请求中发送`code_challenge`和`code_challenge_method=S256`
5. 在token交换时发送`code_verifier`进行验证

### GitHub对PKCE的要求
- GitHub要求所有OAuth应用使用PKCE
- 必须使用S256方法（不支持plain方法）
- code_challenge必须是43个字符长度
- 公共客户端（没有client_secret的应用）必须使用PKCE

## 故障排除

### 错误：Invalid client_secret
**原因**：GitHub应用配置中设置了client_secret
**解决**：确保GitHub应用是公共客户端，不要设置client_secret

### 错误：Missing code_challenge
**原因**：PKCE参数没有正确生成
**解决**：检查`requirePKCE`配置是否正确设置

### 错误：Invalid code_challenge_method
**原因**：使用了不支持的方法
**解决**：确保使用'S256'方法，GitHub不支持'plain'方法
