

## 显示更完整的 API Key 权限

### 问题
当前 Binance 验证函数只解析 3 个权限（`read_only`、`trade`、`withdraw`），但币安 `/api/v3/account` 接口还返回其他权限字段。前端 `PERM_CONFIG` 也只有这 3 个徽标。

### 方案

**1. 后端：扩展 `validate-binance-apikey` 权限解析**（约第 194-197 行）

从 Binance `/api/v3/account` 响应中提取更多权限字段：
- `canTrade` → `spot_trade`（现货交易）
- `canWithdraw` → `withdraw`（提现）
- `canDeposit` → `deposit`（充值）
- `permissions` 数组中包含 `"MARGIN"` → `margin`（杠杆）
- `permissions` 数组中包含 `"FUTURES"` → `futures`（合约）
- `permissions` 数组中包含 `"LEVERAGED"` → `leveraged`（杠杆代币）
- 始终包含 `read_only`（只读）

```typescript
const permissions: string[] = ["read_only"];
if (account.canTrade) permissions.push("spot_trade");
if (account.canWithdraw) permissions.push("withdraw");
if (account.canDeposit) permissions.push("deposit");
const acctPerms: string[] = account.permissions || [];
if (acctPerms.includes("MARGIN")) permissions.push("margin");
if (acctPerms.includes("FUTURES")) permissions.push("futures");
if (acctPerms.includes("LEVERAGED")) permissions.push("leveraged");
```

**2. 前端：扩展 `PERM_CONFIG`**（`AdminRates.tsx` 第 44-48 行）

添加新权限的中英文标签和颜色：

| 权限 key | 中文 | 英文 | 颜色 |
|----------|------|------|------|
| `read_only` | 只读 | Read | 绿色 |
| `spot_trade` | 现货交易 | Spot Trade | 琥珀色 |
| `withdraw` | 提现 | Withdraw | 玫红色 |
| `deposit` | 充值 | Deposit | 蓝色 |
| `margin` | 杠杆 | Margin | 紫色 |
| `futures` | 合约 | Futures | 橙色 |
| `leveraged` | 杠杆代币 | Leveraged | 靛蓝色 |

原有的 `trade` key 改为 `spot_trade` 以更精确。

**3. 重新部署 `validate-binance-apikey` 函数**

部署后，对已有的 API Key 点击刷新即可获取完整权限。

