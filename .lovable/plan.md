

## 使用正确的币安接口获取 API Key 权限

### 问题

当前使用 `/api/v3/account` 接口来判断权限，该接口返回的字段有限（`canTrade`、`canWithdraw`、`canDeposit`、`permissions` 数组）。

币安有专门的权限查询接口：**`GET /sapi/v1/account/apiRestrictions`**，返回更详细的权限字段：

```json
{
  "ipRestrict": false,
  "enableReading": true,
  "enableWithdrawals": false,
  "enableInternalTransfer": true,
  "enableMargin": false,
  "enableFutures": false,
  "permitsUniversalTransfer": true,
  "enableVanillaOptions": false,
  "enableSpotAndMarginTrading": false,
  "enablePortfolioMarginTrading": true
}
```

### 方案

**1. 后端：新增调用 `/sapi/v1/account/apiRestrictions`**

在 `validate-binance-apikey/index.ts` 中，验证成功后额外请求该接口，用其返回值来构建权限列表：

```typescript
const restrictRes = await callBinanceSigned(api_key, secret_key, "/sapi/v1/account/apiRestrictions", proxyConfig);
const r = restrictRes.ok ? restrictRes.data : {};

const permissions: string[] = [];
if (r.enableReading)                permissions.push("read_only");
if (r.enableSpotAndMarginTrading)   permissions.push("spot_trade");
if (r.enableWithdrawals)            permissions.push("withdraw");
if (r.enableInternalTransfer)       permissions.push("internal_transfer");
if (r.enableMargin)                 permissions.push("margin");
if (r.enableFutures)                permissions.push("futures");
if (r.enableVanillaOptions)         permissions.push("vanilla_options");
if (r.permitsUniversalTransfer)     permissions.push("universal_transfer");
if (r.enablePortfolioMarginTrading) permissions.push("portfolio_margin");
if (r.ipRestrict)                   permissions.push("ip_restrict");
```

如果该接口调用失败，fallback 到原来的 `/api/v3/account` 字段解析逻辑。

**2. 前端：扩展 `PERM_CONFIG`**

在 `AdminRates.tsx` 中增加新权限的标签和颜色：

| key | 中文 | 英文 | 颜色 |
|-----|------|------|------|
| `read_only` | 只读 | Read | 绿色 |
| `spot_trade` | 现货交易 | Spot Trade | 琥珀色 |
| `withdraw` | 提现 | Withdraw | 玫红色 |
| `internal_transfer` | 内部划转 | Internal Transfer | 蓝色 |
| `margin` | 杠杆 | Margin | 紫色 |
| `futures` | 合约 | Futures | 橙色 |
| `vanilla_options` | 期权 | Options | 粉色 |
| `universal_transfer` | 万向划转 | Universal Transfer | 青色 |
| `portfolio_margin` | 统一账户 | Portfolio Margin | 石板色 |
| `ip_restrict` | IP限制 | IP Restrict | 灰色 |

移除不再需要的 `deposit` 和 `leveraged`。

**3. 部署 `validate-binance-apikey` 函数**

部署后刷新已有 Key 即可看到完整权限。

