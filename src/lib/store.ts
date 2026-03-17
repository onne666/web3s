import { CoinRate, DEFAULT_RATES, ExchangeId } from "./constants";

const RATES_KEY = "crypto_shop_rates";
const MEMBERS_KEY = "crypto_shop_members";
const ADMIN_PASS = "shop2024";

export interface Member {
  id: string;
  exchange: ExchangeId;
  apiKey: string;
  createdAt: string;
  cardNumber: string;
}

export function getRates(): CoinRate[] {
  const stored = localStorage.getItem(RATES_KEY);
  if (stored) return JSON.parse(stored);
  return DEFAULT_RATES;
}

export function saveRates(rates: CoinRate[]) {
  localStorage.setItem(RATES_KEY, JSON.stringify(rates));
}

export function getMembers(): Member[] {
  const stored = localStorage.getItem(MEMBERS_KEY);
  if (stored) return JSON.parse(stored);
  return [];
}

export function addMember(exchange: ExchangeId, apiKey: string): Member {
  const members = getMembers();
  const member: Member = {
    id: crypto.randomUUID(),
    exchange,
    apiKey: apiKey.slice(0, 8) + "****",
    createdAt: new Date().toISOString(),
    cardNumber: `VIP-${Date.now().toString(36).toUpperCase()}`,
  };
  members.push(member);
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
  return member;
}

export function verifyAdminPassword(password: string): boolean {
  return password === ADMIN_PASS;
}
