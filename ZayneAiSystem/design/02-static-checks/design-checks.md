# L2 设计层静态检查

## 机械可查的部分（stylelint / lint）

```yaml
id: tokens-only
prevents: 业务样式绕过 token 硬编码颜色/间距，一致性瓦解
enforcement: stylelint
```

1. **禁止裸色值**：业务 `.module.less` 中出现十六进制/rgb 颜色即报错，只准用语义 token
   （stylelint `color-no-hex` + `declaration-property-value-disallowed-list`）。
2. **间距/字号白名单**：margin/padding/font-size 的值必须落在刻度上
   （`declaration-property-value-allowed-list`）。
3. **z-index 白名单**：只准使用具名档位变量。
4. **禁止 `!important`**：出现即说明样式结构有问题，回头改结构。
5. **禁止业务样式覆盖共享组件内部**：`.module.less` 中不准出现穿透共享组件的选择器。

```yaml
id: five-states-present
prevents: agent 默认只写理想态，上线后空态/错误态裸奔
enforcement: agent 终止条件核对（逐页清单）
```

6. **五态核对**：本次新增/修改的每个异步数据视图，逐一核对五态是否显式处理。

## 批评环清单（agent 自查用，AI 做审查比做创作可靠）

页面完成后，agent 对着截图/渲染结果按下表自查（源自 Nielsen 启发式的可判定子集）：

| # | 检查 | 判定标准 |
|---|------|----------|
| 1 | 状态可见 | 每个用户操作 100ms 内有可感知反馈 |
| 2 | 破坏性确认 | 删除/覆盖/不可逆操作有确认步骤 |
| 3 | 错误可恢复 | 错误信息说人话且给出出路（重试/返回） |
| 4 | 对比度 | 正文对比度 ≥ 4.5:1（WCAG AA），可用工具测 |
| 5 | 可点击目标 | 交互目标 ≥ 40×40px（触屏场景 44×44） |
| 6 | 一致性 | 同一动作全站同一表达（按钮位置、措辞、图标） |
| 7 | 层级 | 页面只有一个视觉重心；主操作唯一且醒目 |
| 8 | 密度 | 信息分组遵循间距刻度，组内距 < 组间距 |

自查发现的问题当场修，修不了的（涉及 token/模式变更）上报，禁止装作没看见。
