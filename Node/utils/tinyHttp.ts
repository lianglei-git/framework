const Koa = require('koa');
const Router = require('koa-router');
const cors = require('koa2-cors');
const staticFile = require('koa-static');
const bodyParser = require('koa-bodyparser');
const path = require('path');
const { isDev } = require('./adapterDevelop');

var port = 9292;
const projectCwd = isDev ? '../../' : './'; // 区分不同环境的根路径，默认为生产环境

/**
 * 微小服务
 * @param {Router} router
 * @returns {Koa & {router: Router, Run: (port=9292, ...args:any)=>Koa}} app
 */
function SetupTinyServe(router = new Router()) {
  /** 服务端渲染HTTP接口服务 */
  const app = new Koa();
  /** 挂载基本中间件 */
  app
    .use(staticFile(path.join(__dirname, projectCwd, 'public')))
    .use(cors())
    .use(bodyParser());
  // 挂载实例路由对象
  app.router = router;
  // 启动服务
  app.Run = (_port, ...args) => {
    if (_port == undefined) {
      _port = port;
    }
    app.use(app.router.routes()).use(app.router.allowedMethods());
    return app.listen(port, ...args);
  };
  return app;
}

module.exports = {
  SetupTinyServe
};
