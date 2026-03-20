export const EXCHANGES = [
  { id: "binance", name: "Binance", logo: "https://bin.bnbstatic.com/static/images/common/logo.png" },
  { id: "okx", name: "OKX", logo: "https://www.okx.com/cdn/assets/imgs/253/59830BB78B18A776.png" },
  { id: "bybit", name: "Bybit", logo: "🟠" },
  { id: "bitget", name: "Bitget", logo: "🔵" },
  { id: "kraken", name: "Kraken", logo: "🟣" },
] as const;

export type ExchangeId = typeof EXCHANGES[number]["id"];

export interface CoinRate {
  symbol: string;
  name: string;
  buybackRate: number;
  currency: string;
}

export const DEFAULT_RATES: CoinRate[] = [
  { symbol: "USDT", name: "Tether", buybackRate: 7.20, currency: "CNY" },
];

export const WALLET_ADDRESS = "TXxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

// Exchanges that require a passphrase
export const EXCHANGES_WITH_PASSPHRASE = ["okx", "bitget"];

export const API_KEY_GUIDES: Record<string, { steps: string[]; stepsEn: string[] }> = {
  binance: {
    steps: [
      "登录 Binance 账户，点击右上角头像 → API 管理",
      "点击「创建 API」，选择「系统生成」类型",
      "输入标签名称，完成安全验证",
      "重要：仅勾选「读取」权限，不要开启交易或提现权限",
      "复制 API Key 和 Secret Key 填入下方",
    ],
    stepsEn: [
      "Log in to Binance, click avatar → API Management",
      "Click 'Create API', select 'System Generated'",
      "Enter a label, complete security verification",
      "Important: Only check 'Read' permission, do NOT enable trading or withdrawal",
      "Copy API Key and Secret Key, paste below",
    ],
  },
  okx: {
    steps: [
      "登录 OKX，进入「个人中心」→「API」",
      "点击「创建 V5 API Key」",
      "设置名称和 Passphrase（创建时必须设置，请牢记）",
      "权限选择「只读」",
      "完成邮箱 / Google 验证",
      "复制 API Key、Secret Key 和 Passphrase 填入下方",
    ],
    stepsEn: [
      "Log in to OKX, go to Profile → API",
      "Click 'Create V5 API Key'",
      "Set a name and Passphrase (required, remember it)",
      "Select 'Read Only' permission",
      "Complete email / Google verification",
      "Copy API Key, Secret Key and Passphrase, paste below",
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
    stepsEn: [
      "Log in to Bybit, click avatar → API",
      "Click 'Create New Key', select 'System Generated'",
      "Set permission to 'Read Only' only",
      "Complete 2FA and create",
      "Copy API Key and Secret Key, paste below",
    ],
  },
  bitget: {
    steps: [
      "登录 Bitget，进入「个人中心」→「API 管理」",
      "点击「创建 API」",
      "权限设置选择「只读」",
      "设置 Passphrase 和安全验证",
      "复制 API Key、Secret Key 和 Passphrase 填入下方",
    ],
    stepsEn: [
      "Log in to Bitget, go to Profile → API Management",
      "Click 'Create API'",
      "Set permission to 'Read Only'",
      "Set Passphrase and complete verification",
      "Copy API Key, Secret Key and Passphrase, paste below",
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
    stepsEn: [
      "Log in to Kraken, go to Settings → API",
      "Click 'Create API Key'",
      "Only check 'Query Funds' and 'Query Open Orders & Trades'",
      "Complete 2FA verification",
      "Copy API Key and Private Key, paste below",
    ],
  },
};
