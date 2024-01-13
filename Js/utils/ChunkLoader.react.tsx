import React from "react";
import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";

const map = [];
let idx = 0;
let cur = null;
// 这个使用固定下标可能出现一些问题。我先把这个逻辑完成闭环。后续如果再有需要在进行完善。
type IChunkLoader = (props: {
  Component: React.JSX.Element | string;
  onLoad?: (params: any) => void;
  params: {
    [k: string]: any;
  };
  isNext?: boolean;
}) => React.JSX.Element;

const ChunkReactLoader: IChunkLoader = ({
  Component,
  isNext = false,
  params,
  onLoad,
}) => {
  const [loading, setLoading] = useState(true);
  const [NextCm, setNextCmp] = useState<{
    Cmp: JSX.Element;
    params: any;
    onLoad: (params: any) => void;
  }>(null);
  const ran = useRef(Math.random());
  function next() {
    setNextCmp(map[idx]);
  }
  useEffect(() => {
    (async () => {
      if (!isNext) {
        map.push({
          Cmp: Component,
          params,
          onLoad,
        });
      }
      if (cur) {
        return;
      }
      cur = ran;
      if (onLoad != null) {
        await onLoad(params);
      }
      idx++;
      setLoading(false);
      next();
      cur = null;
    })();
  }, []);

  if (!loading) {
    return (
      <>
        {Component}
        {NextCm && (
          <ChunkReactLoader
            Component={NextCm.Cmp}
            params={NextCm.params}
            onLoad={NextCm.onLoad}
            isNext
          />
        )}
      </>
    );
  }
  return null;
};
/**
 * 我也不是很清楚应该为此命名为甚么，比如：按顺序await？
 * @example
const Example = () => {
  let arr = Array(10).fill(1);
  const ExamCmp = (props) => {
    return <div>第{props.cur.index}加载完成</div>;
  };
  const onLoad = async (props) => {
    if (props.index > 3) {
      props.index = props.index + "丰富过的";
    }
    await new Promise((res) => {
      setTimeout(res, 1000);
    });
  };
  return (
    <div>
      {arr.map((_, index) => {
        // 使用引用对象
        const reflect = { index };
        return (
          <ChunkReactLoader
            key={index}
            Component={<ExamCmp cur={reflect} />}
            params={reflect}
            onLoad={onLoad}
          />
        );
      })}
    </div>
  );
};

setTimeout(() => {
  const rootEl = document.getElementById("root") as HTMLElement;
  ReactDOM.createRoot(rootEl).render(<Example />);
}, 4000);
*/

export { ChunkReactLoader };
