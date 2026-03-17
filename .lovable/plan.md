

## 修改方案

### 变更概览

1. **增加紫色占比** — 调整 `index.css` 中背景渐变、glow、面板等大面积使用紫色，提升科幻感
2. **仅保留 USDT** — `constants.ts` 删除 USDC，DEFAULT_RATES 只留 USDT
3. **首页汇率卡片** — 移除"今日兑换汇率"标题和列表，改为单张大卡片展示 `1 USDT = 7.20 CNY` 的等式风格
4. **会员主页改造** — 移除汇率列表，替换为「代币兑换计算器」表单卡片：
   - 输入 USDT 数量 → 实时计算 CNY 金额
   - 「确认兑换」按钮 → 弹出汇款信息页面（Dialog/新视图）
   - 显示 TRX 链钱包地址 + QR Code + 一键复制按钮
5. **管理后台简化** — 只需管理一个 USDT 汇率，简化 UI（可选保留添加功能）

### 涉及文件

| 文件 | 变更 |
|---|---|
| `src/index.css` | 加大紫色渐变占比，背景/glow/动画偏紫 |
| `src/lib/constants.ts` | 删除 USDC，只留 USDT；新增 `WALLET_ADDRESS` 常量（TRC-20 钱包地址） |
| `src/lib/store.ts` | 适配单币种 |
| `src/pages/Index.tsx` | 单张 USDT 汇率等式卡片，移除列表 |
| `src/pages/MemberDashboard.tsx` | 替换汇率列表为兑换计算器表单 + 确认兑换弹窗（含 TRX 地址、QR Code、复制按钮） |
| `src/pages/AdminRates.tsx` | 简化为单币种汇率编辑 |

### 兑换弹窗设计
- 使用 Dialog 组件弹出
- 显示兑换摘要（X USDT → Y CNY）
- TRC-20 钱包地址 + 复制按钮（`navigator.clipboard`）
- QR Code 使用 `qrcode.react` 库生成
- 链标识："TRON (TRC-20)" 标签

### 钱包地址
将使用占位地址 `TXxxxxxxxxxxxxxxxxxxxxxxxxxxxx`，可在 `constants.ts` 中配置，管理后台后续可扩展编辑。

