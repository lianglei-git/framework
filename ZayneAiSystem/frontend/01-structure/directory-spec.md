# L1 物理结构规范

目录结构本身就是规则：agent 见结构而仿结构，这是零成本约束。

## 分层（简化版 Feature-Sliced Design）

```
src/
├── shared/            # 无业务语义层：纯 UI 组件、utils、hooks
│   └── ui/            # 通用组件（对应 packages/ui 定位）
├── stores/            # 状态层
│   ├── RootStore.ts   # 根 store，唯一入口，持有全局单例 store
│   ├── ThemeStore.ts  # 全局：主题
│   ├── ConfigStore.ts # 全局：配置
│   └── <biz>/         # 业务 store，一个业务一个文件夹
├── features/          # 业务功能层：业务组件 + 该业务的局部逻辑
│   └── <biz>/
│       └── components/
└── pages/             # 页面层：编排 features，注入 store 生命周期
    └── <page>/
```

**依赖方向（单向，由 L2 lint 强制）：**
`shared` ← `stores` ← `features` ← `pages`
下层永远不知道上层的存在；`shared` 不知道任何业务概念、不 import 任何 store。

## 一组件 / 一页面 = 一个文件夹

```
Button/
├── index.tsx        # 组件本体，文件夹唯一对外出口
├── styles.less      # 样式（如有）
├── types.ts         # props 与内部类型（如有）
└── hooks.ts         # 组件私有 hooks（如有）
```

- 文件夹名 = 组件名（PascalCase）；页面文件夹同理。
- 禁止在文件夹外部 import 其内部文件（只准 import 文件夹本身）。

## Store 归属与生命周期

| 类型 | 位置 | 生命周期 | 举例 |
|------|------|----------|------|
| 全局单例 | `stores/` 根目录，挂在 RootStore 下 | 应用启动创建，常驻 | Theme、Config、Auth/User |
| 业务 store | `stores/<biz>/` | 进入对应页面/模块时创建，离开时销毁 | 各业务自己的状态 |

- RootStore 是唯一的 store 组合点，通过 React Context + `useStore()` hook 向下提供。
- 业务 store 的创建/销毁由 `pages/` 层负责（页面挂载时实例化并注入，卸载时释放）。

## MobX 结合方式

- store 类内用 `makeAutoObservable(this)`；变更一律走 action 方法，禁止组件内直接给 observable 字段赋值。
- 读 store 的组件必须包 `observer`。
- **共享组件（shared/ui）**：不 import store、不包 observer，数据与回调全部走 props。
- **业务组件（features）**：可直接 `useStore()` 读取并调用本业务 store 的 action。
