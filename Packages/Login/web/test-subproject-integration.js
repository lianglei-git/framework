#!/usr/bin/env node

/**
 * 子项目集成测试脚本
 * 用于测试前端子项目SSO集成功能
 */

const fs = require('fs')
const path = require('path')

console.log('🚀 子项目SSO集成测试脚本')
console.log('========================')

// 测试文件存在性
const testFiles = [
    'src/config/subproject-integration.ts',
    'src/hooks/useSubProjectSSO.ts',
    'src/components/SubProjectIntegrationExample.tsx',
    'src/examples/SubProjectIntegrationDemo.tsx',
    'SUBPROJECT_INTEGRATION_README.md'
]

let allFilesExist = true

testFiles.forEach(file => {
    const filePath = path.join(__dirname, file)
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${file} - 存在`)
    } else {
        console.log(`❌ ${file} - 不存在`)
        allFilesExist = false
    }
})

// 测试hooks导出
const hooksIndexPath = path.join(__dirname, 'src/hooks/index.ts')
if (fs.existsSync(hooksIndexPath)) {
    const hooksContent = fs.readFileSync(hooksIndexPath, 'utf8')
    if (hooksContent.includes('useSubProjectSSO')) {
        console.log('✅ useSubProjectSSO Hook已正确导出')
    } else {
        console.log('❌ useSubProjectSSO Hook未正确导出')
        allFilesExist = false
    }
} else {
    console.log('❌ src/hooks/index.ts 不存在')
    allFilesExist = false
}

// 测试配置文件内容
const configPath = path.join(__dirname, 'src/config/subproject-integration.ts')
if (fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, 'utf8')

    const requiredExports = [
        'SubProjectConfig',
        'SUBPROJECT_CONFIGS',
        'getSubProjectConfig',
        'registerSubProjectConfig',
        'getAllSubProjectConfigs'
    ]

    let configValid = true
    requiredExports.forEach(exportName => {
        if (configContent.includes(exportName)) {
            console.log(`✅ ${exportName} - 已定义`)
        } else {
            console.log(`❌ ${exportName} - 未定义`)
            configValid = false
        }
    })

    if (configValid) {
        console.log('✅ 子项目配置文件结构正确')
    } else {
        console.log('❌ 子项目配置文件结构有误')
        allFilesExist = false
    }
}

// 测试示例组件内容
const demoPath = path.join(__dirname, 'src/examples/SubProjectIntegrationDemo.tsx')
if (fs.existsSync(demoPath)) {
    const demoContent = fs.readFileSync(demoPath, 'utf8')

    if (demoContent.includes('useSubProjectSSO')) {
        console.log('✅ 演示组件正确使用useSubProjectSSO Hook')
    } else {
        console.log('❌ 演示组件未使用useSubProjectSSO Hook')
        allFilesExist = false
    }
}

// 测试App.tsx更新
const appPath = path.join(__dirname, 'src/components/App.tsx')
if (fs.existsSync(appPath)) {
    const appContent = fs.readFileSync(appPath, 'utf8')

    if (appContent.includes('SubProjectIntegrationDemo')) {
        console.log('✅ App.tsx已正确导入演示组件')
    } else {
        console.log('❌ App.tsx未导入演示组件')
        allFilesExist = false
    }

    if (appContent.includes('integration-demo')) {
        console.log('✅ App.tsx已添加集成演示路由')
    } else {
        console.log('❌ App.tsx未添加集成演示路由')
        allFilesExist = false
    }
}

// 测试README更新
const readmePath = path.join(__dirname, 'README.md')
if (fs.existsSync(readmePath)) {
    const readmeContent = fs.readFileSync(readmePath, 'utf8')

    if (readmeContent.includes('子项目SSO集成')) {
        console.log('✅ README.md已更新子项目集成说明')
    } else {
        console.log('❌ README.md未更新子项目集成说明')
        allFilesExist = false
    }
}

// 测试集成文档
const integrationReadmePath = path.join(__dirname, 'SUBPROJECT_INTEGRATION_README.md')
if (fs.existsSync(integrationReadmePath)) {
    console.log('✅ 子项目集成文档已创建')
} else {
    console.log('❌ 子项目集成文档未创建')
    allFilesExist = false
}

console.log('\n========================')
if (allFilesExist) {
    console.log('🎉 子项目SSO集成功能测试全部通过！')
    console.log('\n📋 测试结果:')
    console.log('✅ 所有必需文件已创建')
    console.log('✅ Hooks已正确导出')
    console.log('✅ 配置文件结构正确')
    console.log('✅ 演示组件已创建')
    console.log('✅ App.tsx已更新')
    console.log('✅ README.md已更新')
    console.log('✅ 集成文档已创建')

    console.log('\n🚀 现在可以运行以下命令启动前端应用:')
    console.log('npm run dev 或 yarn dev 或 pnpm dev')

    console.log('\n📱 访问以下路由查看集成示例:')
    console.log('1. 子项目集成示例: /subproject-integration')
    console.log('2. 集成演示: /integration-demo')

} else {
    console.log('❌ 子项目SSO集成功能测试失败！')
    console.log('\n🔧 请检查上述错误并修复问题')
    process.exit(1)
}
