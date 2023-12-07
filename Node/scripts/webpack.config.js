// 执行命令 cross-env NODE_ENV=production webpack --progress --display-modules --color --config webpack.config.js
const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
// const HtmlWebpackPlugin = require('html-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const webpack = require('webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const dotenv = require('dotenv');
dotenv.config('./.env');
/** 当时是否是开发环境 */
const isDev = process.env.NODE_ENV === 'development';

/** 要返回的webpack配置 */
var config = {
  target: 'node',
  node: {
    __dirname: false
  },

  mode: isDev ? 'development' : 'production',
  // 入口文件
  entry: {
    /** 主进程 */
    // 'bar': './src/utils/progressbar.js'
    main: './src/main.js',
    /** 乳腺渲染进程 */
    mg_render: './src/mg-render.js',
    // /** 冠脉预渲染 */
    coronary_prender: './src/coronary-prender/coronary-prender.js',
    // /** 冠脉动态渲染 */
    coronary_render: './src/coronary-render/coronary-render.js',
    headNeck_render: './src/head-neck-render/headNeck-render.js',
    /** CT预渲染 */
    ct_prender: './src/ct-prender/ct-prender.js',
    /** 蓝图测试 */
    blueprint: './src/blueprint/blueprint-main.js'
  },
  // 输出目录
  output: {
    path: path.join(__dirname, './server-render/dist'),
    filename: '[name].js'
  },
  // 排除
  externals: {
    // 使用原生方式引入
    'canvas': 'require("canvas");',
    'node-nvrtc': 'require("node-nvrtc");',
    'bluep-js': '((window.libs||{})["bluep-js"]||{BluePrintNode:function(){}})',
    // 'react': '((window.libs||{})["react"]||{})',
    'react-dom': '((window.libs||{})["react-dom"]||{})'
  },
  // loader配置
  module: {
    rules: [
      // c++代码载入
      {
        test: /\.(cu|cpp|hpp|h|inl)$/i,
        use: ['raw-loader']
      },
      // less
      {
        test: /\.less$/,
        use: [{ loader: 'css-loader', options: { modules: true }}, 'less-loader']
        // use: ['style-loader', { loader: 'css-loader', options: { modules: true }}, 'less-loader']
      },
      // node加载器
      {
        test: /\.node$/,
        loader: 'node-loader'
      },
      // js载入
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
            presets: ['@babel/preset-env', '@babel/preset-react'],
            plugins: [
              '@babel/plugin-transform-modules-commonjs',
              '@babel/plugin-transform-runtime',
              'transform-remove-strict-mode',
              ['@babel/plugin-proposal-decorators', { 'legacy': true }]
            ]
          }
        }
      },
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto'
      }
    ]
  },
  // 服务设置
  devServer: {
    hot: true,
    contentBase: path.join(__dirname, 'dist'),
    port: 13814,
    lazy: false,
    inline: false,
    clientLogLevel: 'none',
    // 隔离模式头
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    },
    // 允许远端访问
    host: '0.0.0.0'
  },
  resolve: {
    modules: [
      path.resolve(__dirname, 'src'),
      // framework中的内容直接引入
      path.resolve(__dirname, 'framework'),
      'node_modules'
    ]
  },
  plugins: [],
  devtool: (isDev) ? 'cheap-module-eval-source-map' : 'source-map'
};

// 生产模式使用的插件
if (!isDev) {
  config.plugins.push(
    // 生成代码占用可视化文件
    new BundleAnalyzerPlugin({
      reportFilename: '../report.html',
      analyzerMode: 'static',
      openAnalyzer: false,
      generateStatsFile: false
    }),
    // 清理多余文件
    new CleanWebpackPlugin({
      cleanStaleWebpackAssets: !isDev
    }),
    // 压缩js
    // new UglifyJsPlugin(),
    new CopyWebpackPlugin({ patterns: ['./logs/**', './public/**', './src/config.js', './ecosystem.config.js', './History.md', './lib/**'] })
  );
}

// 输出最终的配置
module.exports = config;
