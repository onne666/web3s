export const EXCHANGES = [
  { id: "binance", name: "Binance", logo: "🟡" },
  { id: "okx", name: "OKX", logo: "⚫" },
  { id: "bybit", name: "Bybit", logo: "🟠" },
  { id: "bitget", name: "Bitget", logo: "🔵" },
  { id: "kraken", name: "Kraken", logo: "🟣" },
] as const;

export type ExchangeId = typeof EXCHANGES[number]["id"];

export interface CoinRate {
  symbol: string;
  name: string;
  marketPrice: number;
  memberPrice: number;
  currency: string;
}

export const DEFAULT_RATES: CoinRate[] = [
  { symbol: "BTC", name: "Bitcoin", marketPrice: 84250, memberPrice: 86356, currency: "USDT" },
  { symbol: "ETH", name: "Ethereum", marketPrice: 1920, memberPrice: 1968, currency: "USDT" },
  { symbol: "USDT", name: "Tether", marketPrice: 1.0, memberPrice: 1.025, currency: "USD" },
  { symbol: "USDC", name: "USD Coin", marketPrice: 1.0, memberPrice: 1.023, currency: "USD" },
  { symbol: "BNB", name: "BNB", marketPrice: 640, memberPrice: 656, currency: "USDT" },
];

export const API_KEY_GUIDES: Record<string, { steps: string[] }> = {
  binance: {
    steps: [
      "登录 Binance 账户，点击右上角头像 → API 管理",
      "点击「创建 API」，选择「系统生成」类型",
      "输入标签名称（如 CryptoShop），完成安全验证",
      "重要：仅勾选「读取」权限，不要开启交易或提现权限",
      "复制 API Key 和 Secret Key 填入下方",
    ],
  },
  okx: {
    steps: [
      "登录 OKX，进入「个人中心」→「API」",
      "点击「创建 V5 API Key」",
      "设置名称，权限选择「只读」",
      "完成邮箱 / Google 验证",
      "复制 API Key 和 Secret Key 填入下方",
    ],
  },
  bybit: {
    steps: [
      "登录 Bybit，点击头像 → 「API」",
      "点击「创建新 Key」，选择「系统生成 API Key」",
      "Key 权限仅选择「只读」",
      "完成二次验证后创建",
      "复制 API Key 和 Secret Key 填入下方",
    ],
  },
  bitget: {
    steps: [
      "登录 Bitget，进入「个人中心」→「API 管理」",
      "点击「创建 API」",
      "权限设置选择「只读」",
      "设置口令和安全验证",
      "复制 API Key 和 Secret Key 填入下方",
    ],
  },
  kraken: {
    steps: [
      "登录 Kraken，进入 Settings → API",
      "点击「Create API Key」",
      "权限仅勾选「Query Funds」和「Query Open Orders & Trades」",
      "完成 2FA 验证",
      "复制 API Key 和 Private Key 填入下方",
    ],
  },
};
