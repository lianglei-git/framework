var Cache = {};

var key = 0;
// 生成唯一下标
var createKey = function () {
    key++;
    return 'k' + key;
};

// 保存单次数据
const saveOne = (val) => {
    var key = createKey();
    Cache[key] = {
        type: 'one',
        value: val
    };
    return key;
};
// 载入数据
const loadSaveOne = (key) => {
    var value = Cache[key];
    if (value == null) {
        return null;
    }
    if (value.type == 'one') {
        delete Cache[key];
    }
    return value.value;
};

const getTextInfo = (nodes) => {
    const result = {
        text: '',
        children: Array<any>()
    };
    nodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            result.text += node.textContent.trim();
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const text: string = node.textContent;
            result.children.push(text);
        }
    });
    return result;
};
export { loadSaveOne, saveOne, getTextInfo };
