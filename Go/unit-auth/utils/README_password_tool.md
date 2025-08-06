# 密码测试工具使用说明

## 概述
`password_tool.go` 是一个用于测试和调试用户密码功能的工具脚本。它可以帮助您：
- 查看所有用户信息
- 获取特定用户的详细信息（包括密码哈希）
- 验证用户密码是否正确
- 生成新的密码哈希
- **分析密码强度**
- **测试常见密码**
- **分析哈希信息**

## 功能特性

### 1. 列出所有用户
```bash
go run utils/password_tool.go list
```
显示数据库中所有用户的基本信息（不显示密码哈希）。

### 2. 获取特定用户信息
```bash
go run utils/password_tool.go user <email>
```
获取指定邮箱用户的详细信息，包括密码哈希。

**示例：**
```bash
go run utils/password_tool.go user test7@example.com
```

### 3. 验证密码
```bash
go run utils/password_tool.go verify <email> <password>
```
验证指定用户的密码是否正确。

**示例：**
```bash
go run utils/password_tool.go verify test7@example.com 123456
```

### 4. 生成密码哈希
```bash
go run utils/password_tool.go hash <password>
```
为指定密码生成 bcrypt 哈希值。

**示例：**
```bash
go run utils/password_tool.go hash mypassword123
```

### 5. 分析用户密码强度 ⭐ 新功能
```bash
go run utils/password_tool.go analyze <email>
```
分析指定用户的密码哈希信息，包括算法、成本因子等。

**示例：**
```bash
go run utils/password_tool.go analyze test7@example.com
```

### 6. 测试常见密码 ⭐ 新功能
```bash
go run utils/password_tool.go crack <email>
```
测试用户的密码是否匹配常见弱密码。

**示例：**
```bash
go run utils/password_tool.go crack test7@example.com
```

### 7. 分析哈希信息 ⭐ 新功能
```bash
go run utils/password_tool.go info <email>
```
详细分析用户密码哈希的技术信息。

**示例：**
```bash
go run utils/password_tool.go info test7@example.com
```

### 8. 分析密码强度 ⭐ 新功能
```bash
go run utils/password_tool.go strength <password>
```
分析指定密码的强度，提供详细建议。

**示例：**
```bash
go run utils/password_tool.go strength MyPassword123!
```

## 重要说明

### 🔒 关于密码"解密"
**bcrypt 哈希是单向加密的，无法解密**。这是密码安全的基本原则：
- ✅ 可以验证密码是否正确
- ✅ 可以分析哈希的技术信息
- ✅ 可以测试常见弱密码
- ❌ 无法从哈希反推出原始密码

### 🛡️ 安全功能
工具提供以下安全分析功能：
1. **密码强度评估** - 检查密码复杂度
2. **常见密码测试** - 检测弱密码
3. **哈希信息分析** - 验证加密算法
4. **安全建议** - 提供改进建议

## 数据库配置

工具使用以下数据库配置：
- **主机**: localhost
- **端口**: 3306
- **用户名**: test
- **密码**: test
- **数据库**: unit_auth

如需修改配置，请编辑 `password_tool.go` 文件中的常量定义。

## 安全注意事项

⚠️ **重要提醒**：
1. 此工具仅用于开发和测试环境
2. 不要在生产环境中使用此工具
3. 密码哈希信息属于敏感数据，请妥善保管
4. 建议在使用完毕后删除或限制访问此工具
5. 常见密码测试功能仅用于安全评估

## 使用场景

### 开发调试
- 验证用户注册时密码是否正确加密
- 检查登录功能是否正常工作
- 调试密码重置功能

### 安全评估
- 检测用户是否使用弱密码
- 评估密码策略的有效性
- 分析密码哈希的安全性

### 测试验证
- 验证 bcrypt 哈希算法是否正常工作
- 测试密码验证逻辑
- 检查数据库中的用户数据

### 数据迁移
- 验证现有用户的密码哈希格式
- 检查密码加密的一致性

## 输出示例

### 列出用户
```
=== 用户列表 (共 6 个用户) ===
1. === 用户信息 ===
ID: 367bf05b-305e-4f40-971c-98e052a40339
邮箱: test7@example.com
用户名: testuser7
角色: user
状态: active
```

### 获取用户详情
```
=== 用户信息 ===
ID: 367bf05b-305e-4f40-971c-98e052a40339
邮箱: test7@example.com
用户名: testuser7
角色: user
状态: active
密码哈希: $2a$10$Hu6GyGvKvjqUgKhd8CvPW.Hag3Co7g5UNCJzvdiImY6yjB.N.wTDS
```

### 密码验证
```
=== 密码验证测试 ===
测试用户: test7@example.com
测试密码: 123456
✅ 密码验证成功
```

### 生成哈希
```
=== 密码哈希生成 ===
原始密码: mypassword123
哈希结果: $2a$10$uqIAYVSZ2n.VbA1cmkTyruti4k/hnzqmPPLLf6yjK7xhlmD1JeNfi
```

### 哈希信息分析
```
=== 哈希信息分析 ===
用户: test7@example.com
✅ 有效哈希
算法: bcrypt
成本因子: 10
长度: 60 字符
格式: 标准 bcrypt 格式
```

### 常见密码测试
```
=== 常见密码测试 ===
用户: test7@example.com
正在测试常见密码...
⚠️  发现匹配的常见密码:
  - 123456
```

### 密码强度分析
```
=== 密码强度分析 ===
密码: MyPassword123!
长度: 14 字符
强度评分: 6/6
强度等级: 很强
字符类型:
  - 小写字母: true
  - 大写字母: true
  - 数字: true
  - 特殊字符: true
建议:
  - 密码长度良好
  - 包含小写字母
  - 包含大写字母
  - 包含数字
  - 包含特殊字符
```

## 故障排除

### 数据库连接失败
如果遇到数据库连接错误，请检查：
1. MySQL 服务是否正在运行
2. 数据库配置是否正确
3. 用户名和密码是否正确
4. 数据库是否存在

### 用户不存在
如果查询用户时提示用户不存在，请检查：
1. 邮箱地址是否正确
2. 用户是否已被删除
3. 数据库表结构是否正确

## 扩展功能

如需添加新功能，可以在 `main()` 函数的 switch 语句中添加新的 case：

```go
case "newcommand":
    // 新功能实现
    break
```

## 依赖项

工具依赖以下 Go 包：
- `database/sql` - 数据库连接
- `github.com/go-sql-driver/mysql` - MySQL 驱动
- `golang.org/x/crypto/bcrypt` - 密码哈希
- `strings` - 字符串处理
- `strconv` - 字符串转换

确保这些依赖项已正确安装。 