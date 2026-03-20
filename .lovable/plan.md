

## 替换 Logo + 移除安全提示和"绑定只读"文案

### 改动

#### 1. `src/lib/constants.ts` — Logo 改为图片 URL

将 `EXCHANGES` 数组中 Binance 和 OKX 的 `logo` 字段从 emoji 改为图片 URL：
- Binance: `https://bin.bnbstatic.com/static/images/common/logo.png`
- OKX: `https://www.okx.com/cdn/assets/imgs/253/59830BB78B18A776.png`

#### 2. `src/pages/SelectExchange.tsx` — 渲染 logo 改为 `<img>`

将 `<span className="text-3xl">{ex.logo}</span>` 改为条件渲染：如果 logo 是 URL 则用 `<img>`，否则保留 emoji。

#### 3. `src/pages/ApiKeyInput.tsx` — 同样改 logo 渲染 + 移除安全提示

- Logo 渲染同上
- 删除安全提示区块（第 92-100 行，Shield 图标 + securityTitle/securityDesc 等）
- 修改 `bindTitle` 引用处的文案

#### 4. `src/lib/i18n.tsx` — 更新文案

- `bindTitle` 改为"绑定 API Key 以完成会员注册" / "Bind API Key to complete registration"（去掉"只读"）
- `securityTitle`、`securityDesc`、`securityReadOnly`、`securityDescEnd` 可保留但不再使用

### 改动文件
- `src/lib/constants.ts`
- `src/pages/SelectExchange.tsx`
- `src/pages/ApiKeyInput.tsx`
- `src/lib/i18n.tsx`

