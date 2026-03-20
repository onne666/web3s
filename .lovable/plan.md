

## 方案：生成中转服务代码

由于 Supabase Edge Functions (Deno Deploy) 无法原生使用 HTTP/SOCKS5 代理，需要一个轻量中转服务部署到你自己的服务器上。

### 要做的事

1. **生成中转服务代码**（输出到 `/mnt/documents/relay-service/`）
   - `index.js` — Express 服务，接收后端请求，通过指定代理转发到 Binance API
   - `package.json` — 依赖：express、https-proxy-agent、socks-proxy-agent、node-fetch
   - `README.md` — 部署说明

2. **中转服务功能**
   - 单个 `POST /relay` 端点，通用转发
   - 根据传入的 `proxy.type` 自动选择 HTTP 或 SOCKS5 代理
   - 通过 `X-Relay-Auth` header 校验 token，防止未授权访问
   - 将 Binance 响应原样返回

3. **部署流程**（你来操作）
   - 把生成的代码上传到任意服务器
   - `npm install && node index.js`
   - 记下服务地址（如 `http://你的IP:3000/relay`）
   - 回到项目中配置 `RELAY_SERVICE_URL` 和 `RELAY_AUTH_TOKEN`

### 不需要改动的部分
- 后端函数（`withdraw-binance`、`validate-binance-apikey`）已内置中转逻辑
- 前端代理编辑 UI 已就绪
- 数据库 `proxy_config` 字段已就位

