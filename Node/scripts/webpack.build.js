// 执行命令 node webpack.build.js

const path = require('path');
const webpack = require('webpack');
process.env.NODE_ENV = 'production';
const { readFileSync } = require('fs');
const basicConfig = require('../../webpack.config');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const packageInfo = require('./package.json');
let packageName = '_HNServerRender';
let privatePackagePath = '';
const entry = {
  headNeck_render: path.resolve(__dirname, './headNeck-render.js')
};

try {
  const Config = eval(readFileSync(path.join(__dirname, '../config.js'), 'utf8'));
  console.log(packageInfo.name + '配置 ---> ', Config.HeadNeckRender);
  privatePackagePath = Config.HeadNeckRender.privatePackagePath;
  packageName = path.basename(privatePackagePath);
} catch (e) {}
console.log('私有包名为 ----> ', packageName);

/** 下面可以被其他私有项目复用 --- */
const privateConfig = Object.assign(basicConfig, {
  entry,
  output: {
    path: path.join(__dirname, './' + packageName),
    filename: '[name].js'
  },
  plugins: [
    new CleanWebpackPlugin({
      cleanStaleWebpackAssets: true
    }),
    new CopyWebpackPlugin({
      patterns: [path.resolve(__dirname, 'package.json'), path.resolve(__dirname, '../config.js')]
    })
  ]
});

webpack(privateConfig).run((err, stats) => {
  if (err) {
    console.error(err);
    return;
  }

  console.log(
    stats.toString({
      colors: true,
      modules: false,
      chunks: false,
      chunkModules: false
    })
  );
  console.log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
  console.log(packageInfo.name + '构建成功: ');
  console.log('包版本 ===> ', '\x1b[31m' + packageInfo.version + '\x1b[0m');
  console.log('包路径 ===> ', '\x1b[34m' + path.join(__dirname, './' + packageName) + '\x1b[0m');
  console.log('包内容 ===> \n', packageInfo.changelog);
  privatePackagePath &&
    console.info('\x1b[35m%s\x1b[0m', '提示：服务器可能需要被替换的内容路径为 ~~ ' + privatePackagePath);
});
