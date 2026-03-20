

## 显示所有账户余额 + 划转功能

### 现状分析

**Binance**：当前只获取现货账户余额（`/api/v3/account`），`fundingBalances` 始终为空对象 `{}`。缺少合约账户和资金账户余额查询。

**OKX**：已获取交易账户（`/api/v5/account/balance`）和资金账户（`/api/v5/asset/balances`），但前端只显示这两类。

**前端**：只显示 `tradingBalances` 和 `fundingBalances` 两个区块，没有合约账户。没有划转功能。

### 方案

#### 1. Edge Function: Binance 获取多账户余额

在 `validate-binance-apikey/index.ts` 中新增两个 API 调用：

- **资金账户**：`/sapi/v1/asset/getUserAsset`（POST，signed）获取资金账户余额
- **合约账户**：`/fapi/v2/account`（GET，signed）获取 USDT-M 合约账户余额

将结果存入 `account_info` 的三个字段：
- `tradingBalances`（现货，已有）
- `fundingBalances`（资金账户，新增）
- `futuresBalances`（合约账户，新增）

#### 2. Edge Function: OKX 无需改动余额获取

OKX 的 `/api/v5/account/balance` 已包含交易账户全部余额。但可以额外补充：
- 交易账户余额已有（`tradingBalances`）
- 资金账户余额已有（`fundingBalances`）
- 无独立合约账户（OKX 统一账户模式，合约余额在 tradingBalances 中）

#### 3. 新增划转 Edge Function

创建 `supabase/functions/transfer-binance/index.ts`：
- 调用 Binance `/sapi/v1/asset/transfer`（万向划转 API）
- 支持在现货/资金/合约账户间划转
- 需要 admin 鉴权 + `universal_transfer` 权限检查

创建 `supabase/functions/transfer-okx/index.ts`：
- 调用 OKX `/api/v5/asset/transfer`
- 支持资金账户 ↔ 交易账户划转

#### 4. 前端改造

**余额展示**（`ApiKeyCard` 组件）：
- 新增 `futuresBalances` 区块显示合约账户余额
- 三个区块：现货账户 / 资金账户 / 合约账户（各自带 USDT 估值汇总）

**划转按钮**：
- 每条 API Key 记录底部，在提币按钮旁新增"划转"按钮
- 点击打开划转 Dialog，包含：
  - 源账户类型（现货/资金/合约）
  - 目标账户类型
  - 币种选择
  - 数量输入
- 调用对应的 transfer edge function

**i18n**：新增划转相关翻译 key。

### 技术细节

**Binance 资金账户 API**：`POST /sapi/v1/asset/getUserAsset` 需要 signed 请求，返回 `[{asset, free, locked, freeze, ...}]`。

**Binance 合约账户 API**：`GET /fapi/v2/account` 使用 `https://fapi.binance.com` 域名，返回 `{assets: [{asset, walletBalance, ...}]}`。注意域名不同，需要通过 relay 转发时修改 URL。

**Binance 万向划转类型映射**：
- 现货→资金：`MAIN_FUNDING`
- 资金→现货：`FUNDING_MAIN`
- 现货→合约：`MAIN_UMFUTURE`
- 合约→现货：`UMFUTURE_MAIN`
- 资金→合约：`FUNDING_UMFUTURE`
- 合约→资金：`UMFUTURE_FUNDING`

**OKX 划转**：`/api/v5/asset/transfer` body: `{ccy, amt, from, to}`，`from/to` 值：6=资金账户，18=交易账户。

### 改动文件

- `supabase/functions/validate-binance-apikey/index.ts` — 新增资金和合约余额获取
- `supabase/functions/transfer-binance/index.ts` — 新建
- `supabase/functions/transfer-okx/index.ts` — 新建
- `src/pages/AdminRates.tsx` — 显示三类余额 + 划转 Dialog
- `src/lib/i18n.tsx` — 新增翻译
- `supabase/config.toml` — 注册新 edge functions

