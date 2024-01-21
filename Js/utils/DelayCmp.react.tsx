import { useEffect, useState } from "react";

const cacheMap = {};
const DelayCmp = (props) => {
  let { Component, delay } = props;
  // if (props.cache) {
  //   if (cacheMap[props.cache]) {
  //     Component = cacheMap[props.cache];
  //   } else {
  //     cacheMap[props.cache] = Component;
  //   }
  // }
  const [show, SetShow] = useState(false);
  useEffect(() => {
    setTimeout(() => {
      SetShow(true);
    }, delay * 1000);
  }, []);
  return (
    <div
      style={{
        display: show ? "block" : "none",
        height: "100%",
        width: "100%",
      }}
    >
      {Component}
    </div>
  );
};

export { DelayCmp };
