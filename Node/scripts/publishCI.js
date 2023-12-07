/**
 * 上传打包后的文件到服务器上的webpack插件
 */
const { spawn } = require('node:child_process');
const UploadDir = require('./serverLib').UploadDir;
const fs = require('node:fs');
const path = require('node:path');
const { Shell } = require('./serverLib');
const deleteFile = fs.readdirSync(path.resolve(__dirname, '../server-render/dist'));
const servePath = '//dist';
const newServePath = '/hdb/serender/dist';

const loadEndCallback = (serverConfig) => {
  const cmd = `cd ${servePath} \r\n pm2 restart ecosystem.config.js \r\n \n exit \n`;
  Shell(serverConfig, cmd, (err, buf) => {
    console.log('重新启动完成✅', serverConfig.host);
  });
};
const buildFolder = path.resolve(__dirname, '../server/dist');
const serverConfigList = [
];

serverConfigList.forEach((serverConfig) => {
  const chmod = spawn('chmod', ['-R', '777', serverConfig.buildFolder]);
  chmod.on('exit', (code, signal) => {
    console.log('\n服务器授权成功，开始自动化部署~~\n');
    console.info(
      [
        '----------   ------------ -----------  ----           --------   ---      ---',
        '************ ************ ************ ****          **********   ***    *** ',
        '--        -- ----         ---      --- ----         ----    ----   ---  ---  ',
        '**        ** ************ ************ ****         ***      ***    ******   ',
        '--        -- ------------ -----------  ----         ---      ---     ----    ',
        '**        ** ****         ****         ************ ****    ****     ****    ',
        '------------ ------------ ----         ------------  ----------      ----    ',
        '**********   ************ ****         ************   ********       ****    '
      ].join('\n')
    );
    UploadDir(
      serverConfig,
      serverConfig.buildFolder,
      serverConfig.deleteFile,
      serverConfig.servePath,
      (err) => {
        if (err) throw err;
        console.info(
          [
            '------------ --------  ----    ---- --------  ------------ ----    ----',
            '************ ********  *****   **** ********  ************ ****    ****',
            '----           ----    ------  ----   ----    ----         ----    ----',
            '************   ****    ************   ****    ************ ************',
            '------------   ----    ------------   ----    ------------ ------------',
            '****           ****    ****  ******   ****           ***** ****    ****',
            '----         --------  ----   ----- --------  ------------ ----    ----',
            '****         ********  ****    **** ********  ************ ****    ****'
          ].join('\n')
        );
        console.log('\n自动化部署成功~\n');
        loadEndCallback(serverConfig);
      }
    );
  });
});
