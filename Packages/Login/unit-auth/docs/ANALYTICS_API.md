# 统计分析和监控API文档

## 概述

统计分析和监控API提供了全面的数据分析和系统监控功能，包括用户增长分析、登录行为分析、用户行为分析、系统性能监控和实时指标等。所有统计接口都需要管理员权限。

## 认证

所有统计接口都需要在请求头中包含有效的JWT token：

```
Authorization: Bearer <your-jwt-token>
```

## API端点

### 1. 用户增长分析

**GET** `/api/v1/admin/analytics/user-growth`

分析用户注册增长趋势，支持多种时间段和分组方式。

**查询参数：**
- `period` (可选): 时间段，支持 `1h`, `6h`, `24h`, `7d`, `30d`, `90d`, `1y`，默认 `7d`
- `group_by` (可选): 分组方式，支持 `day`, `week`, `month`，默认 `day`

**响应示例：**
```json
{
  "code": 200,
  "message": "User growth analytics retrieved successfully",
  "data": {
    "period": "7d",
    "start_date": "2025-07-28T14:25:49.869183+08:00",
    "end_date": "2025-08-04T14:25:49.869183+08:00",
    "data": [
      {
        "date": "2025-08-04T00:00:00+08:00",
        "count": 7
      }
    ],
    "summary": {
      "total_growth": 7,
      "avg_daily_growth": 1,
      "growth_rate": 0,
      "previous_period": 0
    },
    "trends": {
      "trend": "increasing"
    }
  }
}
```

### 2. 登录行为分析

**GET** `/api/v1/admin/analytics/login-behavior`

分析用户登录行为，包括成功率、高峰时段、登录渠道等。

**查询参数：**
- `period` (可选): 时间段，支持 `1h`, `6h`, `24h`, `7d`, `30d`, `90d`, `1y`，默认 `7d`
- `provider` (可选): 登录方式过滤（email, phone, google, wechat）

**响应示例：**
```json
{
  "code": 200,
  "message": "Login analytics retrieved successfully",
  "data": {
    "period": "7d",
    "start_date": "2025-07-28T14:25:57.283605+08:00",
    "end_date": "2025-08-04T14:25:57.283605+08:00",
    "data": {
      "provider_stats": [
        {
          "provider": "email",
          "count": 19,
          "success_count": 11,
          "success_rate": 57.89
        },
        {
          "provider": "phone",
          "count": 1,
          "success_count": 1,
          "success_rate": 100
        }
      ],
      "time_stats": [
        {
          "hour": 9,
          "count": 2
        },
        {
          "hour": 13,
          "count": 10
        }
      ]
    },
    "summary": {
      "total_logins": 20,
      "successful_logins": 12,
      "success_rate": 60,
      "active_users": 7
    },
    "trends": {
      "peak_hours": [13]
    }
  }
}
```

### 3. 用户行为分析

**GET** `/api/v1/admin/analytics/user-behavior`

分析用户行为模式，包括留存率、活跃度、注册渠道等。

**查询参数：**
- `period` (可选): 时间段，支持 `7d`, `30d`, `90d`, `1y`，默认 `30d`

**响应示例：**
```json
{
  "code": 200,
  "message": "User behavior analytics retrieved successfully",
  "data": {
    "period": "30d",
    "start_date": "2025-07-05T14:26:10.457933+08:00",
    "end_date": "2025-08-04T14:26:10.457933+08:00",
    "data": {
      "retention": [
        {
          "day": 1,
          "retained": 0,
          "total": 0,
          "rate": 0
        }
      ],
      "activity": [
        {
          "activity_level": "high",
          "count": 7,
          "percentage": 100
        }
      ],
      "channels": [
        {
          "channel": "email",
          "count": 5,
          "percentage": 71.43
        },
        {
          "channel": "phone",
          "count": 4,
          "percentage": 57.14
        },
        {
          "channel": "oauth",
          "count": 2,
          "percentage": 28.57
        }
      ]
    },
    "summary": {
      "total_users": 7,
      "avg_retention_rate": 0
    },
    "trends": {
      "retention_trend": "stable"
    }
  }
}
```

### 4. 系统性能分析

**GET** `/api/v1/admin/analytics/system-performance`

监控系统性能指标，包括响应时间、错误率、资源使用等。

**查询参数：**
- `period` (可选): 时间段，支持 `1h`, `6h`, `24h`, `7d`，默认 `24h`

**响应示例：**
```json
{
  "code": 200,
  "message": "System performance analytics retrieved successfully",
  "data": {
    "period": "24h",
    "start_date": "2025-08-03T14:26:56.428153+08:00",
    "end_date": "2025-08-04T14:26:56.428153+08:00",
    "data": {
      "response_times": [
        {
          "endpoint": "/api/v1/auth/login",
          "avg_response_time": 150.5,
          "max_response_time": 500,
          "min_response_time": 50,
          "request_count": 1000
        }
      ],
      "errors": [
        {
          "error_type": "authentication",
          "count": 8,
          "percentage": 57.14
        }
      ],
      "database": {
        "total_queries": 5000,
        "avg_query_time": 25.5,
        "slow_queries": 50,
        "connection_count": 10
      },
      "resources": {
        "cpu_usage": 45.2,
        "memory_usage": 68.7,
        "disk_usage": 23.1,
        "network_io": 1024.5
      }
    },
    "summary": {
      "total_requests": 1700,
      "error_rate": 0.82,
      "avg_response_time": 216.5
    },
    "trends": {
      "performance_trend": "stable",
      "error_trend": "decreasing"
    }
  }
}
```

### 5. 实时监控指标

**GET** `/api/v1/admin/analytics/real-time`

获取系统实时监控指标，包括在线用户、系统状态、最近活动等。

**响应示例：**
```json
{
  "code": 200,
  "message": "Real-time metrics retrieved successfully",
  "data": {
    "timestamp": "2025-08-04T14:27:06.702344+08:00",
    "user_stats": {
      "online_users": 1,
      "active_sessions": 3,
      "recent_logins": 3,
      "recent_registrations": 2
    },
    "system_metrics": {
      "cpu_usage": 42.5,
      "memory_usage": 65.8,
      "disk_usage": 23.1,
      "network_io": 856.2,
      "request_rate": 125.3,
      "error_rate": 2.1
    },
    "recent_activities": [
      {
        "type": "login",
        "user_id": "367bf05b-305e-4f40-971c-98e052a40339",
        "username": "testuser7",
        "action": "登录成功 (email)",
        "timestamp": "2025-08-04T13:46:37.281+08:00"
      }
    ]
  }
}
```

## 时间段说明

### 支持的时间段
- `1h`: 最近1小时
- `6h`: 最近6小时
- `24h`: 最近24小时
- `7d`: 最近7天
- `30d`: 最近30天
- `90d`: 最近90天
- `1y`: 最近1年

### 分组方式
- `day`: 按天分组
- `week`: 按周分组
- `month`: 按月分组

## 数据说明

### 用户增长分析
- **total_growth**: 总增长用户数
- **avg_daily_growth**: 平均每日增长
- **growth_rate**: 增长率（与同期对比）
- **previous_period**: 同期数据

### 登录行为分析
- **success_rate**: 登录成功率
- **peak_hours**: 高峰时段
- **provider_stats**: 各登录方式统计
- **time_stats**: 按小时统计

### 用户行为分析
- **retention**: 留存率数据（1-7天）
- **activity**: 活跃度分布（高/中/低/不活跃）
- **channels**: 注册渠道分布

### 系统性能分析
- **response_times**: 各接口响应时间
- **errors**: 错误类型分布
- **database**: 数据库性能指标
- **resources**: 系统资源使用情况

### 实时监控
- **online_users**: 在线用户数
- **active_sessions**: 活跃会话数
- **system_metrics**: 系统实时指标
- **recent_activities**: 最近活动记录

## 使用示例

### 获取7天用户增长分析
```bash
curl -X GET "http://localhost:8080/api/v1/admin/analytics/user-growth?period=7d&group_by=day" \
  -H "Authorization: Bearer your-jwt-token"
```

### 获取登录行为分析
```bash
curl -X GET "http://localhost:8080/api/v1/admin/analytics/login-behavior?period=30d" \
  -H "Authorization: Bearer your-jwt-token"
```

### 获取实时监控指标
```bash
curl -X GET "http://localhost:8080/api/v1/admin/analytics/real-time" \
  -H "Authorization: Bearer your-jwt-token"
```

### 获取系统性能分析
```bash
curl -X GET "http://localhost:8080/api/v1/admin/analytics/system-performance?period=24h" \
  -H "Authorization: Bearer your-jwt-token"
```

## 错误处理

### 常见错误码
- `400`: 请求参数错误
- `401`: 未认证
- `403`: 权限不足
- `500`: 服务器内部错误

### 错误响应格式
```json
{
  "code": 400,
  "message": "Invalid period parameter"
}
```

## 性能优化

### 查询优化
- 所有统计查询都使用数据库索引
- 支持分页和缓存机制
- 复杂查询使用数据库聚合函数

### 数据缓存
- 实时数据不缓存
- 历史数据支持缓存
- 缓存时间根据数据更新频率调整

## 注意事项

1. 所有统计接口都需要管理员权限
2. 时间段参数会影响查询性能，建议合理选择
3. 实时监控数据为当前时刻快照
4. 历史数据可能存在延迟
5. 系统性能数据为模拟数据，实际部署时需要集成真实的监控系统
6. 所有时间字段使用ISO 8601格式
7. 数据统计基于数据库现有数据，确保数据完整性

## 扩展功能

### 可扩展的统计维度
- 地理位置分析
- 设备类型分析
- 用户画像分析
- 业务指标分析

### 可集成的监控系统
- Prometheus + Grafana
- ELK Stack
- 自定义监控面板
- 告警系统 