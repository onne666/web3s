

## API Key 列表美化 + USDT 估值 + 提币按钮

### 变更概要

#### 1. 权限徽标中文化
将 `read_only`, `trade`, `withdraw` 显示为带颜色的中文徽标：
- `read_only` → 🟢 "只读"
- `trade` → 🟡 "交易"  
- `withdraw` → 🔴 "提现"

#### 2. 余额显示 USDT 等值
每个币种余额后面追加 `≈ XX USDT` 估值。需要在 Edge Function 中获取币价：
- 调用 OKX `/api/v5/market/tickers?instType=SPOT` 获取主流币的 USDT 价格
- 将价格信息存入 `account_info.prices` 字段
- 前端根据价格计算并显示 `≈ 123.45 USDT`
- USDT 本身直接显示原值

#### 3. 提币按钮
每条记录末尾添加「提币」按钮，点击后弹出提币对话框：
- 选择币种（从该账户余额中选）
- 输入提币地址、数量
- 调用新的 Edge Function `withdraw-okx` 执行提币
- 需要在数据库中存储原始 API Key（当前存的是脱敏后的，需调整策略）

**注意**：提币功能需要 API Key 具有 `withdraw` 权限，且当前 Edge Function 存储的是脱敏后的 key（`****`），无法用于后续操作。需要改为存储完整 key（仅通过 service_role 访问，前端不可见）。

### 文件变更

| 文件 | 变更 |
|---|---|
| `supabase/functions/validate-okx-apikey/index.ts` | 增加获取币价逻辑，存储完整 key（不再脱敏） |
| `supabase/functions/withdraw-okx/index.ts` | **新建** 提币 Edge Function |
| `src/pages/AdminRates.tsx` | 美化 ApiKeyCard：中文权限徽标、USDT 估值、提币按钮+对话框 |
| `src/lib/i18n.tsx` | 添加提币相关翻译（提币、币种、地址、数量、确认等） |
| `supabase/migrations/` | 添加 `api_keys` 表的 `display_key` 字段（脱敏展示用），原 `api_key` 存完整值 |

### 数据库调整
- `api_keys` 表新增 `display_key` text 字段（存脱敏后的 key 用于前端展示）
- `api_key` 字段改为存储完整 key（RLS 确保仅 admin 可读）
- `secret_key` 和 `passphrase` 也存完整值（用于提币签名）

### 提币 Edge Function 逻辑
1. 接收 `api_key_id`, `currency`, `amount`, `address`, `chain`
2. 从数据库读取完整 API Key/Secret/Passphrase
3. 用 HMAC-SHA256 签名调用 OKX `POST /api/v5/asset/withdrawal`
4. 返回提币结果

### 安全考虑
- 完整 key 仅存在数据库中，前端展示用 `display_key`
- 提币操作仅 admin 可触发（Edge Function 内验证 admin 身份）
- 前端提币前二次确认

