/**
 * 该文件封装了对远程服务器的操作
 */
const EventEmitter = require('node:events');
const { Client } = require('ssh2'); // ssh2模块需要使用npm安装
const fs = require('fs');
const path = require('path');

/**
 * 描述：连接远程电脑
 * 参数：server 远程电脑凭证；
         then 回调函数
 * 回调：then(conn) 连接远程的client对象
 */
function Connect(server, then) {
  const conn = new Client();
  conn
    .on('ready', () => {
      then(conn);
    })
    .on('error', (err) => {
      console.log('error!', err);
    })
    .on('end', () => {
      console.log('finish!');
    })
    .on('close', (had_error) => {
      // console.log('connect close', had_error);
    })
    .connect(server);
}

/**
 * 描述：运行shell命令
 * 参数：server 远程电脑凭证；
         cmd 执行的命令；
         then 回调函数
 * 回调：then(err, data) ： data 运行命令之后的返回数据信息
 */
function Shell(server, cmd, then) {
  Connect(server, (conn) => {
    conn.shell((err, stream) => {
      if (err) {
        then(err);
      } else {
        // end of if
        let buf = '';
        stream
          .on('close', () => {
            conn.end();
            then(err, buf);
          })
          .on('data', (data) => {
            buf += data;
          })
          .stderr.on('data', (data) => {
            console.log(`stderr: ${data}`);
          });
        stream.end(cmd);
      }
    });
  });
}

/**
 * 描述：上传文件
 * 参数：server 远程电脑凭证；
         localPath 本地路径；
         remotePath 远程路径；
         then 回调函数
 * 回调：then(err, result)
 */
function UploadFile(server, localPath, remotePath, then) {
  Connect(server, (conn) => {
    conn.sftp((err, sftp) => {
      if (err) {
        then(err);
      } else {
        sftp.fastPut(localPath, remotePath, (err, result) => {
          conn.end();
          then(err, result);
        });
      }
    });
  });
}

/**
 * 描述：下载文件
 * 参数：server 远程电脑凭证；
         remotePath 远程路径；
         localPath 本地路径；
         then 回调函数
 * 回调：then(err, result)
 */
function DownloadFile(server, remotePath, localPath, then) {
  Connect(server, (conn) => {
    conn.sftp((err, sftp) => {
      if (err) {
        then(err);
      } else {
        sftp.fastGet(remotePath, localPath, (err, result) => {
          if (err) {
            then(err);
          } else {
            conn.end();
            then(err, result);
          }
        });
      }
    });
  });
}

/**
 * 描述：获取远程文件路径下文件列表信息
 * 参数：server 远程电脑凭证；
 *       remotePath 远程路径；
 *       isFile 是否是获取文件，true获取文件信息，false获取目录信息；
 *       then 回调函数
 * 回调：then(err, dirs) ： dir, 获取的列表信息
 */
function GetFileOrDirList(server, remotePath, isFile, then) {
  const cmd = `find ${remotePath} -type ${isFile == true ? 'f' : 'd'}\r\nexit\r\n`;
  Shell(server, cmd, (err, data) => {
    let arr = [];
    const remoteFile = [];
    arr = data.split('\r\n');
    arr.forEach((dir) => {
      if (dir.indexOf(remotePath) == 0) {
        remoteFile.push(dir);
      }
    });
    then(err, remoteFile);
  });
}

/**
 * 描述：控制上传或者下载一个一个的执行
 */
class Control extends EventEmitter {}
// util.inherits(Control, events.EventEmitter); // 使这个类继承EventEmitter

const control = new Control();

control.on('donext', (todos, then) => {
  if (todos.length > 0) {
    const func = todos.shift();
    func((err, result) => {
      if (err) {
        throw err;
      } else {
        control.emit('donext', todos, then);
      }
    });
  } else {
    then(null);
  }
});

/**
 * 描述：下载目录到本地
 * 参数：server 远程电脑凭证；
 *       remotePath 远程路径；
 *       localDir 本地路径，
 *       then 回调函数
 * 回调：then(err)
 */
function DownloadDir(server, remoteDir, localDir, then) {
  GetFileOrDirList(server, remoteDir, false, (err, dirs) => {
    if (err) {
      throw err;
    } else {
      GetFileOrDirList(server, remoteDir, true, (err, files) => {
        if (err) {
          throw err;
        } else {
          dirs.shift();
          dirs.forEach((dir) => {
            const tmpDir = path.join(localDir, dir.slice(remoteDir.length + 1)).replace(/[//]\g/, '\\');
            // 创建目录
            fs.mkdirSync(tmpDir);
          });
          const todoFiles = [];
          files.forEach((file) => {
            const tmpPath = path.join(localDir, file.slice(remoteDir.length + 1)).replace(/[//]\g/, '\\');
            todoFiles.push((done) => {
              DownloadFile(server, file, tmpPath, done);
              console.log(`downloading the ${file}`);
            }); // end of todoFiles.push
          });
          control.emit('donext', todoFiles, then);
        }
      });
    }
  });
}

/**
 * 描述：获取文件目录以及文件列表信息
 * 参数：destDir 本地路径，
 *       dirs 目录列表
 *       files 文件列表
 */
function GetFileAndDirList(localDir, dirs, files) {
  const dir = fs.readdirSync(localDir);
  for (let i = 0; i < dir.length; i++) {
    const p = path.join(localDir, dir[i]);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      dirs.push(p);
      GetFileAndDirList(p, dirs, files);
    } else {
      files.push(p);
    }
  }
}

/**
 * 描述：上传文件夹到远程目录
 * 参数：server 远程电脑凭证；
 *       localDir 本地路径，
 *       remoteDir 远程路径；
 *       then 回调函数
 * 回调：then(err)
 */
function UploadDir(server, localDir, remoteDir, servePath, then) {
  const dirs = [];
  const files = [];
  GetFileAndDirList(localDir, dirs, files);
  // console.log('GetFileAndDirList', dirs, files);
  // 删除远程指定目录下的所有文件
  let deleteDir;
  if (Array.isArray(remoteDir)) {
    deleteDir = remoteDir.map((pathname) => (done) => {
      const cmd = `rm -rf ${pathname} \r\nexit\r\n`;
      Shell(server, cmd, done);
    });
  } else {
    deleteDir = [
      (done) => {
        const cmd = `rm -rf ${remoteDir}* \r\nexit\r\n`;
        console.log(cmd);
        Shell(server, cmd, done);
      }
    ];
  }

  // 创建远程目录
  const todoDir = [];
  dirs.forEach((dir) => {
    todoDir.push((done) => {
      const to = path.join(servePath, dir.slice(localDir.length)).replace(/[\\]/g, '/');
      const cmd = `mkdir -p ${to}\r\nexit\r\n`;
      console.log(cmd);
      Shell(server, cmd, done);
    }); // end of push
  });

  // 上传文件
  const todoFile = [];
  files.forEach((file) => {
    todoFile.push((done) => {
      const to = path.join(servePath, file.slice(localDir.length)).replace(/[\\]/g, '/');
      console.log(`upload ${to}`);
      UploadFile(server, file, to, done);
    });
  });

  control.emit('donext', deleteDir, (err) => {
    if (err) {
      throw err;
    } else {
      control.emit('donext', todoDir, (err) => {
        if (err) {
          throw err;
        } else {
          control.emit('donext', todoFile, then);
        }
      });
    }
  });
}

exports.Shell = Shell;
exports.UploadFile = UploadFile;
exports.DownloadFile = DownloadFile;
exports.GetFileOrDirList = GetFileOrDirList;
exports.DownloadDir = DownloadDir;
exports.UploadDir = UploadDir;
