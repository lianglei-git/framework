/* eslint-disable no-return-await */
/* eslint-disable no-return-assign */
import { useEffect, useState } from 'react';
import Ws from './ws';
import { AdapterDiSocket, Modules } from './utils';
// import {AxiosRequestConfig} from 'axios'

let _ws;
let lastHash = null;

/**
 *  初始化Ws -- 只有一个实例 仍可使用
 *
 * 1.0 废弃⚠️ @param {{ip: string, uri: string, moduleFiles: Array<File>, [x:string]: any}} params
 * 2.0 使用中 @param {{ip: string, AxiosRequestConfig:axios默认配置 , moduleFiles: Array<File>, [x:string]: any}} params
 * @returns {{ws: SocketIo || null}}
 */
function hookInitWs({ ip, uri, moduleFiles, ...args }) {
  const [ws, setWs] = useState(() => null);
  useEffect(() => {
    if (!ws) {
      console.log('frameWork -- ws初始化');
      const modules = Modules(moduleFiles);
      (async () => {
        await Ws.Instance({
          clss: modules,
          ip,
          ...args
        }).then((res) => {
          _ws = res;
          setWs(res);
        });
      })();
    }
  });
  return {
    ws
  };
}

/**
 * @param {Array<{cls: new(), ip,  AxiosRequestConfig:axios默认配置, [K:string]:any}> | {moduleFiles: any[] | new(), ip, uri, [K:string]?: any}} params
 * @returns {Promise<SocketIo>}
 * @example
 * 多个实例：🌰
 * InitWs([
    {
      ip: '10.2.118.164',
      cls: class A {
        get Socket(){
        return this.socket
        }
     }
    },
    {
      ip: '10.2.112.138',
      cls: class B {}
    }
  ]).then(WsMap => console.log(WsMap))

  * 单个实例：🌰
   InitWs({
    moduleFiles,// 参考参数
    ip: '10.2.118.164', // 10.2.112.138
    ...d
  }).then(WsMap => console.log(WsMap))
 */
async function InitWs(params) {
  if (Array.isArray(params)) {
    params.forEach((item) => {
      item.cls = AdapterDiSocket(item.cls);
    });
    return await Ws.SomeSockets(params).then((r) => (_ws = r));
  }
  const { ip, moduleFiles, customSockets, ...args } = params;
  const modules = Modules(moduleFiles);
  return Ws.Instance({
    clss: modules,
    ip,
    lock: !(lastHash && window.location.href !== lastHash),
    ...args
  }).then((r) => {
    lastHash = window.location.href;
    return (_ws = r);
  });
}

function useWs() {
  useEffect(() => {}, [_ws]);
  return {
    initWs: InitWs,
    ws: _ws
  };
}
export { useWs, hookInitWs, InitWs };
