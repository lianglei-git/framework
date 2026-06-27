# Scripts 目录

这个目录包含用于管理和操作 unit-auth 系统的便捷脚本。

## 脚本列表

### start-test-server.sh

启动测试服务器脚本，用于快速启动unit-auth服务器并启用测试模式。

#### 功能特性

- ✅ **自动构建**: 自动构建最新版本的项目
- ✅ **环境检查**: 检查Go版本和依赖
- ✅ **配置管理**: 自动创建和检查配置文件
- ✅ **测试模式**: 自动启用测试模式
- ✅ **健康检查**: 验证服务器是否正常启动
- ✅ **进程管理**: 在后台运行并支持优雅停止

### create-sso-client.sh

创建SSO客户端的便捷脚本。

#### 相关文件
- `test-create-sso-client.sh`: 测试脚本的模拟版本，无需实际服务器
- `start-test-server.sh`: 启动测试服务器脚本

### test-create-sso-client.sh

create-sso-client.sh的测试版本，用于在没有实际服务器运行时测试脚本逻辑。

#### 功能特性

- ✅ **模拟服务器**: 模拟真实的API响应，无需实际服务器
- ✅ **相同的参数**: 支持与主脚本相同的命令行参数
- ✅ **网络延迟**: 模拟真实的网络请求延迟
- ✅ **输出一致**: 输出格式与主脚本完全一致
- ✅ **配置保存**: 同样会生成配置文件

#### 使用方法

```bash
# 基本用法（使用默认值）
./scripts/test-create-sso-client.sh

# 自定义参数
./scripts/test-create-sso-client.sh [客户端ID] [客户端名称] [重定向URI] [描述]

# 查看帮助信息
./scripts/test-create-sso-client.sh -h
```

#### 示例输出

```
[INFO] === 测试CreateSSOClient脚本 ===
[INFO] 客户端ID: test-client
[INFO] 客户端名称: My Test App
[INFO] 客户端密钥: mock-sec...
[INFO] 正在创建SSO客户端...
[SUCCESS] SSO客户端创建成功！

{
  "code": 201,
  "message": "SSO client created successfully",
  "data": {
    "id": "test-client",
    "name": "My Test App",
    "description": "Test application created by script",
    "redirect_uris": ["http://localhost:3000/callback"],
    "grant_types": ["authorization_code", "refresh_token"],
    "response_types": ["code"],
    "scope": ["openid", "profile", "email"],
    "auto_approve": false,
    "is_active": true,
    "created_at": "2025-09-26T11:38:20Z",
    "updated_at": "2025-09-26T11:38:20Z"
  }
}

[SUCCESS] 客户端配置信息：
----------------------------------------
客户端ID (Client ID): test-client
客户端密钥 (Client Secret): mock-secret-1758886699
重定向URI (Redirect URI): http://localhost:3000/callback
授权端点 (Authorization Endpoint): http://localhost:8080/oauth/authorize
令牌端点 (Token Endpoint): http://localhost:8080/oauth/token
用户信息端点 (UserInfo Endpoint): http://localhost:8080/oauth/userinfo
----------------------------------------

[SUCCESS] 配置已保存到文件: sso-client-test-client.json
```

#### 功能特性

- ✅ **自动生成客户端ID**: 使用时间戳确保唯一性
- ✅ **随机密钥生成**: 自动生成安全的客户端密钥
- ✅ **灵活配置**: 支持自定义所有必要参数
- ✅ **输入验证**: 验证URL格式和必需参数
- ✅ **美观输出**: 彩色日志输出和格式化显示
- ✅ **错误处理**: 完善的错误检查和友好提示
- ✅ **配置文件**: 自动保存客户端配置到JSON文件
- ✅ **安全提醒**: 提供安全使用建议

#### 使用方法

```bash
# 基本用法（使用默认值）
./scripts/create-sso-client.sh

# 自定义参数
./scripts/create-sso-client.sh [客户端ID] [客户端名称] [重定向URI] [描述]

# 使用环境变量指定服务器地址
BASE_URL=http://localhost:8080 ./scripts/create-sso-client.sh

# 查看帮助信息
./scripts/create-sso-client.sh -h
./scripts/create-sso-client.sh --help
```

#### 参数说明

| 参数 | 说明 | 默认值 | 必填 |
|------|------|--------|------|
| 客户端ID | 唯一标识符 | `test-client-$(date +%s)` | 否 |
| 客户端名称 | 显示名称 | `Test Client` | 否 |
| 重定向URI | OAuth回调地址 | `http://localhost:3000/callback` | 否 |
| 描述 | 客户端描述 | `Test SSO Client created by script` | 否 |

#### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `BASE_URL` | 服务器地址 | `http://localhost:8080` |
| `CLIENT_SECRET` | 客户端密钥（可选） | 自动生成32位随机密钥 |

#### 示例

```bash
# 创建默认测试客户端
./scripts/create-sso-client.sh

# 创建自定义客户端
./scripts/create-sso-client.sh my-client "My Application" "http://myapp.com/callback" "My awesome SSO app"

# 指定服务器地址
BASE_URL=https://api.example.com ./scripts/create-sso-client.sh

# 使用自定义密钥
CLIENT_SECRET=my-custom-secret ./scripts/create-sso-client.sh my-client "Test App"
```

#### 输出示例

```
[INFO] 创建SSO客户端
[INFO] 客户端ID: my-test-client
[INFO] 客户端名称: Test Client
[INFO] 重定向URI: http://localhost:3000/callback
[INFO] 描述: Test SSO Client created by script
[INFO] 服务器地址: http://localhost:8080
[INFO] 客户端密钥: abcdefgh...

[INFO] 正在创建SSO客户端...
[SUCCESS] SSO客户端创建成功！

{
  "code": 201,
  "message": "SSO client created successfully",
  "data": {
    "id": "my-test-client",
    "name": "Test Client",
    "description": "Test SSO Client created by script",
    "redirect_uris": ["http://localhost:3000/callback"],
    "grant_types": ["authorization_code", "refresh_token"],
    "response_types": ["code"],
    "scope": ["openid", "profile", "email"],
    "auto_approve": false,
    "is_active": true,
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z"
  }
}

[SUCCESS] 客户端配置信息：
----------------------------------------
客户端ID (Client ID): my-test-client
客户端密钥 (Client Secret): my-secret-key-here
重定向URI (Redirect URI): http://localhost:3000/callback
授权端点 (Authorization Endpoint): http://localhost:8080/oauth/authorize
令牌端点 (Token Endpoint): http://localhost:8080/oauth/token
用户信息端点 (UserInfo Endpoint): http://localhost:8080/oauth/userinfo
----------------------------------------

[SUCCESS] 配置已保存到文件: sso-client-my-test-client.json

[WARNING] 安全提醒：
1. 请妥善保管客户端密钥 (Client Secret)
2. 客户端密钥不会在API响应中返回
3. 如果遗失密钥，需要重新创建客户端
4. 请定期更新客户端密钥
```

#### 配置文件格式

脚本会自动创建一个JSON配置文件，包含客户端的所有重要信息：

```json
{
    "client_id": "my-test-client",
    "client_secret": "my-secret-key-here",
    "redirect_uri": "http://localhost:3000/callback",
    "authorization_endpoint": "http://localhost:8080/oauth/authorize",
    "token_endpoint": "http://localhost:8080/oauth/token",
    "userinfo_endpoint": "http://localhost:8080/oauth/userinfo",
    "created_at": "2024-01-01T12:00:00Z"
}
```

#### 依赖要求

- `curl`: 用于发送HTTP请求
- `jq`: 用于格式化JSON输出（可选，但推荐）

#### 错误处理

脚本包含完善的错误处理：

- 检查必需的依赖工具
- 验证URL格式
- 检查HTTP响应状态码
- 提供友好的错误信息

#### 安全注意事项

1. **密钥保护**: 客户端密钥是敏感信息，请妥善保管
2. **权限控制**: 只有授权用户才能创建和管理客户端
3. **定期更新**: 建议定期更新客户端密钥
4. **环境隔离**: 不同环境使用不同的客户端配置

## 使用流程

1. **启动服务器**: 确保unit-auth服务器正在运行
2. **运行脚本**: 执行创建脚本
3. **保存配置**: 记录客户端ID和密钥
4. **测试连接**: 使用生成的配置测试OAuth流程
5. **生产部署**: 在生产环境中使用相应的服务器地址

## 故障排除

### 常见问题

1. **连接失败**: 检查服务器地址和网络连接
2. **权限错误**: 确保有权限访问API端点
3. **参数错误**: 检查输入参数格式
4. **依赖缺失**: 安装必要的工具（curl, jq）

### 调试模式

如需调试，可以设置以下环境变量：

```bash
DEBUG=1 ./scripts/create-sso-client.sh
```

这会显示更详细的调试信息。

## 扩展脚本

根据需要，可以在此目录下添加更多管理脚本：

- `update-sso-client.sh`: 更新客户端配置
- `delete-sso-client.sh`: 删除客户端
- `list-sso-clients.sh`: 列出所有客户端
- `test-sso-client.sh`: 测试客户端连接

## 贡献

欢迎提交改进建议和bug报告！
