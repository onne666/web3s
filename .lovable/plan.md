

## 修复 Binance 提币：添加 walletType 参数 + 增加提币前余额检查

### 问题分析

当前 `withdraw-binance` 的 `URLSearchParams` 中没有包含 `walletType` 参数。虽然 Binance 文档说默认从现货账户扣款，但某些账户配置（如统一账户模式）下需要显式指定。

### 方案

#### 1. Edge Function 改动 (`withdraw-binance/index.ts`)

- 在请求参数中添加 `walletType: "0"`（明确指定从现货钱包提币）
- 前端也可以传 `wallet_type` 参数（`0`=现货, `1`=资金），默认为 `0`

#### 2. 前端提币 Dialog 改进 (`AdminRates.tsx`)

- 新增"提币来源"下拉选择：现货钱包 / 资金钱包
- 显示对应钱包中该币种的可用余额，方便确认是否足够
- 余额不足时禁用提币按钮并提示

### 改动文件

- `supabase/functions/withdraw-binance/index.ts` — 添加 `walletType` 参数
- `src/pages/AdminRates.tsx` — 提币 Dialog 增加钱包类型选择和余额提示

