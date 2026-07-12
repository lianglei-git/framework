# Unit Auth - 微服务认证系统

这是一个基于Go语言和Gin框架的现代化认证微服务，支持插件化认证方式和完整的用户统计功能。

## 🚀 功能特性

### 认证功能
- ✅ **插件化认证系统** - 支持多种认证方式
  - 邮箱密码登录
  - 手机号验证码登录
  - Google OAuth登录
  - **微信扫码登录** - 完整的OAuth2.0流程
  - GitHub OAuth登录（可扩展）
- ✅ **JWT Token认证** - 安全的无状态认证
- ✅ **邮箱验证码** - 注册和密码重置
- ✅ **短信验证码** - 手机号登录和注册
- ✅ **密码管理** - 加密存储、重置、修改

### 用户统计
- ✅ **实时统计** - 用户访问量、新增用户数
- ✅ **多维度统计** - 日、周、月、自定义时间范围
- ✅ **登录日志** - 详细的登录记录和审计
- ✅ **活跃用户** - 用户活跃度分析

### 安全特性
- ✅ **限流保护** - 防止暴力破解
- ✅ **密码加密** - bcrypt强加密
- ✅ **CORS支持** - 跨域安全配置
- ✅ **请求追踪** - 完整的请求日志
- ✅ **监控指标** - Prometheus集成

## 🏗️ 技术架构

### 核心组件
- **框架**: Gin (高性能HTTP框架)
- **数据库**: MySQL + GORM (ORM)
- **缓存**: Redis (会话和限流)
- **认证**: JWT (无状态认证)
- **监控**: Prometheus + Grafana
- **日志**: Zap (结构化日志)

### 插件系统
```
plugins/
├── plugin.go          # 插件接口定义
├── email_provider.go  # 邮箱认证提供者
├── phone_provider.go  # 手机号认证提供者
└── google_provider.go # Google OAuth提供者
```

### 服务架构
```
services/
├── stats.go           # 用户统计服务
└── cache.go           # 缓存服务
```

## 📁 项目结构

```
unit-auth/
├── main.go              # 主入口文件
├── go.mod               # Go模块文件
├── env.example          # 环境变量示例
├── README.md            # 项目说明
├── Dockerfile           # Docker配置
├── docker-compose.yml   # Docker Compose配置
├── start.sh             # 启动脚本
├── config/
│   └── config.go        # 配置管理
├── models/
│   ├── user.go          # 用户模型
│   └── database.go      # 数据库连接
├── handlers/
│   ├── auth.go          # 传统认证处理器
│   ├── plugin_auth.go   # 插件认证处理器
│   ├── stats.go         # 统计处理器
│   └── user.go          # 用户处理器
├── middleware/
│   ├── auth.go          # JWT认证中间件
│   ├── rate_limit.go    # 限流中间件
│   └── monitoring.go    # 监控中间件
├── plugins/
│   ├── plugin.go        # 插件接口
│   ├── email_provider.go
│   ├── phone_provider.go
│   └── google_provider.go
├── services/
│   ├── stats.go         # 统计服务
│   └── cache.go         # 缓存服务
└── utils/
    ├── jwt.go           # JWT工具
    └── mailer.go        # 邮件工具
```

## 🚀 快速开始

### 1. 环境准备

确保已安装：
- Go 1.26+
- MySQL 8.0+
- Redis 6.0+

### 2. 配置环境变量

```bash
cp env.example .env
```

编辑 `.env` 文件：
```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=unit_auth

# JWT配置
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRATION=24

# SMTP邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com

# Google OAuth配置
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8080/api/v1/auth/oauth/google/callback

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 微信OAuth配置
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret
WECHAT_REDIRECT_URI=http://localhost:8080/api/v1/auth/wechat/callback
```

### 3. 安装依赖

```bash
go mod tidy
```

### 4. 运行服务

```bash
./start.sh
```

或使用Docker：
```bash
docker-compose up -d
```

服务将在 `http://localhost:8080` 启动。

## 📊 API接口

### 认证接口

#### 1. 邮箱登录
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### 2. 手机号登录
```http
POST /api/v1/auth/phone-login
Content-Type: application/json

{
  "phone": "13800138000",
  "code": "123456"
}
```

#### 3. OAuth登录
```http
POST /api/v1/auth/oauth-login
Content-Type: application/json

{
  "provider": "google",
  "code": "oauth_code",
  "state": "state_string"
}
```

#### 4. 获取OAuth URL
```http
GET /api/v1/auth/oauth/google/url?state=random_state
```

#### 5. 获取可用提供者
```http
GET /api/v1/auth/providers
```

#### 6. 微信扫码登录
```http
# 获取二维码
GET /api/v1/auth/wechat/qr-code

# 处理回调（微信服务器调用）
GET /api/v1/auth/wechat/callback?code=xxx&state=xxx

# 检查登录状态
GET /api/v1/auth/wechat/status/{state}
```

### 统计接口

#### 1. 总体统计
```http
GET /api/v1/stats/overall
Authorization: Bearer <token>
```

#### 2. 每日统计
```http
GET /api/v1/stats/daily/2024-01-15
Authorization: Bearer <token>
```

#### 3. 每周统计
```http
GET /api/v1/stats/weekly?end_date=2024-01-15
Authorization: Bearer <token>
```

#### 4. 每月统计
```http
GET /api/v1/stats/monthly/2024/1
Authorization: Bearer <token>
```

#### 5. 自定义范围统计
```http
GET /api/v1/stats/range?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer <token>
```

### 用户管理接口

#### 1. 获取用户信息
```http
GET /api/v1/user/profile
Authorization: Bearer <token>
```

#### 2. 更新用户信息
```http
PUT /api/v1/user/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "nickname": "新昵称",
  "avatar": "https://example.com/avatar.jpg"
}
```

## 🔌 插件开发

### 创建新的认证提供者

1. 实现 `AuthProvider` 接口：

```go
type MyProvider struct {
    // 你的配置
}

func (mp *MyProvider) GetName() string {
    return "my_provider"
}

func (mp *MyProvider) GetType() string {
    return "custom"
}

func (mp *MyProvider) IsEnabled() bool {
    return true
}

func (mp *MyProvider) Authenticate(ctx context.Context, credentials map[string]interface{}) (*models.User, error) {
    // 实现认证逻辑
}

func (mp *MyProvider) GetAuthURL(ctx context.Context, state string) (string, error) {
    // 实现OAuth URL生成
}

func (mp *MyProvider) HandleCallback(ctx context.Context, code string, state string) (*models.User, error) {
    // 实现OAuth回调处理
}
```

2. 在 `main.go` 中注册提供者：

```go
myProvider := plugins.NewMyProvider(config)
pluginManager.RegisterProvider(myProvider)
```

## 📈 监控和日志

### Prometheus指标

访问 `http://localhost:8080/metrics` 查看Prometheus指标：

- `auth_login_total` - 登录总次数
- `auth_login_success_total` - 成功登录次数
- `auth_login_failure_total` - 失败登录次数
- `auth_registration_total` - 注册总次数
- `http_requests_total` - HTTP请求总数
- `http_request_duration_seconds` - 请求响应时间

### 日志格式

```json
{
  "level": "info",
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "req_123456",
  "message": "User login successful",
  "user_id": "user_123",
  "provider": "email",
  "ip": "192.168.1.1"
}
```

## 🔒 安全考虑

### 密码安全
- 使用bcrypt进行密码哈希
- 自动加盐处理
- 密码强度验证

### 传输安全
- 强制HTTPS（生产环境）
- JWT Token安全传输
- 敏感数据加密

### 防护机制
- 登录失败限流
- IP黑名单
- 请求频率限制
- SQL注入防护

## 🚀 部署

### Docker部署

```bash
# 构建镜像
docker build -t unit-auth .

# 运行容器
docker run -d -p 8080:8080 --env-file .env unit-auth
```

### Kubernetes部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: unit-auth
spec:
  replicas: 3
  selector:
    matchLabels:
      app: unit-auth
  template:
    metadata:
      labels:
        app: unit-auth
    spec:
      containers:
      - name: unit-auth
        image: unit-auth:latest
        ports:
        - containerPort: 8080
        env:
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: host
```

### 生产环境配置

1. 使用强密码和安全的JWT密钥
2. 配置HTTPS证书
3. 设置数据库连接池
4. 配置Redis集群
5. 设置监控告警
6. 配置日志聚合

## 🤝 贡献

欢迎提交Issue和Pull Request！

## �� 许可证

MIT License 