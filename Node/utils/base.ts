import { inflate } from 'pako';
import { atob } from './base64';

// 服务端容错
if (typeof global !== 'undefined' && !global.window) global.window = global;

/**
 * 获取当前页面的get参数
 * @returns {{[key:string]:string}}
 */
export var GetLocationArgs = function () {
  // 兼容服务端渲染
  if(!window.location) return {};
  let kvs = window.location.href.split('#')[0].split('?')[1] || '';
  kvs = kvs.split('&');
  const args = {};
  for (const i in kvs) {
    const kv = kvs[i].split('=');
    args[kv[0]] = kv[1];
  }
  return args;
};
/**
 * 获取当前环境下的Chrome版本号
 * @returns {number}
 */
export var GetChromeVersion = function () {
  const arr = navigator.userAgent.split(' ');
  let chromeVersion = '';
  for (let i = 0; i < arr.length; i++) {
    if (/chrome/i.test(arr[i])) {
      chromeVersion = arr[i];
    }
  }
  if (chromeVersion) {
    return Number(chromeVersion.split('/')[1].split('.')[0]);
  }
  return false;
};

/**
 * 获取当前环境下的位数
 * @returns {boolean}
 */
export var isChrome32Bit = function () {
  const userAgent = navigator.userAgent;
  const isWin64 = userAgent.includes('Win64') || userAgent.includes('x64');
  const isLinux64 = userAgent.includes('Linux x86_64');
  console.log(userAgent, 'userAgent');
  if (isWin64 || isLinux64) {
    return false; // 64位谷歌内核
  } else {
    return true; // 32位谷歌内核
  }
};

/**
 * 获取当前环境是否为xp 系统
 * @returns {boolean}
 */
export var isXp = function () {
  const isWindowsXP = /Windows NT 5.1|Windows XP/.test(navigator.userAgent);
  if (isWindowsXP) {
    return true;
  } else {
    return false;
  }
};


/**
 * Rle方案压缩数据
 * @param {number[]} nums 待压缩的数据
 * @returns {number[]} 压缩完成的数据
 */
export var RleEncode = (nums, maxLength = 10e10) => {
  const encoded = [];
  let current = nums[0];
  let run_length = 1;
  for (let i = 1; i < nums.length; i++) {
    const num = nums[i];
    if (num === current) {
      run_length++;
    } else {
      encoded.push(run_length);
      encoded.push(current);
      current = num;
      run_length = 1;
      // 最大长度限制
      if (encoded.length > maxLength) return false;
    }
  }
  encoded.push(run_length);
  encoded.push(current);
  return encoded;
};

/**
 * Rle方案压缩数据
 * @param {number[]} nums 待压缩的数据
 * @returns {number[]} 压缩完成的数据
 */
export var RleEncodeN = (nums) => {
  const encoded = [];
  let current = nums[0];
  let run_length = 1;
  for (let i = 1; i < nums.length; i++) {
    const num = nums[i];
    if (num === current) {
      run_length++;
    } else {
      encoded.push(current);
      encoded.push(run_length);
      current = num;
      run_length = 1;
    }
  }
  encoded.push(current);
  encoded.push(run_length);
  return encoded;
};

/**
 * Rle方案解压数据
 * @param {number[]} nums 要解压的数据
 * @returns {Uint8Array} 解压完成的数据
 */
export var RleDecode = (nums = []) => {
  // 获取总长度
  let allLen = 0;
  for (var i = 0; i < nums.length; i += 2) {
    allLen += Number(nums[i]);
  }
  // 创建缓冲区
  const buffer = new Uint8Array(CreateBuffer(allLen));
  let off = 0;
  // 写入缓冲区
  for (var i = 0; i < nums.length; i += 2) {
    const len = Number(nums[i]);
    const val = Number(nums[i + 1]);
    buffer.fill(val, off, off + len);
    off += len;
  }
  return buffer;
};

/**
 * Rle方案解压数据
 * @param {number[]} nums 要解压的数据
 * @returns {Uint8Array} 解压完成的数据
 */
export var RleDecodeN = (nums = []) => {
  // 获取总长度
  let allLen = 0;
  for (var i = 1; i < nums.length; i += 2) {
    allLen += Number(nums[i]);
  }
  // 创建缓冲区
  const buffer = new Uint8Array(CreateBuffer(allLen));
  let off = 0;
  // 写入缓冲区
  for (var i = 0; i < nums.length; i += 2) {
    const len = Number(nums[i + 1]);
    const val = Number(nums[i]);
    buffer.fill(val, off, off + len);
    off += len;
  }
  return buffer;
};

/**
 * 创建一个内存空间，可兼容的使用共享内存或普通内存
 * @param {number} len 数据长度
 * @returns
 */
export var CreateBuffer = function (len) {
  return new ArrayBuffer(len);
};

// 用于保存输出的数据
const logData = {};

/** 全局用于调试时输出的工具 */
export var LOG = (window.LOG = {
  /**
   * 向一个类型的日志里面添加一条数据
   * @param {string} key 要添加的类型
   * @param {*} val 要添加的数据
   */
  log(key, ...args) {
    logData[key] = logData[key] || [];
    if (args.length === 1) {
      args = args[0];
    }
    logData[key].push(args);
  },
  /**
   * 输出指定类型的数据
   * @param {string} key 要显示的类型
   */
  show(key) {
    console.log(logData[key]);
    this.clear(key);
  },
  /**
   * 清空指定类型的数据
   * @param {string} key 要情况的类型
   */
  clear(key) {
    logData[key] = [];
  }
});

/**
 * 日期格式化
 * @param {Date} date 要格式化的时间对象
 * @param {string} fmt 格式化模板字符串  例如yyyy-MM-dd hh:mm:ss
 * @returns 格式化结果
 */
export var DateFromat = function (date, fmt) {
  const o = {
    'Y+': date.getFullYear(), // 年份
    'y+': date.getFullYear(), // 年份
    'M+': date.getMonth() + 1, // 月份
    'd+': date.getDate(), // 日
    'h+': date.getHours(), // 小时
    'm+': date.getMinutes(), // 分
    's+': date.getSeconds(), // 秒
    'q+': Math.floor((date.getMonth() + 3) / 3), // 季度
    S: date.getMilliseconds() // 毫秒
  };
  if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, `${date.getFullYear()}`.substr(4 - RegExp.$1.length));
  for (const k in o) {
    if (new RegExp(`(${k})`).test(fmt)) {
      fmt = fmt.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : `00${o[k]}`.substr(`${o[k]}`.length));
    }
  }
  return fmt;
};

/**
 * 将压缩的base64字符串体素转换为Uint8Array
 * @param {*} str 要转换的字符串
 * @returns
 */
export var loadBase64Voxel = function (str) {
  if (!str) {
    return;
  }
  let data = base64ToUint8Array(str);
  data = inflate(data);
  const voxel = new Uint8Array(CreateBuffer(data.length));
  for (let i = 0; i < data.length; i++) {
    voxel[i] = data[i];
  }
  return voxel;
};

// base64转arraybuffer
export function base64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = (window.atob || atob)(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * 判断一个节点是否是另一个节点的子节点
 * @param {HTMLElement} par 要判断的父节点
 * @param {HTMLElement} child 要判断的子节点
 * @returns {boolean}
 */
export var isChild = function (par, child) {
  let now = child;
  while (now && now.parentNode && now.parentNode != null) {
    if (now === par || now.parentNode === par) {
      return true;
    }
    now = now.parentNode;
  }
  return false;
};

/** 获取用户信息 */
export function getUserInfo() {
  const { yunPacs } = GetLocationArgs();
  const key = yunPacs === 'is' ? 'pacs-userInfo' : 'userInfo';
  if (window.localStorage && localStorage.getItem(key)) {
    return JSON.parse(localStorage.getItem(key));
  }
  if (window.localStorage && localStorage.getItem('pacs-userInfo')) {
    return JSON.parse(localStorage.getItem('pacs-userInfo'));
  }
  return {};
}

/** 获取用户token信息a */
export function getToken() {
  const userInfo = getUserInfo();
  const userKey = window.localStorage && localStorage.getItem('userKey');
  const { token = '' } = userInfo;
  return {
    token: userKey || token,
    appType: userKey ? 'direct_ai' : ''
  };
}

/**
 * 两个相同长度的数组中的数值的每个同位值的差值是否在规定的范围内
 * @param {number[]} arr1 数组1
 * @param {number[]} arr2 数组2
 * @param {number} limit 差值上限
 */
export function ArrayTolerance(arr1, arr2, limit = 1) {
  for (var i in arr1) {
    if (Math.abs(arr1[i] - arr2[i]) > limit) return false;
  }
  return true;
}

/**
 * 计算Box体积,支持2d/3d
 * @param {*} box 要计算的box
 * @returns {number} box的体积
 */
export const BoxVol = (box) => {
  const l = {
    x: box.x2 - box.x1,
    y: box.y2 - box.y1,
    z: box.z2 - box.z1
  };
  // 是否有负值
  for (const i in l) {
    if (l[i] < 0) {
      return -1;
    }
  }
  if (box.z != null) {
    return l.x * l.y * l.z;
  }
  return l.x * l.y;
};

/**
 * 获取两个框的重叠部分
 * @param {*} b1 box1
 * @param {*} b2 box2
 * @returns 重叠框，有负值则不重叠
 */
export const getMergeBox = (b1, b2) => {
  const b3 = {};
  // 处理一个轴向
  const jaxA = (a) => {
    b3[a + '1'] = Math.max(b1[a + '1'], b2[a + '1']);
    b3[a + '2'] = Math.min(b1[a + '2'], b2[a + '2']);
  };
  // 处理三个轴向
  jaxA('x');
  jaxA('y');
  jaxA('z');
  return b3;
};

export const BoxMerge = (b1, b2) => {
  // 返回比例
  return BoxVol(getMergeBox(b1, b2)) / (BoxVol(b1) + BoxVol(b2) - BoxVol(getMergeBox(b1, b2)));
};

/**
 * 获取paths的包围盒
 * @param {{x: number; y: number; z?:number}[]} paths
 * @returns {import("./index").BBox}
 */
export const getPathsBBox = (paths) => {
  if (paths.length === 0) return null;
  const is3d = paths[0].z !== undefined;
  const pMin = { x: Infinity, y: Infinity, z: Infinity };
  const pMax = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    pMin.x = Math.min(pMin.x, path.x);
    pMin.y = Math.min(pMin.y, path.y);
    is3d && (pMin.z = Math.min(pMin.z, path.z));

    pMax.x = Math.max(pMax.x, path.x);
    pMax.y = Math.max(pMax.y, path.y);
    is3d && (pMax.z = Math.max(pMax.z, path.z));
  }

  /** @type {import("./index").BBox} */
  const bbox = {
    x: pMin.x,
    y: pMin.y,

    rx: pMax.x - pMin.x,
    ry: pMax.y - pMin.y
  };

  if (is3d) {
    bbox['z'] = pMin.z;
    bbox['rz'] = pMax.z - pMin.z;
  }

  return bbox;
};

/**
 * 获取字符串的哈希值
 * @param {string} str 要获取哈希值的字符串
 * @returns
 */
export const GetStringHashCode = (str) => {
  var hash = 0;
  var i;
  var chr;
  if (str.length === 0) return hash;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

/**
 * 获取数组中每个值的数量映射表
 * @param {[]} arr 要获取的数组
 */
export const GetCountMapFromArray = (arr) => {
  const re = {};
  for (var i = 0; i < arr.length; i++) {
    re[arr[i]] = re[arr[i]] || 0;
    re[arr[i]]++;
  }
  return re;
};
