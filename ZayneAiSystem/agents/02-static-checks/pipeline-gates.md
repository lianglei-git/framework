# L2 交付流水线闸门

真正的"监察者"是这条确定性流水线，不是任何 LLM。
所有闸门顺序执行，任何一道不过，交付不发生。

## 闸门顺序

```
① 语言级 lint（eslint / golangci-lint / stylelint）
        ↓
② 边界 lint（分层单向依赖、shared 禁触 store、handler 禁触 repository、token 白名单）
        ↓
③ 测试套件（单测 + 接口测试；AC 覆盖在此验证）
        ↓
④ 迁移校验（migration checksum、破坏性关键字扫描）
        ↓
⑤ 索引同步核对（本次触碰的领域，对应 *.llms.txt 条目与源码一致）
        ↓
⑥ review agent 单遍评审（唯一的判断力环节）
        ↓
交付
```

- ①–⑤ 全部机械可判定，能脚本化的尽早脚本化进 CI；
  暂未脚本化的由执行 agent 按各领域终止清单逐项核对，效力等同。
- ⑥ 是整条流水线里唯一允许 LLM 参与检查的位置。

## 闸门的检查项来源

流水线本身不发明规则，只执行各领域已定义的检查：

| 闸门 | 规则来源 |
|------|----------|
| ②
 | frontend/eslint-rules.md、backend/backend-checks.md、design/design-checks.md |
| ③ | requirements：每条 AC 对应测试 |
| ④ | database/migration-checks.md |
| ⑤ | 各领域 03-indexes 的维护规则 |

```yaml
id: no-gate-bypass
prevents: 用 eslint-disable、跳过测试、"回头再补索引"等方式绕闸门
enforcement: CI + 元规则二（系统性绕过 = 先审规则本身）
```

- 绕过行为一律视为信号而非违纪：先按元规则二审查该闸门是否摩擦过大，
  确属规则问题就修订规则；确属偷懒则该次交付作废重走。
