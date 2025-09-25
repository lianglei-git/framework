/**
 * SSO数据迁移脚本
 * 用于将现有认证系统的数据迁移到SSO模式
 *
 * 使用方法：
 * 1. 确保SSO服务已配置并运行
 * 2. 运行此脚本：node migration/sso-migration.js
 * 3. 按照提示完成迁移过程
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

/**
 * 迁移配置
 */
const MIGRATION_CONFIG = {
    // 现有认证数据存储路径
    authDataPath: path.join(__dirname, '../../localStorage/auth_data.json'),

    // 迁移日志路径
    logPath: path.join(__dirname, 'migration.log'),

    // SSO服务配置
    ssoConfig: {
        serverUrl: process.env.SSO_SERVER_URL || 'https://sso.example.com',
        clientId: process.env.SSO_CLIENT_ID || 'migration-client',
        clientSecret: process.env.SSO_CLIENT_SECRET || 'migration-secret'
    },

    // 迁移选项
    options: {
        // 是否创建备份
        createBackup: true,

        // 是否测试模式（不实际修改数据）
        testMode: false,

        // 批量大小
        batchSize: 10,

        // 并发数
        concurrency: 3
    }
}

/**
 * 迁移器类
 */
class SSOMigrator {
    constructor(config) {
        this.config = config
        this.existingUsers = []
        this.migratedUsers = []
        this.failedUsers = []
        this.logStream = null
    }

    /**
     * 初始化迁移器
     */
    async init() {
        console.log('🔄 初始化SSO迁移器...')

        // 创建日志流
        this.logStream = fs.createWriteStream(this.config.logPath, { flags: 'a' })

        // 验证SSO服务连接
        await this.validateSSOConnection()

        this.log('Migration initialized successfully')
        console.log('✅ 迁移器初始化完成')
    }

    /**
     * 验证SSO服务连接
     */
    async validateSSOConnection() {
        try {
            const response = await fetch(`${this.config.ssoConfig.serverUrl}/api/v1/sso/status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            if (!response.ok) {
                throw new Error(`SSO服务连接失败: ${response.status}`)
            }

            const result = await response.json()
            if (result.code !== 200) {
                throw new Error(`SSO服务返回错误: ${result.message}`)
            }

            this.log('SSO service connection validated')
            console.log('✅ SSO服务连接验证通过')
        } catch (error) {
            this.log(`SSO connection validation failed: ${error.message}`)
            throw new Error(`无法连接到SSO服务: ${error.message}`)
        }
    }

    /**
     * 加载现有用户数据
     */
    loadExistingUsers() {
        console.log('📂 加载现有用户数据...')

        try {
            // 从localStorage数据文件加载
            if (fs.existsSync(this.config.authDataPath)) {
                const authDataContent = fs.readFileSync(this.config.authDataPath, 'utf8')
                const authData = JSON.parse(authDataContent)

                if (authData.users && Array.isArray(authData.users)) {
                    this.existingUsers = authData.users
                } else if (authData.user) {
                    // 单个用户数据
                    this.existingUsers = [authData.user]
                }
            }

            // 从localStorage目录加载
            const localStorageDir = path.dirname(this.config.authDataPath)
            if (fs.existsSync(localStorageDir)) {
                const files = fs.readdirSync(localStorageDir)
                for (const file of files) {
                    if (file.startsWith('auth_user_') && file.endsWith('.json')) {
                        try {
                            const userData = JSON.parse(fs.readFileSync(path.join(localStorageDir, file), 'utf8'))
                            if (userData.user && !this.existingUsers.find(u => u.id === userData.user.id)) {
                                this.existingUsers.push(userData.user)
                            }
                        } catch (error) {
                            this.log(`Failed to load user data from ${file}: ${error.message}`)
                        }
                    }
                }
            }

            this.log(`Loaded ${this.existingUsers.length} existing users`)
            console.log(`✅ 已加载 ${this.existingUsers.length} 个现有用户`)
        } catch (error) {
            this.log(`Failed to load existing users: ${error.message}`)
            throw new Error(`加载现有用户数据失败: ${error.message}`)
        }
    }

    /**
     * 创建用户备份
     */
    createBackup() {
        if (!this.config.options.createBackup) {
            return
        }

        console.log('💾 创建用户数据备份...')

        const backupDir = path.join(__dirname, 'backup')
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true })
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const backupPath = path.join(backupDir, `users-backup-${timestamp}.json`)

        const backupData = {
            timestamp: new Date().toISOString(),
            totalUsers: this.existingUsers.length,
            users: this.existingUsers,
            config: this.config
        }

        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2))
        this.log(`Backup created at ${backupPath}`)
        console.log(`✅ 备份已创建: ${backupPath}`)
    }

    /**
     * 为用户生成SSO标识符
     */
    generateSSOIdentifier(user) {
        // 使用用户ID和邮箱的组合生成唯一标识符
        const data = `${user.id}:${user.email || user.username}`
        return crypto.createHash('sha256').update(data).digest('hex')
    }

    /**
     * 转换用户数据格式
     */
    convertUserToSSOFormat(user) {
        return {
            sub: this.generateSSOIdentifier(user),
            name: user.username,
            preferred_username: user.username,
            email: user.email,
            email_verified: true,
            picture: user.avatar,
            custom_claims: {
                original_user: user,
                migrated_at: new Date().toISOString(),
                migration_version: '1.0'
            },
            created_at: user.created_at,
            updated_at: user.updated_at
        }
    }

    /**
     * 迁移单个用户
     */
    async migrateUser(user) {
        try {
            const ssoUser = this.convertUserToSSOFormat(user)

            // 调用SSO服务创建用户
            const response = await fetch(`${this.config.ssoConfig.serverUrl}/api/v1/sso/users/migrate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.generateMigrationToken()}`
                },
                body: JSON.stringify({
                    original_user: user,
                    sso_user: ssoUser,
                    migration_token: this.generateUserMigrationToken(user)
                })
            })

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            const result = await response.json()
            if (result.code !== 200) {
                throw new Error(result.message || 'Migration failed')
            }

            this.log(`User ${user.id} migrated successfully`)
            return result.data
        } catch (error) {
            this.log(`Failed to migrate user ${user.id}: ${error.message}`)
            throw error
        }
    }

    /**
     * 生成迁移令牌
     */
    generateMigrationToken() {
        const data = `${this.config.ssoConfig.clientId}:${this.config.ssoConfig.clientSecret}:${Date.now()}`
        return crypto.createHash('sha256').update(data).digest('hex')
    }

    /**
     * 为特定用户生成迁移令牌
     */
    generateUserMigrationToken(user) {
        const data = `${user.id}:${user.email || user.username}:${Date.now()}`
        return crypto.createHash('sha256').update(data).digest('hex')
    }

    /**
     * 批量迁移用户
     */
    async migrateUsersBatch(users) {
        const results = []
        const batchSize = this.config.options.batchSize
        const concurrency = this.config.options.concurrency

        for (let i = 0; i < users.length; i += batchSize) {
            const batch = users.slice(i, i + batchSize)
            console.log(`📦 迁移批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(users.length / batchSize)} (用户 ${i + 1}-${Math.min(i + batchSize, users.length)})`)

            const promises = batch.map(user => this.migrateUser(user))
            const batchResults = await Promise.allSettled(promises)

            batchResults.forEach((result, index) => {
                const user = batch[index]
                if (result.status === 'fulfilled') {
                    results.push({ user, success: true, data: result.value })
                    this.migratedUsers.push(user)
                } else {
                    results.push({ user, success: false, error: result.reason })
                    this.failedUsers.push({ user, error: result.reason })
                }
            })

            // 批次间延迟
            if (i + batchSize < users.length) {
                await this.delay(1000)
            }
        }

        return results
    }

    /**
     * 执行迁移
     */
    async executeMigration() {
        console.log('🚀 开始执行SSO迁移...')

        // 加载现有用户
        this.loadExistingUsers()

        if (this.existingUsers.length === 0) {
            console.log('ℹ️ 没有找到需要迁移的用户数据')
            return
        }

        // 创建备份
        this.createBackup()

        if (this.config.options.testMode) {
            console.log('🧪 测试模式：模拟迁移过程...')
            this.simulateMigration()
            return
        }

        // 执行实际迁移
        await this.migrateUsersBatch(this.existingUsers)

        // 生成迁移报告
        this.generateMigrationReport()

        console.log('✅ 迁移执行完成')
    }

    /**
     * 模拟迁移（测试模式）
     */
    simulateMigration() {
        console.log('📋 模拟迁移过程...')

        this.existingUsers.forEach(user => {
            const ssoUser = this.convertUserToSSOFormat(user)
            console.log(`  - ${user.username} -> SSO ID: ${ssoUser.sub}`)

            this.migratedUsers.push(user)
        })

        this.generateMigrationReport()
    }

    /**
     * 生成迁移报告
     */
    generateMigrationReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: this.existingUsers.length,
                migrated: this.migratedUsers.length,
                failed: this.failedUsers.length
            },
            migratedUsers: this.migratedUsers.map(user => ({
                original_id: user.id,
                username: user.username,
                sso_identifier: this.generateSSOIdentifier(user)
            })),
            failedUsers: this.failedUsers.map(item => ({
                username: item.user.username,
                error: item.error.message
            }))
        }

        const reportPath = path.join(__dirname, 'migration-report.json')
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

        console.log('\n📊 迁移报告:')
        console.log(`  总用户数: ${report.summary.total}`)
        console.log(`  迁移成功: ${report.summary.migrated}`)
        console.log(`  迁移失败: ${report.summary.failed}`)
        console.log(`  报告文件: ${reportPath}`)

        if (this.failedUsers.length > 0) {
            console.log('\n❌ 迁移失败的用户:')
            this.failedUsers.forEach(item => {
                console.log(`  - ${item.user.username}: ${item.error.message}`)
            })
        }
    }

    /**
     * 延迟函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    /**
     * 记录日志
     */
    log(message) {
        const timestamp = new Date().toISOString()
        const logMessage = `[${timestamp}] ${message}\n`

        if (this.logStream) {
            this.logStream.write(logMessage)
        }

        console.log(message)
    }

    /**
     * 清理资源
     */
    cleanup() {
        if (this.logStream) {
            this.logStream.end()
        }
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('🎯 SSO数据迁移工具')
    console.log('==================')

    const migrator = new SSOMigrator(MIGRATION_CONFIG)

    try {
        await migrator.init()
        await migrator.executeMigration()
    } catch (error) {
        console.error('❌ 迁移失败:', error.message)
        migrator.log(`Migration failed: ${error.message}`)
        process.exit(1)
    } finally {
        migrator.cleanup()
    }
}

// 运行迁移
if (require.main === module) {
    main().catch(error => {
        console.error('Migration script error:', error)
        process.exit(1)
    })
}

module.exports = { SSOMigrator, MIGRATION_CONFIG }
