

## 修复 OKX Passphrase 问题：前端 trim + 后端日志

### 问题

OKX 返回 `OK-ACCESS-PASSPHRASE incorrect`。代码逻辑无误，passphrase 从前端直接传到 header。但可能存在前后空格导致不匹配。

### 改动

#### 1. `src/pages/ApiKeyInput.tsx`
- 提交时对 `apiKey`、`secretKey`、`passphrase` 都做 `.trim()` 处理后再发送

#### 2. `supabase/functions/validate-okx-apikey/index.ts`
- 对收到的 `passphrase` 做 `.trim()`
- 添加 `console.log` 输出 passphrase 长度（不输出内容），方便排查

### 改动文件
- `src/pages/ApiKeyInput.tsx` — trim 所有输入
- `supabase/functions/validate-okx-apikey/index.ts` — trim + 调试日志

