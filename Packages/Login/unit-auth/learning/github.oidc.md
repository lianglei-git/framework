原理：
1. A 网站让用户跳转到 GitHub。
2. GitHub 要求用户登录，然后询问"A 网站要求获得 xx 权限，你是否同意？"
3. 用户同意，GitHub 就会重定向回 A 网站，同时发回一个授权码。
4. A 网站使用授权码，向 GitHub 请求令牌。
5. GitHub 返回令牌.
6. A 网站使用令牌，向 GitHub 请求用户数据。


应用登记：
进入gihub进行应用登记。
里面会有一个选项为: Authorization callback URL
会给你返回客户端 ID（client ID）和客户端密钥（client secret），这就是应用的身份识别码。


### ~~如果 Authorization callback URL 填写的是前端：~~
~~那么流程是这样：~~
> ~~用户登录 -> 携带clientId跳转到github登录 -> github重定向为Authorization callback URL~~
~~返回前端后，要通过返回来的查询参数信息重新发送请求到本地后端，告诉本地后端，我已经得到一个许可了，但是你需要通过secretId进行获取用户信息，这时候后端会调用github的accesstoken接口返回~~

### ~~如果 Authorization callback URL 填写的是后端：~~
~~后端直接就可以完成token交换~~

~~如果没有**secretId**，则使用PKCE来完成。~~

上述逻辑有误！！！ 

目前采用双重验证。PKCE + secret

关于 
1. Authorization callback URL
2.  https://github.com/login/oauth/access_token中的查询参数redirect_uri
3. https://github.com/login/oauth/authorize中的查询参数 redirect_uri


在 GitHub OIDC/OAuth 流程中，你提到的 3 个 URL/参数既相关又有严格区别，核心是要保证 **“授权请求、回调、令牌交换”三个环节的 `redirect_uri` 完全一致**，否则会导致授权失败。以下是详细梳理：


### 1. Authorization callback URL（GitHub 应用配置中的回调 URL）
- **含义**：这是你在 GitHub 应用后台（`Settings > Developer settings > OAuth apps`）配置的**允许的回调地址白名单**。  
- **作用**：GitHub 仅会在用户授权后，将用户重定向到该列表中的 URL（防止恶意网站劫持授权码）。  
- **要求**：  
  - 必须是**完整的 URL**（包含协议 `http/https`、域名、端口、路径，如 `http://localhost:3000/callback`）；  
  - 支持配置多个 URL（换行分隔），但实际授权时只能使用其中一个；  
  - 开发环境可使用 `http://localhost`，生产环境必须使用 `https`（否则可能被 GitHub 拒绝）。  


### 2. `https://github.com/login/oauth/authorize` 中的 `redirect_uri` 参数
- **含义**：这是你在**发起授权请求**时，通过 URL 参数传递给 GitHub 的回调地址。  
- **作用**：告诉 GitHub“用户授权后，将 `code`（授权码）和 `state` 重定向到哪个地址”。  
- **要求**：  
  - 必须**严格匹配** GitHub 应用配置中“Authorization callback URL”的其中一个（包括协议、域名、端口、路径，大小写敏感）；  
  - 若未传递该参数，GitHub 会默认使用应用配置中的“第一个回调 URL”；  
  - 必须进行 **URL 编码**（如路径中的 `/` 编码为 `%2F`，空格编码为 `%20`）。  


### 3. `https://github.com/login/oauth/access_token` 中的 `redirect_uri` 参数
- **含义**：这是你在**用授权码交换令牌**时，传递给 GitHub 的回调地址。  
- **作用**：GitHub 会验证该地址是否与“授权请求时的 `redirect_uri`”一致，防止授权码被劫持到其他地址后滥用。  
- **要求**：  
  - 必须**与授权请求时的 `redirect_uri` 完全一致**（包括 URL 编码后的格式）；  
  - 即使授权请求时使用了“默认回调 URL”（未显式传递 `redirect_uri`），令牌交换时也必须显式传递该默认 URL；  
  - 若不一致，GitHub 会返回 `invalid_grant` 错误，拒绝发放 `access_token`。  


### 三者的关系与核心原则
- **包含关系**：  
  应用配置的 `Authorization callback URL` 是“白名单”，授权请求的 `redirect_uri` 必须是白名单中的一个，令牌交换的 `redirect_uri` 必须等于授权请求的 `redirect_uri`。  

- **核心原则**：**三个环节的 `redirect_uri` 必须完全一致**（白名单包含授权地址，授权地址等于令牌交换地址）。  

- **错误示例**：  
  - 应用配置 `http://localhost:3000/cb`，但授权请求用 `http://localhost:3000/callback` → 授权失败（不在白名单）；  
  - 授权请求用 `http://localhost:3000/cb`，但令牌交换用 `http://localhost:3000/callback` → 交换失败（地址不匹配）。  


### 总结
| 环节                       | URL/参数作用                       | 关键要求                             |
| -------------------------- | ---------------------------------- | ------------------------------------ |
| 应用配置                   | 限制允许的回调地址（白名单）       | 完整 URL，支持多个，生产环境需 https |
| 授权请求（`authorize`）    | 指定用户授权后重定向的地址         | 必须在白名单中，与令牌交换地址一致   |
| 令牌交换（`access_token`） | 验证回调地址一致性，防止授权码劫持 | 必须与授权请求时的地址完全一致       |

记住：**“配置的白名单包含授权地址，授权地址等于令牌交换地址”** 是确保 GitHub OIDC 流程正常工作的核心规则。