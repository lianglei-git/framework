/* eslint-disable no-await-in-loop */
/* eslint-disable no-return-assign */
/* eslint-disable consistent-return */
/* eslint-disable no-constructor-return */
/* eslint-disable no-undef */
/* eslint-disable no-restricted-syntax */

import axios from 'axios';
import Base from './_base';

const message = {
  error: Spui.Message.error
}
const _ = Object.create(null);
class Ws extends Base {
  /** @type {Ws} */
  static instance = 0;

  static init = false;

  /**
   *
   * @param {{clss:Array<new()>, ip: string, id: number}} props
   * @returns Promise<context>
   */
  constructor(props) {
    const cprops = { ...props };
    const cls = cprops.clss || [];
    delete cprops.clss;
    super(cprops);
    const self = this;
    const { ip, AxiosRequestConfig } = cprops;
    return new Promise((res) => {
      axios(AxiosRequestConfig)
        .then(async (re) => {
          const url = re.request.responseURL;
          cprops.ip = ip || url.slice(0, url.lastIndexOf(':'));
          if (re.data?.port?.data == null && re.data?.port?.code === 2002) {
            // 资源不足
            message.error(re.data?.port?.message, 3);
            return res(null);
          }
          self.socket = io(`${cprops.ip}:${re.data.port}/`);

          for (const C of cls) {
            this[C.cname || C.name] = new C(
              Object.assign(cprops, { _socket: self.socket, IoPort: re.data.port })
            );
          }

          self.socket.on('connect', () => {
            Ws.init = false;
            self._init(self.socket).then(() => {
              res(self);
            });
          });
        })
        .catch((error) => console.error(error));
    });
  }

  /**
   * 初始多个WS 分发到对应的类里面
   * @param {{cls: new(), ip, id, uri, ...args}} anys
   * @returns {{[K]: new()}}
   */
  static async SomeSockets(anys) {
    for (let i = 0; i < anys.length; i++) {
      const Cls = anys[i].cls;
      if (!_[Cls.cname || Cls.name]) {
        _[Cls.cname] = 1;
        const s = await new Ws({ ...anys[i], clss: [] });
        _[Cls.cname] = await Cls.Instance(Object.assign(anys[i], { _socket: s.socket }));
      }
    }
    return Promise.resolve(Object.freeze(Object.create(_)));
  }

  /**
   *  初始化一个ws 分发到那个传入的类里面
   * @param {{clss:Array<new()>, ip: string, id: number}} props any
   * @param {*} lock 重新生成
   * @returns {new Ws()}
   */
  static async Instance(props) {
    // if (Ws.init) return;
    const condition = Ws.instance && (props.lock ?? true);
    if (condition) return Promise.resolve(Ws.instance);
    Ws.instance?.destorySocket?.();
    // Ws.instance?.socket?.disconnect?.();
    // Ws.instance?.socket?.close?.();
    console.log(props, Ws.init, 'propspropsprops');

    Ws.init = true;
    return (Ws.instance = await new Ws(props));
  }
}

export default Ws;
