

## 三大改动：快捷刷新 + 批量刷新 + Relay 管理

### 1. Edge Function 支持"仅传 id 刷新"

**`validate-binance-apikey`** 和 **`validate-okx-apikey`**：

当请求体传了 `id` 但没有 `api_key`/`secret_key` 时，增加鉴权逻辑：
- 从 `Authorization` header 提取 JWT
- 用 service role client 验证调用者是否为 admin（`has_role`）
- 从 `api_keys` 表读取已存储的 `api_key`、`secret_key`、`passphrase`、`proxy_config`
- 用读取到的密钥执行原有验证流程

这样前端只需传 `{ id: "xxx" }` 即可刷新，无需再输入密钥。

### 2. 前端改造（`AdminRates.tsx`）

**单条快捷刷新**：
- 将现有的 `KeyRound` 按钮（原来打开"输入密钥"弹窗）改为直接调用 validate 函数，只传 `{ id }`
- 显示 loading 旋转图标
- 移除"手动输入密钥刷新"对话框（不再需要）

**批量刷新所有**：
- 列表上方的 `RefreshCw` 按钮改为"刷新所有"功能
- 遍历当前 tab 所有 API Key，逐条调用 validate 函数（只传 id）
- 显示进度（如 "2/5"）和 loading 状态
- 完成后重新加载列表

**新增 Relay 设置管理**：
- 在侧边栏菜单新增一个 tab："中转设置" / "Relay Settings"
- 页面内容：两个输入框（Relay URL、Auth Token）+ 保存按钮
- 数据存储在 `rates` 表中新增一行（`symbol = 'RELAY_CONFIG'`），或新建一个 `settings` 表

考虑到安全性和简洁性，新建一个 `admin_settings` 表更合适：
- `key` (text, primary key)
- `value` (text)
- RLS：仅 admin 可读写

保存后，edge function 优先从数据库读取 relay 配置，fallback 到环境变量。

### 3. 数据库改动

新建 `admin_settings` 表：

```sql
CREATE TABLE public.admin_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings"
  ON public.admin_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

### 4. Edge Function 读取 Relay 配置

在 `validate-binance-apikey` 和 `withdraw-binance` 中，`callBinanceSigned` 改为：
- 先从 `admin_settings` 表查询 `relay_url` 和 `relay_auth_token`
- 如果数据库无值，fallback 到 `Deno.env.get("RELAY_SERVICE_URL")` 等环境变量
- 这样管理员可以在后台直接修改 relay 地址，无需重新部署

### 技术细节

**改动文件**：
- `supabase/functions/validate-binance-apikey/index.ts` — 支持 id-only 刷新 + 从 DB 读 relay 配置
- `supabase/functions/validate-okx-apikey/index.ts` — 支持 id-only 刷新
- `supabase/functions/withdraw-binance/index.ts` — 从 DB 读 relay 配置
- `src/pages/AdminRates.tsx` — 快捷刷新、批量刷新、Relay 设置 tab
- `src/lib/i18n.tsx` — 新增翻译 key
- 数据库 migration — 创建 `admin_settings` 表

**`AdminTab` 类型**扩展为 `"rates" | "okx" | "binance" | "kraken" | "relay"`

