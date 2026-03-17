

## 修复提币权限显示 + 完善提币功能

### 问题根因

**权限解析 Bug**：OKX `/api/v5/account/config` 返回的 `perm` 字段是逗号分隔的字符串，如 `"read_only,trade,withdraw"`。当前代码用 `===` 精确匹配，只能识别单权限情况，导致复合权限（如 `"read_only,withdraw"`）无法识别。

```text
当前代码:  if (configData.perm === "withdraw") → 仅匹配 "withdraw"
实际返回:  configData.perm = "read_only,trade,withdraw" → 不匹配任何分支
结果: permissions = ["read_only,trade,withdraw"]  ← 原始字符串被当作单个权限
前端: permissions.includes("withdraw") → false → 按钮显示"无权限"
```

### 修复方案

#### 1. 修复 `validate-okx-apikey` 权限解析

将 `perm` 字段按逗号分割后匹配：
```typescript
const rawPerms = (configData.perm || "").split(",").map(s => s.trim());
const permissions: string[] = [];
if (rawPerms.includes("read_only")) permissions.push("read_only");
if (rawPerms.includes("trade")) permissions.push("trade");
if (rawPerms.includes("withdraw")) permissions.push("withdraw");
```

#### 2. 完善提币 Edge Function (`withdraw-okx`)

根据 OKX 文档修正参数：
- `fee` 不能填 `"0"`，需先调用 `/api/v5/asset/currencies` 获取该币种链的最小手续费 `minFee`
- 保持 `dest: "4"` 用于链上提币

#### 3. 提币对话框增加手续费提示

在前端提币对话框中显示预估手续费（从 withdraw-okx Edge Function 返回），让管理员确认。

### 文件变更

| 文件 | 变更 |
|---|---|
| `supabase/functions/validate-okx-apikey/index.ts` | 修复 perm 解析逻辑（逗号分割） |
| `supabase/functions/withdraw-okx/index.ts` | 增加获取 minFee 逻辑，替换 fee: "0" |
| `src/pages/AdminRates.tsx` | 提币对话框添加手续费显示字段 |

### 对已有数据的影响

已入库的 API Key 的 permissions 字段可能存储了错误的权限值。需要在前端也增加逗号分割的兼容解析，或在 Edge Function 中增加一个「重新验证」逻辑来刷新已有记录。

