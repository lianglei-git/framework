/* eslint-disable guard-for-in */
const isObject = (target) => Object.prototype.toString.call(target) === '[object Object]';

/**
 *
 * @param {new()} C
 * @returns {new()}
 */
function AdapterDiSocket(C) {
  const obj = {
    [`${C.name}_sup`]: class extends C {
      _socket = 0;

      static init = null;

      static instance = null;

      static cname = C.name;

      constructor(p = null) {
        super(p);
        if (isObject(p)) {
          for (const [k, v] of Object.entries(p)) this[k] = v;
        }
        // eslint-disable-next-line no-unused-expressions
        super._init && super._init();
      }

      get socket() {
        return this._socket || null;
      }

      // 废弃⚠️
      static async Instance(props, lock = true) {
        const TmpClass = obj[`${C.name}_sup`];
        if (TmpClass.init) return;
        let _ = TmpClass.instance;
        if (_ && lock) return Promise.resolve(_);
        if (!lock) {
          _?._socket?.close?.();
          try {
            _._socket = null;
            _ = null;
          } catch (error) {
            // eslint-disable-next-line no-return-await
            return (TmpClass.instance = await new TmpClass(props));
          }
        }
        TmpClass.init = true;
        // eslint-disable-next-line no-return-assign
        return (TmpClass.instance = await new TmpClass(props));
      }
    }
  };
  return obj[`${C.name}_sup`];
}
/**
 * @param {Array<File>} files
 * @returns _esModule
 */
function Modules(files) {
  const anyModules = [];
  files.keys().forEach((key) => {
    if (key.indexOf('index.js') === -1) {
      const module = files(key);
      if (!Reflect.has(module, 'default')) throw Error('导出格式仅限 “export default”');
      const _default = module.default;

      if (isObject(_default)) for (const _key2 in _default) anyModules.push(AdapterDiSocket(_default[_key2]));
      else anyModules.push(AdapterDiSocket(_default));
    }
  });
  return anyModules;
}

export { AdapterDiSocket, Modules };
