# L2 静态检查清单

这一层的使命：把纠错闭环收进 agent 的工作循环内部（写完 → lint 报错 → 自己改完才能交付），错误不经过人的眼睛。

## 规则 1：共享组件禁止接触 store

```yaml
id: no-store-in-shared
prevents: 通用组件与业务状态耦合，导致无法跨业务/跨项目复用
enforcement: eslint
```

在 `src/shared/**` 范围内配置：

```js
// eslint 配置（针对 src/shared/** 的 overrides）
{
  files: ['src/shared/**'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['**/stores/**', 'mobx', 'mobx-react*'],
          message: 'shared 层禁止接触 store 与 mobx，数据一律走 props' },
      ],
    }],
  },
}
```

## 规则 2：分层单向依赖

```yaml
id: layer-one-way-deps
prevents: 下层反向依赖上层（如 shared import features），分层名存实亡
enforcement: eslint (eslint-plugin-boundaries)
```

```js
// eslint-plugin-boundaries
settings: {
  'boundaries/elements': [
    { type: 'shared',   pattern: 'src/shared/**' },
    { type: 'stores',   pattern: 'src/stores/**' },
    { type: 'features', pattern: 'src/features/**' },
    { type: 'pages',    pattern: 'src/pages/**' },
  ],
},
rules: {
  'boundaries/element-types': ['error', {
    default: 'disallow',
    rules: [
      { from: 'shared',   allow: ['shared'] },
      { from: 'stores',   allow: ['shared', 'stores'] },
      { from: 'features', allow: ['shared', 'stores', 'features'] },
      { from: 'pages',    allow: ['shared', 'stores', 'features', 'pages'] },
    ],
  }],
},
```

## 规则 3：组件文件夹封装

```yaml
id: component-folder-encapsulation
prevents: 外部深入 import 组件内部文件，破坏"一组件一文件夹"的封装边界
enforcement: eslint
```

```js
'no-restricted-imports': ['error', {
  patterns: [
    { group: ['**/components/*/!(index)*'],
      message: '只允许 import 组件文件夹本身（走 index 出口）' },
  ],
}],
```

## 规则 4：跨业务 store 访问禁令

```yaml
id: no-cross-biz-store
prevents: 业务 A 组件直接读写业务 B 的 store，状态耦合无法拆分
enforcement: eslint (boundaries 细化) + code review 兜底
```

`features/<bizA>/**` 只允许 import `stores/<bizA>/**` 与全局 store（RootStore/Theme/Config）。
跨业务需要共享的状态，走 L5 决策：提取公共 store。

## CI 接入

- `pnpm run lint` 必须零 error 才允许任务终止（见 L4 `task-termination.mdc`）。
- 以上规则的任何放宽（`eslint-disable`）视为「agent 系统性绕过」信号，触发元规则二审查。
