# L2 数据层静态检查

## 检查项

```yaml
id: migration-immutable
prevents: 修改已执行的迁移，导致各环境数据库状态不一致且不可考证
enforcement: 迁移工具 checksum（golang-migrate/Flyway 原生支持）+ CI
```

1. **历史校验和**：CI 中比对已执行 migration 的 checksum，任何已入库文件被改动即失败。
   这是数据层唯一必须尽早脚本化的检查，不能只靠 agent 自觉。

```yaml
id: destructive-op-gate
prevents: 破坏性 SQL 未经 L5 决策就混进迁移
enforcement: CI 关键字扫描 + agent 终止条件核对
```

2. **破坏性操作扫描**：migration 中出现 `DROP TABLE` / `DROP COLUMN` / `RENAME` /
   `ALTER ... TYPE` / `TRUNCATE`，必须同时满足：
   头部 `destructive: yes` 标注 + 对应 L5 决策记录（见 05 层）。缺一即打回。

```yaml
id: migration-hygiene
prevents: 迁移文件不规范导致失败时无法定位、无法追溯
enforcement: agent 终止条件核对（未来：脚本）
```

3. 命名符合 `YYYYMMDDHHMM_<动词>_<对象>.sql`；一文件一意图。
4. 头部注释四字段齐全（feat / purpose / reversible / destructive）。
5. schema 变更与数据回填未混在同一文件。
6. 给既有表加的列可空或带默认值。

```yaml
id: schema-index-sync
prevents: schema.llms.txt 与真实表结构脱节，判重与影响评估失去依据
enforcement: agent 终止条件核对
```

7. 本次涉及的表在 `schema.llms.txt` 中条目已同步（columns / updated / 归属）。
