# L2 需求文档检查清单

文档没有编译器，这一层暂由 agent 在任务终止前按清单逐项核对（未来可脚本化接入 CI）。
核对不过 = 任务未完成，与 lint 报错同等地位。

## 检查项

```yaml
id: req-doc-completeness
prevents: 需求文档缺关键字段（尤其 Non-goals），开发时范围蔓延无依据可查
enforcement: agent 终止条件核对（未来：脚本）
```

1. **必填字段非空**：问题陈述 / In Scope / Non-goals（≥1 条且每条带原因）/ 验收标准。
2. **问题陈述写的是问题**：不含"做一个""实现""开发"开头的功能式表述。

```yaml
id: ac-judgeable
prevents: 验收标准不可判定，测试没有客观依据，"完成"变成主观感觉
enforcement: agent 终止条件核对（未来：脚本查禁用词）
```

3. **AC 禁用词扫描**：流畅、好看、快速、友好、易用、优化、提升、更好、体验佳。
   命中任何一个即打回重写。
4. **AC 可翻译性**：每条 AC 自问"这条能直接写成一个测试用例吗？"答不上来就重写。
5. **AC id 稳定性**：confirmed 之后 AC id 不得重排、不得复用已删除的 id。

```yaml
id: req-status-legal
prevents: 状态乱跳（如 shipped 改回 draft 继续加需求），生命周期形同虚设
enforcement: agent 终止条件核对
```

6. **状态转移合法**：只能沿 draft → confirmed → in-dev → shipped 前进，
   或任意状态 → deprecated。confirmed 及之后改范围必须有决策记录行。
7. **索引同步**：`requirements.llms.txt` 对应条目与文档一致（status、acs 列表、updated）。
