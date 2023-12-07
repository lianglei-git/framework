async function limitQueue(promises, limit = 10) {
  let RunTabskIndex = 0;
  let RunLimitMaxIndex = 0;
  let RunTaskFullIndex = 0;
  let isStartTaks = true;
  const promisesLength = promises.length;
  const currentRunTaks = promises.splice(0, limit);
  let PromiseResult = null;
  let PromiseReject = null;
  if(promisesLength == 0) {
    return Promise.resolve(true);
  }
  if (promisesLength < limit) {
    limit = promisesLength - 1;
  }

  function runLimitTask() {
    while (isStartTaks) {
      setup(currentRunTaks[RunLimitMaxIndex]);
    }
  }

  function setup(promise) {
    if (RunTabskIndex > promisesLength - 1) {
      isStartTaks = false;
      return;
    }
    if (RunLimitMaxIndex >= limit) {
      isStartTaks = false;
      return;
    }
    RunLimitMaxIndex++;
    RunTabskIndex++;
    const _next = () => {
      RunTaskFullIndex++;
      if (RunTaskFullIndex > promisesLength - 1) {
        PromiseResult();
        return;
      }
      currentRunTaks.splice(RunLimitMaxIndex, 1);
      const nexttask = promises.shift();
      currentRunTaks.push(nexttask);
      RunLimitMaxIndex--;
      setup(nexttask);
    }
    if(typeof promise !== 'function') {
      _next();
      return console.log(promise,'无效的函数Promise')
    }
    promise().then(_next).catch((reason) => {
     return PromiseReject(reason);
    })
  }

  runLimitTask();

  return new Promise((res, reject) => {
    PromiseResult = res;
    PromiseReject = reject;
  })
}

export default limitQueue;
