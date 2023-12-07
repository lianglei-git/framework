// import { message } from 'antd';
import axios from 'axios';
import { UUID } from '../utils/UUID';

const message = {
  error: Spui.Message.error
}
let uuid = null;
class BaseWs {
  isTrue = true;

  cbMap = {};

  /** 重写socket Emit事件 */
  adapterSocketEmit(socket) {
    const _emit = socket.emit.bind(socket);
    socket.emit = (eventName, value, ...args) => {
      if (Object.prototype.toString.call(value) === '[object Object]') {
        value.clientUUID = uuid;
      } else {
        value = {
          message: value,
          clientUUID: uuid,
          socketId: socket.id
        };
      }
      return _emit(eventName, value, ...args);
    };
  }

  destorySocket() {
    uuid = null;
    // 私有接口
    const uri = `${this.socket.io.uri}_socket/disconnect`;
    axios.get(uri, { params: { uuid } });
    this.socket.close();
  }

  _init(socket) {
    const ws = socket || this.socket;
    let resultCall = null;
    /** 服务端异常报错， 手动监听 */
    ws.on('proerror', ({ error }) => {
      message.error(`socketErr:${error}`);
    });
    /** 关闭窗口接口 */
    window.onbeforeunload = function () {
      if (!uuid) return void 0;
      // 私有接口
      const uri = `${ws.io.uri}_socket/disconnect`;
      axios.get(uri, { params: { uuid } });
    };

    window.onunload = () => {
      const now = new Date().getTime();
      while (new Date().getTime() - now < 1500) {}
    };

    socket.on('callback', (data) => {
      if (this.cbMap[data.id]) this.cbMap[data.id](data);
      delete this.cbMap[data.id];
    });

    /** 初始化UUID，UUID由服务端初始化进行 唯一匹配 */
    ws.on('uuid', (uid) => {
      if (!uuid) {
        uuid = uid;
      }
      this.adapterSocketEmit(ws);
      resultCall?.();
    });

    /** 重载接口； 当不同的clientUUID匹配不上会触发此接口 */
    ws.on('reset', () => {
      console.log('需要重新初始化一遍');
      // window.history.go(0);
      ws?.disconnect?.();
    });

    // connect：连接成功
    // connecting：正在连接
    // disconnect：断开连接
    // connect_failed：连接失败
    // error：错误发生，并且无法被其他事件类型所处理
    // message：同服务器端message事件
    // anything：同服务器端anything事件
    // reconnect_failed：重连失败
    // reconnect：成功重连
    // reconnecting：正在重连
    ws.on('disconnect', (reason) => {
      console.log('断开连接 --> ', ws?.id, reason);
    });

    ws.on('connect_error', (reason) => {
      console.log('connect_error --> ', reason);
    });

    ws.on('connecting', () => {
      console.log('正在链接 --> ', ws?.id);
    });

    ws.on('connect_failed', (reason) => {
      console.log('连接失败 --> ', reason);
    });

    ws.on('reconnect', () => {
      console.log('成功重连 --> ', ws?.id);
    });

    ws.on('reconnecting', () => {
      console.log('正在重连 --> ', ws?.id);
    });

    ws.on('reconnect_failed', (reason) => {
      console.log('重连失败 --> ', reason);
    });

    // 心跳
    setInterval(() => ws.emit('hert', 'hert'), 4000);
    return new Promise((res) => (resultCall = res));
  }

  // 发送
  post(type, data) {
    const self = this;
    return new Promise((next) => {
      const id = UUID();
      this.cbMap[id] = (p) => {
        next(p);
      };
      self.socket.emit(type, { ...data, id });
    });
  }
}

export default BaseWs;
