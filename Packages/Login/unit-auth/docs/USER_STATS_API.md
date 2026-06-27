# 用户统计API文档

## 概述

本文档描述了用户统计相关的API接口，包括用户统计、登录统计和每日统计功能。

## 认证要求

所有统计API都需要JWT认证，请在请求头中包含有效的Authorization token：

```
Authorization: Bearer <your_jwt_token>
```

## API端点

### 1. 用户统计

**GET** `/api/v1/stats/users`

获取用户统计信息，包括用户总数、活跃用户、验证状态等。

#### 响应示例

```json
{
  "code": 200,
  "message": "User statistics retrieved successfully",
  "data": {
    "total_users": 150,
    "active_users": 120,
    "inactive_users": 30,
    "email_verified": 100,
    "phone_verified": 80,
    "admin_users": 5,
    "regular_users": 145,
    "new_users_today": 3,
    "new_users_week": 15,
    "new_users_month": 45,
    "login_count_today": 25,
    "login_count_week": 180,
    "login_count_month": 750
  }
}
```

#### 字段说明

- `total_users`: 总用户数
- `active_users`: 活跃用户数（状态为active）
- `inactive_users`: 非活跃用户数（状态为inactive）
- `email_verified`: 邮箱验证用户数
- `phone_verified`: 手机验证用户数
- `admin_users`: 管理员用户数
- `regular_users`: 普通用户数
- `new_users_today`: 今日新用户数
- `new_users_week`: 本周新用户数
- `new_users_month`: 本月新用户数
- `login_count_today`: 今日登录次数
- `login_count_week`: 本周登录次数
- `login_count_month`: 本月登录次数

### 2. 登录统计

**GET** `/api/v1/stats/logins`

获取登录统计信息，支持按时间范围和登录提供商过滤。

#### 查询参数

- `start_date` (可选): 开始日期，格式：YYYY-MM-DD，默认：30天前
- `end_date` (可选): 结束日期，格式：YYYY-MM-DD，默认：今天
- `provider` (可选): 登录提供商，如：email, phone, google, github, wechat

#### 请求示例

```
GET /api/v1/stats/logins?start_date=2025-08-01&end_date=2025-08-05&provider=email
```

#### 响应示例

```json
{
  "code": 200,
  "message": "Login statistics retrieved successfully",
  "data": {
    "stats": {
      "total_logins": 150,
      "successful_logins": 140,
      "failed_logins": 10,
      "unique_users": 85,
      "today_logins": 25,
      "week_logins": 180,
      "month_logins": 750,
      "provider_stats": {
        "email": 80,
        "phone": 45,
        "google": 15
      }
    },
    "start_date": "2025-08-01",
    "end_date": "2025-08-05",
    "provider": "email"
  }
}
```

#### 字段说明

- `total_logins`: 总登录次数
- `successful_logins`: 成功登录次数
- `failed_logins`: 失败登录次数
- `unique_users`: 唯一用户数
- `today_logins`: 今日登录次数
- `week_logins`: 本周登录次数
- `month_logins`: 本月登录次数
- `provider_stats`: 按提供商统计的登录次数

### 3. 每日统计

**GET** `/api/v1/stats/daily-enhanced`

获取每日统计信息，支持自定义日期范围和天数。

#### 查询参数

- `date` (可选): 目标日期，格式：YYYY-MM-DD，默认：今天
- `days` (可选): 查询天数，范围：1-365，默认：7天

#### 请求示例

```
GET /api/v1/stats/daily-enhanced?date=2025-08-05&days=7
```

#### 响应示例

```json
{
  "code": 200,
  "message": "Daily statistics retrieved successfully",
  "data": {
    "daily_stats": [
      {
        "date": "2025-07-30",
        "new_users": 2,
        "active_users": 15,
        "login_count": 25,
        "unique_logins": 12,
        "email_verified": 95,
        "phone_verified": 78
      },
      {
        "date": "2025-07-31",
        "new_users": 3,
        "active_users": 18,
        "login_count": 30,
        "unique_logins": 15,
        "email_verified": 98,
        "phone_verified": 80
      }
    ],
    "start_date": "2025-07-30",
    "end_date": "2025-08-05",
    "days": 7
  }
}
```

#### 字段说明

每个日期包含以下统计信息：
- `date`: 日期
- `new_users`: 新用户数
- `active_users`: 活跃用户数（当日有登录的用户）
- `login_count`: 登录次数
- `unique_logins`: 唯一登录用户数
- `email_verified`: 邮箱验证用户数
- `phone_verified`: 手机验证用户数

## 错误响应

### 401 Unauthorized
```json
{
  "code": 401,
  "message": "Invalid or expired token"
}
```

### 400 Bad Request
```json
{
  "code": 400,
  "message": "Invalid date format. Use YYYY-MM-DD"
}
```

### 500 Internal Server Error
```json
{
  "code": 500,
  "message": "Failed to get statistics"
}
```

## 使用示例

### 1. 获取用户统计
```bash
curl -X GET "http://localhost:8080/api/v1/stats/users" \
  -H "Authorization: Bearer your_jwt_token"
```

### 2. 获取登录统计（最近30天）
```bash
curl -X GET "http://localhost:8080/api/v1/stats/logins" \
  -H "Authorization: Bearer your_jwt_token"
```

### 3. 获取登录统计（指定日期范围）
```bash
curl -X GET "http://localhost:8080/api/v1/stats/logins?start_date=2025-08-01&end_date=2025-08-05" \
  -H "Authorization: Bearer your_jwt_token"
```

### 4. 获取每日统计（最近7天）
```bash
curl -X GET "http://localhost:8080/api/v1/stats/daily-enhanced" \
  -H "Authorization: Bearer your_jwt_token"
```

### 5. 获取每日统计（指定日期和天数）
```bash
curl -X GET "http://localhost:8080/api/v1/stats/daily-enhanced?date=2025-08-05&days=14" \
  -H "Authorization: Bearer your_jwt_token"
```

## 测试脚本

使用提供的测试脚本进行API测试：

```bash
./test_user_stats.sh
```

## 注意事项

1. **认证要求**: 所有API都需要有效的JWT token
2. **日期格式**: 使用YYYY-MM-DD格式
3. **时区**: 所有时间都使用服务器本地时区
4. **性能**: 大量数据查询可能需要较长时间
5. **缓存**: 建议在客户端实现适当的缓存机制

## 数据更新频率

- 用户统计：实时更新
- 登录统计：实时更新
- 每日统计：实时计算，基于当前数据库状态 