import { UUID } from "./UUID";
import { LinkedList } from "./struct/LinkedList";
let isDev = false;
type IDIParams = {
  originData: object;
  taskFunc: (...arg: any) => any;
  runningState: {
    status: "wait" | "running" | "failed" | "finished";
    message: string;
    count: number;
    pass: any[];
  };
};
type IQueueItemTaskType = {
  uuid: string;
  DIP: IDIParams; // Hint: 外界注入参数依赖
};

// 生成依赖注入器与参数混同
function generateInjectorDIParams(func: (...arg: any) => any): IDIParams {
  return new (class InjectorDI {
    originData = Object.create(null);
    runningState = {
      status: "wait",
      message: "",
      //   totalRunTime: 0,
      count: 0,
      pass: [],
    };
    taskFunc = func;
    // TODO: 实现注入方法
    make() {
      console.log("制造");
    }
    overtake() {
      console.log("追增");
    }
  })();
}

type IChunkQueueLoaderConfig = {
  maxLimit: number;
};
class ChunkQueueLoader {
  // 信息
  info = {
    currentRunningTask: null, // 当前运行的任务
    runningTasksNumber: 0, // 正在运行任务的数量
    isStopAllTasks: false,
  };
  linkedlist = new LinkedList();
  tasksMap = new Map();
  constructor(public config: IChunkQueueLoaderConfig) {}
  destoryFinishedQueue(task: IQueueItemTaskType) {
    // 把此次任务放进执行过程中
    task.DIP.runningState.pass.push(task.DIP.runningState);
  }

  loopRunning() {
    const curTask = this.info.currentRunningTask;
    let uuid = curTask.data;
    this.runOneTask(this.tasksMap.get(uuid));
  }

  // 执行一次任务
  async runOneTask(task: IQueueItemTaskType) {
    task.DIP.runningState.status = "running";
    task.DIP.runningState.count++;
    if (this.info.runningTasksNumber == this.config.maxLimit) {
      return;
    }
    this.info.runningTasksNumber++;
    try {
      await task.DIP.taskFunc();
      task.DIP.runningState.status = "finished";
      isDev && console.log("Task finished   ::::: ", task.uuid);
    } catch (err) {
      console.log(err);
      task.DIP.runningState.status = "failed";
      task.DIP.runningState.message = err.stack;
    }
    this.info.runningTasksNumber--;
    if (this.info.isStopAllTasks) {
      isDev && console.log("停止所有任务 ::: ");
      return;
    }
    // 消除这次任务
    this.destoryFinishedQueue(task);
    if (this.info.currentRunningTask.next) {
      this.info.currentRunningTask = this.info.currentRunningTask.next;
    } else {
      isDev &&
        console.log(
          "该任务最后一批的倒数第",
          this.info.runningTasksNumber,
          "个任务"
        );
      return;
    }
    this.loopRunning();
  }

  static createTask(key, func): IQueueItemTaskType {
    // 如果使用外界key
    const uuid = key ?? UUID();
    const DIP = generateInjectorDIParams(func);
    return {
      uuid,
      DIP,
    };
  }
  pushQueue(key, func) {
    const task = ChunkQueueLoader.createTask(key, func);
    if (this.tasksMap.has(task.uuid)) {
      return this.runOneTask(task);
    }
    // 这个应该是个连表啊
    this.tasksMap.set(task.uuid, task);
    this.linkedlist.append(task.uuid);

    // 首次没有就给默认值
    if (this.info.currentRunningTask == null) {
      this.info.currentRunningTask = this.linkedlist.head;
    }
    // 执行前要把指针指过去
    if (this.info.runningTasksNumber < this.config.maxLimit) {
      this.info.currentRunningTask = this.info.currentRunningTask.next;
    }
    this.runOneTask(task);
  }

  stopChunkTasks() {
    this.info.isStopAllTasks = true;
    // this.info.runningTasksNumber = 0;
  }
  startChunkTasks() {
    this.info.isStopAllTasks = false;
    this.loopRunning();
  }
}

/** -- --- --- -- 测试 */
/**
 * @example
 * 这个功能只能适用异步加载时候
 */
function TestExampleChunkQueueLoader() {
  isDev = true;
  let arr = Array(30).fill(1);
  const loader = new ChunkQueueLoader({
    // 最大共同执行数量
    maxLimit: 5,
  });
  const delay = () => new Promise((res) => setTimeout(res, 1000));
  arr.map((_, key) => loader.pushQueue(key, delay));
  // 可以在浏览器里面随时执行这个，并查看输出信息
  (window as any).addChunkTasks = (num) => {
    Array(num)
      .fill(1)
      .map(() => loader.pushQueue(null, delay));
  };
  (window as any).stopChunkTasks = loader.stopChunkTasks.bind(loader);
  (window as any).startChunkTasks = loader.startChunkTasks.bind(loader);
  //   addChunkTasks(10);
}
// TestExampleChunkQueueLoader();

export { ChunkQueueLoader };
