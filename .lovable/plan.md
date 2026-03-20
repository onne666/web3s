

## 修复 Relay "Invalid URL" 错误

### 根因

Edge function 在没有有效代理时，仍然调用 relay 并传入 `{ enabled: false }` 作为 proxy 配置。Relay 的 `buildAgent()` 不检查 `enabled` 字段，尝试用 `undefined` 的 host/port 构造代理 URL，导致 "Invalid URL"。

### 修复方案

**修改 `callBinanceSigned`（edge function）**：当没有有效代理配置时，不经过 relay，直接请求币安 API。只有当代理配置有效（`enabled && host`）时才走 relay。

```text
当前逻辑：
  有 relay 环境变量 → 总是走 relay（即使 proxy 无效）→ relay 报错 → fallback 直连

修复后：
  有 relay 环境变量 AND 有有效 proxy → 走 relay
  否则 → 直连币安
```

**具体改动**：`supabase/functions/validate-binance-apikey/index.ts` 约第 118-135 行

将判断逻辑从：
- `if (useRelay)` → 总是调 relay

改为：
- `if (useRelay && proxyConfig?.enabled && proxyConfig?.host)` → 仅在有有效代理时调 relay
- 否则直连 `https://api.binance.com`

同时对 `withdraw-binance/index.ts` 做相同修改（如果也有类似逻辑）。

### 影响

- 有代理配置的 API Key：继续走 relay 中转（满足 IP 白名单）
- 无代理配置的 API Key：直连币安（无需中转）
- 消除 "Invalid URL" 错误，权限接口 `/sapi/v1/account/apiRestrictions` 能正常返回数据

