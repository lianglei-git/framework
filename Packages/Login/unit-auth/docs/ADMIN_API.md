# 管理员API文档

## 概述

管理员API提供了完整的用户管理功能，包括用户CRUD操作、统计分析、登录日志查看等。所有管理员接口都需要管理员权限。

## 认证

所有管理员接口都需要在请求头中包含有效的JWT token：

```
Authorization: Bearer <your-jwt-token>
```

## API端点

### 1. 用户管理

#### 1.1 获取用户列表

**GET** `/api/v1/admin/users`

获取所有用户的列表，支持分页、搜索和过滤。

**查询参数：**
- `page` (可选): 页码，默认1
- `page_size` (可选): 每页数量，默认10
- `search` (可选): 搜索关键词（用户名、邮箱、昵称）
- `status` (可选): 用户状态过滤（active, inactive, suspended, pending）
- `role` (可选): 用户角色过滤（user, admin, moderator）
- `sort_by` (可选): 排序字段，默认created_at
- `sort_order` (可选): 排序方向（asc, desc），默认desc

**响应示例：**
```json
{
  "code": 200,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "id": "499dce4e-7e06-4059-838c-326221d97001",
        "email": "admin@example.com",
        "phone": "",
        "username": "admin",
        "nickname": "管理员",
        "role": "admin",
        "status": "active",
        "email_verified": true,
        "phone_verified": false,
        "login_count": 0,
        "last_login_at": "2025-08-04T14:18:08.199+08:00",
        "created_at": "2025-08-04T14:05:53.024+08:00",
        "updated_at": "2025-08-04T14:18:08.199+08:00"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 10,
      "total": 7,
      "total_pages": 1
    }
  }
}
```

#### 1.2 获取单个用户

**GET** `/api/v1/admin/users/{id}`

获取指定用户的详细信息。

**路径参数：**
- `id`: 用户ID

**响应示例：**
```json
{
  "code": 200,
  "message": "User retrieved successfully",
  "data": {
    "id": "499dce4e-7e06-4059-838c-326221d97001",
    "email": "admin@example.com",
    "phone": "",
    "username": "admin",
    "nickname": "管理员",
    "role": "admin",
    "status": "active",
    "email_verified": true,
    "phone_verified": false,
    "login_count": 0,
    "last_login_at": "2025-08-04T14:18:08.199+08:00",
    "created_at": "2025-08-04T14:05:53.024+08:00",
    "updated_at": "2025-08-04T14:18:08.199+08:00"
  }
}
```

#### 1.3 更新用户信息

**PUT** `/api/v1/admin/users/{id}`

更新指定用户的信息。

**路径参数：**
- `id`: 用户ID

**请求体：**
```json
{
  "username": "new_username",
  "nickname": "新昵称",
  "email": "new@example.com",
  "phone": "13800138000",
  "role": "user",
  "status": "active",
  "email_verified": true,
  "phone_verified": false,
  "meta": {
    "avatar": "https://example.com/avatar.jpg",
    "bio": "用户简介"
  }
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "User updated successfully",
  "data": {
    "id": "499dce4e-7e06-4059-838c-326221d97001",
    "email": "new@example.com",
    "phone": "13800138000",
    "username": "new_username",
    "nickname": "新昵称",
    "meta": {
      "avatar": "https://example.com/avatar.jpg",
      "bio": "用户简介"
    },
    "role": "user",
    "status": "active",
    "email_verified": true,
    "phone_verified": false,
    "login_count": 0,
    "last_login_at": "2025-08-04T14:18:08.199+08:00",
    "created_at": "2025-08-04T14:05:53.024+08:00"
  }
}
```

#### 1.4 删除用户

**DELETE** `/api/v1/admin/users/{id}`

删除指定用户（软删除）。

**路径参数：**
- `id`: 用户ID

**响应示例：**
```json
{
  "code": 200,
  "message": "User deleted successfully"
}
```

#### 1.5 批量更新用户

**POST** `/api/v1/admin/users/bulk-update`

批量更新多个用户的状态。

**请求体：**
```json
{
  "user_ids": ["user_id_1", "user_id_2", "user_id_3"],
  "action": "activate"
}
```

**支持的操作：**
- `activate`: 激活用户
- `deactivate`: 停用用户
- `delete`: 删除用户

**响应示例：**
```json
{
  "code": 200,
  "message": "Bulk operation completed. Updated: 2, Deleted: 0",
  "data": {
    "updated_count": 2,
    "deleted_count": 0
  }
}
```

### 2. 统计分析

#### 2.1 用户统计

**GET** `/api/v1/admin/stats/users`

获取用户相关的统计信息。

**响应示例：**
```json
{
  "code": 200,
  "message": "User statistics retrieved successfully",
  "data": {
    "total_users": 7,
    "active_users": 6,
    "inactive_users": 1,
    "email_verified": 5,
    "phone_verified": 2,
    "admin_users": 1,
    "new_users_today": 7,
    "new_users_week": 7,
    "new_users_month": 7,
    "login_count_today": 12
  }
}
```

#### 2.2 登录日志

**GET** `/api/v1/admin/stats/login-logs`

获取登录日志，支持分页和过滤。

**查询参数：**
- `page` (可选): 页码，默认1
- `page_size` (可选): 每页数量，默认20
- `user_id` (可选): 用户ID过滤
- `provider` (可选): 登录方式过滤（email, phone, google, wechat）
- `success` (可选): 登录成功状态过滤（true, false）
- `start_date` (可选): 开始日期
- `end_date` (可选): 结束日期

**响应示例：**
```json
{
  "code": 200,
  "message": "Login logs retrieved successfully",
  "data": {
    "logs": [
      {
        "id": 1,
        "user_id": "499dce4e-7e06-4059-838c-326221d97001",
        "provider": "email",
        "ip": "::1",
        "user_agent": "curl/8.9.1",
        "location": "",
        "success": true,
        "error_msg": "",
        "created_at": "2025-08-04T14:18:08.199+08:00"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 20,
      "total_pages": 1
    }
  }
}
```

### 3. 系统管理

#### 3.1 验证码统计

**GET** `/api/v1/admin/verification-stats`

获取验证码相关的统计信息。

**响应示例：**
```json
{
  "code": 200,
  "message": "Verification stats retrieved successfully",
  "data": {
    "email_verifications": 0,
    "sms_verifications": 0,
    "expired_codes": 0,
    "used_codes": 0
  }
}
```

#### 3.2 清理验证码

**POST** `/api/v1/admin/cleanup-verifications`

清理过期的验证码。

**响应示例：**
```json
{
  "code": 200,
  "message": "Verification cleanup completed"
}
```

## 角色和权限

### 用户角色

- `user`: 普通用户
- `admin`: 管理员
- `moderator`: 版主

### 用户状态

- `active`: 活跃
- `inactive`: 非活跃
- `suspended`: 已暂停
- `pending`: 待审核

## 错误处理

### 常见错误码

- `400`: 请求参数错误
- `401`: 未认证
- `403`: 权限不足
- `404`: 资源不存在
- `500`: 服务器内部错误

### 错误响应格式

```json
{
  "code": 400,
  "message": "Invalid request data: validation error"
}
```

## 使用示例

### 获取用户列表（带搜索和过滤）

```bash
curl -X GET "http://localhost:8080/api/v1/admin/users?search=admin&status=active&page=1&page_size=5" \
  -H "Authorization: Bearer your-jwt-token"
```

### 更新用户信息

```bash
curl -X PUT "http://localhost:8080/api/v1/admin/users/user-id" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "nickname": "新昵称",
    "role": "moderator",
    "status": "active"
  }'
```

### 批量激活用户

```bash
curl -X POST "http://localhost:8080/api/v1/admin/users/bulk-update" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "user_ids": ["user-id-1", "user-id-2"],
    "action": "activate"
  }'
```

## 注意事项

1. 所有管理员接口都需要管理员权限
2. 用户删除采用软删除方式
3. 批量操作使用数据库事务确保数据一致性
4. 搜索功能支持模糊匹配
5. 分页参数有合理的默认值和上限
6. 所有时间字段使用ISO 8601格式 