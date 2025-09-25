#!/usr/bin/env node

/**
 * SSO API服务器
 * 为子项目提供SSO认证API服务
 * 作为Login-v1项目的API服务器运行
 */

import http from 'http'
import { handleAuthAPI } from './src/api/auth.js'

const PORT = 5174

console.log('🚀 启动SSO API服务器...')
console.log(`📍 监听端口: ${PORT}`)
console.log(`🔗 API基础URL: http://localhost:${PORT}`)

// 创建HTTP服务器
const server = http.createServer(async (req, res) => {
    const { method, url } = req

    console.log(`📨 ${method} ${url}`)

    try {
        // 只有/api/auth路径才交给SSO API处理器
        if (url.startsWith('/api/auth')) {
            // 将Node.js的req/res转换为Web API的Request/Response
            const body = method !== 'GET' && method !== 'HEAD' ? await readBody(req) : null

            const request = new Request(`http://localhost${url}`, {
                method,
                headers: req.headers,
                body: body ? JSON.stringify(body) : null
            })

            const response = await handleAuthAPI(request)

            // 设置响应头
            for (const [key, value] of response.headers) {
                res.setHeader(key, value)
            }

            res.statusCode = response.status

            // 获取响应体
            const responseBody = await response.text()
            res.end(responseBody)

            console.log(`✅ ${response.status} ${url}`)
        } else {
            // 其他请求返回404
            res.statusCode = 404
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
                error: 'not_found',
                error_description: 'Endpoint not found'
            }))
            console.log(`❌ 404 ${url}`)
        }
    } catch (error) {
        console.error('❌ 服务器错误:', error)
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
            error: 'server_error',
            error_description: error.message
        }))
    }
})

// 读取请求体
function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = ''
        req.on('data', chunk => {
            body += chunk.toString()
        })
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {})
            } catch (error) {
                resolve({})
            }
        })
        req.on('error', reject)
    })
}

// 启动服务器
server.listen(PORT, () => {
    console.log('\n🎉 SSO API服务器启动成功!')
    console.log('\n📋 可用端点:')
    console.log(`🔑 POST /api/auth/token        - 令牌交换`)
    console.log(`👤 GET  /api/auth/userinfo     - 用户信息`)
    console.log(`🔄 POST /api/auth/refresh      - 令牌刷新`)
    console.log(`🚪 POST /api/auth/logout       - 登出`)
    console.log(`🔗 GET  /api/auth/authorize    - 构建登录URL`)
    console.log('\n📝 使用说明:')
    console.log('1. 确保unit-auth后端服务在端口8080运行')
    console.log('2. 启动Login-v1前端应用（默认端口5173）')
    console.log('3. 子项目可以调用上述API进行SSO认证')
    console.log('\n⚠️  开发环境CORS已配置为允许所有来源')
})

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('\n🛑 收到SIGTERM信号，正在关闭服务器...')
    server.close(() => {
        console.log('✅ 服务器已关闭')
        process.exit(0)
    })
})

process.on('SIGINT', () => {
    console.log('\n🛑 收到SIGINT信号，正在关闭服务器...')
    server.close(() => {
        console.log('✅ 服务器已关闭')
        process.exit(0)
    })
})
