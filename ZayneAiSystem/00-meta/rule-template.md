# 新规则模板

任何新规则（无论落在哪一层）先按此模板填写，填不出 `prevents` 的规则不允许进入系统。

```yaml
id:          # 唯一标识，如 no-store-in-shared
layer:       # L1 结构 / L2 静态检查 / L3 索引 / L4 流程 / L5 决策
prevents:    # 这条规则防止什么具体问题（必填，一句话，可证伪）
enforcement: # 由什么强制执行：目录结构 / eslint / CI / cursor-rule / 人
created:     # YYYY-MM-DD
status:      # active / deprecated
notes:       # 可选：已知的摩擦点、例外情况
```

## 填写检查

1. `prevents` 写的是**问题**还是**偏好**？偏好（"我喜欢这样"）不构成规则。
2. `enforcement` 是不是已经压到了最低可行层级？写着 cursor-rule 的，先问一遍能不能变成 eslint。
3. 与现有规则冲突吗？冲突时修订旧规则，不允许两条矛盾规则并存。
