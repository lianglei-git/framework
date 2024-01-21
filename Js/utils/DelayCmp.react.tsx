import { useEffect, useState } from "react";

const DelayCmp = (props) => {
  const { Component, delay } = props;
  const [show, SetShow] = useState(false);
  useEffect(() => {
    setTimeout(() => {
      SetShow(true);
    }, delay * 1000);
  }, []);
  return <div style={{ display: show ? "block" : "none" }}>{Component}</div>;
};

export { DelayCmp };
