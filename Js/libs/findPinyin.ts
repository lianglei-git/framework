// 需要安装Pinyin库

// import pinyin from 'speech-web/libs/pinyin.mjs';

// 生成汉字与拼音的映射表
function buildPinyinMap(chineseStr) {
  const map = [];
  let pinyinStr = '';

  // 逐字转换拼音
  for (let i = 0; i < chineseStr.length; i++) {
    const char = chineseStr[i];
    const py = pinyin(char, {
      style: 0,
      segment: false
    })[0] || char;

    // 记录映射关系
    map.push({
      sourceStart: i,
      sourceEnd: i + 1,
      pinyinStart: pinyinStr.length,
      pinyinEnd: pinyinStr.length + py.length,
      char: char,
      pinyin: py
    });

    pinyinStr += py;
  }

  return { map, pinyinStr };
}

function findPinyinPositions(target, mapping, fullPinyin, chineseStr) {
  const results = [];
  let pos = fullPinyin.indexOf(target);

  while (pos !== -1) {
    const start = pos;
    const end = pos + target.length;

    // 查找覆盖该拼音区间的所有字符
    const matched = mapping.filter(m =>
      m.pinyinStart < end && m.pinyinEnd > start
    );

    if (matched.length > 0) {
      results.push({
        pinyinPos: [start, end],
        sourcePos: [
          matched[0].sourceStart,
          matched[matched.length - 1].sourceEnd
        ],
        text: chineseStr.slice(
          matched[0].sourceStart,
          matched[matched.length - 1].sourceEnd
        )
      });
    }

    pos = fullPinyin.indexOf(target, pos + 1); // 继续查找下一个匹配
  }

  return results;
}

export {
  findPinyinPositions,
  buildPinyinMap
};

// const chineseStr = "股骨头坏死，并且桥本有阳性病害。切换磁条再切换骨头测量";

// const { map, pinyinStr } = buildPinyinMap(chineseStr);
// console.log("完整拼音字符串:", pinyinStr, map);
// // 输出：gugutouhuaisai，bingqieqiaobenyouyangxingbinghai。qiehuancitiaozaiqiehuangutouceliang

// const targetPinyin = "gutou";
// const results = findPinyinPositions(targetPinyin, map, pinyinStr);

// console.log(results,"results")

// results.forEach(res => {
//   console.log(`拼音位置: [${res.pinyinPos}] => 源文字位置: [${res.sourcePos}]`);
//   console.log("对应汉字:", chineseStr.slice(...res.sourcePos));
// });
