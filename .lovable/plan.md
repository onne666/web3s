
目标：把 Binance 的 API Key 功能按现有 OKX 流程补齐，包括「前台验证入库 + 后台列表管理 + 刷新/删除 + 提币调用」，并统一走后端记录（你已确认）。

一、现状结论（基于代码）
1) 前台 `ApiKeyInput` 只有 OKX 调用后端验证；Binance 仍走本地 `localStorage` 假流程。  
2) 后台 `AdminRates` 已有 OKX 完整卡片能力（权限、余额、提币、刷新、删除），但 Binance 菜单是 disabled + “coming soon”。  
3) 目前仅有 OKX 两个后端函数：`validate-okx-apikey`、`withdraw-okx`。  
4) `api_keys` 表结构已通用（含 exchange/permissions/account_info/display_key 等），可直接承载 Binance，无需新增表。

二、实施方案（将要改动）
A. 新增 Binance 验证函数（核心）
- 新建：`supabase/functions/validate-binance-apikey/index.ts`
- 功能：
  1. 校验请求参数（api_key、secret_key，passphrase 对 Binance 可选/忽略）。
  2. 使用 Binance 签名接口校验（`/api/v3/account`，HMAC-SHA256）。
  3. 解析权限并映射为统一权限数组：
     - `canTrade=true` -> `trade`
     - `canWithdraw=true` -> `withdraw`
     - 其余默认含 `read_only`
  4. 读取资产余额（`balances`）并整理为 `tradingBalances`；`fundingBalances` 先置空对象。
  5. 拉取 USDT 对价价格并生成 `prices`（用于后台估值展示）。
  6. 按 OKX 逻辑写入/更新 `api_keys`（支持 `id` 更新模式），`exchange='binance'`，返回 `{ success, id, permissions, account_info }`。

B. 新增 Binance 提币函数
- 新建：`supabase/functions/withdraw-binance/index.ts`
- 功能：
  1. 与 OKX 提币函数一致：手动鉴权 + 仅管理员可调用。
  2. 根据 `api_key_id + exchange='binance'` 取完整密钥。
  3. 兼容旧权限格式（逗号字符串/数组）并验证 `withdraw` 权限。
  4. 调 Binance 提币接口（`/sapi/v1/capital/withdraw/apply`）完成提币。
  5. 返回统一响应结构 `{ success, error?, data? }`，便于前端复用现有提示逻辑。

C. 前台绑定页接入 Binance 真验证
- 修改：`src/pages/ApiKeyInput.tsx`
- 调整为：
  - `exchangeId === 'okx'` -> `validate-okx-apikey`
  - `exchangeId === 'binance'` -> `validate-binance-apikey`
  - 成功后统一跳转 `/member/:id`（后端记录 ID）
  - 其他交易所暂保留原逻辑（不影响）。

D. 后台 Binance 管理页上线（复用 OKX UI）
- 修改：`src/pages/AdminRates.tsx`
- 关键点：
  1. 启用 Binance 菜单（`enabled: true`）。
  2. Binance 标签页复用现有 API Key 列表/卡片组件（按 `exchange='binance'` 加载）。
  3. 卡片操作函数按 `data.exchange` 动态路由：
     - 刷新：OKX 调 `validate-okx-apikey`，Binance 调 `validate-binance-apikey`
     - 提币：OKX 调 `withdraw-okx`，Binance 调 `withdraw-binance`
  4. 刷新弹窗按交易所决定是否展示 Passphrase（Binance 不强制）。
  5. 删除逻辑沿用当前管理员删除策略。

E. 多语言补齐
- 修改：`src/lib/i18n.tsx`
- 增补 Binance 页面/提示文案（若缺少）并优化“刷新密钥”描述为按交易所动态文案（有/无 passphrase）。

F. 函数配置
- 修改：`supabase/config.toml`
- 新增：
  - `[functions.validate-binance-apikey] verify_jwt = false`
  - `[functions.withdraw-binance] verify_jwt = false`

三、数据与安全策略
1) 不新增数据库表；复用 `api_keys` 通用结构。  
2) 现有 `api_keys` 的 SELECT/UPDATE/DELETE 已限制管理员。  
3) 插入由验证函数使用服务端权限写入（前端不直写）。  
4) 管理端所有敏感操作继续通过后端鉴权 + 管理员角色校验。

四、验收标准
1) 用户在 Binance 绑定页提交后能真实校验并入库，成功跳转会员页。  
2) `/admin` 的 Binance 标签可见且可加载列表（状态/权限/余额展示正常）。  
3) Binance 卡片支持刷新密钥、删除记录。  
4) 若权限含 `withdraw`，可发起 Binance 提币；无权限时按钮禁用并提示一致。  
5) OKX 现有能力不回归。
