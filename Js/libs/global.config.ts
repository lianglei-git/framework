// Title: Global Configuration Management
// Description: This file manages global configuration settings, including loading, modifying, and accessing configuration data. It also supports plugin registration and execution.



/**
1. 准备工作： 你需要准备一个全局配置文件 `csbg.config.json`，并放在 `static` 目录下。
2. 在你的项目中引入这个模块，并调用 `initGlobalConfig()` 方法来初始化全局配置。
3. 你可以通过 `getGlobalconfig()` 方法获取全局配置对象。
4. 你可以使用 `tiny_get()` 和 `tiny_set()` 方法来获取和设置配置项。 示例用法在上面
5. 如果你有插件需要注册，可以使用 `registerPlugin()` 方法注册插件。注册插件的逻辑要优先于全局配置加载。
6. 插件会在全局配置加载完成后自动执行。
*/

/**
 * @file Global configuration management
 * @module framework/Js/utils/global.config
 * @description This module manages global configuration settings, including loading, modifying, and accessing configuration data. It also supports plugin registration and execution.
 * @example
 * import { getGlobalconfig, registerConfigPlugin, initGlobalConfig } from 'framework/Js/utils/global.config';
 * // Register a plugin
 * registerConfigPlugin((config) => {
 *     console.log('Plugin executed with config:', config);
 * });
 * 
 * // Initialize global configuration
 * initGlobalConfig().then(() => {
 *     const config = getGlobalconfig();
 *     console.log(config);
 * });
 */

// -----------------------------
// Type Declarations
// -----------------------------
declare global {
    type ITpConfig = {}
}

/**
Perhaps you need to add the following contents in the global.d.ts file:
declare global {
    type ITpConfig = {
        version: string;
        ...
    }
}
*/

// -----------------------------
// Global Variables
// -----------------------------
let globalConfig: ITpConfig = {};
// perhaps u need to change it.
const configname = 'csbg.config.json';
const plugins = [];


// -----------------------------
// Utility Functions
// -----------------------------
const isDev = (): boolean => {
    try {
        // perhaps u need to change it.
        return process.env.NODE_ENV === 'development';
    } catch (e) {
        return false;
    }
};

/** 注册插件 */
const registerPlugin = (plugin) => {
    if (typeof plugin === 'function') {
        plugins.push(plugin);
    } else {
        console.warn('插件必须是一个函数');
    }
};
/** 执行所有插件 */
const executePlugins = (config) => {
    plugins.forEach((plugin) => {
        plugin(config);
    });
};

// -----------------------------
// Configuration Management
// -----------------------------
const getGlobalconfig = async (): Promise<ITpConfig> => {
    if (Object.keys(globalConfig).length > 0) return globalConfig;

    // 开发环境
    // 直接从静态资源中加载配置文件
    if (isDev()) {
        // perhaps u need to change it.
        await import('../../static/csbg.config.json').then(res => {
            console.log('加载全局配置', res.default);
            globalConfig = res.default;
            return res.default;
        });
    } else {
        // 生产环境
        try {
            const d = await fetch(configname + '?v=' + Date.now()).then(res => res.json());
            globalConfig = d;
        } catch (e) {
            // 开发环境
            globalConfig = {};
        }
    }

    const search = new URLSearchParams(location.search);
    search.forEach((value, key) => {
        // 在url中查找配置项 Suck as: config.stt.key=funasr
        // 如果是全局配置项，则覆盖全局配置
        if (key.startsWith('config.')) {
            const path = key.replace('config.', '');
            tiny_set(globalConfig, path, value);
        }
    });
    // 执行插件
    executePlugins(globalConfig);

    // 挂载到全局对象
    if (typeof window !== 'undefined') {
        window.globalConfig = globalConfig;
    }
    return globalConfig;
};

const initGlobalConfig = async (): Promise<ITpConfig> => {
    return await getGlobalconfig();
};

// -----------------------------
// Utils
// -----------------------------
/**
 * example
 * 
    let obj = {
    a: {
        b: {
        c: 1
        }
    }
    };
    tiny_set(obj, 'a.b.c', 3);
    tiny_get(obj, 'a.b.c', 13);
 */
// 实现 set 函数
const tiny_set = (obj, path, value) => {
    if (!obj || typeof path !== 'string') return;

    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];

        // 如果是最后一个键，设置值
        if (i === keys.length - 1) {
            current[key] = value;
        } else {
            // 如果当前键不存在，创建一个空对象
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
    }
};
// 实现 get 函数
const tiny_get = (obj, path, defaultValue = undefined) => {
    if (!obj || typeof path !== 'string') return defaultValue;

    return path.split('.').reduce((acc, key) => {
        if (acc && acc.hasOwnProperty(key)) {
            return acc[key];
        }
        return defaultValue;
    }, obj);
};


export {
    getGlobalconfig,
    registerPlugin as registerConfigPlugin,
    tiny_get,
    tiny_set,
    initGlobalConfig
};

