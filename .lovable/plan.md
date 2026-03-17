

## 多语言支持 + 首页改版方案

### 1. 国际化 (i18n) 系统

创建 `src/lib/i18n.ts`，使用 React Context + 自定义 hook 实现轻量中英文切换：
- 定义 `zh` / `en` 两套文案字典，覆盖所有页面的静态文本
- 提供 `useLanguage()` hook 返回 `{ t, lang, setLang }`
- 语言偏好存储在 `localStorage`
- 在所有页面顶部添加语言切换按钮（中/EN toggle）

涉及所有页面文件 + `App.tsx`（包裹 Provider）

### 2. 首页重新设计 — 填充空旷感 + 汇率卡片排版优化

当前问题：页面内容稀少、汇率卡片数字层次不清晰。

改版方案：
- **顶部**：品牌名 + 语言切换按钮
- **汇率卡片大改版**：
  - 卡片占据更多纵向空间，增加内边距
  - 数字排版重新设计：`1 USDT` 居上一行（中等字体），`= 7.20 CNY` 居下一行（超大字体，primary 色），视觉层次更清晰
  - 添加 USDT 图标/标识和网络标签 (TRC-20)
  - 底部添加 "实时更新" 时间戳
- **新增特性区域**：在汇率卡片和 CTA 按钮之间添加 3 个小图标卡片（快速到账 / 安全可靠 / 24h 服务），填充页面空白
- **CTA 区域**保持不变

### 3. 涉及文件

| 文件 | 变更 |
|---|---|
| `src/lib/i18n.tsx` | **新建** — 语言 Context、字典、hook |
| `src/App.tsx` | 包裹 `LanguageProvider` |
| `src/pages/Index.tsx` | 重新设计排版 + 国际化文案 + 特性卡片 |
| `src/pages/SelectExchange.tsx` | 国际化文案 |
| `src/pages/ApiKeyInput.tsx` | 国际化文案 |
| `src/pages/MemberDashboard.tsx` | 国际化文案 |
| `src/pages/AdminRates.tsx` | 国际化文案 |
| `src/lib/constants.ts` | API Key 引导步骤添加英文版 |

