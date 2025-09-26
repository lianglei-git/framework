# Create SSO Client Scripts - 快速开始指南

## 概述

这个指南将帮助您快速使用 CreateSSOClient 脚本来创建和管理 SSO 客户端。

## 环境准备

### 1. 安装依赖工具
```bash
# macOS
brew install curl jq

# Ubuntu/Debian
sudo apt install curl jq

# CentOS/RHEL
sudo yum install curl jq
```

### 2. 启动测试服务器（推荐）
```bash
cd /path/to/unit-auth
./scripts/start-test-server.sh  # 启动测试服务器（推荐）
# 或者指定端口：
# ./scripts/start-test-server.sh 3000
```

### 3. 或者手动启动服务器
```bash
cd /path/to/unit-auth
export UNIT_AUTH_TEST_MODE=true  # 启用测试模式
./unit-auth  # 或者使用其他启动方式
```

## 快速使用

### 方法一：启动测试服务器 + 使用创建脚本（完整测试）

```bash
# 1. 启动测试服务器
./scripts/start-test-server.sh

# 2. 在另一个终端窗口中创建客户端
./scripts/create-sso-client.sh

# 3. 或者自定义参数
./scripts/create-sso-client.sh my-app "My App" "http://myapp.com/callback" "My application"
```

### 方法二：使用测试脚本（无需服务器）

```bash
# 基本使用（默认参数）
./scripts/test-create-sso-client.sh

# 自定义参数
./scripts/test-create-sso-client.sh my-app "My Application" "http://myapp.com/callback" "My awesome app"

# 查看帮助
./scripts/test-create-sso-client.sh -h
```

### 方法三：连接现有服务器

```bash
# 基本使用
./scripts/create-sso-client.sh

# 自定义参数
./scripts/create-sso-client.sh my-client "My Client" "http://localhost:3000/callback" "Production client"

# 指定服务器地址
BASE_URL=https://api.mycompany.com ./scripts/create-sso-client.sh

# 查看帮助
./scripts/create-sso-client.sh -h
```

## 常见使用场景

### 场景1：完整开发测试流程
```bash
# 1. 启动测试服务器
./scripts/start-test-server.sh

# 2. 在新终端窗口创建测试客户端
./scripts/create-sso-client.sh

# 3. 或者创建自定义客户端
./scripts/create-sso-client.sh \
  "my-dev-app" \
  "My Development App" \
  "http://localhost:3000/oauth/callback" \
  "Development SSO client"
```

### 场景2：快速原型测试
```bash
# 使用测试脚本快速验证逻辑
./scripts/test-create-sso-client.sh

# 自定义测试参数
./scripts/test-create-sso-client.sh \
  "prototype-app" \
  "Prototype Application" \
  "http://prototype.example.com/callback" \
  "Prototype client for testing"
```

### 场景3：生产环境部署
```bash
# 1. 启动服务器（确保已设置 UNIT_AUTH_TEST_MODE=true）
export UNIT_AUTH_TEST_MODE=true
./unit-auth &

# 2. 创建生产客户端
BASE_URL=https://api.production.com ./scripts/create-sso-client.sh \
  "prod-client-$(date +%Y%m%d)" \
  "Production Client" \
  "https://myapp.com/oauth/callback" \
  "Production SSO client"
```

### 场景4：批量创建多个客户端
```bash
# 为不同的环境创建客户端
for env in dev staging prod; do
  echo "Creating client for $env environment..."
  BASE_URL="https://api.$env.mycompany.com" \
  ./scripts/create-sso-client.sh \
    "client-$env" \
    "Client for $env" \
    "https://myapp-$env.com/callback" \
    "SSO client for $env environment"
done
```

### 场景5：CI/CD 集成
```bash
# 在CI/CD中使用测试脚本
./scripts/test-create-sso-client.sh \
  "ci-client-$(date +%s)" \
  "CI Test Client" \
  "http://ci.example.com/callback" \
  "Automated CI/CD test client"
```

## 输出示例

运行脚本后，您会看到类似这样的输出：

```
[INFO] 客户端ID: my-test-client
[INFO] 客户端名称: My Test App
[INFO] 重定向URI: http://localhost:3000/callback
[INFO] 描述: Test application created by script
[INFO] 服务器地址: http://localhost:8080
[INFO] 客户端密钥: abcdefgh...

[SUCCESS] SSO客户端创建成功！

{
  "code": 201,
  "message": "SSO client created successfully",
  "data": {
    "id": "my-test-client",
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
客户端ID (Client ID): my-test-client
客户端密钥 (Client Secret): my-secret-key-here
重定向URI (Redirect URI): http://localhost:3000/callback
授权端点 (Authorization Endpoint): http://localhost:8080/oauth/authorize
令牌端点 (Token Endpoint): http://localhost:8080/oauth/token
用户信息端点 (UserInfo Endpoint): http://localhost:8080/oauth/userinfo
----------------------------------------

[SUCCESS] 配置已保存到文件: sso-client-my-test-client.json
```

## 配置文件

脚本会自动生成一个JSON配置文件，包含所有必要信息：

```json
{
    "client_id": "my-test-client",
    "client_secret": "my-secret-key-here",
    "redirect_uri": "http://localhost:3000/callback",
    "authorization_endpoint": "http://localhost:8080/oauth/authorize",
    "token_endpoint": "http://localhost:8080/oauth/token",
    "userinfo_endpoint": "http://localhost:8080/oauth/userinfo",
    "created_at": "2025-09-26T11:38:21Z"
}
```

**重要**：请妥善保管这个配置文件，特别是客户端密钥。

## 故障排除

### 问题1：命令未找到
```bash
# 确保在正确的目录下
cd /path/to/unit-auth

# 检查脚本权限
ls -la scripts/create-sso-client.sh
ls -la scripts/start-test-server.sh
ls -la scripts/test-create-sso-client.sh

# 添加执行权限（如果需要）
chmod +x scripts/create-sso-client.sh
chmod +x scripts/start-test-server.sh
chmod +x scripts/test-create-sso-client.sh
```

### 问题2：启动服务器失败
```bash
# 检查Go版本
go version

# 检查依赖
go mod tidy

# 查看详细错误信息
./scripts/start-test-server.sh 2>&1 | tee server.log

# 手动构建
go build -o unit-auth .
```

### 问题3：连接失败
```bash
# 检查服务器是否运行
curl http://localhost:8080/api/v1/health

# 检查端口是否被占用
lsof -i :8080

# 尝试不同的端口
./scripts/start-test-server.sh 3000

# 检查网络连接
ping localhost

# 尝试不同的地址
BASE_URL=http://localhost:8080 ./scripts/create-sso-client.sh
```

### 问题4：权限不足
```bash
# 确保有权限访问API端点
# 检查API是否需要认证
# 尝试使用测试脚本验证逻辑
./scripts/test-create-sso-client.sh

# 手动设置测试模式
export UNIT_AUTH_TEST_MODE=true
./unit-auth
```

### 问题5：参数错误
```bash
# 查看帮助信息
./scripts/create-sso-client.sh -h
./scripts/start-test-server.sh -h

# 检查URL格式
# 确保重定向URI以http://或https://开头

# 验证JSON格式
echo '{"name": "test"}' | jq .
```

### 问题6：Go版本问题
```bash
# 检查Go版本
go version

# 如果版本过低，安装新版本
# macOS
brew install go

# Ubuntu/Debian
sudo apt update && sudo apt install golang-go

# 验证安装
go version
```

### 问题7：依赖工具缺失
```bash
# 安装curl和jq
# macOS
brew install curl jq

# Ubuntu/Debian
sudo apt install curl jq

# CentOS/RHEL
sudo yum install curl jq

# 验证安装
curl --version
jq --version
```

## 最佳实践

### 1. 开发环境
- 使用测试脚本快速验证逻辑
- 使用描述性的客户端名称和ID
- 记录所有创建的客户端信息

### 2. 生产环境
- 使用唯一的客户端ID（建议包含环境标识）
- 设置合适的重定向URI
- 定期更新客户端密钥
- 妥善保管配置文件

### 3. 安全注意事项
- **永远不要**将客户端密钥提交到版本控制系统
- **定期更新**客户端密钥
- **不同环境**使用不同的客户端配置
- **监控**客户端的使用情况

## 扩展功能

### 批量操作
```bash
# 为多个环境创建客户端
for env in dev test staging prod; do
  echo "Creating client for $env environment..."
  BASE_URL="https://api.$env.example.com" \
  ./scripts/create-sso-client.sh \
    "app-$env" \
    "Application $env" \
    "https://app-$env.example.com/callback" \
    "SSO client for $env"
done
```

### 配置管理
```bash
# 保存配置到环境变量
export CLIENT_ID="my-app"
export CLIENT_SECRET="generated-secret"
export REDIRECT_URI="http://myapp.com/callback"

# 使用环境变量
envsubst < client-template.json > client-config.json
```

## 获得帮助

- 查看脚本帮助：`./scripts/create-sso-client.sh -h`
- 查看完整文档：`./scripts/README.md`
- 报告问题：请在项目中创建issue

---

**注意**：请确保在使用前仔细阅读安全提醒，并妥善保管生成的客户端密钥。
