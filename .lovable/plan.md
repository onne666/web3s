

## 修复中转服务器转发逻辑

### 问题

当前系统要求中转服务器（relay）背后还有一个代理（proxy），但用户的场景是中转服务器本身就是固定 IP 出口，不需要额外代理。中转服务器的 `buildAgent()` 总是尝试创建代理 agent，没有"直连"模式。

### 方案

**1. 修改中转服务器代码（用户自行部署）**

在 relay 的 `/relay` 路由中，当 `proxy` 为空或 `proxy.type === "direct"` 时，不创建代理 agent，直接 fetch：

```javascript
// relay 端修改
const agent = (proxy && proxy.type !== "direct" && proxy.host) 
  ? buildAgent(proxy) 
  : undefined;

const fetchOptions = {
  method: request.method || "GET",
  headers: request.headers || {},
  ...(agent ? { agent } : {}),
};
```

**2. 修改 Edge Function（`validate-binance-apikey` 和 `withdraw-binance`）**

调整 `callBinanceSigned` 的逻辑：只要有 relay 环境变量就走 relay 转发，proxy 配置是可选的。如果记录没有配置代理或代理类型为 `direct`，则传 `{ type: "direct" }` 给 relay，让 relay 直连币安。

```text
新逻辑：
  有 relay 环境变量 → 走 relay（传 proxy 配置或 { type: "direct" }）
  无 relay 环境变量 → 直连币安
```

具体改动点：
- `callBinanceSigned` 中移除 `isValidProxy` 的前置判断
- 当 `proxyConfig` 无效时，传 `{ type: "direct" }` 作为 proxy 参数
- `callBinanceViaRelay` 不变

**3. 修改前端代理配置 UI**

在 `AdminRates.tsx` 的代理设置区域增加 "直连（无代理）" 选项：
- 代理类型下拉新增 `direct` 选项
- 选择 `direct` 时隐藏 host/port/用户名/密码字段
- 保存时 `proxy_config` 为 `{ type: "direct", enabled: true }`

### 技术细节

**Edge Function 改动位置**：
- `validate-binance-apikey/index.ts` 第 118-133 行
- `withdraw-binance/index.ts` 对应位置

**前端改动位置**：
- `AdminRates.tsx` 中 `ApiKeyCard` 组件的代理配置表单部分

### 影响

- `proxy_config` 为空或 `{ type: "direct", enabled: true }` → relay 直连币安
- `proxy_config` 有具体代理地址 → relay 通过代理连币安
- 用户需要在自己的 VPS 上更新 relay 代码并重启

