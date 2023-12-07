const dotenv = require('dotenv');
const path = require('path');
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });
const isDev = process.env.NODE_ENV === 'development';
if (/** 开发环境*/ process.env.NODE_ENV === 'development') {
  require('./alias');
  require('@babel/register');
// .babelrc
//   {
//     "presets": [
//         "@babel/preset-env",
//         "@babel/preset-typescript"
//     ],
//     "plugins": [
//         ["@babel/plugin-proposal-decorators", {
//             "legacy": true
//         }],
//         ["@babel/plugin-proposal-class-properties", {
//             "loose": true
//         }],
//         ["@babel/plugin-proposal-private-property-in-object", { "loose": true }],
//         ["@babel/plugin-proposal-private-methods", { "loose": true }],
//         "@babel/plugin-transform-runtime"
//     ]
// }
}

module.exports = {
  isDev
};
