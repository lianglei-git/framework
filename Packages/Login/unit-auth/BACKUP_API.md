# 用户数据备份API文档

## 概述

本文档描述了用户数据备份和恢复相关的API接口，包括数据导出、导入、验证和信息查询功能。

## 认证要求

所有备份API都需要管理员权限，请在请求头中包含有效的管理员JWT token：

```
Authorization: Bearer <your_admin_jwt_token>
```

## API端点

### 1. 导出备份

**POST** `/api/v1/admin/backup/export`

导出用户数据为ZIP格式的备份文件。

#### 请求参数

```json
{
  "description": "备份描述",
  "include_logs": true
}
```

#### 参数说明

- `description` (可选): 备份描述信息
- `include_logs` (可选): 是否包含登录日志，默认false

#### 响应

返回ZIP文件下载，包含以下文件：
- `backup.json`: 主要备份数据
- `README.txt`: 备份说明文件

#### 备份数据结构

```json
{
  "version": "1.0",
  "created_at": "2025-08-05T13:30:00Z",
  "description": "备份描述",
  "users": [...],
  "login_logs": [...],
  "user_stats": [...],
  "email_verifications": [...],
  "sms_verifications": [...],
  "password_resets": [...],
  "wechat_qr_sessions": [...]
}
```

### 2. 导入备份

**POST** `/api/v1/admin/backup/import`

从ZIP文件导入用户数据备份。

#### 请求参数

使用 `multipart/form-data` 格式上传文件：

```
backup_file: <ZIP文件>
```

#### 响应示例

```json
{
  "code": 200,
  "message": "Backup imported successfully",
  "data": {
    "imported_users": 150,
    "imported_logs": 500,
    "backup_version": "1.0",
    "backup_date": "2025-08-05 13:30:00"
  }
}
```

#### ⚠️ 重要警告

- 导入操作会**完全覆盖**现有数据
- 建议在导入前先导出当前数据作为备份
- 导入过程不可逆，请谨慎操作

### 3. 获取备份信息

**GET** `/api/v1/admin/backup/info`

获取当前数据库的备份相关信息。

#### 响应示例

```json
{
  "code": 200,
  "message": "Backup info retrieved successfully",
  "data": {
    "total_users": 150,
    "total_login_logs": 500,
    "total_user_stats": 30,
    "total_email_verifications": 200,
    "total_sms_verifications": 100,
    "total_password_resets": 50,
    "total_wechat_qr_sessions": 20,
    "database_size": "Unknown",
    "last_backup": null
  }
}
```

### 4. 验证备份文件

**POST** `/api/v1/admin/backup/validate`

验证备份文件的完整性和格式。

#### 请求参数

使用 `multipart/form-data` 格式上传文件：

```
backup_file: <ZIP文件>
```

#### 响应示例

```json
{
  "code": 200,
  "message": "Backup validation completed",
  "data": {
    "is_valid": true,
    "version": "1.0",
    "created_at": "2025-08-05T13:30:00Z",
    "description": "测试备份",
    "user_count": 150,
    "log_count": 500,
    "stats_count": 30,
    "email_ver_count": 200,
    "sms_ver_count": 100,
    "password_reset_count": 50,
    "wechat_qr_count": 20,
    "errors": []
  }
}
```

## 使用示例

### 1. 导出备份

```bash
# 导出包含日志的完整备份
curl -X POST "http://localhost:8080/api/v1/admin/backup/export" \
  -H "Authorization: Bearer your_admin_token" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "完整备份 - 2025-08-05",
    "include_logs": true
  }' \
  -o backup.zip
```

### 2. 验证备份文件

```bash
# 验证备份文件
curl -X POST "http://localhost:8080/api/v1/admin/backup/validate" \
  -H "Authorization: Bearer your_admin_token" \
  -F "backup_file=@backup.zip"
```

### 3. 获取备份信息

```bash
# 获取当前数据库信息
curl -X GET "http://localhost:8080/api/v1/admin/backup/info" \
  -H "Authorization: Bearer your_admin_token"
```

### 4. 导入备份（谨慎操作）

```bash
# 导入备份文件
curl -X POST "http://localhost:8080/api/v1/admin/backup/import" \
  -H "Authorization: Bearer your_admin_token" \
  -F "backup_file=@backup.zip"
```

## 备份文件结构

### ZIP文件内容

```
backup.zip
├── backup.json          # 主要备份数据
└── README.txt          # 备份说明文件
```

### backup.json 结构

```json
{
  "version": "1.0",
  "created_at": "2025-08-05T13:30:00Z",
  "description": "备份描述",
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "nickname": "昵称",
      "role": "user",
      "status": "active",
      "created_at": "2025-08-05T13:30:00Z",
      "updated_at": "2025-08-05T13:30:00Z"
    }
  ],
  "login_logs": [...],
  "user_stats": [...],
  "email_verifications": [...],
  "sms_verifications": [...],
  "password_resets": [...],
  "wechat_qr_sessions": [...]
}
```

## 错误响应

### 401 Unauthorized
```json
{
  "code": 401,
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "code": 403,
  "message": "Admin access required"
}
```

### 400 Bad Request
```json
{
  "code": 400,
  "message": "Invalid backup file format"
}
```

### 500 Internal Server Error
```json
{
  "code": 500,
  "message": "Failed to export backup"
}
```

## 安全注意事项

### 1. 权限控制
- 所有备份操作都需要管理员权限
- 备份文件包含敏感信息，请妥善保管

### 2. 数据安全
- 备份文件包含用户密码哈希等敏感信息
- 建议对备份文件进行加密存储
- 定期清理过期的备份文件

### 3. 导入风险
- 导入操作会完全覆盖现有数据
- 建议在导入前进行数据验证
- 导入过程不可逆，请谨慎操作

## 最佳实践

### 1. 备份策略
- 定期进行数据备份（建议每日）
- 保留多个版本的备份文件
- 将备份文件存储在不同的物理位置

### 2. 导入策略
- 导入前先验证备份文件
- 在测试环境中先验证导入结果
- 导入后验证数据完整性

### 3. 监控和日志
- 记录所有备份和导入操作
- 监控备份文件大小和数量
- 设置备份失败告警

## 测试脚本

使用提供的测试脚本进行API测试：

```bash
./test_backup.sh
```

## 故障排除

### 常见问题

1. **备份文件过大**
   - 检查是否包含了不必要的日志数据
   - 考虑分表备份或增量备份

2. **导入失败**
   - 验证备份文件格式是否正确
   - 检查数据库连接和权限
   - 查看服务器日志获取详细错误信息

3. **权限问题**
   - 确保使用管理员token
   - 检查token是否过期
   - 验证用户是否有管理员权限

### 调试命令

```bash
# 检查备份文件内容
unzip -l backup.zip

# 查看备份JSON内容
unzip -p backup.zip backup.json | jq .

# 验证备份文件格式
file backup.zip
``` 