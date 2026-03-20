

## 添加两个运行时密钥

需要将以下两个密钥添加到项目中，供 `withdraw-binance` 和 `validate-binance-apikey` 边缘函数使用：

1. **RELAY_SERVICE_URL** — 中转服务地址：`http://18.162.214.165:3000/relay`
2. **RELAY_AUTH_TOKEN** — 中转服务鉴权令牌：`Lxy.123123`

### 操作
- 使用 `add_secret` 工具分别添加这两个密钥
- 添加后，边缘函数中的 `Deno.env.get("RELAY_SERVICE_URL")` 和 `Deno.env.get("RELAY_AUTH_TOKEN")` 即可读取到值
- 无需改动任何代码

