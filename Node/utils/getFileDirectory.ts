/**
 * fileDisplay(url, callback)
 * @param url: 你即将读取的文件夹路径
 * @param callback: 回调函数
 */

// 直接网上复制粘贴 😄
const fs = require('fs');
const path = require('path');

/**
 *
 * @param {string} url
 * @param {{ matchReg: RegExp, recursion: Boolean, resolvePath: '', isTree: false}} options
 * @param {() => []} cb
 */
 const fileDisplay = (_url, options = {}, _cb) => {
  let _options = {
    matchReg: /[\w\W]*/, // /\./
    recursion: false,
    resolvePath: '',
    isTree: false
  };
  if (typeof options === 'function') {
    _cb = options;
  }
  if (typeof options === 'object') {
    _options = { ..._options, ...options };
  }
  if(_options.resolvePath) {
    _url = _options.resolvePath + _url;
  }
  const arr = [];
  const targetFiles = Object.create(null);
  let timer = null;
  function _matchFile(url, cb, childDirKey, targetObjectFiles) {
    const filePath = path.resolve(url);
    fs.readdir(filePath, (err, files) => {
      if (err) return cb(err);
      files.forEach((filename) => {
        const filedir = path.join(filePath, filename);
        fs.stat(filedir, (eror, stats) => {
          if (eror) return cb(eror);
          const isFile = stats.isFile();
          const isDir = stats.isDirectory();
          if(!targetObjectFiles[childDirKey]) targetObjectFiles[childDirKey] = {} ;

          if (isFile) {
            const _path = filedir.replace(_options.resolvePath ||  __dirname, '').replace(/\\/gim, '/');

            if (_options.matchReg.test(_path)) {
              arr.push(_path);
              targetObjectFiles[childDirKey] = targetObjectFiles[childDirKey]
              if(_options.isTree) {
                if(!targetObjectFiles[childDirKey].files) {
                  targetObjectFiles[childDirKey] = {files: Array(filename)}
                } else {
                  targetObjectFiles[childDirKey].files.push(filename)
                }
              }
            }
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => cb && cb(_options.isTree ? targetFiles: arr), 50);
          }
          if (_options.recursion && isDir) _matchFile(filedir, cb, filedir.replace(url + '/', '') + '/', targetObjectFiles[childDirKey]);
        });
      });
    });
  }

  _matchFile(_url, _cb, '/', targetFiles)
 }

// fileDisplay('../blueprint', { recursion: false, matchReg: /\.(js)/ }, (files) => {
//   console.log(files);
// });
module.exports = fileDisplay;
module.exports.fileDisplayPromise = (...args) => new Promise(res => fileDisplay(...args, res));

// 参考地址： https://blog.csdn.net/weixin_47436633/article/details/125874068
