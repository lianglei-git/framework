var selectText = function () {
    var selectText = window.getSelection ? window.getSelection() : document.selection.createRange().text;
    return selectText.toString();
}
// _e_point 鼠标事件
var getPosAtPoint = function (_e_point) {
    var range;
    var textNode;
    var offset;
    var fanyi_pos = null;
    var scrollTop = 0//that.getScrollTop();
    // standard
    if (document.caretPositionFromPoint) {
        range = document.caretPositionFromPoint(_e_point.pageX, _e_point.pageY - scrollTop);
        textNode = range.offsetNode;
        offset = range.offset;
    }
    // WebKit
    else if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(_e_point.pageX, _e_point.pageY - scrollTop);
        textNode = range.startContainer;
        offset = range.startOffset;
    }

    // only split TEXT_NODEs
    if (textNode.nodeType == 3) {
        var replacement = textNode.splitText(offset);// 截取鼠标位置之后的文本
        var spanElement = document.createElement('span');// 创建标识
        spanElement.id = 'nmh_fanyi_dom';// 设置标识类名
        textNode.parentNode.insertBefore(spanElement, replacement);// 插入标识
        var fanyi_dom = document.getElementById('nmh_fanyi_dom');
        fanyi_pos = fanyi_dom.getBoundingClientRect();
        fanyi_pos['height'] = fanyi_dom.offsetHeight;// 获取插入标识获得得一行高度
        fanyi_dom.parentNode.removeChild(fanyi_dom);// 获取到位置后移除掉标识
        textNode.parentNode.normalize();// 合并文本节点
    }
    return fanyi_pos;// 返回位置	    
}

const SelectionAtPoint = {
    selectText,
    getPosAtPoint
}

export {
    SelectionAtPoint
}

/** test */

// const dan = document.createElement("div")
// dan.innerHTML = `
// <span>翻译</span>
// `
// dan.style.position = "fixed";
// dan.style.color = "red"
// dan.style.display = "none"
// document.body.appendChild(dan)


// const lastSelectInfo = {
//     text: ""
// };

// window.addEventListener("mouseup", e => {
//     const t = selectText()
//     if (t) {
//         lastSelectInfo.text = t
//         dan.style.display = "block"
//         const rect = getPosAtPoint(e);
//         dan.style.left = rect.left + "px";
//         dan.style.top = rect.top + "px";
//     } else {
//         lastSelectInfo.text = ""
//     }
// })

// window.addEventListener("mousedown", e => {
//     dan.style.display = "none"
// })
// dan.addEventListener("mousedown", e => {
//     e.stopPropagation();
// })