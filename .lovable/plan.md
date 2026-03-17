

## 修复提币 Edge Function 报错

### 问题根因

有 **两个 Bug** 导致提币失败：

#### Bug 1: `getClaims` 方法不存在
`supabase-js v2` 没有 `auth.getClaims()` 方法，调用直接抛异常，导致函数返回 500。应改用 `auth.getUser(token)` 获取用户 ID。

#### Bug 2: 权限字段格式错误（已有数据）
数据库中 permissions 存储为 `["read_only,withdraw"]`（单个逗号分隔字符串），而非 `["read_only", "withdraw"]`。`perms.includes("withdraw")` 匹配不到。

需要在 `withdraw-okx` 中也做 flatMap + split 兼容处理。

### 修复方案

**文件: `supabase/functions/withdraw-okx/index.ts`**

1. 将 `supabaseAuth.auth.getClaims(token)` 替换为 `supabaseAuth.auth.getUser(token)`，从 `user.id` 获取 userId
2. 权限检查改为：
   ```typescript
   const perms = ((keyRow.permissions || []) as string[])
     .flatMap(p => p.split(",").map(s => s.trim()));
   if (!perms.includes("withdraw")) { ... }
   ```

**文件: `supabase/functions/validate-okx-apikey/index.ts`**

确认当前的权限解析逻辑是否已经正确分割（上次修复应该已处理），如果正确则无需修改。新添加的 API Key 会存储正确格式。

### 文件变更

| 文件 | 变更 |
|---|---|
| `supabase/functions/withdraw-okx/index.ts` | 修复 auth 验证方法 + 权限兼容解析 |

