function buildScrollMap() {
    const textarea = $(".source");
    const sourceLikeDiv = $("<div />").css({
      position: "absolute",
      visibility: "hidden",
      height: "auto",
      width: textarea[0].clientWidth,
      "font-size": textarea.css("font-size"),
      "font-family": textarea.css("font-family"),
      "line-height": textarea.css("line-height"),
      "white-space": textarea.css("white-space")
    }).appendTo("body");
    const offset = $(".result-html").scrollTop() - $(".result-html").offset().top;
    const _scrollMap = [];
    const nonEmptyList = [];
    const lineHeightMap = [];
    let acc = 0;
    textarea.val().split("\n").forEach((function(str) {
      lineHeightMap.push(acc);
      if (str.length === 0) {
        acc++;
        return;
      }
      sourceLikeDiv.text(str);
      const h = parseFloat(sourceLikeDiv.css("height"));
      const lh = parseFloat(sourceLikeDiv.css("line-height"));
      acc += Math.round(h / lh);
    }));
    sourceLikeDiv.remove();
    lineHeightMap.push(acc);
    const linesCount = acc;
    for (let i = 0; i < linesCount; i++) {
      _scrollMap.push(-1);
    }
    nonEmptyList.push(0);
    _scrollMap[0] = 0;
    $(".line").each((function(n, el) {
      const $el = $(el);
      let t = $el.data("line");
      if (t === "") {
        return;
      }
      t = lineHeightMap[t];
      if (t !== 0) {
        nonEmptyList.push(t);
      }
      _scrollMap[t] = Math.round($el.offset().top + offset);
    }));
    nonEmptyList.push(linesCount);
    _scrollMap[linesCount] = $(".result-html")[0].scrollHeight;
    let pos = 0;
    for (let i = 1; i < linesCount; i++) {
      if (_scrollMap[i] !== -1) {
        pos++;
        continue;
      }
      const a = nonEmptyList[pos];
      const b = nonEmptyList[pos + 1];
      _scrollMap[i] = Math.round((_scrollMap[b] * (i - a) + _scrollMap[a] * (b - i)) / (b - a));
    }
    return _scrollMap;
  }
  // Synchronize scroll position from source to result
    const syncResultScroll = _.debounce((function() {
    const textarea = $(".source");
    const lineHeight = parseFloat(textarea.css("line-height"));
    const lineNo = Math.floor(textarea.scrollTop() / lineHeight);
    if (!scrollMap) {
      scrollMap = buildScrollMap();
    }
    const posTo = scrollMap[lineNo];
    $(".result-html").stop(true).animate({
      scrollTop: posTo
    }, 100, "linear");
  }), 50, {
    maxWait: 50
  });
  // Synchronize scroll position from result to source
    const syncSrcScroll = _.debounce((function() {
    const resultHtml = $(".result-html");
    const scrollTop = resultHtml.scrollTop();
    const textarea = $(".source");
    const lineHeight = parseFloat(textarea.css("line-height"));
    if (!scrollMap) {
      scrollMap = buildScrollMap();
    }
    const lines = Object.keys(scrollMap);
    if (lines.length < 1) {
      return;
    }
    let line = lines[0];
    for (let i = 1; i < lines.length; i++) {
      if (scrollMap[lines[i]] < scrollTop) {
        line = lines[i];
        continue;
      }
      break;
    }
    textarea.stop(true).animate({
      scrollTop: lineHeight * line
    }, 100, "linear");
  }), 50, {
    maxWait: 50
  });