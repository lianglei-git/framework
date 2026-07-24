# ZayneAiSystem — AI 驱动开发内核

> 目标：把对 AI 的控制从「每次口头指挥」变成「一次性写进制度」。
> 原则：**每条规则都往下压，压到能强制执行它的最低层级；自然语言只保留无法用工具表达的部分。**

## 组织方式：全局元规则 + 领域目录

```
ZayneAiSystem/
├── 00-meta/          # 全局：规则的规则（生命周期、预算、修订留痕），凌驾于所有领域
├── frontend/         # 前端领域（已落地）
├── requirements/     # 需求领域（已落地）
├── database/         # 数据层（已落地：迁移只增不改、schema 索引，全系统最高决策门槛）
├── backend/          # 后端领域（已落地：API 契约先行、分层结构、契约变更两级分类）
├── design/           # 设计领域（已落地：design tokens、五态强制、模式索引、批评环自查）
└── agents/           # agent 编制（已落地：判断力之尺、流水线闸门、任务书模板、派发留痕）
```

每个领域内部统一按五层展开：

| 层级 | 子目录 | 承担什么 | 执行者 |
|------|--------|----------|--------|
| L1 物理结构 | `01-structure/` | 目录/文档的形态规范（结构即规则） | 结构本身 |
| L2 静态检查 | `02-static-checks/` | 机械可判定的硬约束 | lint / CI / 核对清单 |
| L3 机器索引 | `03-indexes/` | AI 的外部记忆（*.llms.txt） | agent 维护，schema 固定 |
| L4 流程规则 | `04-process-rules/` | 时机与动作（.mdc，接入项目的 .cursor/rules/） | Cursor rules |
| L5 人的决策 | `05-human-decisions/` | 仅不可逆决策与规则修订 | 人 |

## 统一方法论：找出各领域的不可逆资产

每个领域的治理都围绕同一个问题展开——**这个领域里什么东西一旦发布就有依赖方、回退昂贵？**
给它建索引、设 L5 门槛，其余一切压给确定性工具。

| 领域 | 不可逆资产 | 索引 |
|------|-----------|------|
| 前端 | 公共组件、公共 store | components.llms.txt / stores.llms.txt |
| 需求 | 已确认的范围决策（Non-goals、AC） | requirements.llms.txt |
| 后端 | API 契约 | api.llms.txt |
| 数据层 | 表结构（牵扯存量数据，门槛全系统最高） | schema.llms.txt |
| 设计 | design tokens、参照设计语言的选定 | tokens 文件 + patterns.llms.txt |
| agents | 编制本身（每加一个常驻角色，协调复杂度按平方涨） | delegations.llms.txt |

## 跨领域枢纽：验收标准（AC）

需求文档的 AC 是打通全链路的关键：
**需求（AC 定义"做到什么算完成"）→ 开发（任务必须引用 FEAT-id）→ 测试（每条 AC 对应测试用例）→ 索引（implements/tests 字段双向追溯）。**
这就是为什么"测试 agent"不需要存在——测什么由 AC 客观决定，跑不跑得过由 CI 判定。

## 接入一个新项目

1. 将各领域 `04-process-rules/` 下的 `.mdc` 复制（或软链）到项目 `.cursor/rules/`。
2. 按各领域 `01-structure/` 初始化目录骨架与文档模板。
3. 按 `frontend/02-static-checks/eslint-rules.md` 配置边界 lint，接入 CI。
4. 用各领域 `03-indexes/` 模板在项目内创建对应 `*.llms.txt`。
5. 规则的任何增删改，走 `00-meta/constitution.md` 流程。

## 纠错闭环（本系统存在的理由）

旧闭环：agent 写错 → 用户发现 → 口头指正 → agent 改 → 换个会话又错。
新闭环：agent 写完 → lint 报错 / 终止条件未满足 → agent **在交付前自己改完**。
错误不再经过人的眼睛，这就是被消除的沉默成本。
