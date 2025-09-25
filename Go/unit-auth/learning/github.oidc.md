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


### 如果 Authorization callback URL 填写的是前端：
那么流程是这样：
> 用户登录 -> 携带clientId跳转到github登录 -> github重定向为Authorization callback URL
返回前端后，要通过返回来的查询参数信息重新发送请求到本地后端，告诉本地后端，我已经得到一个许可了，但是你需要通过secretId进行获取用户信息，这时候后端会调用github的accesstoken接口返回

### 如果 Authorization callback URL 填写的是后端：
后端直接就可以完成token交换

如果没有**secretId**，则使用PKCE来完成。