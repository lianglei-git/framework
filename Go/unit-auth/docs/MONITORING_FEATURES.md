# 监控功能说明

## 概述

本系统实现了完整的Prometheus监控功能，包括认证指标、HTTP请求统计和用户活跃度分析。

## Prometheus指标

### 认证指标
- `auth_login_total` - 登录总次数
- `auth_login_success_total` - 成功登录次数
- `auth_login_failure_total` - 失败登录次数
- `auth_registration_total` - 注册总次数

### HTTP请求指标
- `http_requests_total` - HTTP请求总数（按方法、端点、状态码分类）
- `http_request_duration_seconds` - 请求响应时间（直方图）

## 用户活跃度统计

### 日活跃用户
- 统计每日活跃用户数量
- 支持查询指定日期的活跃用户数
- 自动清理3个月前的历史数据

### 月活跃用户
- 统计每月活跃用户数量
- 支持查询指定月份的活跃用户数
- 自动清理3个月前的历史数据

### 有效用户
- 统计过去30天内有活动的用户数量
- 用于计算用户留存率

## API端点

### Prometheus指标
- `GET /metrics` - Prometheus格式的指标数据

### 监控API
- `GET /api/monitoring/prometheus` - Prometheus指标端点信息
- `GET /api/monitoring/metrics` - 自定义指标数据
- `GET /api/monitoring/user-activity/stats` - 用户活跃度统计
- `GET /api/monitoring/user-activity/details` - 用户活跃度详情
- `GET /api/monitoring/user-activity/daily` - 日活跃用户数
- `GET /api/monitoring/user-activity/monthly` - 月活跃用户数
- `GET /api/monitoring/user-activity/top` - 最活跃用户
- `GET /api/monitoring/health` - 系统健康状态
- `GET /api/monitoring/summary` - 指标摘要
- `GET /api/monitoring/metrics/by-period` - 按时间段获取指标
- `GET /api/monitoring/metrics/history` - 指标历史数据
- `POST /api/monitoring/export` - 导出指标到数据库

## 中间件集成

### 活动记录中间件
- `ActivityMiddleware` - 记录用户活跃度
- `LoginActivityMiddleware` - 记录登录活动
- `RegistrationActivityMiddleware` - 记录注册活动

### 使用示例
```go
// 在路由中集成监控中间件
r.Use(middleware.ActivityMiddleware(monitoringService))
r.Use(middleware.LoginActivityMiddleware(monitoringService))
r.Use(middleware.RegistrationActivityMiddleware(monitoringService))
```

## 数据存储

### 内存存储
- 用户活跃度数据存储在内存中
- 支持缓存机制，提高查询性能
- 定期清理过期数据

### 数据库存储
- 指标定义存储在`metrics`表
- 指标值存储在`metric_values`表
- 支持历史数据查询和分析

## 监控服务

### MonitoringService
- 管理Prometheus指标
- 统计用户活跃度
- 提供缓存机制
- 支持数据导出

### 主要方法
- `RecordLogin(success bool)` - 记录登录事件
- `RecordRegistration()` - 记录注册事件
- `RecordHTTPRequest()` - 记录HTTP请求
- `RecordUserActivity(userID string)` - 记录用户活跃度
- `GetActiveUsersStats()` - 获取活跃用户统计
- `ExportMetrics()` - 导出指标到数据库

## 测试

### 测试脚本
运行 `test_monitoring.sh` 来测试所有监控功能：

```bash
chmod +x test_monitoring.sh
./test_monitoring.sh
```

### 测试内容
1. Prometheus指标端点
2. 自定义指标API
3. 用户活跃度统计
4. 日/月活跃用户
5. 系统健康状态
6. 指标摘要
7. 最活跃用户
8. 指标导出

## 配置

### 环境变量
- `PROMETHEUS_ENABLED` - 启用Prometheus监控
- `METRICS_CACHE_TTL` - 指标缓存TTL（默认5分钟）

### 数据库配置
确保数据库中存在以下表：
- `metrics` - 指标定义
- `metric_values` - 指标值
- `users` - 用户表

## 性能优化

### 缓存策略
- 活跃用户统计缓存5分钟
- 自动清理过期数据
- 内存存储提高查询速度

### 数据清理
- 日活跃数据保留3个月
- 月活跃数据保留3个月
- 用户活动数据保留90天

## 扩展功能

### 告警规则
- 支持自定义告警规则
- 可配置告警阈值和持续时间
- 支持多种告警级别

### 通知系统
- 支持邮件、短信、Webhook通知
- 可配置通知模板
- 支持重试机制

### 仪表板
- 提供Web界面查看监控数据
- 支持图表和趋势分析
- 实时数据更新

## 故障排除

### 常见问题
1. 指标数据不更新 - 检查中间件是否正确集成
2. 活跃用户统计异常 - 检查用户ID是否正确传递
3. 数据库连接失败 - 检查数据库配置和连接

### 调试方法
1. 查看日志输出
2. 检查API响应
3. 验证数据库数据
4. 使用测试脚本验证功能 