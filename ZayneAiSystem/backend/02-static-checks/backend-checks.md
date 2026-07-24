# L2 后端静态检查

## 检查项

```yaml
id: layer-one-way-deps-backend
prevents: 跨层依赖（典型：handler 直调 repository），分层名存实亡
enforcement: lint（Go 用 depguard/go-arch-lint；Node 用 eslint-plugin-boundaries）
```

1. **分层依赖检查**：router→handler→service→repository 单向，跨层 import 即报错。
   Go 示例（golangci-lint 的 depguard，按目录划域）：

```yaml
# .golangci.yml 片段
linters-settings:
  depguard:
    rules:
      handler-no-repo:
        files: ["**/handler/**"]
        deny:
          - pkg: "<module>/repository"
            desc: "handler 禁止直接访问 repository，走 service"
      service-no-http:
        files: ["**/service/**"]
        deny:
          - pkg: "github.com/gin-gonic/gin"
            desc: "service 层禁止出现 HTTP 概念"
```

```yaml
id: cross-domain-service-only
prevents: 业务 A 的代码直接操作业务 B 的 repository/表，业务耦合无法拆分
enforcement: lint（同上，按业务包划 deny 规则）+ code review 兜底
```

2. **跨业务边界**：`<bizA>/**` 禁止 import `<bizB>/repository`；跨业务只准 service 对 service。

```yaml
id: contract-impl-sync
prevents: 实现与契约漂移——路由存在但契约没记，或契约写了但实现悄悄变了形状
enforcement: agent 终止条件核对（未来：脚本比对路由表与索引条目）
```

3. **契约同步**：本次新增/修改的每个端点在 `api.llms.txt` 有一致条目
   （方法、路径、请求/响应字段、错误码）。
4. **先契约后实现**：新端点的契约条目 status 不是 missing——
   发现"有实现无契约"的存量端点，先补契约再改它。

```yaml
id: backend-lint-baseline
prevents: 低级错误（未处理的 error、竞态、死代码）流入主干
enforcement: golangci-lint / eslint + CI
```

5. 语言级 lint 零 error（Go：golangci-lint 默认集 + errcheck；Node：项目 eslint）。
