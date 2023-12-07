const { spawn, fork } = require('child_process');
var process = require('process');
// const eventsBranch = require('../other/branchEvents');
const { createLogger, plugins } = require('./logger');
var env = { ...process.env };
// env.Path = __dirname + '\\lib;' + process.env.Path;
// env.PATH = __dirname + '/lib;' + process.env.PATH;
// env.LD_LIBRARY_PATH = __dirname + '/lib:' + process.env.LD_LIBRARY_PATH;
// env.CUDA_DEVICE_ORDER = 'PCI_BUS_ID';
const childPids = []; // 此项目下 全部的子进程。

// TODO: 2022/7/27; Q?
// 待确认个问题， webpack编译后 此文件会不会被编译成单例对象，如果是的，此逻辑没有问题；
// 反之 childPids 会出现重新加载；只会在某个独立被使用的文件中产生独立缓存，require就是这个原理。

const getChildPids = () => childPids;
const logger = global.logger || createLogger({ plugins: [plugins.client_logger()], prefix: '[主进程]' });
/**
 * 运行一个子进程，启动后会立即发送args给子进程，子进程返回第一个消息后进程就会结束，并且把返回的消息作为函数返回值
 * @param {string} path 要运行的js文件路径
 * @param {*} args 子进程运行参数
 * @returns
 */
var runProcess = function (path, args = {}) {
  /** 退出进程 */
  const exitProcess = (child) => {
    var pid = child.pid;
    child.kill(); // 杀掉同步
    childPids.splice(
      childPids.findIndex((i) => i.pid === child.pid),
      1
    );
    spawn('kill', ['-s', 9, pid]); // 强制杀死
    console.log(`已释放[${args.port}]端口的进程`, child.pid); // , child.channel;
  };

  return new Promise((next) => {
    // 创建进程
    var child = fork(path, {
      env
    });
    childPids.push(child);

    // 侦听子进程消息
    child.on('message', (message) => {
      if (message.data === 'close') {
        // 关闭进程
        exitProcess(child);
        next({
          message,
          child
        });
      }
      if (message.data === 'print') {
        const { type = 'log', msg = '', options = {} } = message.loggerOptions || {};
        logger._output(type, msg, Object.assign(options, args));
      }
    });
    // 发送消息到子进程
    child.send(args);
  });
};

/** 销毁存留的进程 */
const onDestoryRemainProcess = () => {
  Promise.all(
    getChildPids().map((c) => {
      return new Promise((res) => {
        const pid = c.pid;
        c.kill();
        const s = setTimeout(() => {
          spawn('kill', ['-s', 9, pid]);
          clearTimeout(s);
          res(c.pid + '---' + c.channel);
        }, 1000);
      });
    })
  ).then((anys) => {
    console.log(anys);
    process.exit();
  });
};

module.exports = {
  runProcess,
  getChildPids,
  onDestoryRemainProcess
};
