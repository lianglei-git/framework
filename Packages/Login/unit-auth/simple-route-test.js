/**
 * 简单的路由测试
 * 测试Unit Auth的路由是否正确注册
 */

const https = require('http')

const BASE_URL = 'http://localhost:8080'

function makeRequest(path, method = 'GET') {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        }

        const req = https.request(options, (res) => {
            let data = ''

            res.on('data', (chunk) => {
                data += chunk
            })

            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                })
            })
        })

        req.on('error', (err) => {
            reject(err)
        })

        req.end()
    })
}

async function testRoutes() {
    console.log('🔍 简单路由测试')

    const tests = [
        '/health',
        '/api/v1/openid-configuration',
        '/api/v1/jwks-json',
        '/api/v1/projects/public',
        '/api/v1/auth/send-email-code',
    ]

    for (const path of tests) {
        try {
            console.log(`\n测试: ${path}`)
            const response = await makeRequest(path, 'GET')
            console.log(`状态码: ${response.statusCode}`)
            console.log(`响应: ${response.body.substring(0, 100)}...`)
        } catch (error) {
            console.log(`错误: ${error.message}`)
        }
    }
}

testRoutes().catch(console.error)
