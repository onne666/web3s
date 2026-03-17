

## 问题根因：数据库中存储的是脱敏后的 API Key

数据库查询显示：
- `api_key` 字段值为 `6dc85393****1c71`（长度 16，含 `****`）
- `secret_key` 字段值为 `****`（长度 4）

**所有已有记录都是在旧代码时期入库的**，当时 `api_key` 存储的是脱敏值，`secret_key` 也被截断了。虽然 `validate-okx-apikey` 已修复为存储完整 key，但旧数据没有更新。

当 `withdraw-okx` 从数据库读取 `keyRow.api_key` 时，拿到的是 `6dc85393****1c71`，发给 OKX 自然返回 "Invalid OK-ACCESS-KEY"。

## 修复方案

**用户需要重新添加 API Key**，因为旧记录的 secret_key 已经丢失（只有 `****`），无法恢复。

为了改善体验，增加以下功能：

### 1. 添加「刷新/重新验证」按钮
在每条 API Key 记录上添加一个「刷新」按钮，点击后弹出输入框让用户重新填入完整的 API Key、Secret Key 和 Passphrase，然后调用 `validate-okx-apikey` 更新该记录（而非新建）。

### 2. 修改 `validate-okx-apikey` 支持更新模式
接受可选的 `id` 参数，如果传入则 `upsert` 更新已有记录而非插入新记录。

### 3. 删除旧的无效记录按钮
添加一个删除按钮，让管理员可以清除旧的脱敏记录。

### 文件变更

| 文件 | 变更 |
|---|---|
| `supabase/functions/validate-okx-apikey/index.ts` | 支持 `id` 参数做 upsert 更新已有记录 |
| `src/pages/AdminRates.tsx` | 添加「刷新」按钮（重新输入 key）+ 删除按钮 |
| `supabase/migrations/` | 添加 api_keys DELETE RLS 策略（admin only） |

