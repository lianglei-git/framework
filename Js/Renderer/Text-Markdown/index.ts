import highLightPlugins from './plugins/high-light'
try{
    import("markdown-it").then(module => {
        const func = module.default
        const markdownInstance = func();
        const result = markdownInstance.render("# helllo zzz!")
        console.log(result,'module')
    }).catch(err => {
        console.error("请安装 markdown-it ")
    })
}catch(err) {
    console.log(err,'err')
}

// TODO：需要做到在代码运行时动态加载的情况，有些部分代码是比较大的；同样 插件也要采用动态引用
// 可选插件
const OptionalPlugins = [
    highLightPlugins,

]