

## 开发方案：OKX API Key 验证 + 数据库 + 后台管理系统

### 架构总览

这是一个需要后端支持的功能，涉及数据库存储、OKX API 调用（需服务端签名）、以及全新的后台管理系统。

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  用户前端        │ ──> │  Supabase Edge    │ ──> │  OKX API v5 │
│  (ApiKeyInput)   │     │  Functions        │     │             │
└─────────────────┘     └──────────────────┘     └─────────────┘
         │                       │
         │                       ▼
         │              ┌──────────────────┐
         │              │  Supabase DB     │
         │              │  - api_keys      │
         │              │  - rates         │
         │              └──────────────────┘
         │
┌─────────────────┐
│  后台管理系统    │
│  /admin (重构)   │
│  - 汇率管理      │
│  - OKX API Key列表│
│  - 账户信息查看   │
└─────────────────┘
```

### 1. 启用 Lovable Cloud (Supabase)

需要先启用 Lovable Cloud 以获得数据库和 Edge Functions 支持。

### 2. 数据库设计

**api_keys 表**
| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid (PK) | 主键 |
| exchange | text | 交易所 ID (okx/binance/kraken) |
| api_key | text (加密) | API Key |
| secret_key | text (加密) | Secret Key |
| passphrase | text (加密) | OKX 需要的 passphrase |
| status | text | valid / invalid / checking |
| permissions | jsonb | 权限列表 |
| account_info | jsonb | 账户余额等信息 |
| card_number | text | VIP 卡号 |
| created_at | timestamptz | 创建时间 |
| last_checked_at | timestamptz | 最后验证时间 |

**rates 表** — 替换 localStorage
| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid (PK) | 主键 |
| symbol | text | USDT |
| buyback_rate | numeric | 汇率 |
| updated_at | timestamptz | 更新时间 |

### 3. Edge Function: `validate-okx-apikey`

OKX API v5 需要服务端签名（HMAC SHA256），不能在前端直接调用。Edge Function 负责：
- 接收 API Key / Secret Key / Passphrase
- 使用 HMAC-SHA256 签名调用 OKX REST API
- 调用端点：
  - `GET /api/v5/account/config` — 验证 API Key 有效性 + 获取权限
  - `GET /api/v5/account/balance` — 获取账户余额
  - `GET /api/v5/asset/balances` — 获取资金账户余额
- 将结果写入 `api_keys` 表
- 返回验证结果

### 4. ApiKeyInput 页面改造

- OKX 需新增 **Passphrase** 输入框（OKX API 创建时必须设置）
- 提交后调用 Edge Function 进行真实验证
- 显示验证进度和结果
- 验证成功后跳转会员面板

### 5. 后台管理系统重构 (`/admin`)

从单页改为带侧边栏的多页面管理系统：

**布局**：左侧菜单 + 右侧内容区
- 📊 汇率管理 — 编辑 USDT 兑换价（从数据库读写）
- 🔑 OKX API Keys — 列表展示所有 OKX 用户的 API Key 信息
  - 卡号、API Key（脱敏）、状态标签（有效/无效/检查中）
  - 权限列表（只读、交易、提现等）
  - 账户余额（USDT、BTC 等主要币种）
  - 最后验证时间
  - 操作：重新验证按钮
- 🟡 Binance（预留菜单）
- 🟣 Kraken（预留菜单）

### 6. 涉及文件

| 文件 | 变更 |
|---|---|
| `supabase/migrations/001_*.sql` | 创建 api_keys 和 rates 表 |
| `supabase/functions/validate-okx-apikey/index.ts` | OKX API 验证 Edge Function |
| `src/integrations/supabase/` | Supabase client 配置（自动生成） |
| `src/pages/ApiKeyInput.tsx` | 添加 Passphrase 字段，调用 Edge Function |
| `src/pages/AdminRates.tsx` | 完全重构为带侧边栏的管理系统 |
| `src/lib/store.ts` | 改为从 Supabase 读写数据 |
| `src/lib/constants.ts` | OKX API Key 引导步骤增加 Passphrase 说明 |
| `src/lib/i18n.tsx` | 新增后台管理相关翻译 |
| `src/App.tsx` | 可能新增管理子路由 |

### 7. 前置条件

- 需要先启用 Lovable Cloud 才能创建数据库和 Edge Functions
- OKX API Key 的 Secret Key 和 Passphrase 会加密存储在数据库中

### 8. 安全考虑

- Secret Key / Passphrase 仅在 Edge Function 中处理，前端仅提交，不存储明文
- 管理后台保留密码验证（后续可升级为 Supabase Auth）
- API Key 在前端列表中脱敏显示

