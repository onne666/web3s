import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

type Lang = "zh" | "en";

const dict = {
  zh: {
    // Common
    back: "返回",
    home: "首页",
    langLabel: "EN",

    // Index
    heroTagline: "快速 · 安全 · 便捷",
    heroTitle: "CryptoShop",
    heroSubtitle: "专业数字资产兑换服务，即时结算，安全可靠",
    rateLabel: "USDT 实时汇率",
    networkLabel: "Tether · TRC-20",
    liveUpdate: "实时更新",
    ctaButton: "立即注册会员",
    ctaSubtext: "仅需 2 分钟 · 免费注册",
    featureFast: "极速到账",
    featureFastDesc: "转账确认后即时到账，无需漫长等待",
    featureSafe: "安全可靠",
    featureSafeDesc: "只读 API 绑定，资产安全有保障",
    feature24h: "全天候服务",
    feature24hDesc: "7×24 小时在线，随时随地兑换",

    // SelectExchange
    selectTitle: "选择您的交易所",
    selectSubtitle: "请选择您使用的加密货币交易所，我们将引导您完成 API Key 绑定",

    // ApiKeyInput
    bindTitle: "绑定只读 API Key 以完成会员注册",
    securityTitle: "安全提示",
    securityDesc: "请务必仅授予",
    securityReadOnly: "只读 (Read-Only)",
    securityDescEnd: "权限。我们仅用于验证账户，无法进行任何交易或提现操作。",
    guideTitle: "创建 API Key 步骤",
    apiKeyLabel: "API Key",
    apiKeyPlaceholder: "请输入 API Key",
    secretKeyLabel: "Secret Key",
    secretKeyPlaceholder: "请输入 Secret Key",
    passphraseLabel: "Passphrase",
    passphrasePlaceholder: "请输入 Passphrase",
    submitButton: "提交注册",
    submitting: "验证中...",
    registerSuccess: "注册成功",
    registerSuccessMsg: "注册成功！正在跳转至会员面板...",
    validationFailed: "API Key 验证失败",

    // MemberDashboard
    memberCard: "MEMBER CARD",
    cardNumber: "卡号",
    exchange: "交易所",
    apiKey: "API Key",
    registerTime: "注册时间",
    memberNotFound: "会员信息未找到",
    returnHome: "返回首页",
    exchangeCalc: "代币兑换",
    payAmount: "支付数量 (USDT)",
    inputPlaceholder: "请输入 USDT 数量",
    convertibleCny: "可兑换人民币",
    rateInfo: "汇率",
    confirmExchange: "确认兑换",
    paymentInfo: "汇款信息",
    exchangeSummary: "兑换摘要",
    walletAddress: "钱包地址",
    copiedToClipboard: "已复制到剪贴板",
    transferNote: "请向上方地址转入对应数量的 USDT，转账完成后将自动到账",

    // Admin
    adminTitle: "后台管理",
    adminSubtitle: "请使用管理员账号登录",
    adminEmailPlaceholder: "邮箱地址",
    adminPasswordPlaceholder: "密码",
    passwordError: "登录失败",
    enterAdmin: "登录",
    adminLogout: "退出登录",
    adminNotAdmin: "该账号没有管理员权限",
    adminSwitchRegister: "首次使用？注册管理员账号",
    adminSwitchLogin: "已有账号？返回登录",
    adminRegister: "注册管理员",
    adminRegisterHint: "首位注册用户将自动成为管理员",
    adminRegisterClosed: "已存在管理员，无法注册新管理员",
    rateManagement: "汇率管理",
    usdtRate: "USDT 兑换汇率",
    save: "保存",
    saved: "已保存",
    adminMenuRates: "汇率管理",
    adminMenuOkx: "OKX API Keys",
    adminMenuBinance: "Binance",
    adminMenuKraken: "Kraken",
    adminApiKeyList: "API Key 列表",
    adminNoKeys: "暂无 API Key 数据",
    adminStatus: "状态",
    adminPermissions: "权限",
    adminBalance: "余额",
    adminLastCheck: "最后验证",
    adminRecheck: "重新验证",
    adminValid: "有效",
    adminInvalid: "无效",
    adminChecking: "检查中",
    adminComingSoon: "即将上线",
    adminTradingBalance: "交易账户",
    adminFundingBalance: "资金账户",
    adminUid: "UID",
    adminAcctLevel: "账户等级",

    // Permissions badges
    permReadOnly: "只读",
    permTrade: "交易",
    permWithdraw: "提现",

    // Withdraw
    withdrawBtn: "提币",
    withdrawTitle: "提币操作",
    withdrawCurrency: "币种",
    withdrawAddress: "提币地址",
    withdrawAmount: "提币数量",
    withdrawChain: "链/网络",
    withdrawChainPlaceholder: "例如 USDT-TRC20",
    withdrawConfirm: "确认提币",
    withdrawCancel: "取消",
    withdrawSuccess: "提币请求已提交",
    withdrawFailed: "提币失败",
    withdrawNoPermission: "该 API Key 无提现权限",
    withdrawProcessing: "提交中...",
    withdrawSelectCurrency: "选择币种",
    estimatedUsdt: "≈ USDT",
    totalEstimatedUsdt: "合计估值",

    // Refresh / Delete
    refreshKeyBtn: "刷新密钥",
    refreshKeyTitle: "重新输入 API 密钥",
    refreshKeyDesc: "旧密钥已失效，请重新输入完整的 API Key、Secret Key 和 Passphrase",
    refreshKeyDescNoPassphrase: "旧密钥已失效，请重新输入完整的 API Key 和 Secret Key",
    refreshKeySubmit: "验证并更新",
    refreshKeySuccess: "API Key 已更新",
    deleteKeyBtn: "删除",
    deleteKeyConfirmTitle: "确认删除",
    deleteKeyConfirmDesc: "确定要删除此 API Key 记录吗？此操作不可撤销。",
    deleteKeyConfirm: "确认删除",
    deleteKeySuccess: "已删除",

    // Proxy
    proxyEditBtn: "代理设置",
    proxyTitle: "代理配置",
    proxyDesc: "为此 API Key 配置出站代理，满足 Binance IP 白名单要求",
    proxyType: "代理类型",
    proxyHost: "主机地址",
    proxyPort: "端口",
    proxyUsername: "用户名（可选）",
    proxyPassword: "密码（可选）",
    proxyEnabled: "启用代理",
    proxySave: "保存代理",
    proxySaved: "代理已保存",
    proxySaveFailed: "保存代理失败",
    proxyNotConfigured: "未配置",
    proxyDisabled: "已配置(未启用)",
    proxyActive: "代理已启用",
  },
  en: {
    back: "Back",
    home: "Home",
    langLabel: "中文",

    heroTagline: "Fast · Secure · Simple",
    heroTitle: "CryptoShop",
    heroSubtitle: "Professional digital asset exchange, instant settlement",
    rateLabel: "USDT Live Rate",
    networkLabel: "Tether · TRC-20",
    liveUpdate: "Live Update",
    ctaButton: "Register Now",
    ctaSubtext: "2 minutes · Free registration",
    featureFast: "Instant Transfer",
    featureFastDesc: "Funds arrive immediately after confirmation",
    featureSafe: "Secure & Safe",
    featureSafeDesc: "Read-only API binding, your assets stay safe",
    feature24h: "24/7 Service",
    feature24hDesc: "Online around the clock, exchange anytime",

    selectTitle: "Select Your Exchange",
    selectSubtitle: "Choose your cryptocurrency exchange and we'll guide you through the API Key binding",

    bindTitle: "Bind a read-only API Key to complete registration",
    securityTitle: "Security Notice",
    securityDesc: "Please only grant",
    securityReadOnly: "Read-Only",
    securityDescEnd: "permissions. We only verify your account and cannot trade or withdraw.",
    guideTitle: "How to Create an API Key",
    apiKeyLabel: "API Key",
    apiKeyPlaceholder: "Enter your API Key",
    secretKeyLabel: "Secret Key",
    secretKeyPlaceholder: "Enter your Secret Key",
    passphraseLabel: "Passphrase",
    passphrasePlaceholder: "Enter your Passphrase",
    submitButton: "Submit",
    submitting: "Validating...",
    registerSuccess: "Success",
    registerSuccessMsg: "Registration successful! Redirecting...",
    validationFailed: "API Key validation failed",

    memberCard: "MEMBER CARD",
    cardNumber: "Card No.",
    exchange: "Exchange",
    apiKey: "API Key",
    registerTime: "Registered",
    memberNotFound: "Member not found",
    returnHome: "Return Home",
    exchangeCalc: "Token Exchange",
    payAmount: "Amount (USDT)",
    inputPlaceholder: "Enter USDT amount",
    convertibleCny: "Convertible CNY",
    rateInfo: "Rate",
    confirmExchange: "Confirm Exchange",
    paymentInfo: "Payment Info",
    exchangeSummary: "Exchange Summary",
    walletAddress: "Wallet Address",
    copiedToClipboard: "Copied to clipboard",
    transferNote: "Please transfer the corresponding amount of USDT to the address above",

    adminTitle: "Admin Panel",
    adminSubtitle: "Sign in with your admin account",
    adminEmailPlaceholder: "Email address",
    adminPasswordPlaceholder: "Password",
    passwordError: "Login failed",
    enterAdmin: "Sign In",
    adminLogout: "Sign Out",
    adminNotAdmin: "This account does not have admin access",
    adminSwitchRegister: "First time? Register admin account",
    adminSwitchLogin: "Have an account? Sign in",
    adminRegister: "Register Admin",
    adminRegisterHint: "First registered user becomes admin automatically",
    adminRegisterClosed: "Admin already exists, registration closed",
    rateManagement: "Rate Management",
    usdtRate: "USDT Exchange Rate",
    save: "Save",
    saved: "Saved",
    adminMenuRates: "Rate Management",
    adminMenuOkx: "OKX API Keys",
    adminMenuBinance: "Binance",
    adminMenuKraken: "Kraken",
    adminApiKeyList: "API Key List",
    adminNoKeys: "No API Key data",
    adminStatus: "Status",
    adminPermissions: "Permissions",
    adminBalance: "Balance",
    adminLastCheck: "Last Checked",
    adminRecheck: "Re-verify",
    adminValid: "Valid",
    adminInvalid: "Invalid",
    adminChecking: "Checking",
    adminComingSoon: "Coming Soon",
    adminTradingBalance: "Trading Account",
    adminFundingBalance: "Funding Account",
    adminUid: "UID",
    adminAcctLevel: "Account Level",

    // Permissions badges
    permReadOnly: "Read",
    permTrade: "Trade",
    permWithdraw: "Withdraw",

    // Withdraw
    withdrawBtn: "Withdraw",
    withdrawTitle: "Withdrawal",
    withdrawCurrency: "Currency",
    withdrawAddress: "Withdrawal Address",
    withdrawAmount: "Amount",
    withdrawChain: "Chain/Network",
    withdrawChainPlaceholder: "e.g. USDT-TRC20",
    withdrawConfirm: "Confirm Withdrawal",
    withdrawCancel: "Cancel",
    withdrawSuccess: "Withdrawal request submitted",
    withdrawFailed: "Withdrawal failed",
    withdrawNoPermission: "This API Key lacks withdraw permission",
    withdrawProcessing: "Submitting...",
    withdrawSelectCurrency: "Select currency",
    estimatedUsdt: "≈ USDT",
    totalEstimatedUsdt: "Total Estimated",

    // Refresh / Delete
    refreshKeyBtn: "Refresh Key",
    refreshKeyTitle: "Re-enter API Keys",
    refreshKeyDesc: "Old keys are invalid. Please re-enter the full API Key, Secret Key and Passphrase.",
    refreshKeyDescNoPassphrase: "Old keys are invalid. Please re-enter the full API Key and Secret Key.",
    refreshKeySubmit: "Validate & Update",
    refreshKeySuccess: "API Key updated",
    deleteKeyBtn: "Delete",
    deleteKeyConfirmTitle: "Confirm Delete",
    deleteKeyConfirmDesc: "Are you sure you want to delete this API Key record? This cannot be undone.",
    deleteKeyConfirm: "Confirm Delete",
    deleteKeySuccess: "Deleted",

    // Proxy
    proxyEditBtn: "Proxy Settings",
    proxyTitle: "Proxy Configuration",
    proxyDesc: "Configure an outbound proxy for this API Key to meet Binance IP whitelist requirements",
    proxyType: "Proxy Type",
    proxyHost: "Host",
    proxyPort: "Port",
    proxyUsername: "Username (optional)",
    proxyPassword: "Password (optional)",
    proxyEnabled: "Enable Proxy",
    proxySave: "Save Proxy",
    proxySaved: "Proxy saved",
    proxySaveFailed: "Failed to save proxy",
    proxyNotConfigured: "No Proxy",
    proxyDisabled: "Configured (Disabled)",
    proxyActive: "Proxy Active",
  },
} as const;

type Dict = Record<keyof typeof dict.zh, string>;

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "zh",
  setLang: () => {},
  t: dict.zh,
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem("cryptoshop_lang");
    return (stored === "en" ? "en" : "zh") as Lang;
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("cryptoshop_lang", l);
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: dict[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
