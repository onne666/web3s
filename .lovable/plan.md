

## 问题分析

**根本原因**：当前验证 Binance API Key 时，请求是从 Supabase Edge Function 的 IP **直接**发往 Binance API 的，并没有走你的中转服务（18.162.214.165）。

中转逻辑的触发条件是（`validate-binance-apikey/index.ts` 第 111 行）：
```
proxyConfig?.enabled && proxyConfig?.host && relayUrl && relayToken
```

但前端 `ApiKeyInput.tsx` 提交时只发送了 `{ api_key, secret_key, passphrase }`，**没有传 `proxy_config`**，而且这是新建 key（没有 `id`），所以也无法从数据库加载已有代理配置。因此函数走了直连分支，Supabase 的出口 IP 不在币安白名单中，被拒绝。

## 解决方案

修改 `validate-binance-apikey` 边缘函数：当没有传入 `proxy_config` 且没有已有记录可加载时，**默认使用中转服务**（只要 `RELAY_SERVICE_URL` 和 `RELAY_AUTH_TOKEN` 已配置）。

### 具体改动

**文件：`supabase/functions/validate-binance-apikey/index.ts`**

修改 `callBinanceSigned` 函数中的中转判断逻辑（约第 108-111 行）：

```typescript
// 之前：
const useRelay = proxyConfig?.enabled && proxyConfig?.host && relayUrl && relayToken;

// 改为：如果有代理配置就用代理转发，否则只要 relay 可用就直接转发（不经过代理）
const useRelay = relayUrl && relayToken;
```

同时调整 `callBinanceViaRelay` 的调用，当没有 `proxyConfig` 或代理未启用时，传一个空代理配置（让中转服务直连而不走代理）：

```typescript
if (useRelay) {
  const effectiveProxy = (proxyConfig?.enabled && proxyConfig?.host) 
    ? proxyConfig! 
    : { enabled: false };
  return callBinanceViaRelay(relayUrl!, relayToken!, effectiveProxy, { ... });
}
```

**同样需要修改 `supabase/functions/withdraw-binance/index.ts`** 中的相同逻辑，保持一致。

**中转服务端**（你的 VPS 上的 `index.js`）需要确认：当 `proxy.enabled === false` 或没有代理配置时，直接发起请求（不经过任何代理）。如果当前中转服务已有此逻辑则无需改动。

### 效果
- 所有 Binance API 请求都通过你的 VPS（18.162.214.165）发出
- 有代理配置时走代理，无代理配置时 VPS 直连
- 币安看到的 IP 始终是 18.162.214.165，与白名单匹配

