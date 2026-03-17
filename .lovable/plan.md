

## 重新设计方案

### 核心变更

1. **首页重新设计**
   - 顶部展示店铺名称（如"CryptoShop"）和品牌 Logo
   - 仅展示 USDT 和 USDC 两种币种的今日兑换汇率（大字体突出显示）
   - 移除"高于市价"、"溢价"、"Premium"等字眼
   - 移除会员权益板块
   - 移除会员卡预览
   - 保留简洁的"注册会员"CTA 按钮

2. **主题色调整** — 从电光绿改为科技蓝紫色系
   - Primary: `220 90% 56%`（科技蓝）
   - Accent: `260 80% 65%`（紫色辅助）
   - 更新 glow、gradient、pulse-glow 动画配色
   - 保留深色背景和玻璃面板风格

3. **数据层简化**
   - `constants.ts`: DEFAULT_RATES 只保留 USDT 和 USDC
   - `CoinRate` 接口移除 `marketPrice`，只保留 `memberPrice`（改名为 `buybackRate` 兑换价）
   - 移除所有溢价计算逻辑

4. **API Key 验证跳过**
   - `ApiKeyInput.tsx`: 提交后直接成功，跳过 length 校验和模拟延时
   - 保留输入框 UI 和交易所引导步骤

5. **会员面板简化**
   - 汇率表只展示兑换价，移除溢价列

6. **管理后台适配**
   - 只管理 `buybackRate` 字段，移除市场价和溢价相关 UI

### 涉及文件
- `src/index.css` — 主题色
- `tailwind.config.ts` — 如需调整
- `src/lib/constants.ts` — 币种和数据结构
- `src/lib/store.ts` — 适配新数据结构
- `src/pages/Index.tsx` — 首页重新设计
- `src/pages/ApiKeyInput.tsx` — 跳过验证
- `src/pages/MemberDashboard.tsx` — 简化汇率展示
- `src/pages/AdminRates.tsx` — 适配新数据结构

