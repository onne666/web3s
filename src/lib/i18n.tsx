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
    submitButton: "提交注册",
    submitting: "提交中...",
    registerSuccess: "注册成功",
    registerSuccessMsg: "注册成功！正在跳转至会员面板...",

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

    // AdminRates
    adminTitle: "店员管理",
    adminSubtitle: "请输入管理密码",
    adminPasswordPlaceholder: "管理密码",
    passwordError: "密码错误",
    enterAdmin: "进入管理",
    rateManagement: "汇率管理",
    usdtRate: "USDT 兑换汇率",
    save: "保存",
    saved: "已保存",
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
    submitButton: "Submit",
    submitting: "Submitting...",
    registerSuccess: "Success",
    registerSuccessMsg: "Registration successful! Redirecting...",

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
    adminSubtitle: "Enter admin password",
    adminPasswordPlaceholder: "Password",
    passwordError: "Wrong password",
    enterAdmin: "Login",
    rateManagement: "Rate Management",
    usdtRate: "USDT Exchange Rate",
    save: "Save",
    saved: "Saved",
  },
} as const;

type Dict = typeof dict.zh;

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
